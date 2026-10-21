import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatMoney } from "@/lib/format";
import { banking, font, radius, shadow, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

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
  const { gradients } = useTheme();
  return (
    <LinearGradient
      colors={gradients.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Text secondary style={styles.heroLabel}>
        {label}
      </Text>
      <Text style={styles.heroAmount}>{formatMoney(amount)}</Text>
      {note ? (
        <Text secondary style={styles.heroNote}>
          {note}
        </Text>
      ) : null}
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
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.actionTexts}>
        <Text style={[styles.actionLabel, { color: colors.ink }]}>{label}</Text>
        {hint ? (
          <Text secondary style={[styles.actionHint, { color: colors.muted }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted2} />
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
  heroAmount: { color: "#ffffff", fontSize: banking.moneySize, fontWeight: "700", marginTop: 6 },
  heroNote: { color: "rgba(255,255,255,0.72)", fontSize: font.small, marginTop: 6 },
  heroTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  heroFill: { height: 6, borderRadius: radius.pill, backgroundColor: "#ffffff" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: banking.actionRadius,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTexts: { flex: 1, gap: 2 },
  actionLabel: { fontSize: font.title, fontWeight: "700" },
  actionHint: { fontSize: font.small },
});
