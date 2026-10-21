import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { Env } from "../env.js";
import { requireAuth, sendError } from "../http.js";

const FALLBACK = [
  { title: "Кофе с другом", description: "Друг зовёт в кофейню после школы. Кофе и десерт – 12 BYN.", amount: 12 },
  { title: "Новая игра", description: "Вышла скидка на игру мечты: 25 BYN вместо 40.", amount: 25 },
  { title: "Кино с классом", description: "Класс идёт в кино в субботу, билет – 15 BYN.", amount: 15 },
  { title: "Наушники", description: "Старые наушники сломались, новые – 30 BYN.", amount: 30 },
  { title: "Подарок маме", description: "Скоро день рождения мамы, букет – 18 BYN.", amount: 18 },
  { title: "Такси домой", description: "Опаздываешь, такси до дома – 10 BYN.", amount: 10 },
];

const decideSchema = z.object({ decision: z.enum(["spend", "skip"]) });

type Scenario = { title: string; description: string; amount: number };
type EventRow = { title: string; amount: number; decision: string };

const LEVELS = [
  { level: 1, title: "Новичок", from: 0 },
  { level: 2, title: "Копитель", from: 130 },
  { level: 3, title: "Стратег", from: 180 },
  { level: 4, title: "Мастер бюджета", from: 250 },
];

function computeStats(balance: number, events: EventRow[]) {
  const level = [...LEVELS].reverse().find((item) => balance >= item.from) ?? LEVELS[0]!;
  const next = LEVELS.find((item) => item.level === level.level + 1) ?? null;
  let streak = 0;
  for (const event of events) {
    if (event.decision === "skip") {
      streak += 1;
    } else {
      break;
    }
  }
  const spent = events.filter((e) => e.decision === "spend").reduce((sum, e) => sum + Number(e.amount), 0);
  const saved = events.filter((e) => e.decision === "skip").reduce((sum, e) => sum + Number(e.amount) / 2, 0);
  return {
    level: level.level,
    levelTitle: level.title,
    nextLevel: next ? next.level : null,
    nextLevelTitle: next ? next.title : null,
    nextLevelFrom: next ? next.from : null,
    toNextLevel: next ? Math.max(0, next.from - balance) : 0,
    progress: next ? Math.min(1, Math.max(0, (balance - level.from) / Math.max(1, next.from - level.from))) : 1,
    levels: LEVELS,
    streak,
    spent: Math.round(spent),
    saved: Math.round(saved),
    decisions: events.length,
  };
}

async function aiScenario(env: Env): Promise<Scenario | null> {
  const key = env.PROXYAPI_KEY;
  if (!key) return null;
  try {
    const base = env.PROXYAPI_URL || "https://api.proxyapi.ru/openai/v1";
    const response = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({
        model: env.PROXYAPI_MODEL || "gpt-4o-mini",
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              "Ты придумываешь ситуации для игры «Недельный бюджет» для подростка 10-16 лет. Верни строго JSON без пояснений: {\"title\": string (до 40 символов), \"description\": string (до 120 символов), \"amount\": number (5-40)}. Ситуация – бытовая трата виртуальных денег: школа, друзья, хобби, транспорт, подарки. Без повторов.",
          },
          { role: "user", content: "Придумай новую ситуацию." },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "") as Scenario;
    if (!parsed?.title || !parsed?.description || !Number.isFinite(Number(parsed.amount))) return null;
    return {
      title: String(parsed.title).slice(0, 40),
      description: String(parsed.description).slice(0, 140),
      amount: Math.min(40, Math.max(5, Math.round(Number(parsed.amount)))),
    };
  } catch {
    return null;
  }
}

