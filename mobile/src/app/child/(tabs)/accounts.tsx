import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n, type TKey } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { AccountKind } from "@/store/types";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { SlideToConfirm } from "@/ui/SlideToConfirm";

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

/** Счета ребёнка и переводы между ними. Наружу деньги не уходят ни на шаг. */
export default function ChildAccountsScreen() {
  const { t } = useI18n();
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

  const opened = (kind: AccountKind) => (state.accounts ?? []).some((account) => account.kind === kind);
  const allowedByAge = (kind: AccountKind) => state.permissions.some((p) => p.id === kind);

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t("acc.title")}</Text>
        <Text style={styles.subtitle}>{t("acc.subtitle")}</Text>

        <View style={styles.card}>
          {OPENABLE.map((kind) => {
            const balance = balances.get(kind) ?? 0;
            const has = opened(kind);
            const confirming = confirmKind === kind;
            return (
              <View key={kind}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Ionicons name={ICON[kind]} size={20} color={palette.child as string} />
                  </View>
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowTitle}>{t(LABEL[kind])}</Text>
                    <Text style={styles.rowHint}>
                      {has ? t("acc.balance") + " " + balance.toFixed(2) + " BYN" : t("acc.notOpen")}
                    </Text>
                  </View>
                  {has ? null : (
                    <Pressable
                      style={[styles.smallButton, confirming && styles.smallButtonActive]}
                      onPress={() => setConfirmKind(confirming ? null : kind)}
                    >
                      <Text style={[styles.smallButtonText, confirming && styles.smallButtonTextActive]}>
                        {allowedByAge(kind) ? t("acc.open") : t("acc.ask")}
                      </Text>
                    </Pressable>
                  )}
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
          })}
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.icon}>
              <Ionicons name={ICON.goal} size={20} color={palette.child as string} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>{state.goal.title.ru}</Text>
              <Text style={styles.rowHint}>
                {t("acc.balance")} {(balances.get("goal") ?? 0).toFixed(2)} BYN
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("acc.transfer")}</Text>
        <View style={styles.card}>
          <Text style={styles.pickLabel}>{t("acc.from")}</Text>
          <View style={styles.chips}>
            {POTS.map((pot) => (
              <Pressable
                key={"from-" + pot}
                onPress={() => setFrom(pot)}
                style={[styles.chip, from === pot ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, from === pot ? styles.chipTextActive : null]}>
                  {t(LABEL[pot])}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.pickLabel}>{t("acc.to")}</Text>
          <View style={styles.chips}>
            {POTS.filter((pot) => pot !== "deposit").map((pot) => (
              <Pressable
                key={"to-" + pot}
                onPress={() => setTo(pot)}
                style={[styles.chip, to === pot ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, to === pot ? styles.chipTextActive : null]}>
                  {t(LABEL[pot])}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.amountField}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={palette.muted2}
              style={styles.amountInput}
            />
            <Text style={styles.currency}>BYN</Text>
          </View>
          <SlideToConfirm
            label={t("common.swipeTransfer")}
            onConfirm={() => void submit()}
            disabled={busy}
            doneLabel={t("acc.done")}
          />
        </View>

        <Text style={styles.muted}>{t("acc.hint")}</Text>

        {(state.transfers ?? []).length > 0 ? (
          <View style={styles.history}>
            <Text style={styles.sectionTitle}>{t("acc.history")}</Text>
            {(state.transfers ?? []).slice(0, 5).map((transfer) => (
              <View key={transfer.id} style={styles.historyRow}>
                <Text style={styles.historyText}>
                  {t(LABEL[transfer.from])} → {t(LABEL[transfer.to])}
                </Text>
                <Text style={styles.historyAmount}>{transfer.amount.toFixed(2)} BYN</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: font.h2, fontWeight: "800", color: palette.ink },
  subtitle: { fontSize: font.small, color: palette.muted, marginTop: 4, marginBottom: spacing.lg },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  rowLast: { borderBottomWidth: 0 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: palette.childSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTexts: { flex: 1, gap: 2 },
  rowTitle: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  rowHint: { fontSize: font.small, color: palette.muted },
  smallButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.childSoft,
  },
  smallButtonText: { color: palette.childDark, fontWeight: "700", fontSize: font.small },
  smallButtonActive: { backgroundColor: palette.child },
  smallButtonTextActive: { color: palette.white },
  openConfirm: { paddingBottom: spacing.md },
  sectionTitle: { fontSize: font.title, fontWeight: "800", color: palette.ink, marginBottom: spacing.sm },
  pickLabel: { fontSize: font.small, color: palette.muted, marginTop: spacing.md, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  chipActive: { backgroundColor: palette.child, borderColor: palette.child },
  chipText: { fontSize: font.small, fontWeight: "600", color: palette.ink2 },
  chipTextActive: { color: palette.white },
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: spacing.lg,
  },
  amountInput: { flex: 1, paddingVertical: spacing.md, fontSize: font.h3, fontWeight: "700", color: palette.ink },
  currency: { fontSize: font.body, color: palette.muted, fontWeight: "600" },
  muted: { fontSize: font.small, color: palette.muted2, lineHeight: 18 },
  history: { marginTop: spacing.xl },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  historyText: { fontSize: font.small, color: palette.ink2 },
  historyAmount: { fontSize: font.small, fontWeight: "700", color: palette.ink },
});
