import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hashSecret, verifySecret } from "./auth.js";
import type { Env } from "./env.js";
import { sendOtpSms } from "./sms.js";
import { sendTelegram, telegramChatForPhone, telegramEnabled } from "./telegram.js";

const TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 12 && digits.startsWith("375")) {
    return "+" + digits;
  }
  if (digits.length === 9) {
    return "+375" + digits;
  }
  return "+" + digits;
}

/** Код подтверждения: всегда случайный, 4 цифры. DEMO_OTP — только запасной код для сцены. */
export function generateCode(): string {
  return String(crypto.randomInt(0, 10_000)).padStart(4, "0");
}

export async function createChallenge(
  db: SupabaseClient,
  env: Env,
  phone: string,
): Promise<{ challengeId: string; ttlSeconds: number; demoCode?: string }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

  const { data, error } = await db
    .from("otp_challenges")
    .insert({ phone, code_hash: hashSecret(code), expires_at: expiresAt })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Не удалось создать код подтверждения: " + (error?.message ?? "неизвестно"));
  }

  // Основной канал хакатон-продукта: код в Telegram, без SMS и без платных шлюзов.
  if (telegramEnabled()) {
    const chatId = await telegramChatForPhone(db, phone);
    if (chatId) {
      const sent = await sendTelegram(
        "🔐 <b>Moby Family</b>\nКод подтверждения: <b>" + code + "</b>\nДействует 5 минут.",
        chatId,
      );
      if (sent) {
        console.log("[otp] код отправлен в Telegram");
        return {
          challengeId: data.id as string,
          ttlSeconds: TTL_SECONDS,
          ...(env.DEMO_OTP ? { demoCode: env.DEMO_OTP } : {}),
        };
      }
    }
  }

  const delivery = await sendOtpSms(env, phone, code);
  if (delivery.sent) {
    console.log("[otp] код отправлен через " + delivery.provider);
  } else if (delivery.error) {
    console.error("[otp] не удалось отправить код: " + delivery.error);
  } else {
    console.log("[otp] демо-режим, код фиксированный");
  }

  return {
    challengeId: data.id as string,
    ttlSeconds: TTL_SECONDS,
    ...(env.DEMO_OTP ? { demoCode: env.DEMO_OTP } : {}),
  };
}

export type VerifyResult =
  | { ok: true; phone: string }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "wrong_code" };

export async function verifyChallenge(
  db: SupabaseClient,
  env: Env,
  challengeId: string,
  code: string,
): Promise<VerifyResult> {
  const { data: challenge } = await db
    .from("otp_challenges")
    .select("id, phone, code_hash, attempts, expires_at, consumed_at")
    .eq("id", challengeId)
    .maybeSingle();

  if (!challenge || challenge.consumed_at) {
    return { ok: false, reason: "not_found" };
  }
  if (new Date(challenge.expires_at as string).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if ((challenge.attempts as number) >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const isDemo = Boolean(env.DEMO_OTP) && code === env.DEMO_OTP;
  const isValid = isDemo || verifySecret(code, challenge.code_hash as string);

  if (!isValid) {
    await db
      .from("otp_challenges")
      .update({ attempts: (challenge.attempts as number) + 1 })
      .eq("id", challengeId);
    return { ok: false, reason: "wrong_code" };
  }

  await db
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challengeId);

  return { ok: true, phone: challenge.phone as string };
}

export function randomNumeric(length: number): string {
  let out = "";
  while (out.length < length) {
    out += String(crypto.randomInt(0, 10));
  }
  return out;
}

export function randomInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}
