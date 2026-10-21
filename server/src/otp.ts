import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hashSecret, verifySecret } from "./auth.js";
import type { Env } from "./env.js";
import { ApiError } from "./http.js";
import { checkRate } from "./ratelimit.js";
import { maskPhone, sendTelegram, telegramChatForPhone, telegramEnabled } from "./telegram.js";

const TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;

/** Резенд на номер: не чаще одного раза в минуту (по otp_challenges.created_at). */
const RESEND_SECONDS = 60;
/** Не больше 3 кодов на номер за 10 минут. */
const PHONE_LIMIT = 3;
const PHONE_WINDOW_MS = 10 * 60 * 1000;

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

/** Код подтверждения: всегда случайный, ровно 4 цифры. Никаких демо-кодов. */
export function generateCode(): string {
  return String(crypto.randomInt(0, 10_000)).padStart(4, "0");
}

export interface ChallengeResult {
  challengeId: string;
  ttlSeconds: number;
  channel: "telegram" | "none";
}

/**
 * Создаёт OTP-челлендж и отправляет код только в привязанный Telegram.
 *
 * Правила:
 * - нет привязки telegram_bindings -> 409 telegram_not_linked (клиент покажет
 *   кнопку привязки, код не создаётся и не тратит лимиты);
 * - бот не настроен -> channel:"none" без челленджа;
 * - резенд чаще 60 секунд или больше 3 запросов за 10 минут -> 429;
 * - Telegram не принял сообщение -> 502 telegram_failed, челлендж удаляется,
 *   чтобы после восстановления сети можно было сразу повторить.
 */
export async function createChallenge(
  db: SupabaseClient,
  env: Env,
  phone: string,
): Promise<ChallengeResult> {
  if (!telegramEnabled()) {
    console.warn("[otp] Telegram-бот не настроен: код доставить некуда");
    return { challengeId: "", ttlSeconds: 0, channel: "none" };
  }

  const chatId = await telegramChatForPhone(db, phone);
  if (!chatId) {
    throw new ApiError(409, "telegram_not_linked", "Привяжите Telegram, чтобы получить код");
  }

  // Сначала кулдаун: частый тап «Отправить ещё раз» не должен расходовать
  // квоту 3 запроса за 10 минут. Иначе два быстрых тапа запирали номер на 429.
  const { data: latest } = await db
    .from("otp_challenges")
    .select("created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastCreatedAt = latest?.created_at ? new Date(latest.created_at as string).getTime() : 0;
  if (lastCreatedAt > 0 && Date.now() - lastCreatedAt < RESEND_SECONDS * 1000) {
    throw new ApiError(429, "too_many_requests", "Слишком много попыток, подождите");
  }

  const limit = checkRate("otp:phone:" + phone, PHONE_LIMIT, PHONE_WINDOW_MS);
  if (!limit.allowed) {
    throw new ApiError(429, "too_many_requests", "Слишком много попыток, подождите");
  }

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

  // Код в API не возвращается. Для автотестов его можно включить в лог
  // переменной OTP_DEBUG=1; на проде она выключена.
  if (env.OTP_DEBUG) {
    console.log("OTP_DEBUG phone=" + maskPhone(phone) + " code=" + code);
  }

  const sent = await sendTelegram(
    "🔐 <b>Moby Family</b>\nКод подтверждения: <b>" + code + "</b>\nДействует 5 минут.\nНикому его не сообщайте.",
    chatId,
  );
  if (!sent) {
    await db.from("otp_challenges").delete().eq("id", data.id);
    throw new ApiError(
      502,
      "telegram_failed",
      "Не удалось отправить код в Telegram, попробуйте ещё раз",
    );
  }

  console.log("[otp] код отправлен в Telegram " + maskPhone(phone));
  return { challengeId: data.id as string, ttlSeconds: TTL_SECONDS, channel: "telegram" };
}

export type VerifyResult =
  | { ok: true; phone: string }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "wrong_code" };

/** Проверка только по хэшу реального кода: демо-значений и обходов нет. */
export async function verifyChallenge(
  db: SupabaseClient,
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

  if (!verifySecret(code, challenge.code_hash as string)) {
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
