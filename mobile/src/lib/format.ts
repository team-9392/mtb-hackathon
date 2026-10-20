const MONTHS = {
  ru: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  be: ["студз", "лют", "сак", "крас", "мая", "чэр", "ліп", "жн", "вер", "кас", "ліст", "снеж"],
} as const;

export type Lang = keyof typeof MONTHS;

export function formatMoney(value: number, decimals = 2): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const fixed = abs.toFixed(decimals);
  const dot = fixed.indexOf(".");
  const intPart = dot === -1 ? fixed : fixed.slice(0, dot);
  const fracPart = dot === -1 ? "" : fixed.slice(dot + 1);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const body = decimals > 0 ? grouped + "," + fracPart : grouped;
  return (negative ? "−" : "") + body + " BYN";
}

export function formatMoneySigned(value: number, decimals = 2): string {
  return (value > 0 ? "+" : "") + formatMoney(value, decimals);
}

export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  const month = MONTHS[lang][d.getMonth()];
  return d.getDate() + " " + month;
}

export function formatPercent(value: number): string {
  return Math.round(value * 100) + "%";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
