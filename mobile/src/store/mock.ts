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
  AppNotification,
  Consent,
  FamilyState,
  Localized,
  Permission,
} from "./types";

export const L = (ru: string, be: string): Localized => ({ ru, be });

const iso = (daysAgo: number): string =>
  new Date(Date.now() - daysAgo * 86400000).toISOString();

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

const notifications: AppNotification[] = [
  {
    id: "n1",
    title: L("Запрос от Ани", "Запыт ад Ані"),
    body: L("Просит открыть вклад для накоплений", "Просіць адкрыць уклад для зберажэнняў"),
    at: iso(0),
    kind: "request",
  },
  {
    id: "n2",
    title: L("Награда зачислена", "Узнагарода залічана"),
    body: L("3 BYN за задание «Помыть посуду»", "3 BYN за заданне «Памыць посуд»"),
    at: iso(1),
    kind: "reward",
  },
];

export const initialState: FamilyState = {
  role: null,
  onboarded: false,
  child: { name: "Аня", age: 10, bracket: "child_7_13" },
  card: { status: "issued", physical: "ordered", last4: "4417" },
  consents: buildConsents("child_7_13"),
  permissions: buildPermissions("child_7_13", []),
  limits: { monthly: 60, perTxn: 20, confirmEach: false, pocketWeekly: 20, pocketDay: "friday" },
  balance: 43.7,
  savedOnGoal: 128.5,
  goal: { title: L("Самокат", "Самакат"), emoji: "🛴", target: 300, saved: 128.5, autoSave: true },
  points: 145,
  quests: [
    {
      id: "q1",
      title: L("Убрать комнату", "Прыбраць пакой"),
      from: "parent",
      kind: "task",
      points: 0,
      amount: 5,
      status: "waiting",
    },
    {
      id: "q2",
      title: L("Урок: что такое копилка", "Урок: што такое скарбонка"),
      from: "moby",
      kind: "lesson",
      points: 20,
      amount: 0,
      status: "todo",
    },
    {
      id: "q3",
      title: L("Мини-квиз: бюджет на неделю", "Міні-квіз: бюджэт на тыдзень"),
      from: "moby",
      kind: "lesson",
      points: 15,
      amount: 0,
      status: "approved",
    },
    {
      id: "q4",
      title: L("Помыть посуду 3 дня", "Памыць посуд 3 дні"),
      from: "parent",
      kind: "task",
      points: 0,
      amount: 3,
      status: "approved",
    },
  ],
  txns: [
    {
      id: "t1",
      title: L("Супермаркет «Соседи»", "Супермаркет «Соседи»"),
      amount: -31.2,
      category: "groceries",
      at: iso(0),
      status: "done",
      byChild: false,
    },
    {
      id: "t2",
      title: L("Детский мир", "Дзіцячы свет"),
      amount: -24.9,
      category: "kids",
      at: iso(1),
      status: "done",
      byChild: true,
    },
    {
      id: "t3",
      title: L("Аптека «Планета»", "Аптэка «Планета»"),
      amount: -12.4,
      category: "pharmacy",
      at: iso(2),
      status: "done",
      byChild: true,
    },
    {
      id: "t4",
      title: L("Городское кафе", "Гарадское кафэ"),
      amount: -8.5,
      category: "fun",
      at: iso(3),
      status: "done",
      byChild: true,
    },
    {
      id: "t5",
      title: L("Ставки на спорт (заблокировано)", "Стаўкі на спорт (заблакавана)"),
      amount: -15,
      category: "gambling",
      at: iso(4),
      status: "declined",
      byChild: true,
    },
    {
      id: "t6",
      title: L("Карманные деньги", "Кішэнныя грошы"),
      amount: 20,
      category: "fun",
      at: iso(5),
      status: "done",
      byChild: true,
    },
  ],
  requests: [
    {
      id: "r1",
      label: L("Вклад для накоплений", "Уклад для зберажэнняў"),
      target: "deposit",
      status: "pending",
      at: iso(0),
    },
  ],
  notifications,
  accessGranted: false,
  childSession: false,
};

export const ALL_PRODUCT_IDS = PRODUCTS;
