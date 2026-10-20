export type Localized = { ru: string; be: string };

export type AgeBracket = "child_7_13" | "teen_14_17";
export type Role = "parent" | "child";

export type ProductId =
  | "card"
  | "pocket"
  | "savings"
  | "deposit"
  | "insurance"
  | "subscriptions";

export type OperationId = "pay" | "online" | "transfer" | "cash";
export type CategoryId = "kids" | "fun" | "pharmacy" | "groceries" | "gambling" | "adult";
export type ConsentId = "legal" | "pd" | "access" | "written14";

export interface Consent {
  id: ConsentId;
  required: boolean;
  signedAt: string | null;
}

export interface ChildProfile {
  name: string;
  age: number;
  bracket: AgeBracket;
}

export interface CardInfo {
  status: "issued" | "active" | "blocked";
  physical: "ordered" | "delivered";
  last4: string;
}

export interface Permission {
  id: ProductId | OperationId;
  kind: "product" | "operation";
  allowed: boolean;
  requiresConsent: boolean;
  hasConsent: boolean;
  pendingRequest: boolean;
}

export interface LimitState {
  monthly: number;
  perTxn: number;
  confirmEach: boolean;
  pocketWeekly: number;
  pocketDay: "friday" | "monday";
}

export type TxnStatus = "done" | "pending" | "declined";

export interface Txn {
  id: string;
  title: Localized;
  amount: number;
  category: CategoryId;
  at: string;
  status: TxnStatus;
  byChild: boolean;
}

export interface Goal {
  title: Localized;
  emoji: string;
  target: number;
  saved: number;
  autoSave: boolean;
}

export type QuestStatus = "todo" | "waiting" | "approved";

export interface Quest {
  id: string;
  title: Localized;
  from: "parent" | "moby";
  kind: "task" | "lesson";
  points: number;
  amount: number;
  status: QuestStatus;
}

export interface AccessRequest {
  id: string;
  label: Localized;
  target: ProductId | "limit";
  status: "pending" | "approved" | "declined";
  at: string;
}

export interface AppNotification {
  id: string;
  title: Localized;
  body: Localized;
  at: string;
  kind: "request" | "reward" | "ops" | "access";
}

export interface FamilyState {
  role: Role | null;
  onboarded: boolean;
  child: ChildProfile;
  card: CardInfo;
  consents: Consent[];
  permissions: Permission[];
  limits: LimitState;
  balance: number;
  savedOnGoal: number;
  goal: Goal;
  points: number;
  quests: Quest[];
  txns: Txn[];
  requests: AccessRequest[];
  notifications: AppNotification[];
  accessGranted: boolean;
  childSession: boolean;
  /** UUID ребёнка из базы — только в режиме API. */
  childId?: string;
  /** UUID цели из базы — только в режиме API. */
  goalId?: string;
}
