import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

type Scenario = { title: string; description: string; amount: number };
type Event = { id: string; title: string; amount: number; decision: string };

/** Игра «Недельный бюджет»: виртуальные деньги и решения тратить/не тратить. */
export default function BudgetGameScreen() {
  const { t } = useI18n();
  const { showToast } = useStore();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [balance, setBalance] = useState(100);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [history, setHistory] = useState<Event[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const answer = await api<{ balance: number; scenario: Scenario | null; history: Event[] }>("/game/budget");
      setBalance(answer.balance);
      setScenario(answer.scenario);
      setHistory(answer.history ?? []);
    } catch {
      showToast(t("auth.connectFailed"));
    }
  }, [showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const next = async () => {
    setBusy(true);
    try {
      const answer = await api<{ scenario: Scenario }>("/game/budget/scenario", { method: "POST", body: {} });
      setScenario(answer.scenario);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision: "spend" | "skip") => {
    setBusy(true);
    try {
      const answer = await api<{ balance: number; result: string; history: Event[] }>("/game/budget/decide", { method: "POST", body: { decision } });
      setBalance(answer.balance);
      setHistory(answer.history ?? []);
      setScenario(null);
      showToast(answer.result);
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
          <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.title}>Недельный бюджет</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.label}>Виртуальный баланс</Text>
          <Text style={styles.balance}>{Math.round(balance)} BYN</Text>
          <Text style={styles.hint}>Цель — сохранить положительный баланс до конца недели</Text>
        </View>

        {scenario ? (
          <View style={styles.card}>
            <View style={styles.row}><Ionicons name="sparkles-outline" size={16} color="#93c5fd" /><Text style={styles.badge}>Ситуация дня</Text></View>
            <Text style={styles.cardTitle}>{scenario.title}</Text>
            <Text style={styles.cardText}>{scenario.description}</Text>
            <Text style={styles.amount}>−{scenario.amount} BYN</Text>
            <View style={styles.buttons}>
              <Pressable style={[styles.btn, styles.spend]} onPress={() => void decide("spend")} disabled={busy}>
                <Text style={styles.btnText}>Потратить</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.save]} onPress={() => void decide("skip")} disabled={busy}>
                <Text style={styles.btnText}>Отказаться</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.next} onPress={() => void next()} disabled={busy}>
            <Ionicons name="sparkles" size={18} color="#000" />
            <Text style={styles.nextText}>{busy ? "Генерируем…" : "Новая ситуация"}</Text>
          </Pressable>
        )}

        <Text style={styles.section}>История</Text>
        {history.length === 0 ? <Text style={styles.hint}>Пока нет решений</Text> : null}
        {history.map((event) => (
          <View key={event.id} style={styles.event}>
            <View style={styles.eventText}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>{event.decision === "spend" ? "потрачено" : "отказался"} · {Math.round(Number(event.amount))} BYN</Text>
            </View>
            <Text style={[styles.eventAmount, { color: event.decision === "spend" ? "#f87171" : "#34d399" }]}>
              {event.decision === "spend" ? "−" : "+"}{event.decision === "spend" ? Math.round(Number(event.amount)) : Math.round(Number(event.amount) / 2)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0b0f14" },
    scroll: { padding: spacing.lg, gap: spacing.md },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    back: { color: "#fff", fontSize: 26, fontWeight: "700", paddingHorizontal: 6 },
    title: { color: "#fff", fontSize: 22, fontWeight: "800" },
    balanceCard: { backgroundColor: "#151a22", borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.lg, gap: 4 },
    label: { color: "#8b94a3", fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
    balance: { color: "#fff", fontSize: 44, fontWeight: "800", letterSpacing: -1 },
    hint: { color: "#8b94a3", fontSize: 12, fontWeight: "500" },
    card: { backgroundColor: "#1d2430", borderRadius: 24, borderWidth: 1, borderColor: "rgba(147,197,253,0.25)", padding: spacing.lg, gap: 6 },
    row: { flexDirection: "row", alignItems: "center", gap: 6 },
    badge: { color: "#93c5fd", fontSize: 12, fontWeight: "700" },
    cardTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 4 },
    cardText: { color: "#c7d2e0", fontSize: 14, lineHeight: 20, fontWeight: "500" },
    amount: { color: "#f87171", fontSize: 18, fontWeight: "800", marginTop: 4 },
    buttons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    btn: { flex: 1, borderRadius: radius.pill, paddingVertical: 12, alignItems: "center" },
    spend: { backgroundColor: "rgba(248,113,113,0.2)", borderWidth: 1, borderColor: "rgba(248,113,113,0.4)" },
    save: { backgroundColor: "rgba(52,211,153,0.2)", borderWidth: 1, borderColor: "rgba(52,211,153,0.4)" },
    btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    next: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#93c5fd", borderRadius: radius.pill, paddingVertical: 14 },
    nextText: { color: "#000", fontSize: 15, fontWeight: "800" },
    section: { color: "#8b94a3", fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: spacing.md },
    event: { flexDirection: "row", alignItems: "center", backgroundColor: "#151a22", borderRadius: 18, padding: spacing.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
    eventText: { flex: 1 },
    eventTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
    eventMeta: { color: "#8b94a3", fontSize: 12, fontWeight: "500", marginTop: 2 },
    eventAmount: { fontSize: 16, fontWeight: "800" },
  });
