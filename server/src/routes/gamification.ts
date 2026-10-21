import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { Env } from "../env.js";
import { requireAuth, sendError } from "../http.js";

type Claims = { sub: string; role: string; familyId: string | null; childId?: string | null };

interface AchievementDef {
  code: string;
  title: string;
  description: string;
  emoji: string;
  rarity: "bronze" | "silver" | "gold";
}

const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_card", title: "Первая карта", description: "Получил свою первую карту", emoji: "💳", rarity: "bronze" },
  { code: "first_goal", title: "Мечтатель", description: "Создал первую копилку", emoji: "🎯", rarity: "bronze" },
  { code: "first_task", title: "Помощник", description: "Выполнил первое задание", emoji: "✅", rarity: "bronze" },
  { code: "tests_3", title: "Ученик", description: "Прошёл 3 теста по финграмотности", emoji: "📚", rarity: "silver" },
  { code: "tests_all", title: "Эксперт", description: "Прошёл все тесты", emoji: "🏆", rarity: "gold" },
  { code: "coins_500", title: "Копилка 500", description: "Заработал 500 монет", emoji: "🪙", rarity: "silver" },
  { code: "coins_1000", title: "Богач", description: "Заработал 1000 монет", emoji: "💰", rarity: "gold" },
  { code: "streak_3", title: "Три дня подряд", description: "Заходил 3 дня подряд", emoji: "🔥", rarity: "bronze" },
  { code: "streak_7", title: "Неделя силы", description: "Заходил 7 дней подряд", emoji: "⚡", rarity: "gold" },
  { code: "game_once", title: "Игрок", description: "Сыграл в «Недельный бюджет»", emoji: "🎮", rarity: "bronze" },
  { code: "saved_100", title: "Экономист", description: "Сэкономил 100 BYN в игре", emoji: "🐷", rarity: "silver" },
  { code: "duel_win", title: "Победитель дуэли", description: "Обогнал родителя в семейной дуэли", emoji: "🥇", rarity: "gold" },
];

const SKINS: Array<{ code: string; title: string; description: string; accent: string; requirement: string }> = [
  { code: "classic", title: "Классика", description: "Чёрная карта Moby", accent: "#1b2bff", requirement: "Доступна всем" },
  { code: "neon", title: "Неон", description: "Голубая подсветка по краю", accent: "#60a5fa", requirement: "3 уровень" },
  { code: "gold", title: "Золото", description: "Золотая рамка", accent: "#fbbf24", requirement: "5 достижений" },
  { code: "aurora", title: "Аврора", description: "Переливчатое свечение", accent: "#a78bfa", requirement: "Серия 7 дней" },
  { code: "carbon", title: "Карбон", description: "Серый карбон", accent: "#94a3b8", requirement: "500 монет" },
];

const DAILY_REWARDS = [10, 15, 20, 25, 30, 40, 100];

const PET_STAGES = [
  { at: 0, emoji: "🥚", title: "Яйцо", speech: "Положи первую монету в копилку – и я начну расти." },
  { at: 100, emoji: "🐣", title: "Цыплёнок", speech: "Ты накопил 100 BYN – я вылупился!" },
  { at: 300, emoji: "🐥", title: "Птенец", speech: "300 BYN – я уже уверенно стою на лапках." },
  { at: 700, emoji: "🦅", title: "Орлёнок", speech: "700 BYN – я умею летать, а ты умеешь копить." },
  { at: 1500, emoji: "🐉", title: "Дракон", speech: "1500 BYN – легенда копилки! Продолжай в том же духе." },
];

function petStage(saved: number) {
  const stage = [...PET_STAGES].reverse().find((item) => saved >= item.at) ?? PET_STAGES[0]!;
  const next = PET_STAGES.find((item) => item.at > saved) ?? null;
  return { stage, next, progress: next ? Math.min(1, (saved - stage.at) / Math.max(1, next.at - stage.at)) : 1 };
}

function weekStart(): string {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function levelOf(xp: number): { level: number; title: string; nextXp: number; progress: number } {
  const thresholds = [0, 50, 120, 220, 350, 520, 730, 1000, 1350, 1800, 2400, 3200];
  let level = 1;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (xp >= (thresholds[i] as number)) level = i + 1;
  }
  const titles = ["Новичок", "Ученик", "Копитель", "Стратег", "Мастер", "Профи", "Гуру", "Легенда"];
  const current = thresholds[Math.min(level - 1, thresholds.length - 1)] as number;
  const next = (thresholds[Math.min(level, thresholds.length - 1)] as number) ?? current + 500;
  return {
    level,
    title: titles[Math.min(level - 1, titles.length - 1)] as string,
    nextXp: next,
    progress: Math.min(1, Math.max(0, (xp - current) / Math.max(1, next - current))),
  };
}

