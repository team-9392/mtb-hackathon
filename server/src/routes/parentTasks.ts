import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { Env } from "../env.js";
import { requireAuth, sendError } from "../http.js";
import { notify, parentUserIdOfFamily } from "../repo.js";

const createSchema = z.object({
  title: z.string().min(2).max(120),
  points: z.coerce.number().int().min(5).max(500).default(20),
});

const patchSchema = z.object({ status: z.enum(["done", "approved"]) });

/** Задания от родителя: родитель создаёт, ребёнок отмечает, родитель подтверждает и начисляет монеты. */
export async function registerParentTaskRoutes(
  app: FastifyInstance,
  db: SupabaseClient,
  env: Env,
): Promise<void> {
  const loadChild = async (id: string) => {
    const { data } = await db.from("children").select("id, family_id, user_id, name").eq("id", id).maybeSingle();
    return data as { id: string; family_id: string; user_id: string | null; name: string } | null;
  };

  app.get("/children/:id/tasks", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { id } = request.params as { id: string };
      const child = await loadChild(id);
      if (!child || (claims.role === "child" && child.user_id !== claims.sub)) {
        return reply.code(404).send({ error: "not_found", message: "Ребёнок не найден" });
      }
      const { data } = await db
        .from("parent_tasks")
        .select("id, title, points, status, created_at, done_at")
        .eq("child_id", id)
        .order("created_at", { ascending: false });
      return reply.send({ tasks: data ?? [] });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/children/:id/tasks", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      if (claims.role !== "parent") {
        return reply.code(403).send({ error: "forbidden", message: "Только родитель" });
      }
      const { id } = request.params as { id: string };
      const child = await loadChild(id);
      if (!child) {
        return reply.code(404).send({ error: "not_found", message: "Ребёнок не найден" });
      }
      const body = createSchema.parse(request.body ?? {});
      const { data, error } = await db
        .from("parent_tasks")
        .insert({ child_id: id, created_by: claims.sub, title: body.title.trim(), points: body.points })
        .select("id, title, points, status, created_at, done_at")
        .single();
      if (error || !data) {
        return reply.code(500).send({ error: "create_failed", message: "Не удалось создать задание" });
      }
      if (child.user_id) {
        await notify(db, child.user_id, child.family_id, "request", "Новое задание", "Новае заданне", body.title, body.title);
      }
      return reply.code(201).send({ task: data });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/children/:id/tasks/:taskId", async (request, reply) => {
    try {
      const claims = requireAuth(request, env);
      const { id, taskId } = request.params as { id: string; taskId: string };
      const child = await loadChild(id);
      if (!child) {
        return reply.code(404).send({ error: "not_found", message: "Задание не найдено" });
      }
      const body = patchSchema.parse(request.body ?? {});
      const { data: task } = await db
        .from("parent_tasks")
        .select("id, title, points, status, child_id")
        .eq("id", taskId)
        .eq("child_id", id)
        .maybeSingle();
      if (!task) {
        return reply.code(404).send({ error: "not_found", message: "Задание не найдено" });
      }
      if (body.status === "done") {
        if (claims.role !== "child" || child.user_id !== claims.sub) {
          return reply.code(403).send({ error: "forbidden", message: "Отметить может ребёнок" });
        }
        const { data } = await db
          .from("parent_tasks")
          .update({ status: "done", done_at: new Date().toISOString() })
          .eq("id", taskId)
          .select("id, title, points, status, created_at, done_at")
          .single();
        const parentId = await parentUserIdOfFamily(db, child.family_id);
        if (parentId) {
          await notify(db, parentId, child.family_id, "request", "Задание выполнено", "Заданне выканана", task.title, task.title);
        }
        return reply.send({ task: data });
      }
      if (claims.role !== "parent") {
        return reply.code(403).send({ error: "forbidden", message: "Подтвердить может родитель" });
      }
      const { data } = await db
        .from("parent_tasks")
        .update({ status: "approved" })
        .eq("id", taskId)
        .select("id, title, points, status, created_at, done_at")
        .single();
      if (child.user_id) {
        const { data: user } = await db.from("users").select("coins").eq("id", child.user_id).maybeSingle();
        const coins = ((user?.coins as number | null) ?? 0) + (task.points as number);
        await db.from("users").update({ coins }).eq("id", child.user_id);
        await db.from("coin_ledger").insert({ user_id: child.user_id, amount: task.points, reason: "quest" });
        await notify(db, child.user_id, child.family_id, "reward", "Монеты за задание", "Манеты за заданне", task.title + " · +" + task.points + " монет", task.title + " · +" + task.points + " манет");
      }
      return reply.send({ task: data });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
