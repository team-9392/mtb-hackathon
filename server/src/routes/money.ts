import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { Env } from "../env.js";
import { hub } from "../hub.js";
import { badRequest, conflict, forbidden, requireAuth, sendError } from "../http.js";
import { notify, parentUserIdOfFamily } from "../repo.js";
import { productsFor, type ProductId } from "../rules.js";

const ACCOUNT_KINDS = ["pocket", "savings", "deposit"] as const;
const FLOWS = ["pocket", "savings", "deposit", "goal"] as const;

export const ACCOUNT_TITLES: Record<string, { ru: string; be: string }> = {
  pocket: { ru: "Карманные деньги", be: "Кішэнныя грошы" },
  savings: { ru: "Копилка", be: "Скарбонка" },
  deposit: { ru: "Вклад", be: "Уклад" },
  goal: { ru: "Цель", be: "Мэта" },
};

interface ChildRef {
  id: string;
  family_id: string;
  user_id: string | null;
  bracket: "child_7_13" | "teen_14_17";
  name: string;
}

async function loadChild(db: SupabaseClient, childId: string): Promise<ChildRef> {
  const { data } = await db
    .from("children")
    .select("id, family_id, user_id, bracket, name")
    .eq("id", childId)
    .maybeSingle();
  if (!data) {
    throw badRequest("Профиль ребёнка не найден");
  }
  return data as unknown as ChildRef;
}

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

/** Счёт открывает родитель. Ребёнок может только попросить. */
async function openAccount(db: SupabaseClient, childId: string, kind: string): Promise<void> {
  await db
    .from("accounts")
    .upsert(
      { child_id: childId, kind, balance: 0, currency: "BYN" },
      { onConflict: "child_id,kind", ignoreDuplicates: true },
    );
  await db
    .from("permissions")
    .update({ allowed: true, pending_request: false })
    .eq("child_id", childId)
    .eq("product_id", kind);
}

