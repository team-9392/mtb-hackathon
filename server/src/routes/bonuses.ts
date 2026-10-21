import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";

import type { Env } from "../env.js";
import { requireAuth, sendError } from "../http.js";
import { notify, parentUserIdOfFamily } from "../repo.js";
import { REWARDS } from "../rewards.js";
import { QUIZZES } from "../quizzes.js";

const completeSchema = z.object({}).optional();
const quizAnswersSchema = z.object({ answers: z.array(z.number().int().min(0).max(9)).min(1) });

/** Каталог наград живёт в коде (server/src/rewards.ts): цены, партнёры, промокоды. */
async function syncRewards(db: SupabaseClient): Promise<void> {
  const rows = REWARDS.map((reward) => ({
    id: reward.id,
    kind: reward.kind,
    price: reward.price,
    audience: reward.audience,
    title_ru: reward.title.ru,
    title_be: reward.title.be,
    desc_ru: reward.desc.ru,
    desc_be: reward.desc.be,
    value: reward.value,
    sort: reward.sort,
  }));
  if (rows.length === 0) {
    return;
  }
  const { error } = await db.from("rewards").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("[rewards] не удалось синхронизировать награды: " + error.message);
    return;
  }
  const ids = rows.map((row) => row.id);
  const { data: stale } = await db
    .from("rewards")
    .select("id")
    .not("id", "in", "(" + ids.map((id) => '"' + id + '"').join(",") + ")");
  const staleIds = (stale ?? []).map((row) => row.id as string);
  if (staleIds.length > 0) {
    await db.from("purchases").delete().in("reward_id", staleIds);
    await db.from("rewards").delete().in("id", staleIds);
  }
}

/** Контент тестов живёт в коде (server/src/quizzes.ts) и подтягивается в БД при старте. */
async function syncQuizzes(db: SupabaseClient): Promise<void> {
  const rows = QUIZZES.map((quiz, index) => ({
    id: quiz.id,
    kind: quiz.kind,
    points: quiz.points,
    audience: quiz.audience,
    title_ru: quiz.title.ru,
    title_be: quiz.title.be,
    desc_ru: quiz.desc.ru,
    desc_be: quiz.desc.be,
    sort: index + 1,
  }));
  if (rows.length === 0) {
    return;
  }
  const { error } = await db.from("quests").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("[quizzes] не удалось синхронизировать тесты: " + error.message);
    return;
  }
  const ids = rows.map((row) => row.id);
  const { data: stale } = await db.from("quests").select("id").not("id", "in", "(" + ids.map((id) => '"' + id + '"').join(",") + ")");
  const staleIds = (stale ?? []).map((row) => row.id as string);
  if (staleIds.length > 0) {
    await db.from("quest_progress").delete().in("quest_id", staleIds);
    await db.from("quests").delete().in("id", staleIds);
  }
}
const themeSchema = z.object({ theme: z.string().min(1).max(32) });

