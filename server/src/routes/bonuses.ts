import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";

import type { Env } from "../env.js";
import { requireAuth, sendError } from "../http.js";
import { notify, parentUserIdOfFamily } from "../repo.js";

const completeSchema = z.object({}).optional();
const themeSchema = z.object({ theme: z.string().min(1).max(32) });

/** Монеты Moby: квесты от банка и магазин наград. Один эндпоинт отдаёт всё сразу. */
export async function registerBonusRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): Promise<void> {
  app.get("/bonuses", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const audience = claims.role === "child" ? "child" : "parent";

      const [{ data: user }, { data: quests }, { data: progress }, { data: rewards }, { data: bought }] =
        await Promise.all([
          db.from("users").select("coins, theme").eq("id", claims.sub).maybeSingle(),
          db.from("quests").select("id, kind, points, title_ru, title_be, desc_ru, desc_be").eq("audience", audience).order("sort"),
          db.from("quest_progress").select("quest_id").eq("user_id", claims.sub),
          db.from("rewards").select("id, kind, price, title_ru, title_be, desc_ru, desc_be, value").eq("audience", audience).order("sort"),
          db.from("purchases").select("reward_id, code").eq("user_id", claims.sub),
        ]);

      const done = new Set((progress ?? []).map((row) => row.quest_id as string));
      const owned = new Map((bought ?? []).map((row) => [row.reward_id as string, row.code as string]));

      return reply.send({
        coins: (user?.coins as number | null) ?? 0,
        theme: (user?.theme as string | null) ?? "default",
        quests: (quests ?? []).map((quest) => ({ ...quest, done: done.has(quest.id as string) })),
        rewards: (rewards ?? []).map((reward) => ({
          ...reward,
          code: owned.get(reward.id as string) ?? null,
        })),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/quests/:id/complete", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { id } = request.params as { id: string };
      const audience = claims.role === "child" ? "child" : "parent";

      const { data: quest } = await db
        .from("quests")
        .select("id, audience, points, title_ru")
        .eq("id", id)
        .maybeSingle();
      if (!quest || quest.audience !== audience) {
        return reply.code(404).send({ error: "not_found", message: "Квест не найден" });
      }

      const { data: existing } = await db
        .from("quest_progress")
        .select("quest_id")
        .eq("user_id", claims.sub)
        .eq("quest_id", id)
        .maybeSingle();
      if (existing) {
        return reply.code(409).send({ error: "already_done", message: "Квест уже выполнен" });
      }

      await db.from("quest_progress").insert({ user_id: claims.sub, quest_id: id });

      const points = quest.points as number;
      const { data: user } = await db.from("users").select("coins").eq("id", claims.sub).maybeSingle();
      const coins = ((user?.coins as number | null) ?? 0) + points;
      await db.from("users").update({ coins }).eq("id", claims.sub);
      await db.from("coin_ledger").insert({ user_id: claims.sub, amount: points, reason: "quest", quest_id: id });

      // Ребёнок заработал монеты — родитель должен это видеть.
      if (claims.familyId && claims.role === "child") {
        const parentId = await parentUserIdOfFamily(db, claims.familyId);
        if (parentId) {
          await notify(
            db,
            parentId,
            claims.familyId,
            "reward",
            "Монеты за квест",
            "Манеты за квест",
            (quest.title_ru as string) + " · +" + points + " монет",
            (quest.title_ru as string) + " · +" + points + " манет",
          );
        }
      }

      return reply.send({ ok: true, coins, points });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/rewards/:id/buy", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { id } = request.params as { id: string };
      const audience = claims.role === "child" ? "child" : "parent";

      const { data: reward } = await db
        .from("rewards")
        .select("id, audience, kind, price, value, title_ru")
        .eq("id", id)
        .maybeSingle();
      if (!reward || reward.audience !== audience) {
        return reply.code(404).send({ error: "not_found", message: "Награда не найдена" });
      }

      const { data: user } = await db.from("users").select("coins").eq("id", claims.sub).maybeSingle();
      const coins = (user?.coins as number | null) ?? 0;
      const price = reward.price as number;
      if (coins < price) {
        return reply.code(409).send({ error: "not_enough", message: "Не хватает монет" });
      }

      const code =
        reward.kind === "promo"
          ? String(reward.value).length > 3
            ? String(reward.value)
            : "MOBY-" + crypto.randomBytes(3).toString("hex").toUpperCase()
          : String(reward.value);

      await db.from("purchases").insert({ user_id: claims.sub, reward_id: id, code });
      await db.from("coin_ledger").insert({ user_id: claims.sub, amount: -price, reason: "purchase", quest_id: null });
      await db.from("users").update({ coins: coins - price }).eq("id", claims.sub);
      if (reward.kind === "theme") {
        await db.from("users").update({ theme: code }).eq("id", claims.sub);
      }

      return reply.send({ ok: true, coins: coins - price, code, kind: reward.kind });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/me/theme", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { theme } = themeSchema.parse(request.body);
      await db.from("users").update({ theme }).eq("id", claims.sub);
      return reply.send({ ok: true, theme });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  void completeSchema;
}
