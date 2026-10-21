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

export function telegramUsername(): string | null {
  const username = config?.username.trim();
  return username && username.length > 0 ? username : null;
}

let linkSecret = "";

/** В логах и сообщениях номер маскируется: +375•••••1234. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 7) {
    return "••••";
  }
  return "+" + digits.slice(0, 3) + "•••••" + digits.slice(-4);
}

/** Сколько живёт одноразовая ссылка привязки Telegram. */
const LINK_TTL_MS = 10 * 60 * 1000;

/**
 * Одноразовая ссылка привязки Telegram.
 *
 * В URL нет номера телефона: только криптостойкий токен (32 hex-символа).
 * Сам токен хранится в telegram_link_tokens, живёт 10 минут и гасится
 * (consumed_at) при первом /start. В логи токен не попадает.
 */
export async function createTelegramLinkToken(
  db: SupabaseClient,
  phone: string,
): Promise<string | null> {
  const username = telegramUsername();
  if (!config || !username) {
    return null;
  }

  // Заодно чистим просроченные токены, чтобы таблица не росла бесконечно.
  await db
    .from("telegram_link_tokens")
    .delete()
    .lt("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();
  const { error } = await db
    .from("telegram_link_tokens")
    .insert({ token, phone, expires_at: expiresAt });
  if (error) {
    throw new Error("Не удалось создать ссылку привязки Telegram: " + error.message);
  }

  return "https://t.me/" + username + "?start=" + token;
}

/**
 * Атомарно гасит токен и возвращает номер, к которому он был выписан.
 * Повторный /start и просроченный токен возвращают null.
 */
async function consumeTelegramLinkToken(
  db: SupabaseClient,
  token: string,
): Promise<string | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return null;
  }
  const { data, error } = await db
    .from("telegram_link_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("token", token)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("phone")
    .maybeSingle();

  if (error) {
    // Текст ошибки не содержит токен, но на всякий случай логируем только факт.
    console.error("[telegram] не удалось проверить токен привязки");
    return null;
  }
  return (data?.phone as string | null) ?? null;
}

/** Привязан ли номер к чату — тогда код подтверждения уходит в Telegram. */
export async function telegramChatForPhone(
  db: SupabaseClient,
  phone: string,
): Promise<string | null> {
  const { data } = await db.from("telegram_bindings").select("chat_id").eq("phone", phone).maybeSingle();
  return (data?.chat_id as string | null) ?? null;
}

/**
 * Личная ссылка на бота (после входа): по /start привязываем chat_id к пользователю.
 * Формат payload: u_<user-id>_<hmac>, чтобы дефисы UUID не ломали разбор.
 */
export function telegramLink(userId: string): string | null {
  const username = telegramUsername();
  if (!config || !username) {
    return null;
  }
  const token = crypto.createHmac("sha256", linkSecret).update("tg:" + userId).digest("hex").slice(0, 16);
  return "https://t.me/" + username + "?start=u_" + userId + "_" + token;
}

function parseLink(payload: string): string | null {
  if (!payload.startsWith("u_")) {
    return null;
  }
  const rest = payload.slice(2);
  const separator = rest.lastIndexOf("_");
  if (separator <= 0) {
    return null;
  }
  const userId = rest.slice(0, separator);
  const token = rest.slice(separator + 1);
  const expected = crypto.createHmac("sha256", linkSecret).update("tg:" + userId).digest("hex").slice(0, 16);
  if (token.length !== expected.length) {
    return null;
  }
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)) ? userId : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Сеть до Telegram с VPS нестабильна (часть запросов падает по таймауту),
 * поэтому пробуем несколько раз. Без ретраев один сбой превращался в
 * «код не пришёл» и в 502 на экране.
 */
async function telegramFetch(url: string, init?: RequestInit): Promise<Response | null> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });
    } catch (error) {
      const cause = (error as { cause?: { code?: string } }).cause;
      console.error(
        "[telegram] сеть, попытка " +
          attempt +
          "/3: " +
          (error as Error).message +
          (cause?.code ? " (" + cause.code + ")" : ""),
      );
      if (attempt < 3) {
        await delay(300 * attempt);
      }
    }
  }
  return null;
}

/**
 * Бот не может написать первым по правилам Telegram. Поэтому ловим один /start
 * от человека и запоминаем chat_id — дальше пишем ему в личку когда угодно.
 */
export function startTelegramPoller(db: SupabaseClient, env: Env): void {
  if (!config) {
    return;
  }
  linkSecret = env.JWT_SECRET;
  let offset = 0;
  let running = false;

  const bindChat = async (phone: string, chatId: number): Promise<void> => {
    await db
      .from("telegram_bindings")
      .upsert({ phone, chat_id: String(chatId) }, { onConflict: "phone" });
    // Если пользователь с таким номером уже есть, обновляем и его личный chat_id:
    // по нему уходят уведомления и реквизиты карты.
    await db.from("users").update({ telegram_chat_id: String(chatId) }).eq("phone", phone);
  };

  const tick = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const response = await telegramFetch(
        "https://api.telegram.org/bot" + config!.token + "/getUpdates?timeout=0&offset=" + offset,
      );
      if (!response) {
        return;
      }
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
        const startPayload = text.replace("/start", "").trim();

        // Новая привязка: ?start=<32 hex>. Номер телефона в URL не передаётся.
        if (/^[a-f0-9]{32}$/.test(startPayload)) {
          const phone = await consumeTelegramLinkToken(db, startPayload);
          if (!phone) {
            await sendTelegram(
              "Ссылка устарела или уже использована. Запросите новую в приложении Moby Family.",
              String(chatId),
            );
            continue;
          }
          await bindChat(phone, chatId);
          console.log("[telegram] привязка " + maskPhone(phone));
          // Код не отправляем вслепую: он должен быть привязан к челленджу,
          // который создаст приложение. После возврата в приложение человек
          // нажимает «Получить код», и код приходит в этот же чат.
          await sendTelegram(
            "✅ Telegram привязан.\nВернитесь в приложение и нажмите «Получить код» — код придёт сюда.",
            String(chatId),
          );
          continue;
        }

        // Старый формат otp_<phone>_<token> отключён: в нём был номер телефона.
        if (startPayload.startsWith("otp_")) {
          await sendTelegram(
            "Ссылка устарела. Запросите новую в приложении Moby Family.",
            String(chatId),
          );
          continue;
        }

        const userId = parseLink(startPayload);
        if (!userId) {
          continue;
        }
        await db.from("users").update({ telegram_chat_id: String(chatId) }).eq("id", userId);
        await sendTelegram(
          "Готово: сюда будут приходить коды входа и уведомления Moby Family.",
          String(chatId),
        );
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
  const response = await telegramFetch("https://api.telegram.org/bot" + config.token + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId ?? config.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!response) {
    return false;
  }
  if (!response.ok) {
    console.error("[telegram] HTTP " + response.status + " " + (await response.text()).slice(0, 200));
    return false;
  }
  return true;
}
