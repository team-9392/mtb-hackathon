import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View, TextInput } from "react-native";

import { useI18n, type TKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { font, radius, spacing } from "@/theme/tokens";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const PRESETS = [10, 20, 50, 100];
const SOURCES: ("savings" | "goal")[] = ["savings", "goal"];
const LABEL: Record<"savings" | "goal", TKey> = { savings: "acc.savings", goal: "acc.goal" };

/** Одно действие: закинуть деньги на карту из копилки или с цели. */
export function TopUpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const { t } = useI18n();
  const { state, moveMoney, showToast } = useStore();
  const [from, setFrom] = useState<"savings" | "goal">("savings");
  const [amount, setAmount] = useState(20);
  const [busy, setBusy] = useState(false);

  const available =
    from === "goal"
      ? state.savedOnGoal
      : (state.accounts?.find((account) => account.kind === "savings")?.balance ?? 0);

  const submit = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const ok = await moveMoney(from, "pocket", amount);
      if (ok) {
        showToast(t("acc.done"));
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{t("ch.topupTitle")}</Text>
        <Text style={styles.available}>
          {t(LABEL[from])}: {formatMoney(available)}
        </Text>

        <View style={styles.row}>
          {SOURCES.map((source) => (
            <Pressable
              key={source}
              onPress={() => setFrom(source)}
              style={[styles.chip, from === source && styles.chipActive]}
            >
              <Text style={[styles.chipText, from === source && styles.chipTextActive]}>{t(LABEL[source])}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>Сумма, BYN</Text>
          <TextInput
            value={String(amount)}
            onChangeText={(value: string) => setAmount(Math.min(100000, Number(value.replace(/[^0-9]/g, "")) || 0))}
            keyboardType="numeric"
            style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 12 }}
          />
          {PRESETS.map((preset) => (
            <Pressable
              key={preset}
              onPress={() => setAmount(preset)}
              style={[styles.amount, amount === preset && styles.amountActive]}
            >
              <Text style={[styles.amountText, amount === preset && styles.amountTextActive]}>{preset}</Text>
            </Pressable>
          ))}
        </View>

        <SlideToConfirm
          label={t("ch.topupAction", { amount: String(amount) })}
          onConfirm={() => void submit()}
          disabled={busy}
          doneLabel={t("common.done")}
        />
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)" },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: { fontSize: font.h3, fontWeight: "800", color: palette.ink },
  available: { fontSize: font.small, color: palette.muted },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
  },
  chipActive: { backgroundColor: palette.primarySoft, borderColor: palette.primarySoft },
  chipText: { fontSize: font.small, fontWeight: "600", color: palette.ink2 },
  chipTextActive: { color: palette.primaryDark },
  amount: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
  },
  amountActive: { backgroundColor: palette.primary },
  amountText: { fontSize: font.title, fontWeight: "700", color: palette.ink },
  amountTextActive: { color: palette.white },
  });
};
