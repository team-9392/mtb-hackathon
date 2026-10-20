import {
  OPERATIONS,
  consentsFor,
  defaultAllowed,
  defaultOperationAllowed,
  PRODUCTS,
  productsFor,
  requiresWrittenConsent,
} from "./permissions";
import type {
  AgeBracket,
  Consent,
  FamilyState,
  Localized,
  Permission,
} from "./types";

export const L = (ru: string, be: string): Localized => ({ ru, be });

export function buildConsents(bracket: AgeBracket): Consent[] {
  return consentsFor(bracket).map((id) => ({
    id,
    required: true,
    signedAt: null,
  }));
}

export function buildPermissions(bracket: AgeBracket, consents: Consent[]): Permission[] {
  const signed = (id: string) => consents.some((c) => c.id === id && c.signedAt !== null);
  const products: Permission[] = productsFor(bracket).map((id) => ({
    id,
    kind: "product" as const,
    allowed: defaultAllowed(bracket, id),
    requiresConsent: requiresWrittenConsent(id, bracket),
    hasConsent: !requiresWrittenConsent(id, bracket) || signed("written14"),
    pendingRequest: false,
  }));
  const operations: Permission[] = OPERATIONS.map((id) => ({
    id,
    kind: "operation" as const,
    allowed: defaultOperationAllowed(bracket, id),
    requiresConsent: false,
    hasConsent: true,
    pendingRequest: false,
  }));
  return [...products, ...operations];
}

export const initialState: FamilyState = {
  role: null,
  onboarded: false,
  child: { name: "", age: 10, bracket: "child_7_13" },
  card: {
    status: "issued",
    physical: "ordered",
    last4: "0000",
    number: "",
    system: "visa",
    type: "virtual",
    expiry: "",
  },
  consents: buildConsents("child_7_13"),
  permissions: buildPermissions("child_7_13", []),
  limits: { monthly: 0, perTxn: 0, confirmEach: false, pocketWeekly: 0, pocketDay: "monday" },
  balance: 0,
  savedOnGoal: 0,
  goal: { title: L("Цель", "Мэта"), emoji: "🎯", target: 0, saved: 0, autoSave: false },
  points: 0,
  quests: [],
  txns: [],
  requests: [],
  notifications: [],
  accessGranted: false,
  childSession: false,
  accounts: [],
  transfers: [],
};

export const ALL_PRODUCT_IDS = PRODUCTS;
