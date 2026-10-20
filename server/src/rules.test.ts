import assert from "node:assert/strict";
import { test } from "node:test";

import {
  consentsFor,
  decidePayment,
  defaultOperationAllowed,
  isHardBlocked,
  limitLeft,
  productsFor,
  requiresWrittenConsent,
  spentThisMonth,
} from "./rules.js";

test("возрастные ветки: у 7–13 нет вклада", () => {
  assert.ok(!productsFor("child_7_13").includes("deposit"));
  assert.ok(productsFor("teen_14_17").includes("deposit"));
});

test("письменное согласие только подростку и только для вклада", () => {
  assert.deepEqual(consentsFor("child_7_13"), ["legal", "pd", "access"]);
  assert.equal(requiresWrittenConsent("deposit", "teen_14_17"), true);
  assert.equal(requiresWrittenConsent("deposit", "child_7_13"), false);
});

test("младший ребёнок может только платить картой", () => {
  assert.equal(defaultOperationAllowed("child_7_13", "pay"), true);
  assert.equal(defaultOperationAllowed("child_7_13", "online"), false);
  assert.equal(defaultOperationAllowed("teen_14_17", "online"), true);
});

test("азартные игры и 18+ заблокированы жёстко", () => {
  assert.equal(isHardBlocked("gambling"), true);
  assert.equal(isHardBlocked("adult"), true);
  assert.equal(isHardBlocked("kids"), false);
});

test("сервер отклоняет ставку даже при положительном балансе и лимитах", () => {
  const decision = decidePayment({
    bracket: "teen_14_17",
    category: "gambling",
    amount: 10,
    operation: "online",
    monthlyLimit: 300,
    perTxnLimit: 100,
    spentThisMonth: 0,
    operationAllowed: true,
  });
  assert.deepEqual(decision, { status: "declined", reason: "hard_blocked" });
});

test("лимиты: месячный и на одну операцию", () => {
  const base = {
    bracket: "child_7_13" as const,
    category: "kids",
    operation: "pay" as const,
    operationAllowed: true,
    monthlyLimit: 100,
    perTxnLimit: 30,
  };
  assert.deepEqual(decidePayment({ ...base, amount: 40, spentThisMonth: 0 }), {
    status: "declined",
    reason: "per_txn_limit",
  });
  assert.deepEqual(decidePayment({ ...base, amount: 25, spentThisMonth: 90 }), {
    status: "declined",
    reason: "monthly_limit",
  });
  assert.deepEqual(decidePayment({ ...base, amount: 25, spentThisMonth: 10 }), { status: "approved" });
});

test("выключенная родителем операция не проходит", () => {
  const decision = decidePayment({
    bracket: "teen_14_17",
    category: "kids",
    amount: 5,
    operation: "transfer",
    monthlyLimit: 300,
    perTxnLimit: 100,
    spentThisMonth: 0,
    operationAllowed: false,
  });
  assert.deepEqual(decision, { status: "declined", reason: "operation_disabled" });
});

test("траты считаются за текущий месяц и без отклонённых операций", () => {
  const now = new Date().toISOString();
  const spent = spentThisMonth([
    { amount: -10, status: "approved", byChild: true, createdAt: now },
    { amount: -5, status: "declined", byChild: true, createdAt: now },
    { amount: -30, status: "approved", byChild: false, createdAt: now },
  ]);
  assert.equal(spent, 10);
  assert.equal(limitLeft(100, spent), 90);
});
