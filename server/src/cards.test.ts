import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CARD_SYSTEMS,
  cardDetailsMessage,
  cardView,
  expiryFromNow,
  generateCvv,
  generatePan,
  generatePin,
  luhnOk,
  maskPan,
  type CardRow,
} from "./cards.js";

test("CVV – ровно 3 цифры, PIN – ровно 4 цифры", () => {
  for (let index = 0; index < 50; index += 1) {
    assert.match(generateCvv(), /^[0-9]{3}$/);
    assert.match(generatePin(), /^[0-9]{4}$/);
  }
});

test("PIN не состоит из одинаковых цифр", () => {
  for (let index = 0; index < 50; index += 1) {
    assert.doesNotMatch(generatePin(), /^(\d)\1{3}$/);
  }
});

test("номер карты проходит проверку Луна для всех платёжных систем", () => {
  for (const system of CARD_SYSTEMS) {
    for (let index = 0; index < 20; index += 1) {
      const pan = generatePan(system);
      assert.equal(pan.length, 16);
      assert.equal(luhnOk(pan), true, system + " " + pan);
    }
  }
});

test("срок действия – формат MM/YY", () => {
  assert.match(expiryFromNow(), /^(0[1-9]|1[0-2])\/\d{2}$/);
});

test("представление карты не содержит CVV и PIN", () => {
  const row: CardRow = {
    id: "card-1",
    child_id: "child-1",
    last4: "1234",
    status: "issued",
    number: "4276000000001234",
    system: "visa",
    type: "virtual",
    expiry: "10/30",
    cvv: "123",
    pin: "9876",
    created_at: "2026-10-21T00:00:00.000Z",
  };
  const view = cardView(row);
  assert.equal(view.masked, maskPan("1234"));
  assert.equal(view.number, "4276000000001234");
  assert.equal(view.blocked, false);
  assert.equal("cvv" in view, false);
  assert.equal("pin" in view, false);
  assert.equal(cardView({ ...row, status: "blocked" }).blocked, true);
});

test("сообщение с реквизитами в Telegram – согласованный формат", () => {
  assert.equal(
    cardDetailsMessage({ type: "virtual", system: "visa", last4: "1234", cvv: "123", pin: "1234" }),
    "💳 Moby Family: Виртуальная карта · Visa · •••• 1234\nCVV: 123\nPIN: 1234",
  );
  assert.equal(
    cardDetailsMessage({ type: "plastic", system: "belkart", last4: "5678", cvv: "001", pin: "4321" }),
    "💳 Moby Family: Пластиковая карта · Белкарт · •••• 5678\nCVV: 001\nPIN: 4321",
  );
});
