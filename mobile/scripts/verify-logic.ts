/**
 * Проверка бизнес-логики: возрастные ветки, согласия, жёсткие правила ядра, лимиты.
 * Запуск: npm test  (npx tsx scripts/verify-logic.ts)
 */
import { L, buildConsents, buildPermissions, initialState } from "../src/store/mock";
import type { Txn } from "../src/store/types";
import {
  HARD_BLOCKED_CATEGORIES,
  consentsFor,
  defaultAllowed,
  defaultOperationAllowed,
  isHardBlocked,
  limitLeft,
  productsFor,
  requiresWrittenConsent,
  spentThisMonth,
} from "../src/store/permissions";

function ok(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(message + ": получено " + String(actual) + ", ожидалось " + String(expected));
  }
}

function deepEqual(actual: string[], expected: string[], message: string): void {
  if (actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) {
    throw new Error(message + ": получено " + actual.join(",") + ", ожидалось " + expected.join(","));
  }
}

function close(actual: number, expected: number, message: string): void {
  if (Math.abs(actual - expected) > 0.001) {
    throw new Error(message + ": получено " + actual + ", ожидалось " + expected);
  }
}

/**
 * Демо-операции из initialState убраны намеренно (mobile/src/store/mock.ts:70), поэтому
 * фикстуры для проверок трат и лимитов тест собирает сам и не зависит от стора.
 */
const MONTHLY_LIMIT = 60;
const FIXTURE_TXNS: Txn[] = [
  {
    id: "t-fun",
    title: L("Кофе с булочкой", "Кава з булачкай"),
    amount: -24.9,
    category: "fun",
    at: "2026-10-02T09:00:00.000Z",
    status: "done",
    byChild: true,
  },
  {
    id: "t-groceries",
    title: L("Продукты", "Прадукты"),
    amount: -12.4,
    category: "groceries",
    at: "2026-10-05T18:30:00.000Z",
    status: "done",
    byChild: true,
  },
  {
    id: "t-pharmacy",
    title: L("Аптека", "Аптэка"),
    amount: -8.5,
    category: "pharmacy",
    at: "2026-10-09T11:15:00.000Z",
    status: "done",
    byChild: true,
  },
  {
    id: "t-gambling",
    title: L("Ставки", "Стаўкі"),
    amount: -50,
    category: "gambling",
    at: "2026-10-11T21:40:00.000Z",
    status: "declined",
    byChild: true,
  },
  {
    id: "t-parent",
    title: L("Покупка родителя", "Пакупка бацькі"),
    amount: -200,
    category: "kids",
    at: "2026-10-12T10:00:00.000Z",
    status: "done",
    byChild: false,
  },
];

const checks: { name: string; run: () => void }[] = [
  {
    name: "7–13 без вклада, 14–17 с вкладом",
    run: () => {
      ok(!productsFor("child_7_13").includes("deposit"), "у младшего не должно быть вклада");
      ok(productsFor("teen_14_17").includes("deposit"), "у подростка должен быть вклад");
    },
  },
  {
    name: "письменное согласие только подростку и только для вклада",
    run: () => {
      deepEqual(consentsFor("child_7_13"), ["legal", "pd", "access"], "набор согласий для 7–13");
      ok(consentsFor("teen_14_17").includes("written14"), "подростку нужно письменное согласие");
      equal(requiresWrittenConsent("deposit", "teen_14_17"), true, "вклад подростка");
      equal(requiresWrittenConsent("deposit", "child_7_13"), false, "вклад младшего");
    },
  },
  {
    name: "младший ребёнок может только платить картой",
    run: () => {
      equal(defaultOperationAllowed("child_7_13", "pay"), true, "оплата");
      equal(defaultOperationAllowed("child_7_13", "online"), false, "онлайн");
      equal(defaultOperationAllowed("child_7_13", "transfer"), false, "переводы");
      equal(defaultOperationAllowed("child_7_13", "cash"), false, "наличные");
      equal(defaultOperationAllowed("teen_14_17", "online"), true, "онлайн у подростка");
    },
  },
  {
    name: "вклад по умолчанию доступен только подростку",
    run: () => {
      equal(defaultAllowed("teen_14_17", "deposit"), true, "вклад подростка");
      equal(defaultAllowed("child_7_13", "deposit"), false, "вклад младшего");
    },
  },
  {
    name: "азартные игры и 18+ заблокированы всегда",
    run: () => {
      deepEqual(HARD_BLOCKED_CATEGORIES, ["gambling", "adult"], "жёсткие категории");
      equal(isHardBlocked("gambling"), true, "азартные игры");
      equal(isHardBlocked("adult"), true, "18+");
      equal(isHardBlocked("kids"), false, "детские товары разрешены");
    },
  },
  {
    name: "попытка ставки отклонена",
    run: () => {
      const gambling = FIXTURE_TXNS.find((txn) => txn.category === "gambling");
      equal(gambling?.status, "declined", "статус операции со ставкой");
      equal(isHardBlocked(gambling?.category ?? "kids"), true, "категория ставки жёстко заблокирована");
    },
  },
  {
    name: "до подписания согласий вклад недоступен",
    run: () => {
      const permissions = buildPermissions("teen_14_17", buildConsents("teen_14_17"));
      const deposit = permissions.find((p) => p.id === "deposit");
      equal(deposit?.requiresConsent, true, "требуется согласие");
      equal(deposit?.hasConsent, false, "согласия ещё нет");
    },
  },
  {
    name: "после подписания согласие отражено в правах",
    run: () => {
      const consents = buildConsents("teen_14_17").map((consent) => ({
        ...consent,
        signedAt: "2026-01-01T00:00:00.000Z",
      }));
      const permissions = buildPermissions("teen_14_17", consents);
      equal(permissions.find((p) => p.id === "deposit")?.hasConsent, true, "согласие подписано");
    },
  },
  {
    name: "остаток лимита не уходит в минус",
    run: () => {
      equal(limitLeft(30, 60), 30, "остаток 30");
      equal(limitLeft(90, 60), 0, "остаток 0");
      close(limitLeft(spentThisMonth(FIXTURE_TXNS), MONTHLY_LIMIT), 14.2, "остаток лимита по фактическим тратам");
    },
  },
  {
    name: "траты ребёнка не включают отклонённые операции и операции родителя",
    run: () => {
      close(spentThisMonth(FIXTURE_TXNS), 24.9 + 12.4 + 8.5, "сумма трат ребёнка");
      equal(spentThisMonth(initialState.txns), 0, "траты в пустом стартовом состоянии");
    },
  },
];

let failed = 0;
for (const check of checks) {
  try {
    check.run();
    console.log("  ok   " + check.name);
  } catch (error) {
    failed += 1;
    console.log("  FAIL " + check.name + " — " + (error as Error).message);
  }
}

console.log("");
console.log(failed === 0 ? "Все проверки пройдены: " + checks.length : "Провалено проверок: " + failed);
if (failed > 0) {
  process.exit(1);
}
