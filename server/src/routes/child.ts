import { runFraudCheck } from "./ai.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { Env } from "../env.js";
import { hub } from "../hub.js";
import { badRequest, conflict, forbidden, requireAuth, sendError } from "../http.js";
import { parentUserIdOfFamily } from "../repo.js";
import { DECLINE_MESSAGE, decidePayment, spentThisMonth, type OperationId } from "../rules.js";

const OPERATIONS = ["pay", "online", "transfer", "cash"] as const;

interface ChildRef {
  id: string;
  family_id: string;
  user_id: string | null;
  bracket: "child_7_13" | "teen_14_17";
  name: string;
  points: number;
}

async function loadChild(db: SupabaseClient, childId: string): Promise<ChildRef> {
  const { data } = await db
    .from("children")
    .select("id, family_id, user_id, bracket, name, points")
    .eq("id", childId)
    .maybeSingle();
  if (!data) {
    throw badRequest("Профиль ребёнка не найден");
  }
  return data as unknown as ChildRef;
}

/** Ребёнок работает только со своим профилем, родитель – с профилем своей семьи. */
function assertChildAccess(
  claims: { sub: string; familyId: string | null; role: string; childId: string | null },
  child: ChildRef,
): void {
  if (claims.role === "child") {
    if (claims.childId !== child.id || child.user_id !== claims.sub) {
      throw forbidden("Доступен только свой профиль");
    }
    return;
  }
  if (claims.familyId !== child.family_id) {
    throw forbidden("Профиль из другой семьи");
  }
}