async function aiReaction(env: Env, scenario: Scenario, decision: "spend" | "skip", balance: number, streak: number): Promise<string> {
  const key = env.PROXYAPI_KEY;
  const fallback =
    decision === "spend"
      ? "Трата принята. Следи, чтобы к концу недели баланс остался положительным."
      : "Отличное решение! Экономия – это тоже доход.";
  if (!key) return fallback;
  try {
    const base = env.PROXYAPI_URL || "https://api.proxyapi.ru/openai/v1";
    const response = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({
        model: env.PROXYAPI_MODEL || "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 60,
        messages: [
          { role: "system", content: "Ты игровой наставник по финансовой грамотности для подростка. Ответь ОДНОЙ короткой фразой (до 90 символов), дружелюбно, по-русски, без эмодзи." },
          { role: "user", content: "Ситуация: " + scenario.title + " (" + scenario.amount + " BYN). Игрок " + (decision === "spend" ? "потратил" : "отказался от траты") + ". Баланс " + balance + " BYN, серия отказов " + streak + "." },
        ],
      }),
    });
    if (!response.ok) return fallback;
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text ? text.slice(0, 120) : fallback;
  } catch {
    return fallback;
  }
}

/** Игра «Недельный бюджет»: виртуальные деньги, ИИ-ситуации, уровни и серия решений. */
export async function registerBudgetGameRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): Promise<void> {
  const ensureGame = async (userId: string) => {
    const { data } = await db.from("budget_games").select("*").eq("user_id", userId).maybeSingle();
    if (data) return data as Record<string, unknown>;
    const { data: created } = await db.from("budget_games").insert({ user_id: userId, balance: 100 }).select("*").single();
    return created as Record<string, unknown>;
  };

  const loadEvents = async (userId: string) => {
    const { data } = await db
      .from("budget_events")
      .select("id, title, amount, decision, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []) as Array<EventRow & { id: string; created_at: string }>;
  };

  app.get("/game/budget", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const game = await ensureGame(claims.sub);
      const events = await loadEvents(claims.sub);
      const balance = Number(game.balance ?? 0);
      return reply.send({
        balance,
        scenario: game.scenario ?? null,
        scenarioAt: game.scenario_at ?? null,
        stats: computeStats(balance, events),
        history: events.slice(0, 5),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/game/budget/scenario", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      await ensureGame(claims.sub);
      const scenario = (await aiScenario(env)) ?? FALLBACK[Math.floor(Math.random() * FALLBACK.length)] ?? FALLBACK[0]!;
      await db.from("budget_games").update({ scenario, scenario_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", claims.sub);
      return reply.send({ scenario, source: env.PROXYAPI_KEY ? "ai" : "fallback" });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/game/budget/decide", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = decideSchema.parse(request.body ?? {});
      const game = await ensureGame(claims.sub);
      const scenario = game.scenario as Scenario | null;
      if (!scenario) {
        return reply.code(409).send({ error: "no_scenario", message: "Сначала запросите ситуацию" });
      }
      const amount = Number(scenario.amount);
      let balance = Number(game.balance ?? 0);
      if (body.decision === "spend") {
        balance = Math.max(0, balance - amount);
      } else {
        balance = balance + Math.round(amount / 2);
      }
      await db.from("budget_games").update({ balance, scenario: null, updated_at: new Date().toISOString() }).eq("user_id", claims.sub);
      await db.from("budget_events").insert({ user_id: claims.sub, title: scenario.title, amount, decision: body.decision });
      const events = await loadEvents(claims.sub);
      const stats = computeStats(balance, events);
      // Монеты за правильное решение: отказался от траты — сразу начисляем.
      const coinsAwarded = body.decision === "skip" ? 25 : 0;
      let coins = 0;
      if (coinsAwarded > 0) {
        const { data: userRow } = await db.from("users").select("coins").eq("id", claims.sub).maybeSingle();
        coins = Number(userRow?.coins ?? 0) + coinsAwarded;
        await db.from("users").update({ coins }).eq("id", claims.sub);
        await db.from("coin_ledger").insert({ user_id: claims.sub, amount: coinsAwarded, reason: "game" });
      }
      const reaction = await aiReaction(env, scenario, body.decision, balance, stats.streak);
      return reply.send({
        coinsAwarded,
        coins,
        balance,
        stats,
        reaction,
        result: body.decision === "spend" ? "Потрачено " + amount + " BYN" : "Сэкономлено! +" + Math.round(amount / 2) + " BYN бонусом",
        history: events.slice(0, 5),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
