import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { Env } from "../env.js";
import { requireAuth, sendError } from "../http.js";
import { notify, parentUserIdOfFamily } from "../repo.js";

const FALLBACK = [
  "Больше всего уходит на развлечения – попробуй поставить недельный лимит.",
  "Половина трат – мелкие покупки: они съедают бюджет незаметно.",
  "Ты уже экономишь: продолжай откладывать в копилку.",
];


type ChatTurn = { role: "user" | "assistant"; text: string };

const CHAT_SYSTEM = [
  "Ты Моби – дружелюбный помощник по деньгам в приложении Moby Family для подростков 10-16 лет и их родителей.",
  "Отвечай коротко: 2-5 предложений, по-русски, без эмодзи, без морализаторства.",
  "Тебе дают ОБЕЗЛИЧЕННУЮ сводку: только суммы, категории, цели и лимиты – никаких имён, телефонов, номеров карт.",
  "Если вопрос не про деньги и покупки – мягко верни к теме бюджета.",
  "Не проси персональные данные и не советуй сомнительные финансовые схемы. Это виртуальная песочница, реальные деньги не двигаются.",
].join(" ");

/** Обезличенная сводка по ребёнку: только суммы/категории, без имён и реквизитов. */
async function buildAnonymizedContext(db: SupabaseClient, childId: string): Promise<string> {
  const parts: string[] = [];
  const { data: txns } = await db
    .from("transactions")
    .select("amount, category, created_at, status")
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(30);
  const rows = (txns ?? []) as Array<{ amount: number | string; category: string | null; created_at: string; status: string }>;
  const spent = rows.filter((r) => Number(r.amount) < 0).reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0);
  const income = rows.filter((r) => Number(r.amount) > 0).reduce((sum, r) => sum + Number(r.amount), 0);
  const byCategory = new Map<string, number>();
  for (const row of rows) {
    if (Number(row.amount) >= 0) continue;
    const key = row.category ?? "прочее";
    byCategory.set(key, (byCategory.get(key) ?? 0) + Math.abs(Number(row.amount)));
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  parts.push("трат за последние операции: " + Math.round(spent) + " BYN");
  parts.push("поступлений: " + Math.round(income) + " BYN");
  if (top.length > 0) {
    parts.push("топ категорий трат: " + top.map(([name, sum]) => name + " " + Math.round(sum)).join(", "));
  }
  try {
    const { data: goals } = await db.from("goals").select("target, saved, title_ru").eq("child_id", childId).limit(3);
    for (const goal of (goals ?? []) as Array<{ target: number | string; saved: number | string; title_ru: string | null }>) {
      parts.push("цель «" + (goal.title_ru ?? "копилка") + "»: накоплено " + Math.round(Number(goal.saved)) + " из " + Math.round(Number(goal.target)));
    }
  } catch {
    // таблицы целей может не быть в старых сборках – не критично
  }
  return parts.join("; ");
}

async function aiChat(env: Env, context: string, history: ChatTurn[], message: string): Promise<string> {
  const key = env.PROXYAPI_KEY;
  if (!key) {
    return "Сейчас я без связи с ИИ, но подскажу по-простому: сначала отложи 10% с любого пополнения, остальное дели на траты и цель.";
  }
  try {
    const base = env.PROXYAPI_URL || "https://api.proxyapi.ru/openai/v1";
    const messages = [
      { role: "system", content: CHAT_SYSTEM + " Обезличенные данные пользователя: " + context },
      ...history.slice(-6).map((turn) => ({ role: turn.role, content: turn.text })),
      { role: "user", content: message },
    ];
    const response = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({ model: env.PROXYAPI_MODEL || "gpt-4o-mini", temperature: 0.6, max_tokens: 220, messages }),
    });
    if (!response.ok) return "Не получилось подумать – попробуй ещё раз через минуту.";
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text ? text.slice(0, 600) : "Не получилось подумать – попробуй ещё раз через минуту.";
  } catch {
    return "Не получилось подумать – попробуй ещё раз через минуту.";
  }
}

/**
 * ИИ-антифрод: проверяет операцию по ОБЕЗЛИЧЕННЫМ признакам
 * (сумма, категория, время, активность) и при риске пишет родителю.
 * Имена, номера карт и телефоны в модель не попадают.
 */
