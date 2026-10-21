import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { CardSystem, CardType } from "@/store/types";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Text } from "@/ui/Text";

const SYSTEMS: CardSystem[] = ["visa", "mastercard", "belkart", "unionpay"];
const SYSTEM_LABEL: Record<CardSystem, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  belkart: "Белкарт",
  unionpay: "UnionPay",
};

/** Сразу после оплаты пакета — выбор карты для ребёнка: тип и платёжная система. */
export default function CardSetupScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { showToast, refresh } = useStore();
  const params = useLocalSearchParams<{
    childId?: string;
    childName?: string;
    amount?: string;
    method?: string;
    paidAt?: string;
    receipt?: string;
    bracket?: string;
  }>();
  const [type, setType] = useState<CardType>("virtual");
  const [system, setSystem] = useState<CardSystem>("visa");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(false);

  const goNext = () => {
    router.replace({
      pathname: "/auth/success",
      params: {
        childName: params.childName ?? "",
        amount: params.amount ?? "",
        method: params.method ?? "",
        paidAt: params.paidAt ?? new Date().toISOString(),
        receipt: params.receipt ?? "—",
        bracket: params.bracket ?? "child_7_13",
      },
    });
  };

  const issue = async () => {
    const childId = params.childId;
    if (!childId || busy) {
      goNext();
      return;
    }
    setBusy(true);
    try {
      await api("/children/" + childId + "/cards", { method: "POST", body: { type, system } });
      setIssued(true);
      await refresh();
      showToast(t("card.issuedSent"));
      router.replace("/parent");
      return;
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.check}>
            <Ionicons name="checkmark" size={28} color="#fff" />
          </View>
          <Text style={styles.title}>Пакет оформлен</Text>
          <Text style={styles.subtitle}>
            {params.childName ? params.childName + " · " : ""}остался последний шаг — выпустите карту
          </Text>
        </View>

        <Text style={styles.label}>Тип карты</Text>
        <View style={styles.row}>
          {(["virtual", "plastic"] as CardType[]).map((item) => (
            <Pressable key={item} onPress={() => setType(item)} style={[styles.chip, type === item && styles.chipActive]}>
              <Text style={[styles.chipText, type === item && styles.chipTextActive]}>
                {item === "virtual" ? "Виртуальная" : "Пластиковая"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Платёжная система</Text>
        <View style={styles.systems}>
          {SYSTEMS.map((item) => (
            <Pressable key={item} onPress={() => setSystem(item)} style={[styles.system, system === item && styles.systemActive]}>
              <PaymentBrand system={item} />
              <Text style={[styles.systemText, system === item && styles.systemTextActive]}>{SYSTEM_LABEL[item]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hint}>CVV и PIN придут в Telegram сразу после выпуска.</Text>

        {issued ? (
          <Button label="Продолжить" onPress={goNext} />
        ) : (
          <>
            <Button label={busy ? "Выпускаем…" : "Выпустить карту"} onPress={() => void (issued ? goNext() : issue())} loading={busy} />
            <Pressable style={styles.skip} onPress={goNext}>
              <Text style={styles.skipText}>Позже</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, gap: spacing.sm },
    head: { alignItems: "center", gap: 6, marginBottom: spacing.lg },
    check: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
    title: { color: colors.text, fontSize: 24, fontWeight: "800" },
    subtitle: { color: colors.muted, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 18 },
    label: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginTop: spacing.md },
    row: { flexDirection: "row", gap: spacing.sm },
    chip: { flex: 1, alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingVertical: 12 },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    chipText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
    chipTextActive: { color: colors.primary },
    systems: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    system: { flexBasis: "47%", flexGrow: 1, alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.line, paddingVertical: 14 },
    systemActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    systemText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
    systemTextActive: { color: colors.primary },
    hint: { color: colors.muted, fontSize: 12, fontWeight: "500", marginVertical: spacing.md, textAlign: "center" },
    skip: { alignItems: "center", paddingVertical: spacing.md },
    skipText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  });
