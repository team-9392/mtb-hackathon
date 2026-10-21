import { api } from "./client";
import type {
  AccessRequest,
  AgeBracket,
  AppNotification,
  CategoryId,
  ConsentId,
  CardSystem,
  CardType,
  FamilyState,
  OperationId,
  ProductId,
  Quest,
  TransferRow,
  Txn,
} from "@/store/types";

export interface ApiConsent {
  kind: string;
  signed_at: string | null;
}
export interface ApiPermission {
  product_id: string;
  allowed: boolean;
  requires_consent: boolean;
  has_consent: boolean;
  pending_request: boolean;
}
export interface ApiOperation {
  operation_id: string;
  allowed: boolean;
}
export interface ApiLimits {
  monthly: number | string | null;
  per_txn: number | string | null;
  pocket_weekly: number | string | null;
  pocket_day_of_week: number | null;
  confirm_each: boolean;
}
export interface ApiCard {
  id?: string;
  last4: string;
  status: string;
  number?: string | null;
  system?: string | null;
  type?: string | null;
  expiry?: string | null;
}
export interface ApiGoal {
  id: string;
  title_ru: string;
  title_be: string;
  emoji: string;
  target: number | string;
  saved: number | string;
  auto_save: boolean;
}
export interface ApiQuest {
  id: string;
  kind: string;
  title_ru: string;
  title_be: string;
  points: number;
  amount: number | string;
  status: string;
}
export interface ApiTxn {
  id: string;
  amount: number | string;
  category: string;
  title_ru: string;
  title_be: string;
  status: string;
  created_at: string;
}
export interface ApiRequest {
  id: string;
  target: string;
  label_ru: string;
  label_be: string;
  status: string;
  created_at: string;
}
export interface ApiAccount {
  kind: string;
  balance: number | string;
}
export interface ApiChildBlock {
  child: {
    id: string;
    name: string;
    bracket: string;
    points: number;
    accessGranted: boolean;
    accessCode?: string;
  };
  limits: ApiLimits | null;
  permissions: ApiPermission[];
  operations: ApiOperation[];
  card: ApiCard | null;
  accounts: ApiAccount[];
  consents: ApiConsent[];
  goals: ApiGoal[];
  quests: ApiQuest[];
  requests: ApiRequest[];
  transactions: ApiTxn[];
}
export interface ApiFamily {
  family: { id: string; invite_code: string; tariff: string };
  children: ApiChildBlock[];
}
export interface ApiNotification {
  id: string;
  kind: string;
  title_ru: string;
  title_be: string;
  body_ru: string;
  body_be: string;
  created_at: string;
}

const num = (value: number | string | null | undefined): number =>
  typeof value === "number" ? value : Number(value ?? 0);

function bracketOf(value: string): AgeBracket {
  return value === "teen_14_17" ? "teen_14_17" : "child_7_13";
}

const CONSENT_ORDER: ConsentId[] = ["legal", "pd", "access", "written14"];
const TXN_STATUS: Record<string, Txn["status"]> = { approved: "done", declined: "declined", pending: "pending" };
const REQUEST_STATUS: Record<string, AccessRequest["status"]> = { approved: "approved", declined: "declined", pending: "pending" };
const QUEST_STATUS: Record<string, Quest["status"]> = { approved: "approved", waiting: "waiting", todo: "todo" };
const NOTIFICATION_KIND: Record<string, AppNotification["kind"]> = {
  request_created: "request",
  request_resolved: "request",
  reward: "reward",
  access: "access",
};

