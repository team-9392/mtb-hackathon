import crypto from "node:crypto";

/** Реквизиты карты: BIN по платёжной системе, номер с проверкой Луна, срок действия. */

export const CARD_SYSTEMS = ["visa", "mastercard", "belkart", "unionpay"] as const;
export const CARD_TYPES = ["virtual", "plastic"] as const;

export type CardSystem = (typeof CARD_SYSTEMS)[number];
export type CardType = (typeof CARD_TYPES)[number];

const BIN: Record<CardSystem, string> = {
  visa: "4276",
  mastercard: "5555",
  belkart: "9112",
  unionpay: "6262",
};

export function luhnOk(pan: string): boolean {
  let sum = 0;
  for (let index = 0; index < pan.length; index += 1) {
    let digit = Number(pan[pan.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** 16 цифр: BIN + случайные + контрольная цифра по Луну. */
export function generatePan(system: CardSystem): string {
  let body = BIN[system];
  while (body.length < 15) {
    body += String(Math.floor(Math.random() * 10));
  }
  for (let digit = 0; digit <= 9; digit += 1) {
    const candidate = body + String(digit);
    if (luhnOk(candidate)) {
      return candidate;
    }
  }
  return body + "0";
}

/** Срок действия: 4 года от выпуска, формат MM/YY. */
export function expiryFromNow(years = 4): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(2);
  return month + "/" + year;
}

/** CVV: три цифры. */
export function generateCvv(): string {
  return String(crypto.randomInt(0, 1000)).padStart(3, "0");
}

/** PIN: четыре цифры; одинаковые подряд цифры не выдаём даже в демо. */
export function generatePin(): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pin = String(crypto.randomInt(0, 10_000)).padStart(4, "0");
    if (!/^(\d)\1{3}$/.test(pin)) {
      return pin;
    }
  }
  return "4826";
}

export const CARD_SYSTEM_LABEL: Record<CardSystem, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  belkart: "Белкарт",
  unionpay: "UnionPay",
};

export function cardTypeLabel(type: CardType): string {
  return type === "plastic" ? "Пластиковая карта" : "Виртуальная карта";
}

/** Маска для экранов и сообщений: полный номер видят только родитель и сам ребёнок. */
export function maskPan(last4: string): string {
  return "•••• " + last4;
}

/** Строка карты из БД. */
export interface CardRow {
  id: string;
  child_id: string;
  last4: string;
  status: string;
  number: string | null;
  system: CardSystem;
  type: CardType;
  expiry: string | null;
  cvv: string | null;
  pin: string | null;
  issued_at?: string | null;
  blocked_at?: string | null;
  created_at?: string;
}

/** Публичное представление карты: без CVV/PIN, номер + маска. */
export interface CardView {
  id: string;
  last4: string;
  number: string | null;
  system: CardSystem;
  type: CardType;
  expiry: string | null;
  status: string;
  masked: string;
  blocked: boolean;
  createdAt: string | null;
  issuedAt: string | null;
}

export function cardView(row: CardRow): CardView {
  return {
    id: row.id,
    last4: row.last4,
    number: row.number,
    system: row.system,
    type: row.type,
    expiry: row.expiry,
    status: row.status,
    masked: maskPan(row.last4),
    blocked: row.status === "blocked",
    createdAt: row.created_at ?? null,
    issuedAt: row.issued_at ?? null,
  };
}

export interface CardSecret {
  type: CardType;
  system: CardSystem;
  last4: string;
  cvv: string;
  pin: string;
}

/** Сообщение с реквизитами – ровно тот формат, который ждёт демо. */
export function cardDetailsMessage(card: CardSecret): string {
  return (
    "💳 Moby Family: " +
    cardTypeLabel(card.type) +
    " · " +
    CARD_SYSTEM_LABEL[card.system] +
    " · " +
    maskPan(card.last4) +
    "\nCVV: " +
    card.cvv +
    "\nPIN: " +
    card.pin
  );
}
