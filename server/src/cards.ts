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

function luhnOk(pan: string): boolean {
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