export function registerChildRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): void {
  app.get("/children/:id/transactions", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);
      const { data } = await db
        .from("transactions")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return reply.send({ transactions: data ?? [] });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /**
   * Оплата. Решение принимает сервер: жёсткие категории, лимиты и выключенные
   * родителем операции отсекаются здесь, даже если клиент подделан.
   */
  app.post("/children/:id/transactions", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({
          amount: z.number().positive().max(100000),
          category: z.string().min(1),
          operation: z.enum(OPERATIONS).default("pay"),
          merchant: z.string().optional(),
          titleRu: z.string().min(1),
          titleBe: z.string().min(1),
        })
        .parse(request.body);

      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);

      const [limitsRes, opsRes, txnsRes, accountsRes] = await Promise.all([
        db.from("limits").select("monthly, per_txn").eq("child_id", child.id).maybeSingle(),
        db.from("operation_permissions").select("operation_id, allowed").eq("child_id", child.id),
        db.from("transactions").select("amount, status, by_child, created_at").eq("child_id", child.id).limit(200),
        db.from("accounts").select("id, kind, balance").eq("child_id", child.id),
      ]);

      const monthlyLimit = Number(limitsRes.data?.monthly ?? 0);
      const perTxnLimit = Number(limitsRes.data?.per_txn ?? 0);
      const operationAllowed =
        (opsRes.data ?? []).find((row) => row.operation_id === body.operation)?.allowed === true;

      const spent = spentThisMonth(
        (txnsRes.data ?? []).map((row) => ({
          amount: Number(row.amount),
          status: row.status as string,
          byChild: row.by_child as boolean,
          createdAt: row.created_at as string,
        })),
      );

      const decision = decidePayment({
        bracket: child.bracket,
        category: body.category,
        amount: body.amount,
        operation: body.operation as OperationId,
        monthlyLimit,
        perTxnLimit,
        spentThisMonth: spent,
        operationAllowed,
      });

      // Платим первой (самой ранней) картой; заблокирована ли она – решает статус.
      const { data: card } = await db
        .from("cards")
        .select("id, status")
        .eq("child_id", child.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      let status: "approved" | "declined" = decision.status;
      let reason: string | null = decision.status === "declined" ? decision.reason : null;

      if (status === "approved" && card?.status === "blocked") {
        status = "declined";
        reason = "card_blocked";
      }

      if (status === "approved") {
        const pocket = (accountsRes.data ?? []).find((row) => row.kind === "pocket");
        const balance = Number(pocket?.balance ?? 0);
        if (pocket && balance < body.amount) {
          status = "declined";
          reason = "insufficient_funds";
        } else if (pocket) {
          await db.from("accounts").update({ balance: balance - body.amount }).eq("id", pocket.id);
        }
      }

      const localized =
        reason && reason in DECLINE_MESSAGE
          ? DECLINE_MESSAGE[reason as keyof typeof DECLINE_MESSAGE]
          : null;

      const { data: txn, error } = await db
        .from("transactions")
        .insert({
          child_id: child.id,
          card_id: card?.id ?? null,
          amount: -Math.abs(body.amount),
          category: body.category,
          merchant: body.merchant ?? null,
          title_ru: body.titleRu,
          title_be: body.titleBe,
          status,
          decline_reason: reason,
          by_child: true,
        })
        .select("*")
        .single();

      if (error || !txn) {
        throw new Error("Не удалось сохранить операцию: " + (error?.message ?? ""));
      }

      // ИИ-антифрод: обезличенная проверка операции, при риске родителю придёт алерт.
      if (status === "approved") {
        void runFraudCheck(db, env, child.id, { amount: Math.abs(body.amount), category: body.category, titleRu: body.titleRu, status });
      }

      if (status === "declined" && child.user_id && localized) {
        await db.from("notifications").insert({
          user_id: child.user_id,
          family_id: child.family_id,
          kind: "txn_declined",
          title_ru: "Операция отклонена",
          title_be: "Аперацыя адхілена",
          body_ru: localized.ru,
          body_be: localized.be,
        });
      }

      const parentId = await parentUserIdOfFamily(db, child.family_id);
      if (parentId && status === "declined") {
        await db.from("notifications").insert({
          user_id: parentId,
          family_id: child.family_id,
          kind: "txn_declined",
          title_ru: "Попытка операции у " + child.name,
          title_be: "Спроба аперацыі ў " + child.name,
          body_ru: body.titleRu,
          body_be: body.titleBe,
        });
      }

      await hub.publish(db, child.family_id, "txn.created", {
        childId: child.id,
        status,
        reason,
        amount: body.amount,
        titleRu: body.titleRu,
      });

      return reply.status(status === "approved" ? 201 : 200).send({
        transaction: txn,
        status,
        reason,
        message: localized,
        spentThisMonth: status === "approved" ? spent + Math.abs(body.amount) : spent,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/children/:id/requests", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({ target: z.string().min(1), labelRu: z.string().min(1), labelBe: z.string().min(1) })
        .parse(request.body);
      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);

      const { data: requestRow, error } = await db
        .from("access_requests")
        .insert({
          child_id: child.id,
          target: body.target,
          label_ru: body.labelRu,
          label_be: body.labelBe,
          status: "pending",
        })
        .select("*")
        .single();

      if (error || !requestRow) {
        throw new Error("Не удалось создать запрос: " + (error?.message ?? ""));
      }

      if (body.target !== "limit") {
        await db
          .from("permissions")
          .update({ pending_request: true })
          .eq("child_id", child.id)
          .eq("product_id", body.target);
      }

      const parentId = await parentUserIdOfFamily(db, child.family_id);
      if (parentId) {
        await db.from("notifications").insert({
          user_id: parentId,
          family_id: child.family_id,
          kind: "request_created",
          title_ru: child.name + " просит доступ",
          title_be: child.name + " просіць доступ",
          body_ru: body.labelRu,
          body_be: body.labelBe,
        });
      }

      await hub.publish(db, child.family_id, "request.created", {
        childId: child.id,
        requestId: requestRow.id,
        target: body.target,
        labelRu: body.labelRu,
        labelBe: body.labelBe,
      });

      return reply.status(201).send({ request: requestRow });
    } catch (error) {
      return sendError(reply, error);
    }
  });


  /** Создать копилку (цель) ребёнку: может и родитель, и сам ребёнок. */
  app.post("/children/:id/goals", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({ title: z.string().min(2).max(60), target: z.number().positive().max(100000), emoji: z.string().max(4).optional() })
        .parse(request.body);
      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);
      const { data, error } = await db
        .from("goals")
        .insert({
          child_id: child.id,
          title_ru: body.title.trim(),
          title_be: body.title.trim(),
          emoji: body.emoji ?? "🎯",
          target: body.target,
          saved: 0,
          status: "active",
        })
        .select("id, title_ru, target, saved")
        .single();
      if (error || !data) {
        return reply.code(500).send({ error: "create_failed", message: "Не удалось создать копилку" });
      }
      return reply.code(201).send({ goal: data });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Изменить цель копилки. */
  app.patch("/children/:id/goals/:goalId", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid(), goalId: z.string().uuid() }).parse(request.params);
      const body = z
        .object({ title: z.string().min(2).max(60).optional(), target: z.number().positive().max(100000).optional() })
        .parse(request.body);
      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);
      const patch: Record<string, string | number> = {};
      if (body.title) {
        patch.title_ru = body.title.trim();
        patch.title_be = body.title.trim();
      }
      if (body.target) {
        patch.target = body.target;
      }
      if (Object.keys(patch).length === 0) {
        return reply.code(400).send({ error: "empty", message: "Нечего менять" });
      }
      const { data, error } = await db
        .from("goals")
        .update(patch)
        .eq("id", params.goalId)
        .eq("child_id", child.id)
        .select("id, title_ru, target, saved")
        .single();
      if (error || !data) {
        return reply.code(404).send({ error: "not_found", message: "Копилка не найдена" });
      }
      return reply.send({ goal: data });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/children/:id/goals/:goalId/deposit", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid(), goalId: z.string().uuid() }).parse(request.params);
      const body = z.object({ amount: z.number().positive().max(10000) }).parse(request.body);
      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);

      const { data: goal } = await db
        .from("goals")
        .select("id, saved, target, title_ru")
        .eq("id", params.goalId)
        .eq("child_id", child.id)
        .maybeSingle();
      if (!goal) {
        throw conflict("Цель не найдена");
      }

      // Родитель пополняет копилку со своей карты: карман ребёнка не трогаем.
      const isParentFunding = claims.role === "parent";
      const { data: pocket } = await db
        .from("accounts")
        .select("id, balance")
        .eq("child_id", child.id)
        .eq("kind", "pocket")
        .maybeSingle();
      const balance = Number(pocket?.balance ?? 0);
      if (!isParentFunding) {
        if (!pocket || balance < body.amount) {
          throw conflict("На карте недостаточно средств");
        }
      }

      const saved = Number(goal.saved) + body.amount;
      if (!isParentFunding && pocket) {
        await db.from("accounts").update({ balance: balance - body.amount }).eq("id", pocket.id);
      }
      await db
        .from("goals")
        .update({ saved, status: saved >= Number(goal.target) ? "achieved" : "active" })
        .eq("id", goal.id);

      if (isParentFunding) {
        await db.from("transactions").insert({
          child_id: child.id,
          amount: body.amount,
          category: "goal_topup",
          merchant: null,
          title_ru: "Пополнение копилки от родителя",
          title_be: "Папаўненне скарбонкі ад бацькі",
          status: "approved",
          by_child: false,
        });
        if (child.user_id) {
          const parentId = await parentUserIdOfFamily(db, child.family_id);
          void parentId;
          await db.from("notifications").insert({
            user_id: child.user_id,
            family_id: child.family_id,
            kind: "reward",
            title_ru: "Копилка пополнена",
            title_be: "Скарбонка папоўнена",
            body_ru: "+" + body.amount + " BYN в копилку «" + (goal.title_ru ?? "Цель") + "»",
            body_be: "+" + body.amount + " BYN у скарбонку",
          });
        }
      }

      await hub.publish(db, child.family_id, "txn.created", {
        childId: child.id,
        goalId: goal.id,
        saved,
        amount: body.amount,
      });

      return reply.send({ ok: true, saved });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/notifications", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { data } = await db
        .from("notifications")
        .select("*")
        .eq("user_id", claims.sub)
        .order("created_at", { ascending: false })
        .limit(50);
      return reply.send({ notifications: data ?? [] });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/notifications/:id/read", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      await db
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", params.id)
        .eq("user_id", claims.sub);
      return reply.send({ ok: true });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Догон событий после обрыва связи: клиент присылает последний известный id. */
  app.get("/events", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      if (!claims.familyId) {
        return reply.send({ events: [] });
      }
      const query = z.object({ since: z.coerce.number().default(0) }).parse(request.query);
      const { data } = await db
        .from("realtime_events")
        .select("id, topic, payload, created_at")
        .eq("family_id", claims.familyId)
        .gt("id", query.since)
        .order("id", { ascending: true })
        .limit(100);
      return reply.send({ events: data ?? [] });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}