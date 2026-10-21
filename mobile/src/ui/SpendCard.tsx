import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { GlassCard } from "@/ui/GlassCard";
import { Text } from "@/ui/Text";

export type SpendCategory = {
  id: string;
  name: string;
  color: string;
  amount: number;
  items: { name: string; amount: number }[];
};

const DONUT = 160;
const RING_RADIUS = 40;
const RING_WIDTH = 12;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const GAP = 2.5;

/**
 * Аналитика трат из макета профиля: период, кольцевая диаграмма с общей
 * суммой в центре и аккордеон категорий с магазинами.
 */
export function SpendCard({
  categories,
  total,
  periodLabel,
  onPeriod,
  action,
}: {
  categories: SpendCategory[];
  total: number;
  periodLabel: string;
  onPeriod?: () => void;
  action?: React.ReactNode;
}) {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [openId, setOpenId] = useState<string | null>(null);
  const safeTotal = Math.max(1, total);
  let offset = 0;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{t("sp.categories")}</Text>
        {action ?? (
          <Pressable
            onPress={onPeriod}
            disabled={!onPeriod}
            style={[styles.period, { backgroundColor: isDark ? colors.glass : colors.surfaceAlt }]}
          >
            <Text secondary style={styles.periodText}>
              {periodLabel}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.donutWrap}>
        <View style={styles.donut}>
          <Svg width={DONUT} height={DONUT} viewBox="0 0 100 100">
            <Circle
              cx={50}
              cy={50}
              r={RING_RADIUS}
              fill="none"
              stroke={isDark ? "rgba(255,255,255,0.06)" : colors.line}
              strokeWidth={RING_WIDTH}
            />
            <G rotation={-90} origin="50, 50">
              {categories.map((category) => {
                const dash = (category.amount / safeTotal) * CIRCUMFERENCE;
                const element = (
                  <Circle
                    key={category.id}
                    cx={50}
                    cy={50}
                    r={RING_RADIUS}
                    fill="none"
                    stroke={category.color}
                    strokeWidth={RING_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={[Math.max(0.5, dash - GAP), CIRCUMFERENCE]}
                    strokeDashoffset={-offset}
                    onPress={() => setOpenId(openId === category.id ? null : category.id)}
                  />
                );
                offset += dash;
                return element;
              })}
            </G>
          </Svg>
          <View style={styles.donutCenter} pointerEvents="none">
            <Text secondary style={styles.donutLabel}>
              {t("sp.total")}
            </Text>
            <Text style={styles.donutValue}>{formatMoney(total, 0).replace(" BYN", "")}</Text>
            <Text secondary style={styles.donutUnit}>
              BYN
            </Text>
          </View>
        </View>
      </View>

      {categories.length === 0 ? (
        <Text secondary style={styles.empty}>
          {t("sp.noSpend")}
        </Text>
      ) : (
        <View style={styles.list}>
          {categories.map((category) => {
            const open = openId === category.id;
            const percent = Math.round((category.amount / safeTotal) * 100);
            return (
              <View
                key={category.id}
                style={[
                  styles.category,
                  {
                    backgroundColor: isDark ? colors.glass : colors.surfaceAlt,
                    borderColor: isDark ? colors.glassBorder : colors.line,
                  },
                ]}
              >
                <Pressable
                  onPress={() => setOpenId(open ? null : category.id)}
                  style={({ pressed }) => [styles.categoryHead, pressed && styles.pressed]}
                >
                  <View style={styles.categoryTexts}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: category.color,
                          shadowColor: category.color,
                        },
                      ]}
                    />
                    <View style={styles.categoryNames}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {category.name}
                      </Text>
                      <Text secondary style={styles.categoryShare}>
                        {t("sp.share", { n: percent })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.categoryAmountWrap}>
                    <Text style={styles.categoryAmount}>
                      {formatMoney(category.amount, 0).replace(" BYN", "")}
                    </Text>
                    <Text secondary style={styles.categoryUnit}>
                      BYN
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={colors.muted}
                      style={[styles.chevron, open && styles.chevronOpen]}
                    />
                  </View>
                </Pressable>

                {open ? (
                  <View
                    style={[
                      styles.categoryBody,
                      { backgroundColor: isDark ? "rgba(16,23,35,0.65)" : colors.surfaceAlt },
                    ]}
                  >
                    {category.items.map((item, index) => (
                      <View
                        key={item.name + index}
                        style={[styles.item, index < category.items.length - 1 && styles.itemBorder]}
                      >
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text secondary style={styles.itemAmount}>
                          {formatMoney(item.amount, 0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: { padding: 20, gap: 16 },
    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 16, fontWeight: "700", color: colors.ink },
    period: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.glass,
    },
    periodText: { fontSize: 11, fontWeight: "600", color: colors.muted },
    donutWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 4 },
    donut: { width: DONUT, height: DONUT, alignItems: "center", justifyContent: "center" },
    donutCenter: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    donutLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.muted,
    },
    donutValue: { fontSize: 20, fontWeight: "800", color: colors.ink, lineHeight: 24 },
    donutUnit: { fontSize: 10, fontWeight: "600", color: colors.muted, marginTop: 1 },
    empty: { fontSize: 12, color: colors.muted, textAlign: "center", paddingVertical: 8 },
    list: { gap: 8, marginTop: 4 },
    category: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.glass,
      overflow: "hidden",
    },
    categoryHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      gap: 8,
    },
    pressed: { opacity: 0.75 },
    categoryTexts: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      shadowOpacity: 0.5,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    categoryNames: { flex: 1, gap: 2 },
    categoryName: { fontSize: 14, fontWeight: "700", color: colors.ink, lineHeight: 18 },
    categoryShare: { fontSize: 10, color: colors.muted },
    categoryAmountWrap: { flexDirection: "row", alignItems: "baseline", gap: 3 },
    categoryAmount: { fontSize: 14, fontWeight: "700", color: colors.ink },
    categoryUnit: { fontSize: 10, fontWeight: "500", color: colors.muted2 },
    chevron: { marginLeft: 6, transform: [{ rotate: "0deg" }] },
    chevronOpen: { transform: [{ rotate: "180deg" }] },
    categoryBody: {
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceAlt,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      gap: 12,
    },
    itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    itemName: { fontSize: 12, color: colors.ink2, flex: 1 },
    itemAmount: { fontSize: 12, fontWeight: "600", color: colors.muted },
  });
