import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";

import { verifyAccess } from "./auth.js";
import type { Env } from "./env.js";
import { registerGuard } from "./guard.js";
import { hub } from "./hub.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCardRoutes } from "./routes/cards.js";
import { registerChildRoutes } from "./routes/child.js";
import { registerFamilyRoutes } from "./routes/family.js";
import { registerMoneyRoutes } from "./routes/money.js";
import { registerBonusRoutes } from "./routes/bonuses.js";
import { registerPartnerRoutes } from "./routes/partners.js";
import { registerPaymentRoutes } from "./routes/payments.js";
import { configureTelegram, startTelegramPoller } from "./telegram.js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * CORS в проде не должен быть «разрешено всем».
 * Явный CORS_ORIGIN имеет приоритет; если он пуст, разрешаем только домен
 * API и туннели Expo (*.on.expo.app), плюс localhost для разработки.
 */
const DEFAULT_CORS_ORIGINS = ["https://malanka.jaraslau.dev"];
const EXPO_TUNNEL_ORIGIN = /^https:\/\/[a-z0-9-]+\.on\.expo\.app$/i;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isAllowedOrigin(origin: string, configured: string[]): boolean {
  if (configured.length > 0) {
    return configured.includes("*") || configured.includes(origin);
  }
  return DEFAULT_CORS_ORIGINS.includes(origin) || EXPO_TUNNEL_ORIGIN.test(origin) || LOCAL_ORIGIN.test(origin);
}

export async function buildApp(env: Env, db: SupabaseClient): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: "info" },
    trustProxy: true,
    bodyLimit: 1024 * 256,
  });

  const configuredOrigins = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (requestOrigin, callback) => {
      // Мобильные клиенты не присылают Origin — это не браузерный CORS-запрос.
      if (!requestOrigin) {
        callback(null, true);
        return;
      }
      callback(null, isAllowedOrigin(requestOrigin, configuredOrigins));
    },
    credentials: false,
  });
  await app.register(websocket);

  /**
   * Мобильные сборки иногда присылают POST с content-type: application/json
   * и пустым телом (например, «выпустить карту» без настроек). Штатный парсер
   * Fastify отвечает на это 400 FST_ERR_CTP_EMPTY_JSON_BODY, а глобальный
   * обработчик превращал его в 500 — отсюда жалоба «карта не выпускается».
   * Пустое тело считаем пустым объектом: схема запроса подставит значения
   * по умолчанию или вернёт понятную ошибку валидации.
   */
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const raw = typeof body === "string" ? body : "";
    if (raw.trim().length === 0) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(raw));
    } catch {
      const error = new Error("Некорректный JSON в запросе") as Error & {
        statusCode: number;
        code: string;
      };
      error.statusCode = 400;
      error.code = "FST_ERR_CTP_INVALID_JSON_BODY";
      done(error);
    }
  });

  /**
   * Запрет кэширования ответов с персональными данными/реквизитами.
   * HSTS, X-Content-Type-Options и X-Frame-Options отдаёт nginx
   * (/etc/nginx/snippets/moby-api.conf), чтобы заголовки были и на
   * статике, и на ошибках прокси.
   */
  app.addHook("onSend", async (request, reply, payload) => {
    const path = request.url.split("?")[0] ?? "";
    const privateResponse =
      path.startsWith("/auth/") ||
      path === "/me" ||
      /^\/children\/[^/]+\/cards?(\/|$)/.test(path);
    if (privateResponse) {
      reply.header("Cache-Control", "no-store, no-cache, must-revalidate, private");
      reply.header("Pragma", "no-cache");
      reply.header("Expires", "0");
    }
    return payload;
  });

  // Отзыв сессии и отзыв доступа ребёнка проверяются до обработчиков.
  registerGuard(app, db, env);

  app.get("/health", async () => ({
    ok: true,
    service: "moby-family-api",
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN),
    at: new Date().toISOString(),
  }));

  configureTelegram(env);
  startTelegramPoller(db, env);

  registerAuthRoutes(app, db, env);
  registerCardRoutes(app, db, env);
  registerFamilyRoutes(app, db, env);
  registerChildRoutes(app, db, env);
  registerMoneyRoutes(app, db, env);
  registerPaymentRoutes(app, db, env);
  registerBonusRoutes(app, db, env);
  registerPartnerRoutes(app);

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

  app.setErrorHandler((error, request, reply) => {
    // Ошибки уровня Fastify (кривой JSON, слишком большое тело) — это 4xx,
    // а не 500. Раньше они маскировались под «внутреннюю ошибку сервера».
    const statusCode =
      typeof (error as { statusCode?: number }).statusCode === "number"
        ? ((error as { statusCode?: number }).statusCode as number)
        : 500;
    if (statusCode >= 400 && statusCode < 500) {
      request.log.warn({ err: error, statusCode }, "запрос отклонён на уровне HTTP");
      const message =
        statusCode === 413
          ? "Слишком большой запрос"
          : statusCode === 415
            ? "Неподдерживаемый формат данных"
            : "Проверьте параметры запроса";
      void reply
        .status(statusCode)
        .send({ error: statusCode === 400 ? "bad_request" : "request_error", message });
      return;
    }
    app.log.error(error);
    void reply.status(500).send({ error: "internal", message: "Внутренняя ошибка сервера" });
  });

  return app;
}