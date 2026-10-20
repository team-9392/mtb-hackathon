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

export function sendError(reply: FastifyReply, error: unknown): void {
  if (error instanceof ApiError) {
    void reply.status(error.status).send({ error: error.code, message: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : "Внутренняя ошибка";
  void reply.status(500).send({ error: "internal", message });
}
