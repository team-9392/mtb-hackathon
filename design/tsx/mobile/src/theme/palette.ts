/**
 * Палитра MobyFamily.
 *
 * Тёмная тема — по макетам-прототипам (mobyfamily_*_dark_theme.html):
 * фон #0b0f14, панели #181b21 / #22272e, карточки #262a31,
 * muted #8b94a3, синий #3b82f6 / #60a5fa, зелёный #10b981.
 * Светлая — аккуратная пара к ней с теми же смыслами.
 *
 * palette по умолчанию равен тёмной палитре: старые экраны, которые
 * ещё не переведены на useTheme(), продолжают работать и выглядят как макет.
 */

export type ThemeMode = "dark" | "light";

export type Palette = {
  // Фоны и поверхности
  bg: string;
  bgDeep: string;
  panel: string;
  panelAlt: string;
  nav: string;
  surface: string;
  surfaceAlt: string;
  surfaceHover: string;
  card: string;
  glass: string;
  glassBorder: string;
  inputBg: string;

  // Текст
  ink: string;
  ink2: string;
  text: string;
  textSecondary: string;
  muted: string;
  muted2: string;

  // Линии и оверлеи
  line: string;
  lineStrong: string;
  overlay: string;
  scrim: string;

  // Акценты
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primarySoftStrong: string;
  blue: string;
  blueSoft: string;
  cyan: string;
  violet: string;
  violetSoft: string;
  purple: string;
  pink: string;
  amber: string;

  // Бренд ребёнка
  child: string;
  childDark: string;
  childSoft: string;

  // Семантика
  mint: string;
  mintSoft: string;
  green: string;
  greenSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;

  // Базовое
  white: string;
  black: string;

  // Тост
  toastBg: string;
  toastText: string;
  toastBorder: string;
};

export const darkColors: Palette = {
  bg: "#0b0f14",
  bgDeep: "#090d14",
  panel: "#181b21",
  panelAlt: "#22272e",
  nav: "#161e2a",
  surface: "#262a31",
  surfaceAlt: "#22272e",
  surfaceHover: "#2e333b",
  card: "#262a31",
  glass: "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.07)",
  inputBg: "#1b1f26",

  ink: "#f8fafc",
  ink2: "#cbd5e1",
  text: "#f8fafc",
  textSecondary: "#cbd5e1",
  muted: "#8b94a3",
  muted2: "#58687a",

  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.14)",
  overlay: "rgba(0,0,0,0.62)",
  scrim: "rgba(11,15,20,0.82)",

  primary: "#3b82f6",
  primaryDark: "#2563eb",
  primarySoft: "rgba(59,130,246,0.16)",
  primarySoftStrong: "rgba(59,130,246,0.28)",
  blue: "#3b82f6",
  blueSoft: "rgba(59,130,246,0.16)",
  cyan: "#38bdf8",
  violet: "#a855f7",
  violetSoft: "rgba(168,85,247,0.16)",
  purple: "#a855f7",
  pink: "#ec4899",
  amber: "#f59e0b",

  child: "#60a5fa",
  childDark: "#3b82f6",
  childSoft: "rgba(96,165,250,0.16)",

  mint: "#10b981",
  mintSoft: "rgba(16,185,129,0.16)",
  green: "#10b981",
  greenSoft: "rgba(16,185,129,0.16)",
  success: "#10b981",
  successSoft: "rgba(16,185,129,0.16)",
  danger: "#f87171",
  dangerSoft: "rgba(248,113,113,0.16)",
  warn: "#f59e0b",
  warnSoft: "rgba(245,158,11,0.16)",

  white: "#ffffff",
  black: "#000000",

  toastBg: "#2a2f38",
  toastText: "#ffffff",
  toastBorder: "rgba(59,130,246,0.35)",
};

export const lightColors: Palette = {
  bg: "#f4f6fb",
  bgDeep: "#e9edf5",
  panel: "#ffffff",
  panelAlt: "#f2f5fa",
  nav: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#eef2f8",
  surfaceHover: "#f7f9fc",
  card: "#ffffff",
  glass: "rgba(15,23,42,0.03)",
  glassBorder: "rgba(15,23,42,0.07)",
  inputBg: "#f7f9fc",

  ink: "#0f172a",
  ink2: "#344054",
  text: "#0f172a",
  textSecondary: "#344054",
  muted: "#667085",
  muted2: "#98a2b3",

  line: "#e4e7ec",
  lineStrong: "#d0d5dd",
  overlay: "rgba(15,23,42,0.45)",
  scrim: "rgba(15,23,42,0.45)",

  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primarySoft: "#e8efff",
  primarySoftStrong: "#dbe7ff",
  blue: "#2563eb",
  blueSoft: "#e8efff",
  cyan: "#0284c7",
  violet: "#7c3aed",
  violetSoft: "#f3e8ff",
  purple: "#7c3aed",
  pink: "#db2777",
  amber: "#d97706",

  child: "#2563eb",
  childDark: "#1d4ed8",
  childSoft: "#e8efff",

  mint: "#059669",
  mintSoft: "#e3f8f0",
  green: "#059669",
  greenSoft: "#e3f8f0",
  success: "#059669",
  successSoft: "#e3f8f0",
  danger: "#dc2626",
  dangerSoft: "#fde8e8",
  warn: "#b45309",
  warnSoft: "#fff4e0",

  white: "#ffffff",
  black: "#000000",

  toastBg: "#0f172a",
  toastText: "#ffffff",
  toastBorder: "rgba(37,99,235,0.4)",
};

/** Совместимость: старые экраны импортируют palette и получают тёмную тему. */
export const palette: Palette = darkColors;

export type Gradients = {
  hero: readonly [string, string, ...string[]];
  card: readonly [string, string, ...string[]];
  parent: readonly [string, string, ...string[]];
  child: readonly [string, string, ...string[]];
  mint: readonly [string, string, ...string[]];
  ink: readonly [string, string, ...string[]];
};

export type GradientName = keyof Gradients;

export const darkGradients: Gradients = {
  hero: ["#1d3159", "#16233f", "#11182c"],
  card: ["#1d3159", "#16233f", "#11182c"],
  parent: ["#2563eb", "#4f46e5"],
  child: ["#2563eb", "#6366f1"],
  mint: ["#059669", "#0f766e"],
  ink: ["#111827", "#1f2937"],
};

export const lightGradients: Gradients = {
  hero: ["#2563eb", "#1d4ed8"],
  card: ["#1d3159", "#16233f", "#11182c"],
  parent: ["#2563eb", "#4f46e5"],
  child: ["#3b82f6", "#6366f1"],
  mint: ["#10b981", "#0d9488"],
  ink: ["#111827", "#1f2937"],
};

/** Совместимость: старые экраны получают тёмные градиенты. */
export const gradients: Gradients = darkGradients;

export function colorsFor(mode: ThemeMode): Palette {
  return mode === "light" ? lightColors : darkColors;
}

export function gradientsFor(mode: ThemeMode): Gradients {
  return mode === "light" ? lightGradients : darkGradients;
}
