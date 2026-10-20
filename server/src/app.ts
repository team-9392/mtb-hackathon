import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";

import { verifyAccess } from "./auth.js";
import type { Env } from "./env.js";
import { hub } from "./hub.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerChildRoutes } from "./routes/child.js";
import { registerFamilyRoutes } from "./routes/family.js";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function buildApp(env: Env, db: SupabaseClient): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: "info" },
    trustProxy: true,
    bodyLimit: 1024 * 256,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : true,
    credentials: false,
  });
  await app.register(websocket);

  app.get("/health", async () => ({
    ok: true,
    service: "moby-family-api",
    demoOtp: Boolean(env.DEMO_OTP),
    at: new Date().toISOString(),
  }));

  registerAuthRoutes(app, db, env);
  registerFamilyRoutes(app, db, env);
  registerChildRoutes(app, db, env);

  /**
   * Живая связь двух телефонов: родитель и ребёнок одной семьи получают
   * событие сразу, как только второй что-то изменил.
   */
  app.get("/realtime", { websocket: true }, (socket, request) => {
    const query = request.query as { token?: string };
    if (!query.token) {
      socket.close(4401, "no-token");
      return;
    }

    let familyId: string;
    try {
      const claims = verifyAccess(env, query.token);
      if (!claims.familyId) {
        socket.close(4403, "no-family");
        return;
      }
      familyId = claims.familyId;
    } catch {
      socket.close(4401, "bad-token");
      return;
    }

    const leave = hub.join(familyId, { send: (payload) => socket.send(payload) });
    socket.send(JSON.stringify({ topic: "ready", payload: { familyId, clients: hub.clients(familyId) } }));

    socket.on("message", (raw: Buffer) => {
      if (raw.toString() === "ping") {
        socket.send(JSON.stringify({ topic: "pong", payload: {} }));
      }
    });

    socket.on("close", leave);
    socket.on("error", leave);
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    void reply.status(500).send({ error: "internal", message: "Внутренняя ошибка сервера" });
  });

  return app;
}
