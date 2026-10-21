import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { CARD_SYSTEMS, CARD_TYPES, expiryFromNow, generatePan } from "../cards.js";
import type { Env } from "../env.js";
import { requireAuth, sendError } from "../http.js";
import { sendTelegram, telegramChatForPhone, telegramEnabled } from "../telegram.js";

const issueSchema = z.object({
  type: z.enum(CARD_TYPES).default("virtual"),
  system: z.enum(CARD_SYSTEMS).default("visa"),
});

const SYSTEM_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  belkart: "Белкарт",
  unionpay: "UnionPay",
};

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function randomCvv(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

function cardDetailsText(row: Record<string, unknown>): string {
  const dto = toDto(row);
  return [
    "💳 <b>Moby Family</b>: " + (row.type === "plastic" ? "Пластиковая карта" : "Виртуальная карта") + " · " + (SYSTEM_LABEL[row.system as string] ?? row.system) + " · " + dto.masked,
    "CVV: <b>" + row.cvv + "</b>",
    "PIN: <b>" + row.pin + "</b>",
  ].join("\n");
}

function toDto(row: Record<string, unknown>, withSecrets = false) {
  return {
    id: row.id as string,
    last4: String(row.number ?? "").slice(-4),
    number: row.number as string,
    system: row.system as string,
    type: row.type as string,
    expiry: row.expiry as string,
    status: row.status as string,
    masked: "•••• " + String(row.number ?? "").slice(-4),
    ...(withSecrets ? { cvv: row.cvv as string, pin: row.pin as string } : {}),
  };
}

/** Личная карта родителя: выпуск, список и отправка CVV/PIN в Telegram. */
export async function registerParentCardRoutes(
  app: FastifyInstance,
  db: SupabaseClient,
  env: Env,
): Promise<void> {
  app.get("/me/cards", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { data } = await db
        .from("parent_cards")
        .select("id, number, system, type, expiry, status")
        .eq("user_id", claims.sub)
        .order("created_at", { ascending: true });
      return reply.send({ cards: (data ?? []).map((row) => toDto(row)) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/me/cards", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = issueSchema.parse(request.body ?? {});
      const { data: user } = await db.from("users").select("phone").eq("id", claims.sub).maybeSingle();
      const phone = (user?.phone as string | null) ?? null;
      const row = {
        user_id: claims.sub,
        number: generatePan(body.system),
        system: body.system,
        type: body.type,
        expiry: expiryFromNow(4),
        cvv: randomCvv(),
        pin: randomPin(),
        status: "active",
      };
      const { data, error } = await db.from("parent_cards").insert(row).select("*").single();
      if (error || !data) {
        return reply.code(500).send({ error: "issue_failed", message: "Не удалось выпустить карту" });
      }
      // Реквизиты новой карты сразу уходят родителю в Telegram.
      const autoSendOwn = async () => {
        try {
          if (!telegramEnabled()) return;
          const { data: me } = await db.from("users").select("phone").eq("id", claims.sub).maybeSingle();
          const chatId = me?.phone ? await telegramChatForPhone(db, me.phone as string) : null;
          if (!chatId) return;
          await sendTelegram(cardDetailsText(data), chatId);
        } catch (error) {
          console.error("[parent-cards] авто-отправка: " + (error as Error).message);
        }
      };
      void autoSendOwn();
      return reply.code(201).send({ card: toDto(data) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/me/cards/:cardId/details", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { cardId } = request.params as { cardId: string };
      const { data: card } = await db
        .from("parent_cards")
        .select("*")
        .eq("id", cardId)
        .eq("user_id", claims.sub)
        .maybeSingle();
      if (!card) {
        return reply.code(404).send({ error: "not_found", message: "Карта не найдена" });
      }
      if (!telegramEnabled()) {
        return reply.code(409).send({ error: "telegram_not_linked", message: "Привяжите Telegram" });
      }
      const { data: user } = await db.from("users").select("phone").eq("id", claims.sub).maybeSingle();
      const chatId = user?.phone ? await telegramChatForPhone(db, user.phone as string) : null;
      if (!chatId) {
        return reply.code(409).send({ error: "telegram_not_linked", message: "Привяжите Telegram" });
      }
      const text = [
        "💳 <b>Moby Family</b>: " + (card.type === "plastic" ? "Пластиковая карта" : "Виртуальная карта") + " · " + (SYSTEM_LABEL[card.system as string] ?? card.system) + " · " + toDto(card).masked,
        "CVV: <b>" + card.cvv + "</b>",
        "PIN: <b>" + card.pin + "</b>",
      ].join("\n");
      const sent = await sendTelegram(text, chatId);
      if (!sent) {
        return reply.code(502).send({ error: "telegram_failed", message: "Не удалось отправить, попробуйте ещё раз" });
      }
      console.log("[parent-cards] реквизиты карты отправлены в Telegram");
      return reply.send({ ok: true, sentTo: ["telegram"], message: "Отправлено в Telegram" });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
