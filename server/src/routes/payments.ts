import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { Env } from "../env.js";
import { hub } from "../hub.js";
import { badRequest, forbidden, requireAuth, sendError } from "../http.js";
import { notify, parentUserIdOfFamily } from "../repo.js";
import { telegramEnabled, telegramLink } from "../telegram.js";

type Kind = "erip" | "phone";

const TITLES: Record<Kind, { ru: string; be: string }> = {
  erip: { ru: "Платёж ЕРИП", be: "Платёж АРІП" },
  phone: { ru: "Перевод по номеру", be: "Пераклад па нумары" },
};

export function registerPaymentRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): void {
  /**
   * Ребёнок сам ничего не платит: он создаёт заявку, а деньги списывает родитель,
   * подтверждая её. Так работают и ЕРИП, и перевод по номеру телефона.
   */
  app.post("/children/:id/payments", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({
          kind: z.enum(["erip", "phone"]),
          amount: z.number().positive().max(10000),
          recipient: z.string().min(2).max(120),
        })
        .parse(request.body);

      const { data: child } = await db
        .from("children")
        .select("id, family_id, user_id")
        .eq("id", params.id)
        .maybeSingle();
      if (!child) {
        throw badRequest("Профиль ребёнка не найден");
      }
      if (claims.role === "child" && (claims.childId !== child.id || child.user_id !== claims.sub)) {
        throw forbidden("Доступен только свой профиль");
      }
      if (claims.role === "parent" && claims.familyId !== child.family_id) {
        throw forbidden("Профиль из другой семьи");
      }

      const { data: pocket } = await db
        .from("accounts")
        .select("balance")
        .eq("child_id", child.id)
        .eq("kind", "pocket")
        .maybeSingle();
      const balance = Number(pocket?.balance ?? 0);
      if (balance + 0.001 < body.amount) {
        throw badRequest("На карте недостаточно денег для этой заявки");
      }

      const title = TITLES[body.kind as Kind];
      const labelRu = title.ru + ": " + body.recipient;
      const labelBe = title.be + ": " + body.recipient;

      const { data: created } = await db
        .from("access_requests")
        .insert({
          child_id: child.id,
          target: "payment",
          kind: body.kind,
          amount: body.amount,
          recipient: body.recipient,
          label_ru: labelRu,
          label_be: labelBe,
        })
        .select("id")
        .single();

      const parentId = await parentUserIdOfFamily(db, child.family_id);
      if (parentId) {
        await notify(
          db,
          parentId,
          child.family_id,
          "payment_request",
          labelRu,
          labelBe,
          body.amount.toFixed(2) + " BYN · подтвердите или отклоните",
          body.amount.toFixed(2) + " BYN · пацвердзіце або адхіліце",
        );
      }
      await hub.publish(db, child.family_id, "request.created", {
        childId: child.id,
        requestId: created?.id ?? null,
        kind: body.kind,
      });

      return reply.send({ status: "pending", requestId: created?.id ?? null });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Личная ссылка на бота: человек жмёт Start один раз — и бот пишет ему сам. */
  app.get("/telegram/link", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const url = telegramLink(claims.sub);
      const { data: user } = await db
        .from("users")
        .select("telegram_chat_id")
        .eq("id", claims.sub)
        .maybeSingle();
      return reply.send({
        linked: Boolean(user?.telegram_chat_id),
        url,
        botReady: telegramEnabled(),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Регистрация устройства для push-уведомлений. */
  app.post("/push/token", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z
        .object({ token: z.string().min(8), platform: z.string().max(20).optional() })
        .parse(request.body);
      await db
        .from("push_tokens")
        .upsert(
          { user_id: claims.sub, token: body.token, platform: body.platform ?? "unknown", updated_at: new Date().toISOString() },
          { onConflict: "token" },
        );
      return reply.send({ ok: true });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
