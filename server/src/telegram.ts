import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Env } from "./env.js";

interface TelegramConfig {
  token: string;
  /** Общий чат не обязателен: он нужен только как резервный получатель уведомлений. */
  chatId: string;
  username: string;
}

let config: TelegramConfig | null = null;

/** Один раз при старте: бот настроен, если есть токен. Чаты появляются по привязке. */
export function configureTelegram(env: Env): void {
  linkSecret = env.JWT_SECRET;
  config = env.TELEGRAM_BOT_TOKEN
    ? {
        token: env.TELEGRAM_BOT_TOKEN,
        chatId: env.TELEGRAM_CHAT_ID ?? "",
        username: env.TELEGRAM_BOT_USERNAME ?? "",
      }
    : null;
}

export function telegramEnabled(): boolean {
  return config !== null;
}

let linkSecret = "";

/** Ссылка на бота до входа: payload привязывает номер телефона, а не пользователя. */
export function telegramOtpLink(phone: string): string | null {
  if (!config || !config.username) {
    return null;
  }
  const digits = phone.replace(/[^0-9]/g, "");
  const token = crypto.createHmac("sha256", linkSecret).update("tg-otp:" + digits).digest("hex").slice(0, 16);
  return "https://t.me/" + config.username + "?start=otp_" + digits + "_" + token;
}

function parseOtpLink(payload: string): string | null {
  const parts = payload.split("_");
  if (parts.length !== 3 || parts[0] !== "otp") {
    return null;
  }
  const digits = parts[1] ?? "";
  const token = parts[2] ?? "";
  const expected = crypto.createHmac("sha256", linkSecret).update("tg-otp:" + digits).digest("hex").slice(0, 16);
  if (!digits || token.length !== expected.length) {
    return null;
  }
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)) ? "+" + digits : null;
}

/** Привязан ли номер к чату — тогда код подтверждения уходит в Telegram. */
export async function telegramChatForPhone(db: SupabaseClient, phone: string): Promise<string | null> {
  const { data } = await db.from("telegram_bindings").select("chat_id").eq("phone", phone).maybeSingle();
  return (data?.chat_id as string | null) ?? null;
}

/** Личная ссылка на бота: после /start привязываем chat_id к пользователю. */
export function telegramLink(userId: string): string | null {
  if (!config || !config.username) {
    return null;
  }
  const token = crypto.createHmac("sha256", linkSecret).update("tg:" + userId).digest("hex").slice(0, 16);
  return "https://t.me/" + config.username + "?start=" + userId + "-" + token;
}

function parseLink(payload: string): string | null {
  const [userId, token] = payload.split("-");
  if (!userId || !token) {
    return null;
  }
  const expected = crypto.createHmac("sha256", linkSecret).update("tg:" + userId).digest("hex").slice(0, 16);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)) ? userId : null;
}

/**
 * Бот не может написать первым по правилам Telegram. Поэтому ловим один /start
 * от родителя и запоминаем chat_id — дальше пишем ему в личку когда угодно.
 */
export function startTelegramPoller(db: SupabaseClient, env: Env): void {
  if (!config) {
    return;
  }
  linkSecret = env.JWT_SECRET;
  let offset = 0;
  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const response = await fetch(
        "https://api.telegram.org/bot" + config!.token + "/getUpdates?timeout=0&offset=" + offset,
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        result?: { update_id: number; message?: { text?: string; chat?: { id: number } } }[];
      };
      for (const update of payload.result ?? []) {
        offset = Math.max(offset, update.update_id + 1);
        const text = update.message?.text ?? "";
        const chatId = update.message?.chat?.id;
        if (!text.startsWith("/start") || !chatId) {
          continue;
        }
        const payload = text.replace("/start", "").trim();

        // Привязка на этапе входа: номер -> чат, чтобы код приходил в бот.
        if (payload.startsWith("otp_")) {
          const phone = parseOtpLink(payload);
          if (!phone) {
            continue;
          }
          await db.from("telegram_bindings").upsert({ phone, chat_id: String(chatId) }, { onConflict: "phone" });
          await sendTelegram("Готово! Привязка есть. Сейчас пришлю код для входа 👇", String(chatId));
          // Сразу выдаём свежий код: он уйдёт в этот же чат, приложение можно не трогать.
          try {
            const { createChallenge } = await import("./otp.js");
            await createChallenge(db, env, phone);
          } catch (error) {
            console.error("[telegram] код не отправлен: " + (error as Error).message);
          }
          continue;
        }

        const userId = parseLink(payload);
        if (!userId) {
          continue;
        }
        await db.from("users").update({ telegram_chat_id: String(chatId) }).eq("id", userId);
        await sendTelegram("Готово: сюда будут приходить коды входа и уведомления Moby Family.", String(chatId));
      }
    } catch (error) {
      console.error("[telegram] опрос: " + (error as Error).message);
    } finally {
      running = false;
    }
  };

  void tick();
  setInterval(() => void tick(), 5000);
}

/**
 * Сообщение в Telegram. Бесплатный канал: работает и для кодов входа,
 * и для уведомлений родителю (запрос ребёнка, платёж, подтверждение).
 */
export async function sendTelegram(text: string, chatId?: string): Promise<boolean> {
  if (!config) {
    return false;
  }
  // Неизвестный получатель — молча выходим, чтобы не спамить ошибками в лог.
  if (!chatId && !config.chatId) {
    return false;
  }
  try {
    const response = await fetch("https://api.telegram.org/bot" + config.token + "/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId ?? config.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!response.ok) {
      console.error("[telegram] HTTP " + response.status + " " + (await response.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[telegram] ошибка: " + (error as Error).message);
    return false;
  }
}
