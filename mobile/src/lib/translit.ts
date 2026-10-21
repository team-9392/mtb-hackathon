const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya",
  і: "i", ў: "u",
};

/** Транслитерация имени в латиницу для лицевой стороны карты. */
export function translit(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .split("")
    .map((char) => MAP[char] ?? char)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
