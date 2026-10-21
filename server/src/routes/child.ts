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

/** Ребёнок работает только со своим профилем, родитель — с профилем своей семьи. */
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

      const [limitsRes, opsRes, txnsRes, accountsRes, cardRes] = await Promise.all([
        db.from("limits").select("monthly, per_txn").eq("child_id", child.id).maybeSingle(),
        db.from("operation_permissions").select("operation_id, allowed").eq("child_id", child.id),
        db.from("transactions").select("amount, status, by_child, created_at").eq("child_id", child.id).limit(200),
        db.from("accounts").select("id, kind, balance").eq("child_id", child.id),
        db.from("cards").select("status").eq("child_id", child.id).maybeSingle(),
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

      const { data: card } = await db
        .from("cards")
        .select("id, status")
        .eq("child_id", child.id)
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

      const { data: pocket } = await db
        .from("accounts")
        .select("id, balance")
        .eq("child_id", child.id)
        .eq("kind", "pocket")
        .maybeSingle();
      const balance = Number(pocket?.balance ?? 0);
      if (!pocket || balance < body.amount) {
        throw conflict("На карте недостаточно средств");
      }

      const saved = Number(goal.saved) + body.amount;
      await db.from("accounts").update({ balance: balance - body.amount }).eq("id", pocket.id);
      await db
        .from("goals")
        .update({ saved, status: saved >= Number(goal.target) ? "achieved" : "active" })
        .eq("id", goal.id);

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
