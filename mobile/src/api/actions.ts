import { api } from "./client";
import type { TransferRow } from "@/store/types";
import type { AgeBracket, ConsentId, LimitState, Localized, OperationId, ProductId } from "@/store/types";

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
