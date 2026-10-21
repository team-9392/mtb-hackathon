import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useI18n, useL } from "@/i18n";
import { formatPan } from "@/lib/card";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { spentThisMonth } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { font, radius, shadow, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { HeroCard } from "@/ui/Hero";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Badge, Card, EmptyState, ProgressBar, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { TopUpSheet } from "@/ui/TopUpSheet";

export default function ChildHomeScreen() {
  const { t, lang } = useI18n();
  const L = useL();
  const { state, showToast } = useStore();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [topup, setTopup] = useState(false);

  const spent = spentThisMonth(state.txns);
  const left = Math.max(0, state.limits.monthly - spent);
  const myTxns = state.txns.filter((txn) => txn.byChild).slice(0, 4);
  const canTransfer = state.permissions.find((p) => p.id === "transfer")?.allowed ?? false;
  const canOnline = state.permissions.find((p) => p.id === "online")?.allowed ?? false;
  const cardIssued = state.card.number.length > 0;
  const ratio = state.goal.saved / Math.max(1, state.goal.target);
  const balance = formatMoney(state.balance, 0).replace(" BYN", "");

  const quick = [
    {
      id: "topup",
      icon: "add" as const,
      label: t("home.topup"),
      allowed: true,
      onPress: () => setTopup(true),
    },
    {
      id: "erip",
      icon: "qr-code-outline" as const,
      label: t("pay.erip"),
      allowed: true,
      onPress: () => router.push("/child/erip"),
    },
    {
      id: "transfer",
      icon: "call-outline" as const,
      label: t("home.transfer"),
      allowed: canTransfer,
      onPress: () => router.push("/child/erip?mode=phone"),
    },
    {
      id: "goal",
      icon: "heart-outline" as const,
      label: t("home.goal"),
      allowed: true,
      onPress: () => router.push("/child/goal"),
    },
    {
      id: "quests",
      icon: "checkmark-done-outline" as const,
      label: t("home.quests"),
      allowed: true,
      onPress: () => router.push("/child/quests"),
    },
  ];

  return (
    <Screen
      title={t("ch.hello", { name: state.child.name || t("common.child") })}
      subtitle={t("ch.pocketNext")}
      right={
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.line }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(state.child.name || "M").slice(0, 1).toUpperCase()}
          </Text>
        </View>
      }
    >
      <View style={styles.balanceBlock}>
        <Text secondary style={[styles.balanceLabel, { color: colors.muted }]}>
          {t("ch.balance")}
        </Text>
        <Row gap={8} style={styles.balanceRow}>
          <Text style={[styles.balanceValue, { color: colors.ink }]} numberOfLines={1}>
            {balance}
          </Text>
          <Text style={[styles.balanceCurrency, { color: colors.muted }]}>BYN</Text>
        </Row>
      </View>

      <HeroCard gradient="hero">
        <Row style={styles.heroTop}>
          <Text secondary style={styles.heroLabel}>{t("ch.card")}</Text>
          <Row style={styles.heroRight}>
            {cardIssued ? <PaymentBrand system={state.card.system} onDark /> : null}
            <Badge
              label={cardIssued ? t(state.card.type === "plastic" ? "card.plastic" : "card.virtual") : t("card.notIssued")}
              tone={cardIssued ? "child" : "warn"}
              style={styles.heroBadge}
              onDark
            />
          </Row>
        </Row>
        <Text style={styles.heroPan}>{cardIssued ? formatPan(state.card.number) : "•••• •••• •••• ••••"}</Text>
        <Row style={styles.heroFooter}>
          <Text secondary style={styles.heroFooterText}>
            {cardIssued
              ? t("card.expiry") + ": " + (state.card.expiry.length > 0 ? state.card.expiry : "••/••")
              : t("card.notIssuedChild")}
          </Text>
          {cardIssued ? (
            <Text secondary style={styles.heroFooterText}>
              {t("ch.limitLeft")}: {formatMoney(left, 0)}
            </Text>
          ) : null}
        </Row>
      </HeroCard>

      <Row style={styles.quickRow} gap={0}>
        {quick.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              if (!item.allowed) {
                showToast(t("ch.lockedTitle"));
                router.push("/child/blocked");
                return;
              }
              item.onPress();
            }}
            style={({ pressed }) => [styles.quick, pressed && { opacity: 0.75 }]}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.line },
              ]}
            >
              <Ionicons
                name={item.allowed ? item.icon : "lock-closed"}
                size={22}
                color={item.allowed ? colors.primary : colors.muted2}
              />
            </View>
            <Text secondary style={[styles.quickLabel, { color: colors.muted }]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </Row>

      <Pressable onPress={() => router.push("/child/goal")} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <Card>
          <Row style={styles.goalTop}>
            <Row gap={6}>
              <Ionicons name="heart" size={14} color={colors.muted} />
              <Text secondary style={[styles.goalLabel, { color: colors.muted }]}>
                {t("gl.title")}
              </Text>
            </Row>
            <Text secondary style={[styles.goalPercent, { color: colors.primary }]}>
              {formatPercent(ratio)}
            </Text>
          </Row>
          <Text style={[styles.goalTitle, { color: colors.ink }]} numberOfLines={1}>
            {L(state.goal.title)}
          </Text>
          <Text secondary style={[styles.goalAmount, { color: colors.muted }]}>
            {formatMoney(state.goal.saved, 0).replace(" BYN", "")} / {formatMoney(state.goal.target, 0)}
          </Text>
          <ProgressBar value={ratio} tone="primary" height={8} />
        </Card>
      </Pressable>

      {!canOnline ? (
        <Card tone="alt">
          <Row style={styles.lockedRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
            <View style={styles.lockedText}>
              <Text style={[styles.lockedTitle, { color: colors.ink }]}>{t("ch.lockedTitle")}</Text>
              <Text secondary style={[styles.lockedDesc, { color: colors.muted }]}>
                {t("ch.lockedDesc")}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/child/request")}>
              <Text secondary style={[styles.link, { color: colors.primary }]}>
                {t("common.request")}
              </Text>
            </Pressable>
          </Row>
        </Card>
      ) : null}

      <SectionTitle
        right={
          <Pressable onPress={() => router.push("/child/blocked")} hitSlop={8}>
            <Text secondary style={[styles.link, { color: colors.primary }]}>
              {t("bl.title")}
            </Text>
          </Pressable>
        }
      >
        {t("ch.recent")}
      </SectionTitle>
      <Card>
        {myTxns.length === 0 ? (
          <EmptyState icon="receipt-outline" title={t("ch.empty")} />
        ) : (
          myTxns.map((txn, i) => (
            <Row key={txn.id} style={[styles.txn, i > 0 && [styles.txnBorder, { borderTopColor: colors.line }]]}>
              <View
                style={[
                  styles.txnIcon,
                  {
                    backgroundColor:
                      txn.status === "declined" ? colors.dangerSoft : colors.surfaceAlt,
                  },
                ]}
              >
                <Ionicons
                  name={txn.status === "declined" ? "ban" : txn.amount > 0 ? "arrow-down" : "arrow-up"}
                  size={16}
                  color={txn.status === "declined" ? colors.danger : txn.amount > 0 ? colors.mint : colors.ink2}
                />
              </View>
              <View style={styles.txnText}>
                <Text style={[styles.txnTitle, { color: colors.ink }]} numberOfLines={1}>
                  {L(txn.title)}
                </Text>
                <Text secondary style={[styles.txnDate, { color: colors.muted2 }]}>
                  {formatDate(txn.at, lang)}
                </Text>
              </View>
              {txn.status === "declined" ? (
                <Badge label={t("common.locked")} tone="danger" />
              ) : (
                <Text
                  style={[
                    styles.txnAmount,
                    { color: txn.amount > 0 ? colors.mint : colors.ink },
                  ]}
                >
                  {formatMoney(txn.amount)}
                </Text>
              )}
            </Row>
          ))
        )}
      </Card>

      <TopUpSheet visible={topup} onClose={() => setTopup(false)} />
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
    avatar: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 15, fontWeight: "700" },
    balanceBlock: { marginTop: spacing.xs, marginBottom: spacing.sm },
    balanceLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
    balanceRow: { alignItems: "baseline", marginTop: 4 },
    balanceValue: { fontSize: font.balance, fontWeight: "700", letterSpacing: -2.4, lineHeight: 60 },
    balanceCurrency: { fontSize: 18, fontWeight: "700" },
    heroTop: { justifyContent: "space-between" },
    heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
    heroBadge: { backgroundColor: "rgba(255,255,255,0.18)" },
    heroRight: { alignItems: "center", gap: spacing.sm },
    heroPan: {
      color: palette.white,
      fontSize: 17,
      fontWeight: "600",
      letterSpacing: 2,
      marginTop: spacing.md,
    },
    heroFooter: { justifyContent: "space-between", marginTop: spacing.lg },
    heroFooterText: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "500" },
    quickRow: { justifyContent: "space-between", marginVertical: spacing.xs },
    quick: { flex: 1, alignItems: "center", gap: 6 },
    quickIcon: {
      width: 54,
      height: 54,
      borderRadius: radius.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.card,
    },
    quickLabel: { fontSize: 10.5, fontWeight: "600", textAlign: "center" },
    goalTop: { justifyContent: "space-between", marginBottom: spacing.sm },
    goalLabel: { fontSize: 12, fontWeight: "600" },
    goalPercent: { fontSize: 12, fontWeight: "700" },
    goalTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
    goalAmount: { fontSize: 13, marginTop: 2, marginBottom: spacing.md },
    lockedRow: { gap: spacing.md },
    lockedText: { flex: 1, gap: 2 },
    lockedTitle: { fontSize: 13, fontWeight: "700" },
    lockedDesc: { fontSize: 11.5, lineHeight: 15 },
    link: { fontSize: 13, fontWeight: "700" },
    txn: { gap: spacing.md, paddingVertical: spacing.md },
    txnBorder: { borderTopWidth: 1 },
    txnIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
    txnText: { flex: 1, gap: 2 },
    txnTitle: { fontSize: 13, fontWeight: "600" },
    txnDate: { fontSize: 11 },
    txnAmount: { fontSize: 13, fontWeight: "700" },
  });
};