async function childOfFamily(db: SupabaseClient, familyId: string): Promise<{ id: string; userId: string | null; name: string } | null> {
  const { data } = await db.from("children").select("id, user_id, name").eq("family_id", familyId).order("created_at").limit(1).maybeSingle();
  if (!data) return null;
  return { id: data.id as string, userId: (data.user_id as string | null) ?? null, name: (data.name as string) ?? "ребёнок" };
}

export async function registerGamificationRoutes(app: FastifyInstance, db: SupabaseClient, env: Env): Promise<void> {
  const resolve = async (claims: Claims) => {
    if (claims.role === "child" && claims.childId) {
      const { data } = await db.from("children").select("id, user_id, name").eq("id", claims.childId).maybeSingle();
      return data ? { child: { id: data.id as string, userId: (data.user_id as string | null) ?? null, name: (data.name as string) ?? "ребёнок" }, userId: claims.sub } : null;
    }
    if (!claims.familyId) return null;
    const child = await childOfFamily(db, claims.familyId);
    if (!child) return null;
    return { child, userId: child.userId };
  };

  const computeAchievements = async (userId: string, childId: string) => {
    const checks: Record<string, boolean> = {};
    const [cards, goals, tasks, tests, games, ledger, logins, duel] = await Promise.all([
      db.from("cards").select("id", { count: "exact", head: true }).eq("child_id", childId),
      db.from("goals").select("id", { count: "exact", head: true }).eq("child_id", childId).then((r) => r, () => ({ count: 0 })),
      db.from("parent_tasks").select("id", { count: "exact", head: true }).eq("child_id", childId).eq("status", "approved"),
      db.from("quiz_results").select("id", { count: "exact", head: true }).eq("user_id", userId).then((r) => r, () => ({ count: 0 })),
      db.from("budget_events").select("id, decision", { count: "exact" }).eq("user_id", userId).then((r) => r, () => ({ count: 0, data: [] })),
      db.from("coin_ledger").select("amount").eq("user_id", userId),
      db.from("daily_logins").select("streak").eq("user_id", userId).order("day", { ascending: false }).limit(1),
      Promise.resolve({ count: 0 }),
    ]);
    void duel;
    const earned = ((ledger as { data?: Array<{ amount: number | string }> | null }).data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
    const saves = ((games as { data?: Array<{ decision: string }> | null }).data ?? []).filter((row) => row.decision === "skip").length;
    const streak = Number(((logins as { data?: Array<{ streak: number | string }> | null }).data ?? [])[0]?.streak ?? 0);

    checks.first_card = (cards.count ?? 0) > 0;
    checks.first_goal = ((goals as { count?: number }).count ?? 0) > 0;
    checks.first_task = (tasks.count ?? 0) > 0;
    checks.tests_3 = ((tests as { count?: number }).count ?? 0) >= 3;
    checks.tests_all = ((tests as { count?: number }).count ?? 0) >= 7;
    checks.coins_500 = earned >= 500;
    checks.coins_1000 = earned >= 1000;
    checks.streak_3 = streak >= 3;
    checks.streak_7 = streak >= 7;
    checks.game_once = (games.count ?? 0) > 0;
    checks.saved_100 = saves >= 5;

    const { data: existing } = await db.from("achievements").select("code").eq("user_id", userId);
    const owned = new Set(((existing ?? []) as Array<{ code: string }>).map((row) => row.code));
    const fresh = Object.entries(checks).filter(([code, ok]) => ok && !owned.has(code)).map(([code]) => code);
    if (fresh.length > 0) {
      await db.from("achievements").insert(fresh.map((code) => ({ user_id: userId, code })));
    }
    return { owned: new Set([...owned, ...fresh]), earned, streak, saves };
  };

  app.get("/gamification/state", async (request, reply) => {
    try {
      const claims = requireAuth(request, env) as unknown as Claims;
      const target = await resolve(claims);
      if (!target || !target.userId) {
        return reply.send({ available: false });
      }
      const userId = target.userId;
      const achievements = await computeAchievements(userId, target.child.id);
      const { data: login } = await db
        .from("daily_logins")
        .select("day, streak, reward")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(1)
        .maybeSingle();
      const claimedToday = Boolean(login && String(login.day) === today());
      const streak = Number(login?.streak ?? 0);
      const lvl = levelOf(achievements.earned);

      const { data: userRow } = await db.from("users").select("coins, card_skin").eq("id", userId).maybeSingle();
      const { data: skinRows } = await db.from("card_skins").select("code").eq("user_id", userId);
      const ownedSkins = new Set(((skinRows ?? []) as Array<{ code: string }>).map((row) => row.code));
      ownedSkins.add("classic");
      if (lvl.level >= 3) ownedSkins.add("neon");
      if (achievements.owned.size >= 5) ownedSkins.add("gold");
      if (streak >= 7) ownedSkins.add("aurora");
      if (achievements.earned >= 500) ownedSkins.add("carbon");

      // Дуэль недели: ребёнок – монеты за неделю, родитель – подтверждённые задания
      const start = weekStart();
      const { data: ledgerWeek } = await db.from("coin_ledger").select("amount, created_at").eq("user_id", userId).gte("created_at", start);
      const childPoints = ((ledgerWeek ?? []) as Array<{ amount: number | string }>).reduce((sum, row) => sum + Number(row.amount), 0);
      const { count: approvedTasks } = await db
        .from("parent_tasks")
        .select("id", { count: "exact", head: true })
        .eq("child_id", target.child.id)
        .eq("status", "approved")
        .gte("created_at", start);
      const parentPoints = (approvedTasks ?? 0) * 10;

      const { data: goalRows } = await db.from("goals").select("saved").eq("child_id", target.child.id);
      const savedTotal = ((goalRows ?? []) as Array<{ saved: number | string }>).reduce((sum, row) => sum + Number(row.saved), 0);
      const petData = petStage(savedTotal);

      return reply.send({
        available: true,
        name: target.child.name,
        coins: Number(userRow?.coins ?? 0),
        level: lvl.level,
        pet: {
          name: "Мобик",
          emoji: petData.stage.emoji,
          title: petData.stage.title,
          speech: petData.stage.speech,
          saved: Math.round(savedTotal),
          nextAt: petData.next ? petData.next.at : null,
          nextTitle: petData.next ? petData.next.title : null,
          progress: petData.progress,
        },
        levelTitle: lvl.title,
        xp: achievements.earned,
        nextXp: lvl.nextXp,
        progress: lvl.progress,
        daily: {
          claimedToday,
          streak,
          day: claimedToday ? Math.min(streak, 7) : (streak % 7) + 1,
          reward: DAILY_REWARDS[Math.min(claimedToday ? Math.min(streak, 7) - 1 : streak % 7, 6)] ?? 10,
        },
        achievements: ACHIEVEMENTS.map((def) => ({ ...def, unlocked: achievements.owned.has(def.code) })),
        skins: SKINS.map((skin) => ({ ...skin, unlocked: ownedSkins.has(skin.code), active: (userRow?.card_skin ?? "classic") === skin.code })),
        duel: { childPoints: Math.round(childPoints), parentPoints, weekStart: start },

      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/gamification/daily", async (request, reply) => {
    try {
      const claims = requireAuth(request, env) as unknown as Claims;
      const target = await resolve(claims);
      if (!target || !target.userId) {
        return reply.code(400).send({ error: "no_child", message: "Нет профиля ребёнка" });
      }
      const userId = target.userId;
      const { data: login } = await db
        .from("daily_logins")
        .select("day, streak, reward")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (login && String(login.day) === today()) {
        return reply.send({ claimed: false, streak: Number(login.streak), reward: 0, coins: null });
      }
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const prevStreak = login && String(login.day) === yesterday ? Number(login.streak) : 0;
      const streak = prevStreak + 1;
      const reward = DAILY_REWARDS[Math.min((streak - 1) % 7, 6)] ?? 10;
      await db.from("daily_logins").insert({ user_id: userId, day: today(), streak, reward });
      const { data: userRow } = await db.from("users").select("coins").eq("id", userId).maybeSingle();
      const coins = Number(userRow?.coins ?? 0) + reward;
      await db.from("users").update({ coins }).eq("id", userId);
      await db.from("coin_ledger").insert({ user_id: userId, amount: reward, reason: "daily" });
      return reply.send({ claimed: true, streak, reward, coins });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/gamification/skins/equip", async (request, reply) => {
    try {
      const claims = requireAuth(request, env) as unknown as Claims;
      const body = z.object({ code: z.string().min(1).max(32) }).parse(request.body ?? {});
      const target = await resolve(claims);
      if (!target || !target.userId) {
        return reply.code(400).send({ error: "no_child", message: "Нет профиля ребёнка" });
      }
      if (!SKINS.some((skin) => skin.code === body.code)) {
        return reply.code(400).send({ error: "unknown_skin", message: "Нет такого скина" });
      }
      await db.from("users").update({ card_skin: body.code }).eq("id", target.userId);
      await db.from("card_skins").upsert({ user_id: target.userId, code: body.code }, { onConflict: "user_id,code" });
      return reply.send({ skin: body.code });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
