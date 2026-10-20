import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { hub } from "../hub.js";
import type { Env } from "../env.js";
import { badRequest, conflict, forbidden, requireAuth, requireParent, sendError } from "../http.js";
import { bootstrapChild, childState, getChild, notify, parentUserIdOfFamily } from "../repo.js";
import { randomNumeric, randomInviteCode } from "../otp.js";
import { defaultAllowed, productsFor, requiresWrittenConsent, type Bracket, type ProductId, type OperationId, type ConsentId } from "../rules.js";

const PRODUCTS = ["card", "pocket", "savings", "deposit", "insurance", "subscriptions"] as const;
const OPERATIONS = ["pay", "online", "transfer", "cash"] as const;
const CONSENTS = ["legal", "pd", "access", "written14"] as const;

export function registerFamilyRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): void {
  app.get("/family", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const { data: family } = await db
        .from("families")
        .select("id, owner_user_id, tariff, invite_code, currency, created_at")
        .eq("id", familyId)
        .maybeSingle();
      const { data: children } = await db
        .from("children")
        .select("id, name, bracket, points, access_granted, access_code, user_id, created_at")
        .eq("family_id", familyId)
        .order("created_at", { ascending: true });

      const states = [];
      for (const row of children ?? []) {
        states.push(await childState(db, row as never));
      }
      return reply.send({ family, children: states });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/family/children", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const body = z
        .object({
          name: z.string().min(1).max(40),
          bracket: z.enum(["child_7_13", "teen_14_17"]),
          birthDate: z.string().optional(),
        })
        .parse(request.body);

      const { data: created, error } = await db
        .from("children")
        .insert({
          family_id: familyId,
          name: body.name,
          bracket: body.bracket,
          birth_date: body.birthDate ?? null,
          access_code: randomInviteCode(),
        })
        .select("id, name, bracket, points, access_granted, access_code")
        .single();

      if (error || !created) {
        throw new Error("Не удалось создать профиль: " + (error?.message ?? ""));
      }

      await bootstrapChild(db, created.id as string, body.bracket as Bracket);
      return reply.status(201).send({ child: created });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/children/:id/state", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      if (claims.role === "child") {
        const { data } = await db
          .from("children")
          .select("id, family_id, user_id, name, bracket, points, access_granted, access_code")
          .eq("id", params.id)
          .maybeSingle();
        if (!data || data.user_id !== claims.sub) {
          throw forbidden("Это профиль другого ребёнка");
        }
        return reply.send(await childState(db, data as never));
      }
      const child = await getChild(db, params.id, requireParent(claims));
      return reply.send(await childState(db, child));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/children/:id", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({ name: z.string().min(1).max(40).optional(), bracket: z.enum(["child_7_13", "teen_14_17"]).optional() })
        .parse(request.body);
      const child = await getChild(db, params.id, familyId);
      const nextBracket = (body.bracket ?? child.bracket) as Bracket;

      await db
        .from("children")
        .update({ name: body.name ?? child.name, bracket: nextBracket })
        .eq("id", child.id);

      if (body.bracket && body.bracket !== child.bracket) {
        // смена возрастной ветки пересобирает права: у 7–13 нет вклада
        await db.from("permissions").delete().eq("child_id", child.id);
        await db.from("operation_permissions").delete().eq("child_id", child.id);
        await db.from("consents").delete().eq("child_id", child.id);
        await bootstrapChild(db, child.id, nextBracket);
      }

      const updated = await getChild(db, child.id, familyId);
      return reply.send({ child: updated });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/children/:id/consents", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({ kinds: z.array(z.enum(CONSENTS)).min(1) }).parse(request.body);
      const child = await getChild(db, params.id, familyId);

      const signedAt = new Date().toISOString();
      for (const kind of body.kinds as ConsentId[]) {
        await db
          .from("consents")
          .upsert(
            {
              family_id: familyId,
              child_id: child.id,
              kind,
              signed_at: signedAt,
              signed_by_user_id: claims.sub,
            },
            { onConflict: "child_id,kind" },
          );
      }

      // письменное согласие на вклад открывает продукт
      if ((body.kinds as string[]).includes("written14")) {
        await db
          .from("permissions")
          .update({ has_consent: true })
          .eq("child_id", child.id)
          .eq("requires_consent", true);
      }

      await hub.publish(db, familyId, "consent.signed", { childId: child.id, kinds: body.kinds });
      return reply.send({ ok: true, signedAt });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/children/:id/access", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({ granted: z.boolean() }).parse(request.body);
      const child = await getChild(db, params.id, familyId);

      await db.from("children").update({ access_granted: body.granted }).eq("id", child.id);
      if (!body.granted) {
        await db.from("sessions").update({ revoked_at: new Date().toISOString() }).eq(
          "user_id",
          child.user_id ?? "00000000-0000-0000-0000-000000000000",
        );
      }

      if (child.user_id) {
        await notify(
          db,
          child.user_id,
          familyId,
          body.granted ? "access_granted" : "access_revoked",
          body.granted ? "Доступ к Moby открыт" : "Доступ к Moby приостановлен",
          body.granted ? "Доступ да Moby адкрыты" : "Доступ да Moby прыпынены",
        );
      }

      await hub.publish(db, familyId, body.granted ? "access.granted" : "access.revoked", {
        childId: child.id,
        granted: body.granted,
      });
      return reply.send({ ok: true, accessGranted: body.granted });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/children/:id/card", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const child = await getChild(db, params.id, familyId);

      const { data: existing } = await db
        .from("cards")
        .select("id")
        .eq("child_id", child.id)
        .maybeSingle();

      const payload = {
        child_id: child.id,
        last4: randomNumeric(4),
        status: "issued",
        issued_at: new Date().toISOString(),
        blocked_at: null,
      };

      const { data: card, error } = existing
        ? await db.from("cards").update(payload).eq("id", existing.id).select("*").single()
        : await db.from("cards").insert(payload).select("*").single();

      if (error || !card) {
        throw new Error("Не удалось выпустить карту: " + (error?.message ?? ""));
      }
      await hub.publish(db, familyId, "permission.updated", { childId: child.id, cardIssued: true });
      return reply.status(201).send({ card });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/children/:id/card", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({ blocked: z.boolean() }).parse(request.body);
      const child = await getChild(db, params.id, familyId);

      await db
        .from("cards")
        .update({
          status: body.blocked ? "blocked" : "issued",
          blocked_at: body.blocked ? new Date().toISOString() : null,
        })
        .eq("child_id", child.id);

      await hub.publish(db, familyId, body.blocked ? "card.blocked" : "card.unblocked", { childId: child.id });
      return reply.send({ ok: true, blocked: body.blocked });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/children/:id/permissions", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({ productId: z.enum(PRODUCTS), allowed: z.boolean() })
        .parse(request.body);
      const child = await getChild(db, params.id, familyId);
      const product = body.productId as ProductId;

      if (product === "deposit" && child.bracket === "child_7_13" && body.allowed) {
        throw conflict("Для 7–13 лет вклад недоступен: договор оформляет родитель");
      }
      if (body.allowed && !productsFor(child.bracket).includes(product)) {
        throw conflict("Продукт недоступен для этой возрастной ветки");
      }

      const { data: current } = await db
        .from("permissions")
        .select("requires_consent, has_consent")
        .eq("child_id", child.id)
        .eq("product_id", product)
        .maybeSingle();

      const needsConsent = requiresWrittenConsent(product, child.bracket);
      const allowed = needsConsent && !current?.has_consent ? false : body.allowed;

      await db
        .from("permissions")
        .update({ allowed, requires_consent: needsConsent, pending_request: false })
        .eq("child_id", child.id)
        .eq("product_id", product);

      await hub.publish(db, familyId, "permission.updated", { childId: child.id, productId: product, allowed });
      return reply.send({ ok: true, allowed, requiresConsent: needsConsent, hasConsent: current?.has_consent ?? false });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/children/:id/operations", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({ operationId: z.enum(OPERATIONS), allowed: z.boolean() }).parse(request.body);
      const child = await getChild(db, params.id, familyId);

      await db
        .from("operation_permissions")
        .update({ allowed: body.allowed })
        .eq("child_id", child.id)
        .eq("operation_id", body.operationId as OperationId);

      await hub.publish(db, familyId, "permission.updated", {
        childId: child.id,
        operationId: body.operationId,
        allowed: body.allowed,
      });
      return reply.send({ ok: true });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/children/:id/limits", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({
          monthly: z.number().min(0).max(10000).optional(),
          perTxn: z.number().min(0).max(10000).optional(),
          pocketWeekly: z.number().min(0).max(10000).optional(),
          pocketDay: z.number().min(0).max(10000).optional(),
          confirmEach: z.boolean().optional(),
        })
        .parse(request.body);
      const child = await getChild(db, params.id, familyId);

      const patch: Record<string, unknown> = {};
      if (body.monthly !== undefined) patch.monthly = body.monthly;
      if (body.perTxn !== undefined) patch.per_txn = body.perTxn;
      if (body.pocketWeekly !== undefined) patch.pocket_weekly = body.pocketWeekly;
      if (body.pocketDay !== undefined) patch.pocket_day = body.pocketDay;
      if (body.confirmEach !== undefined) patch.confirm_each = body.confirmEach;

      if (Object.keys(patch).length === 0) {
        throw badRequest("Не передано ни одного лимита");
      }

      await db.from("limits").update(patch).eq("child_id", child.id);
      await hub.publish(db, familyId, "limit.updated", { childId: child.id, ...patch });
      return reply.send({ ok: true, limits: patch });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/children/:id/requests/:requestId", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const params = z.object({ id: z.string().uuid(), requestId: z.string().uuid() }).parse(request.params);
      const body = z.object({ status: z.enum(["approved", "declined"]) }).parse(request.body);
      const child = await getChild(db, params.id, familyId);

      const { data: requestRow } = await db
        .from("access_requests")
        .select("id, target, status")
        .eq("id", params.requestId)
        .eq("child_id", child.id)
        .maybeSingle();
      if (!requestRow) {
        throw conflict("Запрос не найден");
      }

      await db
        .from("access_requests")
        .update({ status: body.status, resolved_at: new Date().toISOString(), resolved_by_user_id: claims.sub })
        .eq("id", requestRow.id);

      if (body.status === "approved") {
        const target = requestRow.target as string;
        if (target === "limit") {
          const { data: currentLimits } = await db
            .from("limits")
            .select("monthly")
            .eq("child_id", child.id)
            .maybeSingle();
          const monthly = Number(currentLimits?.monthly ?? 0) + 20;
          await db.from("limits").update({ monthly }).eq("child_id", child.id);
          await hub.publish(db, familyId, "limit.updated", { childId: child.id, monthly });
        } else {
          const product = PRODUCTS.includes(target as never) ? (target as ProductId) : null;
          if (product) {
            await db
              .from("permissions")
              .update({ allowed: true, pending_request: false })
              .eq("child_id", child.id)
              .eq("product_id", product);
          }
        }
      } else {
        await db
          .from("permissions")
          .update({ pending_request: false })
          .eq("child_id", child.id)
          .eq("product_id", requestRow.target as string);
      }

      if (child.user_id) {
        await notify(
          db,
          child.user_id,
          familyId,
          "request_resolved",
          body.status === "approved" ? "Родитель одобрил запрос" : "Родитель отклонил запрос",
          body.status === "approved" ? "Бацька ўхваліў запыт" : "Бацька адхіліў запыт",
        );
      }

      await hub.publish(db, familyId, "request.resolved", { childId: child.id, requestId: requestRow.id, status: body.status });
      return reply.send({ ok: true });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  /** Журнал согласий и изменений прав — для вопросов жюри «чем докажете». */
  app.get("/family/audit", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const familyId = requireParent(claims);
      const { data } = await db
        .from("audit_log")
        .select("id, action, entity, entity_id, payload, at")
        .eq("family_id", familyId)
        .order("at", { ascending: false })
        .limit(100);
      return reply.send({ events: data ?? [] });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
