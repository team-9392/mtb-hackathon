import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { hashSecret, issueSession, rotateRefresh, verifySecret } from "../auth.js";
import type { Env } from "../env.js";
import {
  badRequest,
  conflict,
  notFound,
  requireAuth,
  sendError,
  tooMany,
  unauthorized,
} from "../http.js";
import { createChallenge, normalizePhone, randomInviteCode, verifyChallenge } from "../otp.js";
import { checkRate } from "../ratelimit.js";
import { bootstrapChild } from "../repo.js";
import { isPackageComplete, type Bracket } from "../rules.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createTelegramLinkToken,
  telegramChatForPhone,
  telegramEnabled,
  telegramUsername,
} from "../telegram.js";

const phoneSchema = z.object({ phone: z.string().min(6) });

/** Лимиты запросов кода и ссылок привязки (один инстанс API -> in-memory Map). */
const TEN_MINUTES_MS = 10 * 60 * 1000;
const OTP_PER_IP = 10;
const LINK_PER_PHONE = 3;

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().min(4).max(8),
  deviceId: z.string().optional(),
  os: z.string().optional(),
});

const joinSchema = z.object({
  accessCode: z.string().min(4),
});

export function registerAuthRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): void {
  /** Запрос кода: только Telegram, без demoCode и без SMS-фолбэка. */
  app.post("/auth/otp/request", async (request, reply) => {
    try {
      const body = phoneSchema.parse(request.body);
      const phone = normalizePhone(body.phone);
      if (!/^\+375(29|33|44|25)\d{7}$/.test(phone)) {
        throw badRequest("Выберите код оператора 29, 33, 44 или 25 и введите 7 цифр номера");
      }

      const ipLimit = checkRate("otp:ip:" + request.ip, OTP_PER_IP, TEN_MINUTES_MS);
      if (!ipLimit.allowed) {
        reply.header("Retry-After", String(ipLimit.retryAfterSeconds));
        throw tooMany();
      }

      const challenge = await createChallenge(db, env, phone);
      return reply.send(challenge);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /**
   * Ссылка привязки Telegram до входа: номер остаётся на сервере,
   * в URL уходит только одноразовый криптостойкий токен (TTL 10 минут).
   */
  app.post("/auth/telegram/link", async (request, reply) => {
    try {
      const body = z.object({ phone: z.string().min(5) }).parse(request.body);
      const phone = normalizePhone(body.phone);
      if (!/^\+375(29|33|44|25)\d{7}$/.test(phone)) {
        throw badRequest("Выберите код оператора 29, 33, 44 или 25 и введите 7 цифр номера");
      }

      const botReady = telegramEnabled() && telegramUsername() !== null;
      if (!botReady) {
        return reply.send({ url: null, linked: false, botReady: false });
      }

      const chatId = await telegramChatForPhone(db, phone);
      if (chatId) {
        // Уже привязан: новая ссылка не нужна, приложение сразу запросит код.
        return reply.send({ url: null, linked: true, botReady: true });
      }

      const limit = checkRate("tg-link:phone:" + phone, LINK_PER_PHONE, TEN_MINUTES_MS);
      if (!limit.allowed) {
        reply.header("Retry-After", String(limit.retryAfterSeconds));
        throw tooMany();
      }

      const url = await createTelegramLinkToken(db, phone);
      return reply.send({ url, linked: false, botReady: Boolean(url) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    try {
      const body = verifySchema.parse(request.body);
      const result = await verifyChallenge(db, body.challengeId, body.code);
      if (!result.ok) {
        const messages: Record<string, string> = {
          not_found: "Код не найден, запросите новый",
          expired: "Код истёк, запросите новый",
          too_many_attempts: "Слишком много попыток, запросите новый код",
          wrong_code: "Неверный код",
        };
        return reply.status(400).send({ error: "otp_failed", message: messages[result.reason] });
      }

      const { data: existing } = await db
        .from("users")
        .select("id, phone, full_name, status")
        .eq("phone", result.phone)
        .maybeSingle();

      let userId = existing?.id as string | undefined;
      if (!userId) {
        const { data: created, error } = await db
          .from("users")
          .insert({ phone: result.phone })
          .select("id")
          .single();
        if (error || !created) {
          throw new Error("Не удалось создать пользователя: " + (error?.message ?? ""));
        }
        userId = created.id as string;
      }

      await db.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", userId);

      const session = await issueSession(db, env, userId, body.deviceId ?? null, body.os ?? null);
      const { data: user } = await db
        .from("users")
        .select("id, phone, full_name")
        .eq("id", userId)
        .single();

      return reply.send({ ...session, user, needsFamily: session.claims.familyId === null });
    } catch (error) {
      return sendError(reply, error);
    }
  });


  /** Подтверждение чувствительного действия кодом из Telegram — без новой сессии. */
  app.post("/me/confirm/request", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { data: user } = await db.from("users").select("phone").eq("id", claims.sub).maybeSingle();
      const phone = (user?.phone as string | null) ?? null;
      if (!phone) {
        return reply.code(400).send({ error: "no_phone", message: "Нет номера телефона" });
      }
      const challenge = await createChallenge(db, env, normalizePhone(phone));
      return reply.send({ challengeId: challenge.challengeId, ttlSeconds: challenge.ttlSeconds, channel: challenge.channel });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/me/confirm/verify", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z.object({ challengeId: z.string().uuid(), code: z.string().min(4).max(8) }).parse(request.body ?? {});
      const result = await verifyChallenge(db, body.challengeId, body.code);
      if (!result.ok) {
        const message = result.reason === "expired" ? "Код истёк — запросите новый" : result.reason === "too_many_attempts" ? "Слишком много попыток" : "Неверный код";
        return reply.code(400).send({ error: "wrong_code", message });
      }
      return reply.send({ ok: true, sub: claims.sub });
    } catch (error) {
      return sendError(reply, error);
    }
  });
  app.post("/auth/refresh", async (request, reply) => {
    try {
      const body = z.object({ refreshToken: z.string().min(10) }).parse(request.body);
      const rotated = await rotateRefresh(db, env, body.refreshToken);
      if (!rotated) {
        throw unauthorized("Сессия истекла, войдите по номеру заново");
      }
      return reply.send(rotated);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    try {
      const body = z.object({ refreshToken: z.string().min(10) }).parse(request.body);
      const { createHash } = await import("node:crypto");
      const hash = createHash("sha256").update(body.refreshToken).digest("hex");
      await db.from("sessions").update({ revoked_at: new Date().toISOString() }).eq("refresh_hash", hash);
      return reply.send({ ok: true });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /**
   * Родитель без семьи создаёт пакет «Фэмили»: имя, идентификационный номер
   * и ребёнок обязательны. Без ребёнка и без idNumber пакет не оформляется.
   */
  app.post("/auth/family", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z
        .object({
          fullName: z.string().max(60).optional(),
          idNumber: z.string().max(40).optional(),
          childName: z.string().max(40).optional(),
          bracket: z.enum(["child_7_13", "teen_14_17"]).optional(),
        })
        .parse(request.body ?? {});

      if (claims.familyId) {
        throw conflict("Семья уже создана");
      }

      // Гейтинг пакета: сначала идентификационный номер, затем ребёнок.
      const idNumber = (body.idNumber ?? "").trim().toUpperCase();
      if (!/^\d{7}[A-Z]\d{3}[A-Z]{2}\d$/.test(idNumber)) {
        throw badRequest("Проверьте идентификационный номер: 7 цифр, буква, 3 цифры, 2 буквы, цифра — например 5120609A014PB2");
      }
      const childName = (body.childName ?? "").trim();
      if (childName.length === 0) {
        throw badRequest("Добавьте ребёнка");
      }
      const fullName = (body.fullName ?? "").trim();
      const bracket = (body.bracket ?? "child_7_13") as Bracket;

      await db
        .from("users")
        .update({ id_number: idNumber, ...(fullName ? { full_name: fullName } : {}) })
        .eq("id", claims.sub);

      const { data: family, error } = await db
        .from("families")
        .insert({ owner_user_id: claims.sub, invite_code: randomInviteCode() })
        .select("id, invite_code, tariff, currency")
        .single();
      if (error || !family) {
        throw new Error("Не удалось создать семью: " + (error?.message ?? ""));
      }

      let child;
      try {
        const { error: memberError } = await db
          .from("family_members")
          .insert({ family_id: family.id, user_id: claims.sub, role: "parent", status: "active" });
        if (memberError) {
          throw new Error("Не удалось добавить родителя: " + memberError.message);
        }

        const { data: createdChild, error: childError } = await db
          .from("children")
          .insert({
            family_id: family.id,
            name: childName,
            bracket,
            access_code: randomInviteCode(),
          })
          .select("id, name, bracket, points, access_granted, access_code")
          .single();
        if (childError || !createdChild) {
          throw new Error("Не удалось добавить ребёнка: " + (childError?.message ?? ""));
        }
        child = createdChild;
        await bootstrapChild(db, child.id as string, bracket);
      } catch (error) {
        // Пакет без ребёнка не должен оставаться полуоформленным.
        await db.from("families").delete().eq("id", family.id);
        throw error;
      }

      const session = await issueSession(db, env, claims.sub, null, null);
      return reply.send({ family, child, packageComplete: true, ...session });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Ребёнок входит своим номером и кодом доступа, который выдал родитель. */
  app.post("/auth/join", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = joinSchema.parse(request.body);
      const { data: child } = await db
        .from("children")
        .select("id, family_id, name, user_id, bracket")
        .eq("access_code", body.accessCode.trim().toUpperCase())
        .maybeSingle();

      if (!child) {
        throw notFound("Код доступа не найден");
      }
      if (child.user_id && child.user_id !== claims.sub) {
        throw conflict("Этот профиль уже привязан к другому номеру");
      }

      await db.from("children").update({ user_id: claims.sub }).eq("id", child.id);
      const { data: membership } = await db
        .from("family_members")
        .select("id")
        .eq("family_id", child.family_id)
        .eq("user_id", claims.sub)
        .maybeSingle();

      if (!membership) {
        await db
          .from("family_members")
          .insert({ family_id: child.family_id, user_id: claims.sub, role: "child", status: "active" });
      }

      const session = await issueSession(db, env, claims.sub, null, null);
      return reply.send({ child, ...session });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/me", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { data } = await db
        .from("users")
        .select("phone, full_name, id_number")
        .eq("id", claims.sub)
        .maybeSingle();
      const row = (data ?? {}) as { phone?: string; full_name?: string | null; id_number?: string | null };
      const idNumber = row.id_number ?? null;

      // Признак «пакет оформлен»: тариф family + есть ребёнок + есть idNumber.
      let family: { id: string; tariff: string; invite_code: string } | null = null;
      let childCount = 0;
      if (claims.familyId) {
        const [familyRes, childrenRes] = await Promise.all([
          db
            .from("families")
            .select("id, tariff, invite_code")
            .eq("id", claims.familyId)
            .maybeSingle(),
          db.from("children").select("id").eq("family_id", claims.familyId),
        ]);
        family = (familyRes.data as { id: string; tariff: string; invite_code: string } | null) ?? null;
        childCount = (childrenRes.data ?? []).length;
      }
      const packageComplete = isPackageComplete(family?.tariff, childCount, idNumber);

      return reply.send({
        user: {
          id: claims.sub,
          phone: row.phone ?? "",
          fullName: row.full_name ?? null,
          idNumber,
          role: claims.role,
          packageComplete,
        },
        family,
        claims,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/me", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z
        .object({
          fullName: z.string().max(60).optional(),
          idNumber: z.string().max(40).optional(),
        })
        .parse(request.body ?? {});

      const patch: Record<string, string> = {};
      if (body.fullName !== undefined) {
        const value = body.fullName.trim();
        if (value.length === 0) {
          throw badRequest("Укажите имя и фамилию");
        }
        patch.full_name = value;
      }
      if (body.idNumber !== undefined) {
        const value = body.idNumber.trim().toUpperCase();
        if (!/^\d{7}[A-Z]\d{3}[A-Z]{2}\d$/.test(value)) {
          throw badRequest("Проверьте идентификационный номер: 7 цифр, буква, 3 цифры, 2 буквы, цифра — например 5120609A014PB2");
        }
        if (value.length === 0) {
          throw badRequest("Укажите идентификационный номер");
        }
        patch.id_number = value;
      }
      if (Object.keys(patch).length === 0) {
        throw badRequest("Передайте имя или идентификационный номер");
      }

      const { data, error } = await db
        .from("users")
        .update(patch)
        .eq("id", claims.sub)
        .select("id, phone, full_name, id_number")
        .maybeSingle();
      if (error) {
        throw new Error("Не удалось сохранить профиль: " + error.message);
      }
      // Токен мог остаться от аккаунта, который уже удалён (переустановка, очистка базы).
      if (!data) {
        return reply.code(401).send({ error: "session_stale", message: "Сессия устарела — войдите заново" });
      }
      return reply.send({
        user: {
          id: data.id,
          phone: data.phone,
          fullName: data.full_name,
          idNumber: data.id_number,
          role: claims.role,
        },
        claims,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/auth/app-code", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z.object({ code: z.string().regex(/^[0-9]{4,6}$/) }).parse(request.body);
      await db
        .from("app_codes")
        .upsert({ user_id: claims.sub, code_hash: hashSecret(body.code), failed_count: 0, locked_until: null });
      return reply.send({ ok: true });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/auth/app-code/verify", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z.object({ code: z.string().min(4).max(6) }).parse(request.body);
      const { data: stored } = await db
        .from("app_codes")
        .select("code_hash, failed_count, locked_until")
        .eq("user_id", claims.sub)
        .maybeSingle();

      if (!stored) {
        throw notFound("Код приложения не задан");
      }
      if (stored.locked_until && new Date(stored.locked_until as string).getTime() > Date.now()) {
        throw unauthorized("Вход временно заблокирован, попробуйте позже");
      }
      if (!verifySecret(body.code, stored.code_hash as string)) {
        const failed = (stored.failed_count as number) + 1;
        await db
          .from("app_codes")
          .update({
            failed_count: failed,
            locked_until: failed >= 3 ? new Date(Date.now() + 60_000).toISOString() : null,
          })
          .eq("user_id", claims.sub);
        throw unauthorized("Неверный код");
      }
      await db.from("app_codes").update({ failed_count: 0, locked_until: null }).eq("user_id", claims.sub);
      return reply.send({ ok: true });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}