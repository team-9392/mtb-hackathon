import type { CardSystem, CardType } from "@/store/types";

/** 4276123456789012 -> «4276 1234 5678 9012» */
export function formatPan(number: string): string {
  const digits = number.replace(/[^0-9]/g, "");
  if (digits.length === 0) {
    return "•••• •••• •••• ••••";
  }
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export const CARD_SYSTEMS: CardSystem[] = ["visa", "mastercard", "belkart", "unionpay"];
export const CARD_TYPES: CardType[] = ["virtual", "plastic"];

/** Пластик печатают физически, виртуальная доступна сразу. */
export function cardTypeHint(type: CardType): "card.virtualHint" | "card.plasticHint" {
  return type === "virtual" ? "card.virtualHint" : "card.plasticHint";
}