/** Монеты Moby: квесты от банка и магазин наград. Один эндпоинт отдаёт всё сразу. */
export async function registerBonusRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): Promise<void> {
  // Справочники подтягиваем в фоне: Fastify к этому моменту уже может слушать порт.
  void (async () => {
    await syncQuizzes(db);
    await syncRewards(db);
  })();

  app.get("/quizzes/:id", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { id } = request.params as { id: string };
      const audience = claims.role === "child" ? "child" : "parent";
      const quiz = QUIZZES.find((item) => item.id === id && item.audience === audience);
      if (!quiz) {
        return reply.code(404).send({ error: "not_found", message: "Тест не найден" });
      }
      const { data: existing } = await db
        .from("quest_progress")
        .select("quest_id")
        .eq("user_id", claims.sub)
        .eq("quest_id", quiz.id)
        .maybeSingle();
      return reply.send({
        id: quiz.id,
        points: quiz.points,
        done: Boolean(existing),
        title_ru: quiz.title.ru,
        title_be: quiz.title.be,
        desc_ru: quiz.desc.ru,
        desc_be: quiz.desc.be,
        questions: quiz.questions.map((question) => ({
          id: question.id,
          text_ru: question.text.ru,
          text_be: question.text.be,
          options_ru: question.options.ru,
          options_be: question.options.be,
          why_ru: question.why.ru,
          why_be: question.why.be,
        })),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/quests/:id/quiz", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { id } = request.params as { id: string };
      const audience = claims.role === "child" ? "child" : "parent";
      const quiz = QUIZZES.find((item) => item.id === id && item.audience === audience);
      if (!quiz) {
        return reply.code(404).send({ error: "not_found", message: "Тест не найден" });
      }
      const body = quizAnswersSchema.parse(request.body);
      if (body.answers.length !== quiz.questions.length) {
        return reply.code(400).send({ error: "bad_answers", message: "Ответьте на все вопросы" });
      }
      const results = quiz.questions.map((question, index) => body.answers[index] === question.correct);
      const correct = results.filter(Boolean).length;
      const total = quiz.questions.length;
      const ok = correct === total;

      const { data: existing } = await db
        .from("quest_progress")
        .select("quest_id")
        .eq("user_id", claims.sub)
        .eq("quest_id", quiz.id)
        .maybeSingle();

      if (!ok || existing) {
        const { data: user } = await db.from("users").select("coins").eq("id", claims.sub).maybeSingle();
        return reply.send({ ok, correct, total, results, coins: (user?.coins as number | null) ?? 0, points: 0 });
      }

      await db.from("quest_progress").insert({ user_id: claims.sub, quest_id: quiz.id });
      const points = quiz.points;
      const { data: user } = await db.from("users").select("coins").eq("id", claims.sub).maybeSingle();
      const coins = ((user?.coins as number | null) ?? 0) + points;
      await db.from("users").update({ coins }).eq("id", claims.sub);
      await db.from("coin_ledger").insert({ user_id: claims.sub, amount: points, reason: "quest", quest_id: quiz.id });

      if (claims.familyId && claims.role === "child") {
        const parentId = await parentUserIdOfFamily(db, claims.familyId);
        if (parentId) {
          await notify(
            db,
            parentId,
            claims.familyId,
            "reward",
            "Монеты за тест",
            "Манеты за тэст",
            quiz.title.ru + " · +" + points + " монет",
            quiz.title.be + " · +" + points + " манет",
          );
        }
      }

      return reply.send({ ok: true, correct, total, results, coins, points });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/bonuses", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const audience = claims.role === "child" ? "child" : "parent";

      const [{ data: user }, { data: progress }, { data: bought }] = await Promise.all([
        db.from("users").select("coins, theme").eq("id", claims.sub).maybeSingle(),
        db.from("quest_progress").select("quest_id").eq("user_id", claims.sub),
        db.from("purchases").select("reward_id, code").eq("user_id", claims.sub),
      ]);

      const done = new Set((progress ?? []).map((row) => row.quest_id as string));
      const owned = new Map((bought ?? []).map((row) => [row.reward_id as string, row.code as string]));

      return reply.send({
        coins: (user?.coins as number | null) ?? 0,
        theme: (user?.theme as string | null) ?? "default",
        quests: QUIZZES.filter((quiz) => quiz.audience === audience).map((quiz) => ({
          id: quiz.id,
          kind: quiz.kind,
          points: quiz.points,
          title_ru: quiz.title.ru,
          title_be: quiz.title.be,
          desc_ru: quiz.desc.ru,
          desc_be: quiz.desc.be,
          questionCount: quiz.questions.length,
          done: done.has(quiz.id),
        })),
        rewards: REWARDS.filter((reward) => reward.audience === audience).map((reward) => ({
          id: reward.id,
          kind: reward.kind,
          price: reward.price,
          title_ru: reward.title.ru,
          title_be: reward.title.be,
          desc_ru: reward.desc.ru,
          desc_be: reward.desc.be,
          value: reward.value,
          partnerName: reward.partner?.name ?? null,
          partnerLogo: reward.partner?.logo ?? null,
          code: owned.get(reward.id) ?? null,
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

      const reward = REWARDS.find((item) => item.id === id && item.audience === audience);
      if (!reward) {
        return reply.code(404).send({ error: "not_found", message: "Награда не найдена" });
      }

      const { data: user } = await db.from("users").select("coins").eq("id", claims.sub).maybeSingle();
      const coins = (user?.coins as number | null) ?? 0;
      const price = reward.price;
      if (coins < price) {
        return reply.code(409).send({ error: "not_enough", message: "Не хватает монет" });
      }

      const code =
        reward.kind === "promo"
          ? reward.code ?? "MOBY-" + crypto.randomBytes(3).toString("hex").toUpperCase()
          : reward.value;

      await db.from("purchases").insert({ user_id: claims.sub, reward_id: id, code });
      await db.from("coin_ledger").insert({ user_id: claims.sub, amount: -price, reason: "purchase", quest_id: null });
      await db.from("users").update({ coins: coins - price }).eq("id", claims.sub);
      if (reward.kind === "theme") {
        await db.from("users").update({ theme: reward.value }).eq("id", claims.sub);
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
