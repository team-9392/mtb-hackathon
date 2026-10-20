import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { hashSecret, issueSession, rotateRefresh, verifySecret } from "../auth.js";
import type { Env } from "../env.js";
import { badRequest, conflict, notFound, requireAuth, sendError, unauthorized } from "../http.js";
import { createChallenge, normalizePhone, randomInviteCode, verifyChallenge } from "../otp.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { telegramChatForPhone, telegramEnabled, telegramOtpLink } from "../telegram.js";

const phoneSchema = z.object({ phone: z.string().min(6) });

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
  app.post("/auth/otp/request", async (request, reply) => {
    try {
      const body = phoneSchema.parse(request.body);
      const phone = normalizePhone(body.phone);
      if (phone.length < 12) {
        throw badRequest("Проверьте номер телефона");
      }
      const challenge = await createChallenge(db, env, phone);
      return reply.send(challenge);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Привязка Telegram до входа: номер -> чат, код придёт в бот. */
  app.post("/auth/telegram/link", async (request, reply) => {
    try {
      const body = z.object({ phone: z.string().min(5) }).parse(request.body);
      const phone = normalizePhone(body.phone);
      const url = telegramOtpLink(phone);
      const chatId = url ? await telegramChatForPhone(db, phone) : null;
      return reply.send({ url, linked: Boolean(chatId), botReady: telegramEnabled() });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    try {
      const body = verifySchema.parse(request.body);
      const result = await verifyChallenge(db, env, body.challengeId, body.code);
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

  /** Родитель без семьи создаёт пакет «Фэмили» и получает код приглашения. */
  app.post("/auth/family", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z.object({ fullName: z.string().max(60).optional() }).parse(request.body ?? {});
      if (claims.familyId) {
        throw conflict("Семья уже создана");
      }
      // Имя могло уже сохраниться на предыдущем шаге — пустое значение не ошибка.
      if (body.fullName && body.fullName.trim().length > 0) {
        await db.from("users").update({ full_name: body.fullName.trim() }).eq("id", claims.sub);
      }
      const { data: family, error } = await db
        .from("families")
        .insert({ owner_user_id: claims.sub, invite_code: randomInviteCode() })
        .select("id, invite_code, tariff, currency")
        .single();
      if (error || !family) {
        throw new Error("Не удалось создать семью: " + (error?.message ?? ""));
      }
      await db
        .from("family_members")
        .insert({ family_id: family.id, user_id: claims.sub, role: "parent", status: "active" });
      const session = await issueSession(db, env, claims.sub, null, null);
      return reply.send({ family, ...session });
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
      const { data } = await db.from("users").select("phone, full_name").eq("id", claims.sub).maybeSingle();
      const row = (data ?? {}) as { phone?: string; full_name?: string | null };
      return reply.send({
        user: {
          id: claims.sub,
          phone: row.phone ?? "",
          fullName: row.full_name ?? null,
          role: claims.role,
        },
        claims,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/me", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z.object({ fullName: z.string().min(1).max(60) }).parse(request.body);
      const { data, error } = await db
        .from("users")
        .update({ full_name: body.fullName.trim() })
        .eq("id", claims.sub)
        .select("id, phone, full_name")
        .maybeSingle();
      if (error) {
        throw new Error("Не удалось сохранить имя: " + error.message);
      }
      // Токен мог остаться от аккаунта, который уже удалён (переустановка, очистка базы).
      if (!data) {
        return reply.code(401).send({ error: "session_stale", message: "Сессия устарела — войдите заново" });
      }
      return reply.send({
        user: { id: data.id, phone: data.phone, fullName: data.full_name, role: claims.role },
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
