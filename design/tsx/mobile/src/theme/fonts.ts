import type { FontSource } from "expo-font";

/**
 * Шрифты приложения.
 *
 * Основной — TikTok Sans (400/500/600/700), второстепенный — Inter (400/500/600/700).
 * Файлы лежат в assets/fonts и грузятся в корневом _layout.tsx через useFonts.
 *
 * В React Native каждый вес — отдельная семья (файл), поэтому вес выбирается
 * по fontFamily, а не через fontWeight: см. familyForWeight().
 */
export const fonts = {
  regular: "TikTokSans-Regular",
  medium: "TikTokSans-Medium",
  semibold: "TikTokSans-SemiBold",
  bold: "TikTokSans-Bold",

  secondary: "Inter-Regular",
  secondaryMedium: "Inter-Medium",
  secondarySemiBold: "Inter-SemiBold",
  secondaryBold: "Inter-Bold",
} as const;

export type FontFamily = (typeof fonts)[keyof typeof fonts];

export const fontSources: Record<string, FontSource> = {
  "TikTokSans-Regular": require("../../assets/fonts/TikTokSans-Regular.ttf"),
  "TikTokSans-Medium": require("../../assets/fonts/TikTokSans-Medium.ttf"),
  "TikTokSans-SemiBold": require("../../assets/fonts/TikTokSans-SemiBold.ttf"),
  "TikTokSans-Bold": require("../../assets/fonts/TikTokSans-Bold.ttf"),
  "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
  "Inter-Medium": require("../../assets/fonts/Inter-Medium.ttf"),
  "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
  "Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
};

type Weight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

/** Приводит fontWeight из стиля к числовому весу. */
export function normalizeWeight(value: unknown): Weight {
  if (typeof value === "number") {
    const clamped = Math.max(100, Math.min(900, Math.round(value / 100) * 100));
    return String(clamped) as Weight;
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "bold") return "700";
    if (lower === "normal") return "400";
    if (/^[1-9]00$/.test(lower)) return lower as Weight;
  }
  return "400";
}

/** TikTok Sans или Inter под указанный вес. */
export function familyForWeight(weight: unknown, secondary = false): FontFamily {
  const w = normalizeWeight(weight);
  if (secondary) {
    if (w === "700" || w === "800" || w === "900") return fonts.secondaryBold;
    if (w === "600") return fonts.secondarySemiBold;
    if (w === "500") return fonts.secondaryMedium;
    return fonts.secondary;
  }
  if (w === "700" || w === "800" || w === "900") return fonts.bold;
  if (w === "600") return fonts.semibold;
  if (w === "500") return fonts.medium;
  return fonts.regular;
}

/** Готовый набор fontFamily для текстовых стилей. */
export const fontFamily = {
  regular: fonts.regular,
  medium: fonts.medium,
  semibold: fonts.semibold,
  bold: fonts.bold,
  secondary: fonts.secondary,
  secondaryMedium: fonts.secondaryMedium,
  secondarySemiBold: fonts.secondarySemiBold,
  secondaryBold: fonts.secondaryBold,
} as const;
