import type { TKey } from "@/i18n";
import type { Lang } from "@/lib/format";
import type { Palette } from "@/theme/palette";
import type { CategoryId, Txn } from "@/store/types";

/** Подпись категории трат – используем уже переведённые названия из прав. */
export const SPEND_CATEGORY_KEY: Record<CategoryId, TKey> = {
  kids: "rg.op.kids",
  fun: "rg.op.fun",
  pharmacy: "rg.op.pharmacy",
  groceries: "rg.op.groceries",
  gambling: "rg.gambling",
  adult: "rg.adult",
};

/** Цвет сегмента диаграммы: те же акценты, что в макете профиля. */
export function spendCategoryColor(colors: Palette, id: CategoryId): string {
  switch (id) {
    case "kids":
      return colors.green;
    case "fun":
      return colors.purple;
    case "pharmacy":
      return colors.amber;
    case "groceries":
      return colors.cyan;
    case "gambling":
      return colors.danger;
    case "adult":
      return colors.pink;
  }
}

export type SpendGroup = {
  id: CategoryId;
  amount: number;
  items: { name: string; amount: number }[];
};

/**
 * Группируем траты ребёнка по категориям: сумма, магазины и сортировка
 * от большего к меньшему – как в аккордеоне макета.
 */
export function groupSpending(txns: Txn[], lang: Lang): SpendGroup[] {
  const groups = new Map<CategoryId, SpendGroup>();
  txns
    .filter((txn) => txn.amount < 0 && txn.status === "done")
    .forEach((txn) => {
      const amount = Math.abs(txn.amount);
      const group = groups.get(txn.category) ?? { id: txn.category, amount: 0, items: [] };
      group.amount += amount;
      group.items.push({ name: lang === "be" ? txn.title.be : txn.title.ru, amount });
      groups.set(txn.category, group);
    });

  return [...groups.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((group) => ({ ...group, items: [...group.items].sort((a, b) => b.amount - a.amount) }));
}