export async function runFraudCheck(
  db: SupabaseClient,
  env: Env,
  childId: string,
  txn: { amount: number; category?: string | null; titleRu?: string | null; status?: string },
): Promise<void> {
  try {
    if (txn.status && txn.status !== "approved") return;
    const amount = Math.abs(Number(txn.amount));
    if (!Number.isFinite(amount) || amount < 20) return;

    const { data: childRow } = await db.from("children").select("family_id, user_id").eq("id", childId).maybeSingle();
    if (!childRow?.family_id) return;
    const parentId = await parentUserIdOfFamily(db, childRow.family_id as string);
    if (!parentId) return;

    const { data: history } = await db
      .from("transactions")
      .select("amount, created_at, status")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = (history ?? []) as Array<{ amount: number | string; created_at: string }>;
    const avg = rows.length > 0 ? rows.reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0) / rows.length : amount;
    const hour = new Date().getHours();
    const lastDay = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 24 * 60 * 60 * 1000).length;

    // Быстрые правила без ИИ – чтобы алерт был даже без сети
    let score = 0;
    if (amount > Math.max(50, avg * 2.5)) score += 2;
    if (hour >= 0 && hour < 6) score += 1;
    if (lastDay > 8) score += 1;
    if (score === 0) return;

    let risk = score >= 3 ? "high" : "medium";
    let reason = "Операция крупнее обычных для этого профиля.";

    const key = env.PROXYAPI_KEY;
    if (key) {
      try {
        const base = env.PROXYAPI_URL || "https://api.proxyapi.ru/openai/v1";
        const response = await fetch(base + "/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer " + key },
          body: JSON.stringify({
            model: env.PROXYAPI_MODEL || "gpt-4o-mini",
            temperature: 0.2,
            max_tokens: 120,
            messages: [
              {
                role: "system",
                content:
                  "Ты антифрод-модуль семейного банка. По ОБЕЗЛИЧЕННЫМ признакам операции оцени риск: верни строго JSON {\"risk\":\"low\"|\"medium\"|\"high\",\"reason\":string}. reason – одна фраза до 90 символов по-русски, без имён. Учитывай: сумма, средняя трата, ночное время, активность за сутки.",
              },
              {
                role: "user",
                content:
                  "Сумма " + Math.round(amount) + " BYN; средняя трата " + Math.round(avg) + " BYN; категория " + (txn.category ?? "прочее") +
                  "; время " + hour + ":00; операций за сутки " + lastDay + "; предварительный счёт риска " + score + "/4.",
              },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (response.ok) {
          const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "") as { risk?: string; reason?: string };
          if (parsed.risk === "low" || parsed.risk === "medium" || parsed.risk === "high") {
            risk = parsed.risk;
          }
          if (parsed.reason) {
            reason = String(parsed.reason).slice(0, 120);
          }
        }
      } catch {
        // остаёмся на правилах
      }
    }

    if (risk === "low") return;
    await notify(
      db,
      parentId,
      childRow.family_id as string,
      "security",
      risk === "high" ? "ИИ: подозрительная операция" : "ИИ: необычная операция",
      risk === "high" ? "ІИ: падазроная аперацыя" : "ІИ: незвычайная аперацыя",
      "Сумма " + Math.round(amount) + " BYN, категория «" + (txn.category ?? "прочее") + "». " + reason,
      "Сума " + Math.round(amount) + " BYN, катэгорыя «" + (txn.category ?? "іншае") + "». " + reason,
    );
  } catch (error) {
    console.error("[ai] antifraud: " + (error as Error).message);
  }
}

/** ИИ-аналитика трат ребёнка: короткие выводы и совет. */
export async function registerAiRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): Promise<void> {
  app.post("/ai/insights", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const childId = claims.childId ?? null;
      let rows: Array<{ amount: number | string; title_ru?: string | null; category?: string | null; created_at?: string }> = [];
      if (childId) {
        const { data } = await db
          .from("transactions")
          .select("amount, title_ru, category, created_at")
          .eq("child_id", childId)
          .order("created_at", { ascending: false })
          .limit(20);
        rows = (data ?? []) as typeof rows;
      }
      const spent = rows.filter((r) => Number(r.amount) < 0).reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0);
      const summary = rows.slice(0, 10).map((r) => (r.title_ru ?? "операция") + ": " + r.amount + " BYN").join("; ");

      const key = env.PROXYAPI_KEY;
      if (!key || rows.length === 0) {
        return reply.send({ insights: rows.length === 0 ? ["Пока мало данных – сделай пару трат или пополни копилку."] : FALLBACK, source: "fallback" });
      }
      try {
        const base = env.PROXYAPI_URL || "https://api.proxyapi.ru/openai/v1";
        const response = await fetch(base + "/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer " + key },
          body: JSON.stringify({
            model: env.PROXYAPI_MODEL || "gpt-4o-mini",
            temperature: 0.7,
            messages: [
              {
                role: "system",
                content:
                  "Ты финансовый наставник для подростка. По списку операций дай 3 коротких вывода/совета по-русски. Верни строго JSON: {\"insights\": [string, string, string]}. Каждый пункт до 90 символов, без эмодзи, конкретно.",
              },
              { role: "user", content: "Потрачено всего " + Math.round(spent) + " BYN. Операции: " + summary },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!response.ok) {
          return reply.send({ insights: FALLBACK, source: "fallback" });
        }
        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "") as { insights?: string[] };
        const insights = (parsed.insights ?? []).filter((item) => typeof item === "string").slice(0, 3).map((item) => item.slice(0, 120));
        return reply.send({ insights: insights.length > 0 ? insights : FALLBACK, source: "ai" });
      } catch {
        return reply.send({ insights: FALLBACK, source: "fallback" });
      }
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/ai/chat", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const body = z
        .object({
          message: z.string().min(1).max(500),
          history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1000) })).max(12).optional(),
        })
        .parse(request.body ?? {});
      const childId = (claims as unknown as { childId?: string }).childId;
      if (!childId) {
        return reply.send({ answer: "Ассистент доступен в профиле ребёнка." });
      }
      const context = await buildAnonymizedContext(db, childId);
      const answer = await aiChat(env, context, (body.history ?? []) as ChatTurn[], body.message);
      return reply.send({ answer });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/ai/fraud/alerts", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { data } = await db
        .from("notifications")
        .select("id, title_ru, body_ru, created_at")
        .eq("user_id", claims.sub)
        .eq("kind", "security")
        .order("created_at", { ascending: false })
        .limit(5);
      return reply.send({ alerts: data ?? [] });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
