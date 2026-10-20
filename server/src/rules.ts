/**
 * Бизнес-правила пакета «Фэмили». Сервер — источник истины:
 * даже подделанный клиент не сможет оплатить то, что запрещено.
 */

export type Bracket = "child_7_13" | "teen_14_17";
export type ProductId = "card" | "pocket" | "savings" | "deposit" | "insurance" | "subscriptions";
export type OperationId = "pay" | "online" | "transfer" | "cash";
export type ConsentId = "legal" | "pd" | "access" | "written14";

export const HARD_BLOCKED_CATEGORIES: string[] = ["gambling", "adult"];

export const ALL_PRODUCTS: ProductId[] = [
  "card",
  "pocket",
  "savings",
  "deposit",
  "insurance",
  "subscriptions",
];

export function productsFor(bracket: Bracket): ProductId[] {
  if (bracket === "child_7_13") {
    return ["card", "pocket", "savings", "insurance", "subscriptions"];
  }
  return ["card", "pocket", "savings", "deposit", "insurance", "subscriptions"];
}

export function consentsFor(bracket: Bracket): ConsentId[] {
  if (bracket === "child_7_13") {
    return ["legal", "pd", "access"];
  }
  return ["legal", "pd", "access", "written14"];
}

export function requiresWrittenConsent(product: ProductId, bracket: Bracket): boolean {
  return bracket === "teen_14_17" && product === "deposit";
}

export function defaultAllowed(bracket: Bracket, product: ProductId): boolean {
  return productsFor(bracket).includes(product);
}

export function defaultOperationAllowed(bracket: Bracket, operation: OperationId): boolean {
  if (operation === "pay") {
    return true;
  }
  if (bracket === "teen_14_17") {
    return operation === "online";
  }
  return false;
}

export function isHardBlocked(category: string): boolean {
  return HARD_BLOCKED_CATEGORIES.includes(category);
}

export function spentThisMonth(
  txns: { amount: number; status: string; byChild: boolean; createdAt: string }[],
): number {
  const now = new Date();
  return txns
    .filter((txn) => {
      const at = new Date(txn.createdAt);
      return (
        txn.byChild &&
        txn.status === "approved" &&
        txn.amount < 0 &&
        at.getUTCFullYear() === now.getUTCFullYear() &&
        at.getUTCMonth() === now.getUTCMonth()
      );
    })
    .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
}

export function limitLeft(limit: number, spent: number): number {
  return Math.max(0, limit - spent);
}

export type DeclineReason =
  | "hard_blocked"
  | "monthly_limit"
  | "per_txn_limit"
  | "operation_disabled"
  | "insufficient_funds";

export type Decision =
  | { status: "approved" }
  | { status: "declined"; reason: DeclineReason };

export interface PaymentContext {
  bracket: Bracket;
  category: string;
  amount: number;
  operation: OperationId;
  monthlyLimit: number;
  perTxnLimit: number;
  spentThisMonth: number;
  operationAllowed: boolean;
}

export const DECLINE_MESSAGE: Record<DeclineReason, { ru: string; be: string }> = {
  hard_blocked: {
    ru: "Операция запрещена правилами пакета для детей",
    be: "Аперацыя забаронена правіламі пакета для дзяцей",
  },
  monthly_limit: {
    ru: "Превышен месячный лимит",
    be: "Перавышаны месячны ліміт",
  },
  per_txn_limit: {
    ru: "Превышен лимит на одну операцию",
    be: "Перавышаны ліміт на адну аперацыю",
  },
  operation_disabled: {
    ru: "Этот тип операций отключён родителем",
    be: "Гэты тып аперацый адключаны бацькам",
  },
  insufficient_funds: {
    ru: "Недостаточно средств на карте",
    be: "Недастаткова сродкаў на карце",
  },
};

export function decidePayment(ctx: PaymentContext): Decision {
  if (isHardBlocked(ctx.category)) {
    return { status: "declined", reason: "hard_blocked" };
  }
  if (!ctx.operationAllowed) {
    return { status: "declined", reason: "operation_disabled" };
  }
  const amount = Math.abs(ctx.amount);
  if (ctx.perTxnLimit > 0 && amount > ctx.perTxnLimit) {
    return { status: "declined", reason: "per_txn_limit" };
  }
  if (ctx.monthlyLimit > 0 && ctx.spentThisMonth + amount > ctx.monthlyLimit) {
    return { status: "declined", reason: "monthly_limit" };
  }
  return { status: "approved" };
}

export function defaultLimits(bracket: Bracket): {
  monthly: number;
  perTxn: number;
  pocketWeekly: number;
  pocketDay: number;
} {
  if (bracket === "child_7_13") {
    return { monthly: 100, perTxn: 30, pocketWeekly: 20, pocketDay: 0 };
  }
  return { monthly: 300, perTxn: 100, pocketWeekly: 50, pocketDay: 0 };
}
