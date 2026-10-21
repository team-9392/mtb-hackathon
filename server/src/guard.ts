import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { verifyAccess, type AuthClaims } from "./auth.js";
import type { Env } from "./env.js";

/**
 * Единый guard для всех запросов: access-JWT сам по себе живёт 15 минут,
 * поэтому отзыв сессии (logout) и отзыв доступа ребёнка проверяются в БД
 * на каждом запросе, а не только при refresh.
 *
 * Важно: здесь ничего не блокируется «на всякий случай». Нет заголовка или
 * подпись не сошлась – пропускаем, дальше requireAuth вернёт привычный 401.
 */

const PUBLIC_PATHS = new Set(["/health", "/partners"]);
const PUBLIC_PREFIXES = ["/auth/", "/partners/"];

/** Эти пути доступны ребёнку даже при отозванном доступе. */
const ACCESS_EXEMPT_PATHS = new Set(["/me", "/auth/refresh", "/auth/logout"]);

function pathOf(request: FastifyRequest): string {
  const raw = request.url;
  const queryAt = raw.indexOf("?");
  return queryAt === -1 ? raw : raw.slice(0, queryAt);
}

function isPublic(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function sessionRevoked(
  db: SupabaseClient,
  request: FastifyRequest,
  claims: AuthClaims,
): Promise<boolean | null> {
  // Старые токены без sid не блокируем: иначе демо-устройства разлогинятся.
  if (!claims.sid) {
    return false;
  }
  const { data, error } = await db
    .from("sessions")
    .select("id, revoked_at")
    .eq("id", claims.sid)
    .maybeSingle();
  if (error) {
    request.log.error("[guard] не удалось проверить сессию: " + error.message);
    return null;
  }
  return !data || Boolean(data.revoked_at);
}

async function childAccessRevoked(
  db: SupabaseClient,
  request: FastifyRequest,
  claims: AuthClaims,
): Promise<boolean | null> {
  if (claims.role !== "child") {
    return false;
  }
  const { data, error } = await db
    .from("children")
    .select("id, access_granted")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (error) {
    request.log.error("[guard] не удалось проверить доступ ребёнка: " + error.message);
    return null;
  }
  return Boolean(data && data.access_granted === false);
}

export function registerGuard(app: FastifyInstance, db: SupabaseClient, env: Env): void {
  app.addHook("preHandler", async (request, reply) => {
    const path = pathOf(request);
    if (isPublic(path)) {
      return;
    }

    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return;
    }

    let claims: AuthClaims;
    try {
      claims = verifyAccess(env, header.slice("Bearer ".length));
    } catch {
      // Подпись/срок проверит requireAuth и отдаст 401 с понятным текстом.
      return;
    }

    // Сначала отзыв доступа: родитель гасит и сессии, но ребёнку полезнее
    // увидеть 403 access_revoked, чем общий 401 session_revoked.
    if (!ACCESS_EXEMPT_PATHS.has(path)) {
      const accessRevoked = await childAccessRevoked(db, request, claims);
      if (accessRevoked === true) {
        return reply.status(403).send({ error: "access_revoked", message: "Доступ закрыт родителем" });
      }
    }

    const revoked = await sessionRevoked(db, request, claims);
    if (revoked === true) {
      return reply
        .status(401)
        .send({ error: "session_revoked", message: "Сессия завершена – войдите заново" });
    }
  });
}
