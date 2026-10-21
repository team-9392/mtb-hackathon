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
type Level = { level: number; title: string; from: number };
type Stats = {
  level: number;
  levelTitle: string;
  nextLevel: number | null;
  nextLevelTitle: string | null;
  toNextLevel: number;
  progress: number;
  levels: Level[];
  streak: number;
  spent: number;
  saved: number;
  decisions: number;
};

const EMPTY_STATS: Stats = {
  level: 1,
  levelTitle: "Новичок",
  nextLevel: 2,
  nextLevelTitle: "Копитель",
  toNextLevel: 0,
  progress: 0,
  levels: [],
  streak: 0,
  spent: 0,
  saved: 0,
  decisions: 0,
};

/** Игра «Недельный бюджет»: ИИ-ситуации, уровни, серия отказов. */
export default function BudgetGameScreen() {
  const { t } = useI18n();
  const { showToast } = useStore();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [balance, setBalance] = useState(100);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [history, setHistory] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [reaction, setReaction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const answer = await api<{ balance: number; scenario: Scenario | null; history: Event[]; stats: Stats }>("/game/budget");
      setBalance(answer.balance);
      setScenario(answer.scenario);
      setHistory(answer.history ?? []);
      setStats(answer.stats ?? EMPTY_STATS);
    } catch {
      showToast(t("auth.connectFailed"));
    }
  }, [showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const next = async () => {
    setBusy(true);
    setReaction(null);
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
      const answer = await api<{ balance: number; result: string; reaction?: string; history: Event[]; stats: Stats }>("/game/budget/decide", { method: "POST", body: { decision } });
      setBalance(answer.balance);
      setHistory(answer.history ?? []);
      setStats(answer.stats ?? EMPTY_STATS);
      setScenario(null);
      setReaction(answer.reaction ?? answer.result);
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
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Недельный бюджет</Text>
          <View style={styles.streakChip}>
            <Ionicons name="flame" size={13} color="#fbbf24" />
            <Text style={styles.streakText}>{stats.streak}</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.label}>Виртуальный баланс</Text>
          <Text style={styles.balance}>{Math.round(balance)} BYN</Text>
          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#93c5fd" />
              <Text style={styles.levelText}>{stats.levelTitle}</Text>
            </View>
            {stats.nextLevelTitle ? (
              <Text style={styles.levelHint}>до «{stats.nextLevelTitle}»: {Math.round(stats.toNextLevel)} BYN</Text>
            ) : (
              <Text style={styles.levelHint}>максимальный уровень</Text>
            )}
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: Math.round(stats.progress * 100) + "%" }]} />
          </View>
        </View>

        <View style={styles.path}>
          {(stats.levels.length > 0 ? stats.levels : [{ level: 1, title: "Новичок", from: 0 }]).map((item, index, list) => {
            const active = stats.level >= item.level;
            return (
              <View key={item.level} style={styles.stepWrap}>
                <View style={[styles.step, active && styles.stepActive]}>
                  {active ? <Ionicons name="checkmark" size={12} color="#0b0f14" /> : <Text style={styles.stepNum}>{item.level}</Text>}
                </View>
                <Text style={[styles.stepTitle, active && styles.stepTitleActive]} numberOfLines={1}>{item.title}</Text>
                {index < list.length - 1 ? <View style={[styles.stepLine, active && styles.stepLineActive]} /> : null}
              </View>
            );
          })}
        </View>

        {scenario ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="sparkles-outline" size={16} color="#93c5fd" />
              <Text style={styles.badge}>Ситуация дня · ИИ</Text>
            </View>
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
            <Text style={styles.nextText}>{busy ? "ИИ придумывает…" : "Новая ситуация"}</Text>
          </Pressable>
        )}

        {reaction ? (
          <View style={styles.reaction}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#93c5fd" />
            <Text style={styles.reactionText}>{reaction}</Text>
          </View>
        ) : null}

        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats.decisions}</Text>
            <Text style={styles.summaryLabel}>решений</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#f87171" }]}>{stats.spent}</Text>
            <Text style={styles.summaryLabel}>потрачено</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#34d399" }]}>{stats.saved}</Text>
            <Text style={styles.summaryLabel}>сэкономлено</Text>
          </View>
        </View>

        <Text style={styles.section}>История</Text>
        {history.length === 0 ? <Text style={styles.hint}>Пока нет решений</Text> : null}
        {history.map((event) => (
          <View key={event.id} style={styles.event}>
            <View style={styles.eventText}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>
                {event.decision === "spend" ? "потрачено" : "отказался"} · {Math.round(Number(event.amount))} BYN
              </Text>
            </View>
            <Text style={[styles.eventAmount, { color: event.decision === "spend" ? "#f87171" : "#34d399" }]}>
              {event.decision === "spend" ? "−" : "+"}
              {event.decision === "spend" ? Math.round(Number(event.amount)) : Math.round(Number(event.amount) / 2)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (_colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0b0f14" },
    scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    back: { color: "#fff", fontSize: 26, fontWeight: "700", paddingHorizontal: 6 },
    title: { color: "#fff", fontSize: 22, fontWeight: "800", flex: 1 },
    streakChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(251,191,36,0.16)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
    streakText: { color: "#fbbf24", fontSize: 13, fontWeight: "800" },
    balanceCard: { backgroundColor: "#151a22", borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.lg, gap: 4 },
    label: { color: "#8b94a3", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
    balance: { color: "#fff", fontSize: 44, fontWeight: "800", letterSpacing: -1 },
    levelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    levelBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(147,197,253,0.16)", borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
    levelText: { color: "#bfdbfe", fontSize: 11, fontWeight: "800" },
    levelHint: { color: "#8b94a3", fontSize: 11, fontWeight: "600" },
    track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 8 },
    fill: { height: "100%", borderRadius: 3, backgroundColor: "#60a5fa" },
    path: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 4 },
    stepWrap: { flex: 1, alignItems: "center", gap: 6 },
    step: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
    stepActive: { backgroundColor: "#93c5fd", borderColor: "#93c5fd" },
    stepNum: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "800" },
    stepTitle: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "700", textAlign: "center" },
    stepTitleActive: { color: "#dbeafe" },
    stepLine: { position: "absolute", top: 13, left: "62%", right: "-38%", height: 1.5, backgroundColor: "rgba(255,255,255,0.12)" },
    stepLineActive: { backgroundColor: "rgba(147,197,253,0.6)" },
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
    reaction: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#151a22", borderRadius: 18, borderWidth: 1, borderColor: "rgba(147,197,253,0.25)", padding: spacing.md },
    reactionText: { flex: 1, color: "#c7d2e0", fontSize: 13, lineHeight: 18, fontWeight: "500" },
    summary: { flexDirection: "row", gap: spacing.sm },
    summaryItem: { flex: 1, backgroundColor: "#151a22", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: spacing.md, alignItems: "center", gap: 2 },
    summaryValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
    summaryLabel: { color: "#8b94a3", fontSize: 10, fontWeight: "700" },
    section: { color: "#8b94a3", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: spacing.sm },
    hint: { color: "#8b94a3", fontSize: 12, fontWeight: "500" },
    event: { flexDirection: "row", alignItems: "center", backgroundColor: "#151a22", borderRadius: 18, padding: spacing.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
    eventText: { flex: 1 },
    eventTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
    eventMeta: { color: "#8b94a3", fontSize: 12, fontWeight: "500", marginTop: 2 },
    eventAmount: { fontSize: 16, fontWeight: "800" },
  });
