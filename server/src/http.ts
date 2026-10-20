import type { FastifyReply, FastifyRequest } from "fastify";

import { verifyAccess, type AuthClaims } from "./auth.js";
import type { Env } from "./env.js";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function unauthorized(message = "Требуется вход"): ApiError {
  return new ApiError(401, "unauthorized", message);
}

export function forbidden(message = "Недостаточно прав"): ApiError {
  return new ApiError(403, "forbidden", message);
}

export function notFound(message = "Не найдено"): ApiError {
  return new ApiError(404, "not_found", message);
}

export function badRequest(message: string): ApiError {
  return new ApiError(400, "bad_request", message);
}

export function conflict(message: string): ApiError {
  return new ApiError(409, "conflict", message);
}

export function requireAuth(request: FastifyRequest, env: Env): AuthClaims {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw unauthorized();
  }
  try {
    return verifyAccess(env, header.slice("Bearer ".length));
  } catch {
    throw unauthorized("Сессия истекла, войдите заново");
  }
}

export function requireFamily(claims: AuthClaims): string {
  if (!claims.familyId) {
    throw forbidden("Сначала нужно создать семью или войти по коду приглашения");
  }
  return claims.familyId;
}

export function requireParent(claims: AuthClaims): string {
  const familyId = requireFamily(claims);
  if (claims.role !== "parent") {
    throw forbidden("Действие доступно только родителю");
  }
  return familyId;
}

export function requireChild(claims: AuthClaims): string {
  if (claims.role !== "child" || !claims.childId) {
    throw forbidden("Действие доступно только ребёнку");
  }
  return claims.childId;
}

/** Человеческие тексты для ошибок валидации — вместо простыни из zod. */
const FIELD_HINTS: Record<string, string> = {
  fullName: "Укажите имя и фамилию",
  name: "Укажите имя",
  phone: "Проверьте номер телефона",
  accessCode: "Проверьте код доступа",
  amount: "Проверьте сумму",
  kind: "Выберите счёт",
  from: "Выберите, откуда перевести",
  to: "Выберите, куда перевести",
  status: "Неизвестное действие",
  code: "Проверьте код из SMS",
};

export function sendError(reply: FastifyReply, error: unknown): void {
  if (error instanceof ApiError) {
    void reply.status(error.status).send({ error: error.code, message: error.message });
    return;
  }
  // Ошибки схем запросов: отдаём понятный текст и 400 вместо 500 с JSON от zod.
  const issues = (error as { issues?: { path?: (string | number)[]; code?: string }[] })?.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    const first = issues[0];
    const field = String(first?.path?.[0] ?? "");
    const message = FIELD_HINTS[field] ?? "Проверьте введённые данные";
    void reply.status(400).send({ error: "validation", message, fields: issues.map((issue) => issue.path?.[0]) });
    return;
  }
  const raw = error instanceof Error ? error.message : "";
  // Технические ошибки PostgREST («cannot coerce the result to a single JSON object») наружу не отдаём.
  if (raw.includes("coerce the result") || raw.includes("JSON object")) {
    void reply
      .status(409)
      .send({ error: "stale_data", message: "Данные устарели — обновите экран и попробуйте ещё раз" });
    return;
  }
  const message = raw.length > 0 ? raw : "Внутренняя ошибка";
  void reply.status(500).send({ error: "internal", message });
}
