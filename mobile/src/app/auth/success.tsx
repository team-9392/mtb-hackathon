import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SIGNUP_PACKAGE_PRICE } from "@/auth/signup/draft";
import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";

function formatPaidAt(iso: string, lang: "ru" | "be"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const locale = lang === "be" ? "be-BY" : "ru-RU";
  const day = date.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return day + ", " + time;
}

/**
 * Успешная оплата пакета: чек и один шаг в приложение.
 * Данные приходят параметрами с шага 6, чтобы чек пережил перезагрузку веба.
 */
export default function SuccessScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    childName?: string;
    amount?: string;
    method?: string;
    paidAt?: string;
    receipt?: string;
    bracket?: string;
  }>();

  const amountNumber = Number(params.amount ?? SIGNUP_PACKAGE_PRICE);
  const amount = Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber : SIGNUP_PACKAGE_PRICE;
  const paidAt = params.paidAt ?? new Date().toISOString();
  const receipt = params.receipt ?? "—";
  const childName = params.childName ?? "";
  const method = params.method ?? t("reg.methodAccount");
  const bracket = params.bracket === "teen_14_17" ? t("reg.bracket1417") : t("reg.bracket713");

  const rows: { label: string; value: string }[] = [
    { label: t("reg.receiptPackage"), value: t("reg.package") },
    { label: t("reg.receiptMethod"), value: method },
    { label: t("reg.childCard"), value: childName.length > 0 ? childName + " · " + bracket : bracket },
    { label: t("reg.receiptDate"), value: formatPaidAt(paidAt, lang) },
    { label: t("reg.receiptId"), value: receipt },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.md }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <LinearGradient
            colors={["#10b981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.check}
          >
            <Ionicons name="checkmark" size={46} color={colors.white} />
          </LinearGradient>
          <Text style={[styles.title, { color: colors.ink }]}>{t("reg.successTitle")}</Text>
          <Text secondary style={[styles.subtitle, { color: colors.muted }]}>
            {t("reg.successSubtitle")}
          </Text>
        </View>

        <View style={[styles.receipt, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.receiptHead}>
            <View style={styles.receiptTitleRow}>
              <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              <Text style={[styles.receiptTitle, { color: colors.ink }]}>{t("reg.receipt")}</Text>
            </View>
            <View style={[styles.status, { backgroundColor: colors.mintSoft }]}>
              <Ionicons name="checkmark-circle" size={13} color={colors.mint} />
              <Text secondary style={[styles.statusText, { color: colors.mint }]}>
                {t("reg.receiptPaid")}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.rows}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text secondary style={[styles.rowLabel, { color: colors.muted }]}>
                  {row.label}
                </Text>
                <Text style={[styles.rowValue, { color: colors.ink }]} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.totalRow}>
            <Text secondary style={[styles.totalLabel, { color: colors.muted }]}>
              {t("reg.receiptAmount")}
            </Text>
            <Text style={[styles.totalValue, { color: colors.ink }]}>{formatMoney(amount)}</Text>
          </View>
          <Text secondary style={[styles.totalNote, { color: colors.muted2 }]}>
            {t("reg.monthlyNote", { amount: formatMoney(amount) })}
          </Text>
        </View>

        <View style={[styles.next, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
          <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
          <Text secondary style={[styles.nextText, { color: colors.ink2 }]}>
            {t("reg.successSubtitle")}
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.md, borderTopColor: colors.line },
        ]}
      >
        <Button
          label={t("reg.toApp")}
          icon="arrow-forward"
          onPress={() => router.replace("/")}
        />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
    root: { flex: 1 },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    hero: { alignItems: "center", paddingTop: spacing.xl, gap: spacing.sm },
    check: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
      shadowColor: "#10b981",
      shadowOpacity: 0.45,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.6, textAlign: "center" },
    subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: spacing.lg },
    receipt: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    receiptHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    receiptTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    receiptTitle: { fontSize: 16, fontWeight: "700" },
    status: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    statusText: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.2 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
    rows: { gap: spacing.md },
    row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
    rowLabel: { fontSize: 12, fontWeight: "600", paddingTop: 1 },
    rowValue: { fontSize: 13, fontWeight: "700", flex: 1, textAlign: "right" },
    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    totalLabel: { fontSize: 12, fontWeight: "600" },
    totalValue: { fontSize: 24, fontWeight: "700", letterSpacing: -0.6 },
    totalNote: { fontSize: 11, textAlign: "right" },
    next: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    nextText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      backgroundColor: palette.bg,
    },
  });
};