async function goalId(db: SupabaseClient, childId: string): Promise<string | null> {
  const { data } = await db
    .from("goals")
    .select("id")
    .eq("child_id", childId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function readPot(db: SupabaseClient, childId: string, kind: string): Promise<number | null> {
  if (kind === "goal") {
    const id = await goalId(db, childId);
    if (!id) {
      return null;
    }
    const { data } = await db.from("goals").select("saved").eq("id", id).maybeSingle();
    return Number(data?.saved ?? 0);
  }
  const { data } = await db
    .from("accounts")
    .select("balance")
    .eq("child_id", childId)
    .eq("kind", kind)
    .maybeSingle();
  return data ? Number(data.balance) : null;
}

async function writePot(db: SupabaseClient, childId: string, kind: string, value: number): Promise<void> {
  const safe = Math.max(0, Math.round(value * 100) / 100);
  if (kind === "goal") {
    const id = await goalId(db, childId);
    if (id) {
      await db.from("goals").update({ saved: safe }).eq("id", id);
    }
    return;
  }
  await db.from("accounts").update({ balance: safe }).eq("child_id", childId).eq("kind", kind);
}

export function registerMoneyRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): void {
  /**
   * Открытие счёта. Доступно по возрасту — открываем сразу.
   * Недоступно — ребёнок оставляет запрос, и счёт открывает родитель, подтверждая его.
   */
  app.post("/children/:id/accounts", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({ kind: z.enum(ACCOUNT_KINDS) }).parse(request.body);
      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);

      const title = ACCOUNT_TITLES[body.kind] ?? { ru: body.kind, be: body.kind };
      const allowedByBracket = productsFor(child.bracket).includes(body.kind as ProductId);

      if (allowedByBracket || claims.role === "parent") {
        await openAccount(db, child.id, body.kind);
        await hub.publish(db, child.family_id, "account.opened", {
          childId: child.id,
          kind: body.kind,
          openedBy: claims.role,
        });
        return reply.send({ status: "opened", kind: body.kind, openedBy: claims.role });
      }

      const { data: pending } = await db
        .from("access_requests")
        .select("id")
        .eq("child_id", child.id)
        .eq("target", body.kind)
        .eq("status", "pending")
        .maybeSingle();
      if (!pending) {
        await db.from("access_requests").insert({
          child_id: child.id,
          target: body.kind,
          label_ru: "Открыть счёт: " + title.ru,
          label_be: "Адкрыць рахунак: " + title.be,
        });
      }
      await db
        .from("permissions")
        .update({ pending_request: true })
        .eq("child_id", child.id)
        .eq("product_id", body.kind);

      const parentId = await parentUserIdOfFamily(db, child.family_id);
      if (parentId) {
        await notify(db, parentId, child.family_id, "request_created", "Запрос: " + title.ru, "Запыт: " + title.be);
      }
      await hub.publish(db, child.family_id, "request.created", { childId: child.id, target: body.kind });
      return reply.send({ status: "requested", kind: body.kind });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Перевод между своими счетами и целью. Наружу деньги не уходят. */
  app.post("/children/:id/transfers", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({
          from: z.enum(FLOWS),
          to: z.enum(FLOWS),
          amount: z.number().positive().max(10000),
        })
        .parse(request.body);
      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);

      if (body.from === body.to) {
        throw badRequest("Выберите разные счета");
      }

      if (claims.role === "child") {
        const { data: permission } = await db
          .from("permissions")
          .select("allowed")
          .eq("child_id", child.id)
          .eq("product_id", "savings")
          .maybeSingle();
        if (permission && permission.allowed === false) {
          throw forbidden("Копилка отключена — попросите родителя");
        }
      }

      const source = await readPot(db, child.id, body.from);
      if (source === null) {
        throw badRequest(body.from === "goal" ? "Цель ещё не заведена" : "Счёт не открыт");
      }
      if (source + 0.001 < body.amount) {
        throw conflict("На этом счёте недостаточно денег");
      }

      const target = await readPot(db, child.id, body.to);
      if (target === null && body.to === "goal") {
        throw badRequest("Цель ещё не заведена");
      }

      await writePot(db, child.id, body.from, source - body.amount);
      await writePot(db, child.id, body.to, (target ?? 0) + body.amount);

      const { data: transfer } = await db
        .from("transfers")
        .insert({
          child_id: child.id,
          from_kind: body.from,
          to_kind: body.to,
          amount: body.amount,
          initiated_by_user_id: claims.sub,
        })
        .select("id")
        .single();

      await hub.publish(db, child.family_id, "money.moved", {
        childId: child.id,
        from: body.from,
        to: body.to,
        amount: body.amount,
      });

      return reply.send({
        ok: true,
        id: transfer?.id ?? null,
        from: body.from,
        to: body.to,
        amount: body.amount,
        balanceFrom: Math.max(0, Math.round((source - body.amount) * 100) / 100),
        balanceTo: Math.round(((target ?? 0) + body.amount) * 100) / 100,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Родитель переводит деньги ребёнку на карман — главное действие банкинга. */
  app.post("/children/:id/topup", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({ amount: z.number().positive().max(100000) }).parse(request.body);
      if (claims.role !== "parent") {
        throw forbidden("Пополнить счёт может только родитель");
      }
      const child = await loadChild(db, params.id);
      if (claims.familyId !== child.family_id) {
        throw forbidden("Профиль из другой семьи");
      }

      const pocket = (await readPot(db, child.id, "pocket")) ?? 0;
      const balance = Math.round((pocket + body.amount) * 100) / 100;
      await writePot(db, child.id, "pocket", balance);

      await db.from("transactions").insert({
        child_id: child.id,
        amount: body.amount,
        category: "topup",
        merchant: null,
        title_ru: "Пополнение от родителя",
        title_be: "Папаўненне ад бацькі",
        status: "approved",
        by_child: false,
      });

      await hub.publish(db, child.family_id, "txn.created", { childId: child.id, amount: body.amount });
      if (child.user_id) {
        await notify(
          db,
          child.user_id,
          child.family_id,
          "txn",
          "Деньги пришли",
          "Грошы прыйшлі",
          "+" + body.amount.toFixed(2) + " BYN от родителя",
          "+" + body.amount.toFixed(2) + " BYN ад бацькі",
        );
      }

      return reply.send({ ok: true, balance });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** История переводов — на случай вопроса «покажите движение денег». */
  app.get("/children/:id/transfers", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const child = await loadChild(db, params.id);
      assertChildAccess(claims, child);
      const { data } = await db
        .from("transfers")
        .select("id, from_kind, to_kind, amount, created_at")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return reply.send({ transfers: data ?? [] });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
