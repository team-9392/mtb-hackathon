import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { font, radius, spacing } from "@/theme/tokens";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import type { Palette } from "@/theme/palette";
import { useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const PRESETS = [10, 20, 50, 100];
const EXTRA = [200, 500];

/** Главное действие родителя: перевести деньги ребёнку на карман. Одно движение — и готово. */
export function ParentTopUpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const { state, topUpChild, showToast } = useStore();
  const [amount, setAmount] = useState(20);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const ok = await topUpChild(amount);
      if (ok) {
        showToast(t("pt.done"));
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
        <Text style={styles.title}>{t("pt.title")}</Text>
        <Text style={styles.subtitle}>{t("pt.subtitle")}</Text>
        <Text style={styles.balance}>
          {state.child.name} · {formatMoney(state.balance)}
        </Text>

        <View style={styles.row}>
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
        <View style={styles.row}>
          {EXTRA.map((preset) => (
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
          label={t("pt.action", { amount: String(amount) })}
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
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: font.h3, fontWeight: "800", color: palette.ink },
  subtitle: { fontSize: font.small, color: palette.muted, marginTop: -6 },
  balance: { fontSize: font.small, fontWeight: "700", color: palette.ink2 },
  row: { flexDirection: "row", gap: spacing.sm },
  amount: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
  },
  amountActive: { backgroundColor: palette.primary },
  amountText: { fontSize: font.title, fontWeight: "800", color: palette.ink },
  amountTextActive: { color: palette.white },
  });
};
