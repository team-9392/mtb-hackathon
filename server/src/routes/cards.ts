import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  CARD_SYSTEMS,
  CARD_TYPES,
  cardDetailsMessage,
  cardView,
  expiryFromNow,
  generateCvv,
  generatePan,
  generatePin,
  maskPan,
  type CardRow,
} from "../cards.js";
import type { AuthClaims } from "../auth.js";
import type { Env } from "../env.js";
import { hub } from "../hub.js";
import {
  ApiError,
  forbidden,
  notFound,
  requireAuth,
  requireParent,
  sendError,
  tooMany,
} from "../http.js";
import { checkRate } from "../ratelimit.js";
import { getChild, parentUserIdOfFamily, type ChildRow } from "../repo.js";
import { sendTelegram, telegramChatForPhone } from "../telegram.js";

const childParams = z.object({ id: z.string().uuid() });
const cardParams = z.object({ id: z.string().uuid(), cardId: z.string().uuid() });

/** Выпуск новой карты: тип и система обязательны, дефолтов нет. */
const issueSchema = z.object({ type: z.enum(CARD_TYPES), system: z.enum(CARD_SYSTEMS) });

/** Legacy-выпуск сохраняет старые дефолты: клиент мог не передать тело вообще. */
const legacyIssueSchema = z.object({
  type: z.enum(CARD_TYPES).default("virtual"),
  system: z.enum(CARD_SYSTEMS).default("visa"),
});

const blockSchema = z.object({ blocked: z.boolean() });

/**
 * Ребёнок видит только свой профиль, родитель — профили своей семьи.
 * Для выпуска и блокировки отдельно требуем роль родителя.
 */
async function childForRead(
  db: SupabaseClient,
  claims: AuthClaims,
  childId: string,
): Promise<ChildRow> {
  const { data } = await db
    .from("children")
    .select("id, family_id, user_id, name, bracket, points, access_granted, access_code")
    .eq("id", childId)
    .maybeSingle();
  if (!data) {
    throw notFound("Ребёнок не найден");
  }
  if (claims.role === "child") {
    if (claims.childId !== data.id || data.user_id !== claims.sub) {
      throw forbidden("Это профиль другого ребёнка");
    }
    return data as unknown as ChildRow;
  }
  if (data.family_id !== requireParent(claims)) {
    throw forbidden("Профиль из другой семьи");
  }
  return data as unknown as ChildRow;
}

/** Первая (самая ранняя) карта ребёнка — для legacy-эндпоинтов. */
async function firstCard(db: SupabaseClient, childId: string): Promise<CardRow | null> {
  const { data } = await db
    .from("cards")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as unknown as CardRow) ?? null;
}

async function allCards(db: SupabaseClient, childId: string): Promise<CardRow[]> {
  const { data } = await db
    .from("cards")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as CardRow[];
}

/** Новая карта: PAN по Луну, срок 4 года, CVV/PIN — демо-хранение в БД. */
async function insertCard(
  db: SupabaseClient,
  childId: string,
  type: string,
  system: string,
): Promise<CardRow> {
  const pan = generatePan(system as never);
  const { data, error } = await db
    .from("cards")
    .insert({
      child_id: childId,
      last4: pan.slice(-4),
      number: pan,
      system,
      type,
      expiry: expiryFromNow(),
      cvv: generateCvv(),
      pin: generatePin(),
      status: "issued",
      issued_at: new Date().toISOString(),
      blocked_at: null,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error("Не удалось выпустить карту: " + (error?.message ?? ""));
  }
  return data as unknown as CardRow;
}


/** После выпуска сразу отправляем CVV и PIN родителю в Telegram (и ребёнку, если привязан). */

/** Чаты пользователей: сначала привязка по номеру (telegram_bindings), потом users.telegram_chat_id. */
async function resolveChats(db: SupabaseClient, ids: string[]): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }
  const { data: users } = await db.from("users").select("id, phone, telegram_chat_id").in("id", ids);
  const chats = new Set<string>();
  for (const row of users ?? []) {
    const direct = row.telegram_chat_id as string | null;
    if (direct) {
      chats.add(direct);
      continue;
    }
    const phone = row.phone as string | null;
    if (phone) {
      const chatId = await telegramChatForPhone(db, phone);
      if (chatId) {
        chats.add(chatId);
      }
    }
  }
  return Array.from(chats);
}

