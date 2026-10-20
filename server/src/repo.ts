import type { SupabaseClient } from "@supabase/supabase-js";

import { forbidden, notFound } from "./http.js";
import { defaultLimits, defaultOperationAllowed, defaultAllowed, productsFor, requiresWrittenConsent, ALL_PRODUCTS, consentsFor, type Bracket, type OperationId } from "./rules.js";

export const ALL_OPERATIONS: OperationId[] = ["pay", "online", "transfer", "cash"];

export interface ChildRow {
  id: string;
  family_id: string;
  user_id: string | null;
  name: string;
  bracket: Bracket;
  points: number;
  access_granted: boolean;
  access_code: string;
}

export async function getChild(
  db: SupabaseClient,
  childId: string,
  familyId: string,
): Promise<ChildRow> {
  const { data } = await db
    .from("children")
    .select("id, family_id, user_id, name, bracket, points, access_granted, access_code")
    .eq("id", childId)
    .maybeSingle();

  if (!data) {
    throw notFound("Ребёнок не найден");
  }
  if (data.family_id !== familyId) {
    throw forbidden("Профиль из другой семьи");
  }
  return data as unknown as ChildRow;
}

/** Наполняем профиль ребёнка правами, лимитами и согласиями по возрастной ветке. */
export async function bootstrapChild(
  db: SupabaseClient,
  childId: string,
  bracket: Bracket,
): Promise<void> {
  await db.from("permissions").insert(
    ALL_PRODUCTS.map((product) => ({
      child_id: childId,
      product_id: product,
      allowed: defaultAllowed(bracket, product),
      requires_consent: requiresWrittenConsent(product, bracket),
      has_consent: false,
      pending_request: false,
    })),
  );

  await db.from("operation_permissions").insert(
    ALL_OPERATIONS.map((operation) => ({
      child_id: childId,
      operation_id: operation,
      allowed: defaultOperationAllowed(bracket, operation),
    })),
  );

  const limits = defaultLimits(bracket);
  await db.from("limits").insert({
    child_id: childId,
    monthly: limits.monthly,
    per_txn: limits.perTxn,
    pocket_weekly: limits.pocketWeekly,
    pocket_day: limits.pocketDay,
    confirm_each: false,
  });

  const accounts = [
    { child_id: childId, kind: "pocket", balance: 0 },
    { child_id: childId, kind: "savings", balance: 0 },
  ];
  if (bracket === "teen_14_17") {
    accounts.push({ child_id: childId, kind: "deposit", balance: 0 });
  }
  await db.from("accounts").insert(accounts);

  await db.from("consents").insert(
    consentsFor(bracket).map((kind) => ({ family_id: null, child_id: childId, kind })),
  );
}

export async function notify(
  db: SupabaseClient,
  userId: string,
  familyId: string | null,
  kind: string,
  titleRu: string,
  titleBe: string,
  bodyRu?: string,
  bodyBe?: string,
): Promise<void> {
  await db.from("notifications").insert({
    user_id: userId,
    family_id: familyId,
    kind,
    title_ru: titleRu,
    title_be: titleBe,
    body_ru: bodyRu ?? null,
    body_be: bodyBe ?? null,
  });
}

export async function parentUserIdOfFamily(db: SupabaseClient, familyId: string): Promise<string | null> {
  const { data } = await db
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId)
    .eq("role", "parent")
    .limit(1)
    .maybeSingle();
  return (data?.user_id as string) ?? null;
}

/** Полное состояние ребёнка одним запросом — из него рисуются все экраны приложения. */
export async function childState(db: SupabaseClient, child: ChildRow) {
  const [limits, permissions, operations, categories, cards, accounts, consents, goals, quests, requests, txns] =
    await Promise.all([
      db.from("limits").select("*").eq("child_id", child.id).maybeSingle(),
      db.from("permissions").select("*").eq("child_id", child.id),
      db.from("operation_permissions").select("*").eq("child_id", child.id),
      db.from("allowed_categories").select("category_id, allowed").eq("child_id", child.id),
      db.from("cards").select("*").eq("child_id", child.id).order("created_at", { ascending: false }),
      db.from("accounts").select("*").eq("child_id", child.id),
      db.from("consents").select("*").eq("child_id", child.id),
      db.from("goals").select("*").eq("child_id", child.id).eq("status", "active").order("created_at", { ascending: false }),
      db.from("quests").select("*").eq("child_id", child.id).order("created_at", { ascending: false }),
      db.from("access_requests").select("*").eq("child_id", child.id).order("created_at", { ascending: false }).limit(20),
      db.from("transactions").select("*").eq("child_id", child.id).order("created_at", { ascending: false }).limit(30),
    ]);

  return {
    child: {
      id: child.id,
      name: child.name,
      bracket: child.bracket,
      points: child.points,
      accessGranted: child.access_granted,
      accessCode: child.access_code,
      products: productsFor(child.bracket),
    },
    limits: limits.data ?? null,
    permissions: permissions.data ?? [],
    operations: operations.data ?? [],
    categories: categories.data ?? [],
    card: (cards.data ?? [])[0] ?? null,
    accounts: accounts.data ?? [],
    consents: consents.data ?? [],
    goals: goals.data ?? [],
    quests: quests.data ?? [],
    requests: requests.data ?? [],
    transactions: txns.data ?? [],
  };
}
