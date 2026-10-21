import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View, TextInput } from "react-native";

import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { font, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const PRESETS = [10, 20, 50, 100];
const EXTRA = [200, 500];

/** Главное действие родителя: перевести деньги ребёнку на карман. Одно движение – и готово. */
export function ParentTopUpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

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

        <Button
          label={busy ? "Переводим…" : "Перевести " + amount + " BYN"}
          onPress={() => void submit()}
          loading={busy}
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