async function autoSendCardDetails(
  db: SupabaseClient,
  childId: string,
  card: CardRow,
): Promise<void> {
  try {
    if (!card.cvv || !card.pin) {
      return;
    }
    const { data: childRow } = await db
      .from("children")
      .select("id, family_id, user_id")
      .eq("id", childId)
      .maybeSingle();
    if (!childRow?.family_id) {
      return;
    }
    const parentId = await parentUserIdOfFamily(db, childRow.family_id as string);
    const ids = Array.from(
      new Set([parentId, childRow.user_id as string | null].filter((value): value is string => Boolean(value))),
    );
    const chats = await resolveChats(db, ids);
    const text = cardDetailsMessage({
      type: card.type,
      system: card.system,
      last4: card.last4,
      cvv: card.cvv,
      pin: card.pin,
    });
    for (const chatId of chats) {
      await sendTelegram(text, chatId);
    }
  } catch (error) {
    console.error("[cards] авто-отправка реквизитов: " + (error as Error).message);
  }
}

function sameCard(card: CardRow, type: string, system: string): boolean {
  return card.type === type && card.system === system;
}

export function registerCardRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): void {
  /** Все карты ребёнка. number отдаём только родителю и самому ребёнку. */
  app.get("/children/:id/cards", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = childParams.parse(request.params);
      const child = await childForRead(db, claims, params.id);
      const cards = await allCards(db, child.id);
      return reply.send({ childId: child.id, card: cards[0] ? cardView(cards[0]) : null, cards: cards.map(cardView) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Выпустить ещё одну карту. Первый выпуск и повторный — один и тот же путь. */
  app.post("/children/:id/cards", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = childParams.parse(request.params);
      const body = issueSchema.parse(request.body ?? {});
      const child = await getChild(db, params.id, familyId);

      // Повторный тап не должен плодить дубли: та же пара тип+система — та же карта.
      const existing = (await allCards(db, child.id)).find((card) => sameCard(card, body.type, body.system));
      if (existing) {
        return reply.send({ card: cardView(existing), reused: true });
      }

      const card = await insertCard(db, child.id, body.type, body.system);
      void autoSendCardDetails(db, child.id, card);
      await hub.publish(db, familyId, "permission.updated", {
        childId: child.id,
        cardIssued: true,
        cardId: card.id,
        system: card.system,
        type: card.type,
      });
      return reply.status(201).send({ card: cardView(card) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Блокировка/разблокировка конкретной карты. */
  app.patch("/children/:id/cards/:cardId", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = cardParams.parse(request.params);
      const body = blockSchema.parse(request.body ?? {});
      const child = await getChild(db, params.id, familyId);

      const { data: existing } = await db
        .from("cards")
        .select("id")
        .eq("id", params.cardId)
        .eq("child_id", child.id)
        .maybeSingle();
      if (!existing) {
        throw notFound("Карта не найдена");
      }

      const { data: updated, error } = await db
        .from("cards")
        .update({
          status: body.blocked ? "blocked" : "issued",
          blocked_at: body.blocked ? new Date().toISOString() : null,
        })
        .eq("id", params.cardId)
        .eq("child_id", child.id)
        .select("*")
        .single();
      if (error || !updated) {
        throw new Error("Не удалось обновить карту: " + (error?.message ?? ""));
      }

      await hub.publish(db, familyId, body.blocked ? "card.blocked" : "card.unblocked", {
        childId: child.id,
        cardId: params.cardId,
      });
      return reply.send({ ok: true, blocked: body.blocked, card: cardView(updated as unknown as CardRow) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /**
   * Реквизиты (CVV/PIN) — только в Telegram родителю и привязанному ребёнку.
   * В ответе API секретов нет: их не должен увидеть ни лог, ни клиентский кэш.
   */
  app.post("/children/:id/cards/:cardId/details", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = cardParams.parse(request.params);

      // Не больше 3 отправок реквизитов за 10 минут на пользователя.
      const limit = checkRate("card-details:" + claims.sub, 3, 10 * 60 * 1000);
      if (!limit.allowed) {
        throw tooMany();
      }

      const child = await childForRead(db, claims, params.id);

      const { data: stored } = await db
        .from("cards")
        .select("*")
        .eq("id", params.cardId)
        .eq("child_id", child.id)
        .maybeSingle();
      if (!stored) {
        throw notFound("Карта не найдена");
      }
      let card = stored as unknown as CardRow;

      // Старые карты выпущены до 0011 — секреты досоздаём при первом запросе.
      if (!card.cvv || !card.pin) {
        const cvv = card.cvv ?? generateCvv();
        const pin = card.pin ?? generatePin();
        const { data: patched } = await db
          .from("cards")
          .update({ cvv, pin })
          .eq("id", card.id)
          .select("*")
          .single();
        if (patched) {
          card = patched as unknown as CardRow;
        } else {
          card = { ...card, cvv, pin };
        }
      }

      const parentId = await parentUserIdOfFamily(db, child.family_id);
      const userIds = Array.from(
        new Set([parentId, child.user_id].filter((value): value is string => Boolean(value))),
      );
      const chats = await resolveChats(db, userIds);
      if (chats.length === 0) {
        throw new ApiError(409, "telegram_not_linked", "Сначала привяжите Telegram");
      }

      const text = cardDetailsMessage({
        type: card.type,
        system: card.system,
        last4: card.last4,
        cvv: card.cvv as string,
        pin: card.pin as string,
      });
      let sent = 0;
      for (const chatId of chats) {
        if (await sendTelegram(text, chatId)) {
          sent += 1;
        }
      }
      if (sent === 0) {
        throw new ApiError(502, "telegram_failed", "Не удалось отправить в Telegram — попробуйте позже");
      }

      // В лог пишем только факт отправки, без CVV/PIN.
      request.log.info(
        {
          childId: child.id,
          cardId: card.id,
          card: maskPan(card.last4),
          recipients: chats.length,
          sent,
        },
        "[cards] реквизиты карты отправлены в Telegram",
      );
      return reply.send({ ok: true, sentTo: ["telegram"], message: "Отправлено в Telegram" });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /**
   * Legacy: POST /children/:id/card — выпуск/перевыпуск ПЕРВОЙ карты.
   * Повторный вызов с той же парой тип+система сохраняет номер и секреты.
   */
  app.post("/children/:id/card", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = childParams.parse(request.params);
      const body = legacyIssueSchema.parse(request.body ?? {});
      const child = await getChild(db, params.id, familyId);
      const current = await firstCard(db, child.id);

      if (!current) {
        const card = await insertCard(db, child.id, body.type, body.system);
        void autoSendCardDetails(db, child.id, card);
        await hub.publish(db, familyId, "permission.updated", { childId: child.id, cardIssued: true, cardId: card.id });
        return reply.status(201).send({ card: cardView(card) });
      }

      const keep = sameCard(current, body.type, body.system) && Boolean(current.number);
      const pan = keep ? (current.number as string) : generatePan(body.system);
      const payload = {
        last4: pan.slice(-4),
        number: pan,
        system: body.system,
        type: body.type,
        expiry: keep && current.expiry ? current.expiry : expiryFromNow(),
        cvv: keep && current.cvv ? current.cvv : generateCvv(),
        pin: keep && current.pin ? current.pin : generatePin(),
        status: "issued",
        issued_at: new Date().toISOString(),
        blocked_at: null,
      };
      const { data: card, error } = await db
        .from("cards")
        .update(payload)
        .eq("id", current.id)
        .select("*")
        .single();
      if (error || !card) {
        throw new Error("Не удалось выпустить карту: " + (error?.message ?? ""));
      }
      await hub.publish(db, familyId, "permission.updated", { childId: child.id, cardIssued: true, cardId: current.id });
      return reply.status(201).send({ card: cardView(card as unknown as CardRow) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Legacy: PATCH /children/:id/card — блокирует/разблокирует все карты ребёнка. */
  app.patch("/children/:id/card", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = childParams.parse(request.params);
      const body = blockSchema.parse(request.body ?? {});
      const child = await getChild(db, params.id, familyId);

      await db
        .from("cards")
        .update({
          status: body.blocked ? "blocked" : "issued",
          blocked_at: body.blocked ? new Date().toISOString() : null,
        })
        .eq("child_id", child.id);

      await hub.publish(db, familyId, body.blocked ? "card.blocked" : "card.unblocked", { childId: child.id });
      const cards = await allCards(db, child.id);
      return reply.send({ ok: true, blocked: body.blocked, cards: cards.map(cardView) });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
