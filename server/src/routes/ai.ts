import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";

import type { Env } from "../env.js";
import { requireAuth, sendError } from "../http.js";

const FALLBACK = [
  "Больше всего уходит на развлечения — попробуй поставить недельный лимит.",
  "Половина трат — мелкие покупки: они съедают бюджет незаметно.",
  "Ты уже экономишь: продолжай откладывать в копилку.",
];

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
        return reply.send({ insights: rows.length === 0 ? ["Пока мало данных — сделай пару трат или пополни копилку."] : FALLBACK, source: "fallback" });
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
}
