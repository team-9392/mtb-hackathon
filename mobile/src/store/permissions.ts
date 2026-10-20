import type { AgeBracket, CategoryId, ConsentId, OperationId, ProductId } from "./types";

export const HARD_BLOCKED_CATEGORIES: CategoryId[] = ["gambling", "adult"];

export const PRODUCTS: ProductId[] = [
  "card",
  "pocket",
  "savings",
  "deposit",
  "insurance",
  "subscriptions",
];

export const OPERATIONS: OperationId[] = ["pay", "online", "transfer", "cash"];

export function productsFor(bracket: AgeBracket): ProductId[] {
  const base: ProductId[] = ["card", "pocket", "savings", "insurance", "subscriptions"];
  return bracket === "teen_14_17" ? [...base, "deposit"] : base;
}

export function consentsFor(bracket: AgeBracket): ConsentId[] {
  const base: ConsentId[] = ["legal", "pd", "access"];
  return bracket === "teen_14_17" ? [...base, "written14"] : base;
}

export function requiresWrittenConsent(product: ProductId, bracket: AgeBracket): boolean {
  return product === "deposit" && bracket === "teen_14_17";
}

export function defaultAllowed(bracket: AgeBracket, product: ProductId): boolean {
  if (product === "deposit") return bracket === "teen_14_17";
  return true;
}

export function defaultOperationAllowed(bracket: AgeBracket, op: OperationId): boolean {
  if (bracket === "child_7_13") {
    return op === "pay";
  }
  return op === "pay" || op === "online";
}

export function isHardBlocked(category: CategoryId): boolean {
  return HARD_BLOCKED_CATEGORIES.includes(category);
}

export function bracketLabel(bracket: AgeBracket): { ru: string; be: string } {
  return bracket === "child_7_13"
    ? { ru: "7–13 лет", be: "7–13 гадоў" }
    : { ru: "14–17 лет", be: "14–17 гадоў" };
}

export function rightKeys(bracket: AgeBracket): boolean[] {
  const teen = bracket === "teen_14_17";
  return [true, true, teen, true, true];
}

export function limitLeft(spent: number, monthly: number): number {
  return Math.max(0, monthly - spent);
}

export function spentThisMonth(txns: { amount: number; byChild: boolean; status: string }[]): number {
  return txns
    .filter((t) => t.byChild && t.status !== "declined" && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}
