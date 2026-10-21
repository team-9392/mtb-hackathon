import { api } from "./client";
import type { SessionClaims } from "./types";
import type { TransferRow } from "@/store/types";
import type { AgeBracket, ConsentId, LimitState, Localized, OperationId, ProductId } from "@/store/types";

/** Данные родителя и ребёнка, которые уходят одним запросом на шаге оплаты. */
export interface FamilySignupInput {
  fullName: string;
  idNumber: string;
  childName: string;
  bracket: AgeBracket;
}

export interface FamilySignupChild {
  id: string;
  name: string;
  bracket: AgeBracket;
  access_code?: string;
  access_granted?: boolean;
  points?: number;
}

export interface FamilySignupResponse {
  family: { id: string; invite_code: string; tariff: string; currency?: string };
  child: FamilySignupChild;
  packageComplete: boolean;
  accessToken: string;
  refreshToken: string;
  claims: SessionClaims;
}

/**
 * Создание семьи вместе с ребёнком. Сервер сам выпускает права, счета
 * и согласия, поэтому отдельный /family/children при регистрации не нужен.
 */
export function createFamilyApi(body: FamilySignupInput): Promise<FamilySignupResponse> {
  return api<FamilySignupResponse>("/auth/family", { method: "POST", body });
}

/** Профиль родителя: имя и идентификационный номер можно менять по отдельности. */
export function updateProfileApi(patch: { fullName?: string; idNumber?: string }): Promise<{
  user: { id: string; phone: string; fullName?: string | null; idNumber?: string | null };
  claims: SessionClaims;
}> {
  return api("/me", { method: "PATCH", body: patch });
}

const child = (childId: string): string => `/children/${childId}`;

/** Создание ребёнка в семье родителя. */
export function createChildApi(body: { name: string; bracket: AgeBracket }): Promise<unknown> {
  return api("/family/children", { method: "POST", body });
}

/** Подпись согласий: сервер ставит дату и пишет запись в журнал аудита. */
export function signConsentsApi(childId: string, kinds: ConsentId[]): Promise<unknown> {
  return api(`${child(childId)}/consents`, { method: "POST", body: { kinds } });
}

/** Доступ ребёнка к приложению. */
export function setAccessApi(childId: string, granted: boolean): Promise<unknown> {
  return api(`${child(childId)}/access`, { method: "POST", body: { granted } });
}

/** Выпуск карты. */
export function issueCardApi(
  childId: string,
  type: "virtual" | "plastic",
  system: "visa" | "mastercard" | "belkart" | "unionpay",
): Promise<unknown> {
  return api(`${child(childId)}/card`, { method: "POST", body: { type, system } });
}

/** Блокировка и разблокировка карты. */
export function patchCardApi(childId: string, blocked: boolean): Promise<unknown> {
  return api(`${child(childId)}/card`, { method: "PATCH", body: { blocked } });
}

/** Разрешение или запрет продукта. */
export function patchPermissionApi(childId: string, productId: ProductId, allowed: boolean): Promise<unknown> {
  return api(`${child(childId)}/permissions`, { method: "PATCH", body: { productId, allowed } });
}

/** Разрешение или запрет операции. */
export function patchOperationApi(childId: string, operationId: OperationId, allowed: boolean): Promise<unknown> {
  return api(`${child(childId)}/operations`, { method: "PATCH", body: { operationId, allowed } });
}

/** Лимиты. */
export function patchLimitsApi(childId: string, patch: Partial<LimitState>): Promise<unknown> {
  return api(`${child(childId)}/limits`, {
    method: "PATCH",
    body: {
      monthly: patch.monthly,
      perTxn: patch.perTxn,
      pocketWeekly: patch.pocketWeekly,
      pocketDay: patch.pocketDay === undefined ? undefined : patch.pocketDay === "friday" ? 5 : 1,
      confirmEach: patch.confirmEach,
    },
  });
}

/** Ребёнок просит доступ. */
export function createRequestApi(
  childId: string,
  target: ProductId | "limit",
  label: Localized,
): Promise<unknown> {
  return api(`${child(childId)}/requests`, {
    method: "POST",
    body: { target, labelRu: label.ru, labelBe: label.be },
  });
}

/** Родитель решает по запросу. */
export function resolveRequestApi(childId: string, requestId: string, approve: boolean): Promise<unknown> {
  return api(`${child(childId)}/requests/${requestId}`, {
    method: "PATCH",
    body: { status: approve ? "approved" : "declined" },
  });
}

