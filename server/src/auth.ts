import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

import type { Env } from "./env.js";

export type Role = "parent" | "child";

export interface AuthClaims {
  sub: string;
  familyId: string | null;
  role: Role;
  childId: string | null;
  /** id строки sessions: по нему guard проверяет, не отозвана ли сессия. */
  sid: string | null;
}

export interface RefreshPair {
  token: string;
  hash: string;
}

export function hashSecret(value: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(value, salt, 32).toString("hex");
  return "scrypt$" + salt + "$" + hash;
}

export function verifySecret(value: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const salt = parts[1] ?? "";
  const expected = parts[2] ?? "";
  const actual = crypto.scryptSync(value, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccess(env: Env, claims: AuthClaims): string {
  return jwt.sign(
    { familyId: claims.familyId, role: claims.role, childId: claims.childId, sid: claims.sid },
    env.JWT_SECRET,
    {
      subject: claims.sub,
      expiresIn: env.ACCESS_TTL_MIN * 60,
    },
  );
}

export function verifyAccess(env: Env, token: string): AuthClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string") {
    throw new Error("Некорректный токен");
  }
  const sub = decoded.sub;
  if (typeof sub !== "string") {
    throw new Error("В токене нет пользователя");
  }
  const familyId = typeof decoded.familyId === "string" ? decoded.familyId : null;
  const childId = typeof decoded.childId === "string" ? decoded.childId : null;
  const role = decoded.role === "parent" || decoded.role === "child" ? decoded.role : "parent";
  // Старые токены без sid остаются валидными: демо-устройства не должны разлогиниться.
  const sid = typeof decoded.sid === "string" ? decoded.sid : null;
  return { sub, familyId, role, childId, sid };
}

export function createRefresh(): RefreshPair {
  const token = crypto.randomBytes(48).toString("base64url");
  return { token, hash: hashToken(token) };
}

/** Роль и семья определяются базой, а не выбором на экране. */
export async function loadClaims(db: SupabaseClient, userId: string): Promise<AuthClaims> {
  const { data: membership } = await db
    .from("family_members")
    .select("family_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return { sub: userId, familyId: null, role: "parent", childId: null, sid: null };
  }

  const role = membership.role === "child" ? "child" : "parent";
  let childId: string | null = null;
  if (role === "child") {
    const { data: child } = await db
      .from("children")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    childId = child?.id ?? null;
  }

  return { sub: userId, familyId: membership.family_id as string, role, childId, sid: null };
}

export async function issueSession(
  db: SupabaseClient,
  env: Env,
  userId: string,
  deviceId: string | null,
  os: string | null,
): Promise<{ accessToken: string; refreshToken: string; claims: AuthClaims }> {
  const claims = await loadClaims(db, userId);
  const refresh = createRefresh();
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: session, error } = await db
    .from("sessions")
    .insert({
      user_id: userId,
      refresh_hash: refresh.hash,
      device_id: deviceId,
      os,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !session) {
    throw new Error("Не удалось создать сессию: " + (error?.message ?? ""));
  }

  // sid привязывает access-токен к строке sessions: logout/отзыв доступа
  // проверяются guard'ом на каждом запросе, а не только при refresh.
  const sessionClaims: AuthClaims = { ...claims, sid: session.id as string };
  return {
    accessToken: signAccess(env, sessionClaims),
    refreshToken: refresh.token,
    claims: sessionClaims,
  };
}

export async function rotateRefresh(
  db: SupabaseClient,
  env: Env,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; claims: AuthClaims } | null> {
  const hash = hashToken(refreshToken);
  const { data: session } = await db
    .from("sessions")
    .select("id, user_id, expires_at, revoked_at")
    .eq("refresh_hash", hash)
    .maybeSingle();

  if (!session || session.revoked_at) {
    return null;
  }
  if (new Date(session.expires_at as string).getTime() < Date.now()) {
    return null;
  }

  await db.from("sessions").update({ revoked_at: new Date().toISOString() }).eq("id", session.id);
  return issueSession(db, env, session.user_id as string, null, null);
}