/** Переводит ответ сервера в состояние, которым живут экраны. */
export function mapChildBlock(block: ApiChildBlock): Partial<FamilyState> {
  const bracket = bracketOf(block.child.bracket);
  const goal = block.goals[0];
  return {
    childId: block.child.id,
    accessCode: block.child.accessCode ?? "",
    goalId: goal?.id,
    accounts: [
      ...block.accounts
        .filter((account) => ["pocket", "savings", "deposit"].includes(account.kind))
        .map((account) => ({
          kind: account.kind as "pocket" | "savings" | "deposit" | "goal",
          balance: num(account.balance),
        })),
      ...(goal ? [{ kind: "goal" as const, balance: num(goal.saved) }] : []),
    ],
    onboarded: true,
    child: {
      name: block.child.name,
      age: bracket === "teen_14_17" ? 15 : 10,
      bracket,
    },
    points: block.child.points,
    cards: (block.cards ?? []).map((item) => ({
      id: item.id,
      status: item.status === "blocked" ? ("blocked" as const) : item.status === "active" ? ("active" as const) : ("issued" as const),
      physical: item.type === "plastic" ? ("delivered" as const) : ("ordered" as const),
      last4: item.last4,
      number: item.number ?? "",
      system: (item.system as CardSystem | null) ?? "visa",
      type: (item.type as CardType | null) ?? "virtual",
      expiry: item.expiry ?? "",
    })),
    accessGranted: block.child.accessGranted,
    card: block.card
      ? {
          status: block.card.status === "blocked" ? "blocked" : block.card.status === "active" ? "active" : "issued",
          physical: block.card.type === "plastic" ? "delivered" : "ordered",
          last4: block.card.last4,
          number: block.card.number ?? "",
          system: (block.card.system as CardSystem | null) ?? "visa",
          type: (block.card.type as CardType | null) ?? "virtual",
          expiry: block.card.expiry ?? "",
        }
      : {
          status: "issued",
          physical: "ordered",
          last4: "0000",
          number: "",
          system: "visa",
          type: "virtual",
          expiry: "",
        },
    consents: CONSENT_ORDER.map((id) => ({
      id,
      required: id === "written14" ? bracket === "teen_14_17" : true,
      signedAt: block.consents.find((row) => row.kind === id)?.signed_at ?? null,
    })),
    permissions: [
      ...block.permissions.map((row) => ({
        id: row.product_id as ProductId,
        kind: "product" as const,
        allowed: row.allowed,
        requiresConsent: row.requires_consent,
        hasConsent: row.has_consent,
        pendingRequest: row.pending_request,
      })),
      ...block.operations.map((row) => ({
        id: row.operation_id as OperationId,
        kind: "operation" as const,
        allowed: row.allowed,
        requiresConsent: false,
        hasConsent: false,
        pendingRequest: false,
      })),
    ],
    limits: {
      monthly: num(block.limits?.monthly),
      perTxn: num(block.limits?.per_txn),
      confirmEach: Boolean(block.limits?.confirm_each),
      pocketWeekly: num(block.limits?.pocket_weekly),
      pocketDay: block.limits?.pocket_day_of_week === 5 ? "friday" : "monday",
    },
    balance: num(block.accounts.find((account) => account.kind === "pocket")?.balance),
    savedOnGoal: num(goal?.saved),
    goal: {
      title: { ru: goal?.title_ru ?? "Цель", be: goal?.title_be ?? "Мэта" },
      emoji: goal?.emoji ?? "🎯",
      target: num(goal?.target),
      saved: num(goal?.saved),
      autoSave: Boolean(goal?.auto_save),
    },
    quests: block.quests.map((quest) => ({
      id: quest.id,
      title: { ru: quest.title_ru, be: quest.title_be },
      from: quest.kind === "lesson" ? "moby" : "parent",
      kind: quest.kind === "lesson" ? "lesson" : "task",
      points: quest.points,
      amount: num(quest.amount),
      status: QUEST_STATUS[quest.status] ?? "todo",
    })),
    txns: block.transactions.map((txn) => ({
      id: txn.id,
      title: { ru: txn.title_ru, be: txn.title_be },
      amount: num(txn.amount),
      category: txn.category as CategoryId,
      at: txn.created_at,
      status: TXN_STATUS[txn.status] ?? "done",
      byChild: true,
    })),
    requests: block.requests.map((request) => ({
      id: request.id,
      label: { ru: request.label_ru, be: request.label_be },
      target: request.target as ProductId | "limit",
      status: REQUEST_STATUS[request.status] ?? "pending",
      at: request.created_at,
    })),
  };
}

/** Состояние семьи глазами родителя. */
export async function loadParentState(): Promise<Partial<FamilyState>> {
  const data = await api<ApiFamily>("/family");
  const block = data.children[0];
  if (!block) {
    return { role: "parent", onboarded: false };
  }
  return { ...mapChildBlock(block), role: "parent" };
}

/** Состояние ребёнка: свои лимиты, карта, цели, квесты. */
/** Последние переводы между счетами ребёнка. */
async function loadTransfers(childId: string): Promise<TransferRow[]> {
  try {
    const answer = await api<{
      transfers: { id: string; from_kind: string; to_kind: string; amount: number | string; created_at: string }[];
    }>(`/children/${childId}/transfers`);
    return answer.transfers.map((row) => ({
      id: row.id,
      from: row.from_kind as TransferRow["from"],
      to: row.to_kind as TransferRow["to"],
      amount: num(row.amount),
      at: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function loadChildState(childId: string): Promise<Partial<FamilyState>> {
  const block = await api<ApiChildBlock>(`/children/${childId}/state`);
  return {
    ...mapChildBlock(block),
    role: "child",
    childSession: true,
    transfers: await loadTransfers(childId),
  };
}

/** Уведомления семьи. */
export async function loadNotifications(): Promise<AppNotification[]> {
  const data = await api<{ notifications: ApiNotification[] }>("/notifications");
  return (data.notifications ?? []).map((row) => ({
    id: row.id,
    title: { ru: row.title_ru, be: row.title_be },
    body: { ru: row.body_ru, be: row.body_be },
    at: row.created_at,
    kind: NOTIFICATION_KIND[row.kind] ?? "ops",
  }));
}