/** Пополнение цели. */
export function depositGoalApi(childId: string, goalId: string, amount: number): Promise<unknown> {
  return api(`${child(childId)}/goals/${goalId}/deposit`, { method: "POST", body: { amount } });
}

/** Квест ребёнка. */
export function completeQuestApi(childId: string, questId: string): Promise<unknown> {
  return api(`${child(childId)}/quests/${questId}/complete`, { method: "POST", body: {} });
}

/** Подтверждение квеста родителем. */
export function approveQuestApi(childId: string, questId: string): Promise<unknown> {
  return api(`${child(childId)}/quests/${questId}/approve`, { method: "PATCH", body: {} });
}

/** Открытие счёта. Ребёнку недоступные по возрасту счета сервер заводит только по запросу. */
export function openAccountApi(
  childId: string,
  kind: "pocket" | "savings" | "deposit",
): Promise<{ status: "opened" | "requested" }> {
  return api(`${child(childId)}/accounts`, { method: "POST", body: { kind } }) as Promise<{
    status: "opened" | "requested";
  }>;
}

/** Перевод между своими счетами. */
export function transferApi(
  childId: string,
  from: string,
  to: string,
  amount: number,
): Promise<unknown> {
  return api(`${child(childId)}/transfers`, { method: "POST", body: { from, to, amount } });
}

/** Родитель переводит деньги ребёнку на карман. */
export function topUpApi(childId: string, amount: number): Promise<{ ok: boolean; balance: number }> {
  return api(`${child(childId)}/topup`, { method: "POST", body: { amount } }) as Promise<{
    ok: boolean;
    balance: number;
  }>;
}

/** Заявка ребёнка: платёж ЕРИП или перевод по номеру. Деньги списывает родитель. */
export function createPaymentApi(
  childId: string,
  kind: "erip" | "phone",
  amount: number,
  recipient: string,
): Promise<{ status: "pending"; requestId: string | null }> {
  return api(`${child(childId)}/payments`, { method: "POST", body: { kind, amount, recipient } }) as Promise<{
    status: "pending";
    requestId: string | null;
  }>;
}

/** Токен устройства для push-уведомлений. */
export function registerPushTokenApi(token: string, platform: string): Promise<unknown> {
  return api("/push/token", { method: "POST", body: { token, platform } });
}

/** История переводов. */
export function loadTransfersApi(childId: string): Promise<{ transfers: TransferRow[] }> {
  return api(`${child(childId)}/transfers`);
}

/** Отправить CVV и PIN карты в Telegram (в приложении не показываются). */
export function requestCardDetailsApi(
  childId: string,
  cardId: string,
): Promise<{ ok: boolean; sentTo?: string[]; message?: string }> {
  return api(`/children/${childId}/cards/${cardId}/details`, { method: "POST", body: {} });
}

export interface MyCardDto {
  id: string;
  last4: string;
  number: string;
  system: string;
  type: string;
  expiry: string;
  status: string;
  masked: string;
  balance?: number;
}
export function myCardsApi(): Promise<{ cards: MyCardDto[] }> {
  return api("/me/cards");
}
export function issueMyCardApi(body: { type: string; system: string }): Promise<{ card: MyCardDto }> {
  return api("/me/cards", { method: "POST", body });
}
export function requestMyCardDetailsApi(cardId: string): Promise<{ ok: boolean; message?: string }> {
  return api(`/me/cards/${cardId}/details`, { method: "POST", body: {} });
}

export interface ParentTaskDto {
  id: string;
  title: string;
  points: number;
  status: "new" | "done" | "approved";
  created_at?: string;
  done_at?: string | null;
}
export function childTasksApi(childId: string): Promise<{ tasks: ParentTaskDto[] }> {
  return api("/children/" + childId + "/tasks");
}
export function createTaskApi(childId: string, title: string, amount: number): Promise<{ task: ParentTaskDto }> {
  return api("/children/" + childId + "/tasks", { method: "POST", body: { title, amount } });
}
export function updateTaskApi(childId: string, taskId: string, status: "done" | "approved"): Promise<{ task: ParentTaskDto }> {
  return api("/children/" + childId + "/tasks/" + taskId, { method: "PATCH", body: { status } });
}

export function createGoalApi(childId: string, title: string, target: number): Promise<{ goal: { id: string } }> {
  return api("/children/" + childId + "/goals", { method: "POST", body: { title, target } });
}
export function editGoalApi(childId: string, goalId: string, patch: { title?: string; target?: number }): Promise<{ goal: { id: string } }> {
  return api("/children/" + childId + "/goals/" + goalId, { method: "PATCH", body: patch });
}
