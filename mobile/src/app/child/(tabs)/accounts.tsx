import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { api } from "@/api/client";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";

/** Счета ребёнка: карты, баланс и запрос родителю на выпуск новой карты. */
export default function ChildAccountsScreen() {
  const { state, showToast, refresh } = useStore();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState(false);
  const cards = state.cards ?? [];

  const requestCard = async () => {
    if (!state.childId || busy) {
      return;
    }
    setBusy(true);
    try {
      await api("/children/" + state.childId + "/requests", {
        method: "POST",
        body: { target: "card", labelRu: "Выпуск карты", labelBe: "Выпуск карты" },
      });
      showToast("Запрос отправлен родителю");
      await refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось отправить запрос");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen showBack title="Счета" subtitle="Карты и баланс">
      <View style={styles.balanceCard}>
        <Text style={styles.label}>Доступно</Text>
        <Text style={styles.balance}>{formatMoney(state.balance, 0)}</Text>
      </View>

      <Text style={styles.section}>Мои карты</Text>
      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="card-outline" size={24} color="#8b94a3" />
          <Text style={styles.emptyText}>Карты пока нет</Text>
        </View>
      ) : (
        cards.map((card) => (
          <View key={card.id ?? card.last4} style={styles.cardRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="card" size={20} color="#60a5fa" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>
                {card.type === "plastic" ? "Пластиковая карта" : "Виртуальная карта"} ···· {card.last4}
              </Text>
              <Text style={styles.cardMeta}>{card.system.toUpperCase()} · до {card.expiry || "••/••"}</Text>
            </View>
          </View>
        ))
      )}

      <Button label={busy ? "Отправляем…" : "Запросить новую карту"} onPress={() => void requestCard()} loading={busy} />
      <Text style={styles.hint}>Родитель подтвердит выпуск в приложении.</Text>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    balanceCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.lg,
      gap: 4,
    },
    label: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
    balance: { color: colors.text, fontSize: 34, fontWeight: "800" },
    section: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: spacing.sm },
    empty: {
      alignItems: "center",
      gap: 6,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    emptyText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.md,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardText: { flex: 1 },
    cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
    cardMeta: { color: colors.muted, fontSize: 12, fontWeight: "600", marginTop: 2 },
    hint: { color: colors.muted, fontSize: 12, fontWeight: "500", textAlign: "center" },
  });
