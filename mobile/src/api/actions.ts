import { api } from "./client";
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
export function issueCardApi(childId: string): Promise<unknown> {
  return api(`${child(childId)}/card`, { method: "POST", body: {} });
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
