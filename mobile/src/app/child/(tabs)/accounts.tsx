import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n, type TKey } from "@/i18n";
import { formatDate, formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import type { AccountKind } from "@/store/types";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { GlassCard } from "@/ui/GlassCard";
import { HeroGlow } from "@/ui/Glow";
import { ProgressRing, type RingGradient } from "@/ui/ProgressRing";
import { SoftGlow } from "@/ui/SoftGlow";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import { Text } from "@/ui/Text";
import { TextInput } from "@/ui/TextInput";

type Pot = AccountKind | "goal";

const POTS: Pot[] = ["pocket", "savings", "goal"];
const OPENABLE: AccountKind[] = ["pocket", "savings", "deposit"];

const LABEL: Record<Pot, TKey> = {
  pocket: "acc.pocket",
  savings: "acc.savings",
  deposit: "acc.deposit",
  goal: "acc.goal",
};

const ICON: Record<Pot, keyof typeof Ionicons.glyphMap> = {
  pocket: "wallet-outline",
  savings: "archive-outline",
  deposit: "trending-up-outline",
  goal: "flag-outline",
};

const GRADIENT: Record<Pot, RingGradient> = {
  pocket: ["#38bdf8", "#3b82f6", "#6366f1"],
  savings: ["#6366f1", "#8b5cf6", "#d946ef"],
  deposit: ["#10b981", "#14b8a6", "#22c55e"],
  goal: ["#9333ea", "#ec4899", "#f43f5e"],
};

/** Счета ребёнка и переводы между ними. Деньги не покидают семью. */
export default function ChildAccountsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { t, lang } = useI18n();
  const { state, showToast, moveMoney, openAccount } = useStore();
  const [from, setFrom] = useState<Pot>("pocket");
  const [to, setTo] = useState<Pot>("goal");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<AccountKind | null>(null);
  const [confirmKind, setConfirmKind] = useState<AccountKind | null>(null);

  const balances = useMemo(() => {
    const map = new Map<Pot, number>();
    (state.accounts ?? []).forEach((account) => map.set(account.kind, account.balance));
    map.set("goal", state.savedOnGoal);
    return map;
  }, [state.accounts, state.savedOnGoal]);

  const total = useMemo(
    () => [...balances.values()].reduce((sum, value) => sum + value, 0),
    [balances],
  );

  const opened = (kind: AccountKind) => (state.accounts ?? []).some((account) => account.kind === kind);
  const allowedByAge = (kind: AccountKind) => state.permissions.some((p) => p.id === kind);
  const shareOf = (value: number) => (total > 0 ? Math.max(0, Math.min(1, value / total)) : 0);

  const submit = async () => {
    if (busy) {
      return;
    }
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      showToast(t("acc.needAmount"));
      return;
    }
    if (from === to) {
      showToast(t("acc.same"));
      return;
    }
    setBusy(true);
    try {
      const ok = await moveMoney(from, to, Math.round(value * 100) / 100);
      if (ok) {
        setAmount("");
        showToast(t("acc.done"));
      }
    } finally {
      setBusy(false);
    }
  };

  const request = async (kind: AccountKind) => {
    if (opening) {
      return;
    }
    setOpening(kind);
    try {
      const status = await openAccount(kind);
      showToast(status === "opened" ? t("acc.opened") : t("acc.asked"));
    } finally {
      setOpening(null);
      setConfirmKind(null);
    }
  };

  const cardSurface = {
    backgroundColor: isDark ? colors.glass : colors.surface,
    borderColor: isDark ? colors.glassBorder : colors.line,
  };
  const trackColor = isDark ? "rgba(255,255,255,0.08)" : colors.line;
  const barTrack = isDark ? "rgba(255,255,255,0.1)" : colors.surfaceAlt;

  const renderPot = (kind: Pot) => {
    const balance = balances.get(kind) ?? 0;
    const has = kind === "goal" ? true : opened(kind);
    const confirming = confirmKind === kind;
    const share = shareOf(balance);
    const percent = Math.round(share * 100);
    return (
      <View key={kind} style={[styles.potCard, cardSurface]}>
        <View style={styles.potRow}>
          <ProgressRing
            value={share}
            gradient={GRADIENT[kind]}
            id={"pot-" + kind}
            trackColor={trackColor}
          >
            <View style={styles.ringCenter}>
              <Ionicons name={ICON[kind]} size={18} color={colors.ink} />
              <Text style={styles.ringPercent}>{percent}%</Text>
            </View>
          </ProgressRing>

          <View style={styles.potTexts}>
            <View style={styles.potHead}>
              <Text style={styles.potName} numberOfLines={1}>
                {kind === "goal" ? (lang === "be" ? state.goal.title.be : state.goal.title.ru) : t(LABEL[kind])}
              </Text>
              {has || kind === "goal" ? (
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              ) : (
                <Pressable
                  style={[
                    styles.smallButton,
                    {
                      backgroundColor: confirming ? colors.primary : colors.primarySoft,
                    },
                  ]}
                  onPress={() => setConfirmKind(confirming ? null : kind)}
                >
                  <Text
                    secondary
                    style={[
                      styles.smallButtonText,
                      { color: confirming ? colors.white : colors.primary },
                    ]}
                  >
                    {allowedByAge(kind) ? t("acc.open") : t("acc.ask")}
                  </Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.potValue} numberOfLines={1}>
              {has ? formatMoney(balance, 0) : "—"}
            </Text>

            <View style={[styles.potTrack, { backgroundColor: barTrack }]}>
              <LinearGradient
                colors={GRADIENT[kind]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.potFill, { width: percent + "%" }]}
              />
            </View>

            <Text secondary style={styles.potHint}>
              {has ? t("acc.balance") : t("acc.notOpen")}
            </Text>
          </View>
        </View>

        {has || !confirming ? null : (
          <View style={styles.openConfirm}>
            <SlideToConfirm
              label={allowedByAge(kind) ? t("acc.open") : t("acc.ask")}
              onConfirm={() => void request(kind)}
              disabled={opening !== null}
              doneLabel={allowedByAge(kind) ? t("acc.opened") : t("acc.asked")}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {isDark ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow]}>
          <HeroGlow />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{t("acc.title")}</Text>
            <View style={styles.brandPill}>
              <Text secondary style={styles.brandText}>
                MobyFamily
              </Text>
            </View>
          </View>
        </View>
        <Text secondary style={styles.subtitle}>
          {t("acc.subtitle")}
        </Text>

        <GlassCard style={styles.totalCard} padded={false}>
          <SoftGlow
            id="accounts-total-glow"
            size={180}
            color={colors.primary}
            opacity={isDark ? 0.4 : 0.22}
            style={styles.totalGlow}
          />
          <Text secondary style={styles.totalLabel}>
            {t("sp.totalOnAccounts")}
          </Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalValue}>{formatMoney(total, 0).replace(" BYN", "")}</Text>
            <Text secondary style={styles.totalUnit}>
              BYN
            </Text>
          </View>
        </GlassCard>

        <View style={styles.pots}>{OPENABLE.map(renderPot)}</View>
        <View style={styles.pots}>{renderPot("goal")}</View>

        <GlassCard style={styles.transferCard}>
          <Text style={styles.cardTitle}>{t("acc.transfer")}</Text>

          <Text secondary style={styles.pickLabel}>
            {t("acc.from")}
          </Text>
          <View style={styles.chips}>
            {POTS.map((pot) => {
              const active = from === pot;
              return (
                <Pressable
                  key={"from-" + pot}
                  onPress={() => setFrom(pot)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primarySoft : "transparent",
                      borderColor: active ? colors.primary : colors.line,
                    },
                  ]}
                >
                  <Text secondary style={[styles.chipText, { color: active ? colors.primary : colors.muted }]}>
                    {t(LABEL[pot])}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text secondary style={styles.pickLabel}>
            {t("acc.to")}
          </Text>
          <View style={styles.chips}>
            {POTS.filter((pot) => pot !== "deposit").map((pot) => {
              const active = to === pot;
              return (
                <Pressable
                  key={"to-" + pot}
                  onPress={() => setTo(pot)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primarySoft : "transparent",
                      borderColor: active ? colors.primary : colors.line,
                    },
                  ]}
                >
                  <Text secondary style={[styles.chipText, { color: active ? colors.primary : colors.muted }]}>
                    {t(LABEL[pot])}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.amountField,
              {
                backgroundColor: isDark ? "rgba(17,24,35,0.5)" : colors.surfaceAlt,
                borderColor: colors.line,
              },
            ]}
          >
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={colors.muted2}
              style={styles.amountInput}
            />
            <Text secondary style={styles.currency}>
              BYN
            </Text>
          </View>
          <SlideToConfirm
            label={t("common.swipeTransfer")}
            onConfirm={() => void submit()}
            disabled={busy}
            doneLabel={t("acc.done")}
          />
        </GlassCard>

        <Text secondary style={styles.muted}>
          {t("acc.hint")}
        </Text>

        {(state.transfers ?? []).length > 0 ? (
          <View style={styles.history}>
            <Text style={styles.recentTitle}>{t("acc.history")}</Text>
            <GlassCard style={styles.historyCard} padded={false}>
              {(state.transfers ?? []).slice(0, 5).map((transfer, index) => (
                <View
                  key={transfer.id}
                  style={[
                    styles.historyRow,
                    index > 0 && [styles.historyBorder, { borderTopColor: colors.line }],
                  ]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.historyTexts}>
                    <Text style={styles.historyText} numberOfLines={1}>
                      {t(LABEL[transfer.from])} → {t(LABEL[transfer.to])}
                    </Text>
                    <Text secondary style={styles.historyDate}>
                      {formatDate(transfer.at, lang)}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>{formatMoney(transfer.amount, 0)}</Text>
                </View>
              ))}
            </GlassCard>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    glow: { opacity: 0.55 },
    content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120, gap: 14 },
    headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4, color: colors.ink },
    brandPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primarySoftStrong,
    },
    brandText: { fontSize: 11, fontWeight: "500", color: colors.primary },
    subtitle: { fontSize: 13, color: colors.muted, paddingLeft: 2, marginTop: -6 },
    totalCard: { padding: 16, overflow: "hidden", borderRadius: 16, marginTop: 2 },
    totalGlow: { right: -50, bottom: -60 },
    totalLabel: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.muted,
      marginBottom: 2,
    },
    totalRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    totalValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: colors.ink },
    totalUnit: { fontSize: 14, fontWeight: "700", color: colors.muted },
    pots: { gap: 14 },
    potCard: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 12 },
    potRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    ringCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
    ringPercent: { fontSize: 11, fontWeight: "700", color: colors.ink, marginTop: 2 },
    potTexts: { flex: 1, minWidth: 0 },
    potHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    potName: { fontSize: 16, fontWeight: "700", color: colors.ink, flex: 1 },
    potValue: { fontSize: 13, fontWeight: "600", color: colors.ink2, marginTop: 2 },
    smallButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    smallButtonText: { fontSize: 11, fontWeight: "700" },
    potTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 10, width: "100%" },
    potFill: { height: "100%", borderRadius: 4 },
    potHint: { fontSize: 11, fontWeight: "500", color: colors.muted, marginTop: 8 },
    openConfirm: { marginTop: 2 },
    transferCard: { padding: 20, gap: 8, marginTop: 4 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: 2 },
    pickLabel: { fontSize: 12, color: colors.muted, marginTop: 6 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
    chipText: { fontSize: 12.5, fontWeight: "600" },
    amountField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      marginBottom: 14,
      borderRadius: radius.lg,
      borderWidth: 1,
      paddingHorizontal: 16,
    },
    amountInput: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: 19,
      fontWeight: "700",
      color: colors.ink,
    },
    currency: { fontSize: 15.5, fontWeight: "600", color: colors.muted },
    muted: { fontSize: 13, color: colors.muted2, lineHeight: 18 },
    history: { marginTop: 4, gap: 10 },
    recentTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, paddingHorizontal: 4 },
    historyCard: { padding: 8, borderRadius: 24 },
    historyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
    historyBorder: { borderTopWidth: StyleSheet.hairlineWidth },
    historyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    historyTexts: { flex: 1, gap: 2, minWidth: 0 },
    historyText: { fontSize: 13, fontWeight: "600", color: colors.ink },
    historyDate: { fontSize: 11, color: colors.muted },
    historyAmount: { fontSize: 12, fontWeight: "700", color: colors.ink },
  });
