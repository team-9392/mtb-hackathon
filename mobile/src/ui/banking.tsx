import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatMoney } from "@/lib/format";
import { banking, font, gradients, palette, radius, shadow, spacing } from "@/theme/tokens";

/**
 * Базовые «банковские» блоки. Все экраны собираются из них,
 * поэтому смена дизайна = правка этого файла и токенов в theme/tokens.ts.
 */

export function MoneyHero({
  label,
  amount,
  note,
  progress = 0,
}: {
  label: string;
  amount: number;
  note?: string;
  progress?: number;
}) {
  return (
    <LinearGradient
      colors={gradients.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroAmount}>{formatMoney(amount)}</Text>
      {note ? <Text style={styles.heroNote}>{note}</Text> : null}
      <View style={styles.heroTrack}>
        <View style={[styles.heroFill, { width: Math.min(100, Math.max(0, progress * 100)) + "%" }]} />
      </View>
    </LinearGradient>
  );
}

/** Главное действие экрана: одно, крупное, всегда первым. */
export function PrimaryAction({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.9 }]}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={palette.primary as string} />
      </View>
      <View style={styles.actionTexts}>
        <Text style={styles.actionLabel}>{label}</Text>
        {hint ? <Text style={styles.actionHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted2 as string} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: banking.cardRadius,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadow.floating,
  },
  heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: font.small, fontWeight: "600" },
  heroAmount: { color: palette.white, fontSize: banking.moneySize, fontWeight: "800", marginTop: 6 },
  heroNote: { color: "rgba(255,255,255,0.72)", fontSize: font.small, marginTop: 6 },
  heroTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  heroFill: { height: 6, borderRadius: radius.pill, backgroundColor: palette.white },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: banking.actionRadius,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: banking.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTexts: { flex: 1, gap: 2 },
  actionLabel: { fontSize: font.title, fontWeight: "700", color: palette.ink },
  actionHint: { fontSize: font.small, color: palette.muted },
});
