import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";

type Achievement = { code: string; title: string; description: string; emoji: string; rarity: string; unlocked: boolean };
type Skin = { code: string; title: string; description: string; accent: string; requirement: string; unlocked: boolean; active: boolean };
type State = {
  available: boolean;
  nick?: string;
  name?: string;
  coins: number;
  level: number;
  levelTitle: string;
  xp: number;
  nextXp: number;
  progress: number;
  daily: { claimedToday: boolean; streak: number; day: number; reward: number };
  achievements: Achievement[];
  skins: Skin[];
  duel: { childPoints: number; parentPoints: number };
  pet: { name: string; level: number; mood: string; speech: string };
};

/** Центр наград: питомец Мобик, серия входов, достижения, скины карты и дуэль с родителем. */
export default function GameCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const answer = await api<State>("/gamification/state");
      setState(answer);
    } catch {
      // экран останется пустым до сети
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const equip = async (code: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await api("/gamification/skins/equip", { method: "POST", body: { code } });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!state?.available) {
    return (
      <SafeAreaView style={styles.root} edges={[]}>
        <View style={[styles.head, { paddingTop: insets.top + 8, paddingHorizontal: spacing.lg }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={styles.headerTitle}>Центр наград</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Центр наград доступен в профиле ребёнка.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unlocked = state.achievements.filter((item) => item.unlocked).length;
  const duelTotal = Math.max(1, state.duel.childPoints + state.duel.parentPoints);
  const childShare = Math.round((state.duel.childPoints / duelTotal) * 100);

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={styles.headerTitle}>Центр наград</Text>
          <View style={styles.coins}>
            <Text style={styles.coinsText}>{state.coins}</Text>
            <Text style={styles.coinIcon}>🪙</Text>
          </View>
        </View>

        {/* Питомец Мобик живёт в копилке – растёт от накоплений */}

        {/* Серия входов */}
        <View style={styles.dailyRow}>
          <Ionicons name="flame" size={18} color="#fbbf24" />
          <Text style={styles.dailyText}>
            Серия входов: {state.daily.streak} {state.daily.claimedToday ? "· бонус получен сегодня" : "· бонус дня ждёт"}
          </Text>
          <Text style={styles.dailyReward}>+{state.daily.reward}</Text>
        </View>

        {/* Дуэль с родителем */}
        <Text style={styles.section}>Дуэль недели</Text>
        <View style={styles.duelCard}>
          <View style={styles.duelRow}>
            <Text style={styles.duelLabel}>Ты</Text>
            <Text style={styles.duelValue}>{state.duel.childPoints}</Text>
          </View>
          <View style={styles.duelBar}>
            <View style={[styles.duelFill, { width: childShare + "%" }]} />
          </View>
          <View style={styles.duelRow}>
            <Text style={styles.duelLabel}>Родитель</Text>
            <Text style={styles.duelValue}>{state.duel.parentPoints}</Text>
          </View>
          <Text style={styles.duelHint}>
            {state.duel.childPoints >= state.duel.parentPoints ? "Ты впереди – так держать!" : "Родитель впереди: выполни задание или пройди тест."}
          </Text>
        </View>

        {/* Достижения */}
        <Text style={styles.section}>Достижения · {unlocked}/{state.achievements.length}</Text>
        <View style={styles.grid}>
          {state.achievements.map((item) => (
            <View key={item.code} style={[styles.badge, item.unlocked ? styles.badgeOn : styles.badgeOff]}>
              <Text style={[styles.badgeEmoji, !item.unlocked && styles.dim]}>{item.emoji}</Text>
              <Text style={[styles.badgeTitle, !item.unlocked && styles.dim]} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.badgeDesc} numberOfLines={2}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Скины карты */}
        <Text style={styles.section}>Скины карты</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skins}>
          {state.skins.map((skin) => (
            <Pressable
              key={skin.code}
              style={[styles.skin, skin.active && { borderColor: skin.accent }, !skin.unlocked && styles.skinLocked]}
              onPress={() => skin.unlocked && void equip(skin.code)}
              disabled={!skin.unlocked || busy}
            >
              <View style={[styles.skinSwatch, { backgroundColor: skin.accent }]} />
              <Text style={styles.skinTitle}>{skin.title}</Text>
              <Text style={styles.skinReq}>{skin.unlocked ? (skin.active ? "Активен" : "Выбрать") : skin.requirement}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0f14" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "800" },
  coins: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(251,191,36,0.14)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  coinsText: { color: "#fbbf24", fontSize: 13, fontWeight: "800" },
  coinIcon: { fontSize: 12 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  emptyText: { color: "#8b94a3", fontSize: 14, fontWeight: "600", textAlign: "center" },
  petCard: { flexDirection: "row", gap: spacing.md, backgroundColor: "#151a22", borderRadius: 24, borderWidth: 1, borderColor: "rgba(147,197,253,0.22)", padding: spacing.lg },
  petFace: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(147,197,253,0.14)", alignItems: "center", justifyContent: "center" },
  petEmoji: { fontSize: 34 },
  petText: { flex: 1, gap: 3 },
  petName: { color: "#fff", fontSize: 15, fontWeight: "800" },
  petSpeech: { color: "#c7d2e0", fontSize: 12, fontWeight: "500", lineHeight: 17 },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 4 },
  fill: { height: "100%", backgroundColor: "#60a5fa" },
  petXp: { color: "#8b94a3", fontSize: 10, fontWeight: "700" },
  dailyRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(251,191,36,0.25)", padding: spacing.md },
  dailyText: { flex: 1, color: "#fbbf24", fontSize: 12, fontWeight: "700" },
  dailyReward: { color: "#fbbf24", fontSize: 14, fontWeight: "900" },
  section: { color: "#8b94a3", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: spacing.sm },
  duelCard: { backgroundColor: "#151a22", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.md, gap: 6 },
  duelRow: { flexDirection: "row", justifyContent: "space-between" },
  duelLabel: { color: "#8b94a3", fontSize: 12, fontWeight: "700" },
  duelValue: { color: "#fff", fontSize: 13, fontWeight: "800" },
  duelBar: { height: 8, borderRadius: 4, backgroundColor: "rgba(147,197,253,0.25)", overflow: "hidden" },
  duelFill: { height: "100%", backgroundColor: "#60a5fa" },
  duelHint: { color: "#8b94a3", fontSize: 11, fontWeight: "600", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badge: { width: "31%", flexGrow: 1, borderRadius: 18, borderWidth: 1, padding: spacing.sm, gap: 3 },
  badgeOn: { borderColor: "rgba(147,197,253,0.35)", backgroundColor: "rgba(147,197,253,0.1)" },
  badgeOff: { borderColor: "rgba(255,255,255,0.07)", backgroundColor: "#12161d" },
  badgeEmoji: { fontSize: 22 },
  badgeTitle: { color: "#fff", fontSize: 11, fontWeight: "800" },
  badgeDesc: { color: "#8b94a3", fontSize: 9, fontWeight: "500", lineHeight: 12 },
  dim: { opacity: 0.4 },
  skins: { gap: spacing.sm, paddingVertical: 2 },
  skin: { width: 120, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "#151a22", padding: spacing.md, gap: 4 },
  skinLocked: { opacity: 0.5 },
  skinSwatch: { width: 28, height: 18, borderRadius: 5 },
  skinTitle: { color: "#fff", fontSize: 13, fontWeight: "800" },
  skinReq: { color: "#8b94a3", fontSize: 10, fontWeight: "600" },
});
