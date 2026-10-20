/**
 * Проверка бизнес-логики: возрастные ветки, согласия, жёсткие правила ядра, лимиты.
 * Запуск: npm test  (npx tsx scripts/verify-logic.ts)
 */
import { buildConsents, buildPermissions, initialState } from "../src/store/mock";
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
    name: "попытка ставки отклонена в стартовом состоянии",
    run: () => {
      const gambling = initialState.txns.find((txn) => txn.category === "gambling");
      equal(gambling?.status, "declined", "статус операции со ставкой");
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
    },
  },
  {
    name: "траты ребёнка не включают отклонённые операции и операции родителя",
    run: () => {
      close(spentThisMonth(initialState.txns), 24.9 + 12.4 + 8.5, "сумма трат ребёнка");
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
