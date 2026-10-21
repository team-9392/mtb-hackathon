/**
 * Дизайн-токены MobyFamily.
 *
 * Цвета живут в theme/palette.ts (тёмная/светлая палитры), здесь — размеры,
 * радиусы, тени и банковская база. palette/gradients реэкспортируются
 * для обратной совместимости: это тёмная тема по умолчанию.
 */
export {
  darkColors,
  darkGradients,
  gradients,
  lightColors,
  lightGradients,
  palette,
  type GradientName,
  type Gradients,
  type Palette,
  type ThemeMode,
} from "./palette";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** Макеты: скругления 24 у карточек и 32 у больших панелей. */
export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/**
 * Размеры текста из макетов:
 * title 22 bold, body 13–15, labels 11–12, баланс ~3.5rem (56).
 * Старые ключи не меняем, чтобы не ломать существующие экраны.
 */
export const font = {
  h1: 30,
  h2: 24,
  h3: 19,
  title: 17,
  body: 15.5,
  small: 13.5,
  tiny: 11.5,
  titleScreen: 22,
  balance: 56,
  label: 11,
  labelLarge: 12,
} as const;

export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  floating: {
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
} as const;

/**
 * Банковская база. Меняем дизайн здесь — экраны подхватывают сами.
 * heroInk — «тёмная карта» счёта, accentSoft — подложка главного действия.
 */
export const banking = {
  heroInk: ["#1D3159", "#16233F", "#11182C"],
  accentSoft: "#E8EFFF",
  chip: "#F2F4F7",
  moneySize: 34,
  cardRadius: 24,
  actionRadius: 18,
} as const;
