import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { api } from "@/api/client";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";

type DailyState = { claimedToday: boolean; streak: number; day: number; reward: number };

/** Ежедневный вход: сам открывается в новый день, забираешь бонус монетами. */
export function DailyBonus() {
  const [state, setState] = useState<DailyState | null>(null);
  const [visible, setVisible] = useState(false);
  const [claimed, setClaimed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void api<{ available?: boolean; daily?: DailyState }>("/gamification/state")
      .then((answer) => {
        if (!alive || !answer?.daily) return;
        setState(answer.daily);
        if (!answer.daily.claimedToday) {
          setVisible(true);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const answer = await api<{ claimed: boolean; streak: number; reward: number }>("/gamification/daily", { method: "POST", body: {} });
      setClaimed(answer.reward);
      setTimeout(() => setVisible(false), 1400);
    } catch {
      setVisible(false);
    } finally {
      setBusy(false);
    }
  };

  if (!visible || !state) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.fire}>
            <Ionicons name="flame" size={26} color="#fbbf24" />
          </View>
          <Text style={styles.title}>{claimed ? "Бонус получен!" : "День " + state.day + " подряд"}</Text>
          <Text style={styles.subtitle}>
            {claimed ? "Мобик доволен: +" + claimed + " монет" : "Заходи каждый день — награда растёт. Серия: " + state.streak}
          </Text>
          <View style={styles.reward}>
            <Text style={styles.rewardAmount}>+{state.reward}</Text>
            <Text style={styles.rewardLabel}>монет</Text>
          </View>
          {claimed ? (
            <Pressable style={styles.button} onPress={() => setVisible(false)}>
              <Text style={styles.buttonText}>Отлично</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.button} onPress={() => void claim()} disabled={busy}>
              <Text style={styles.buttonText}>{busy ? "Забираем…" : "Забрать бонус"}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setVisible(false)} style={styles.later}>
            <Text style={styles.laterText}>Позже</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 340, borderRadius: 28, backgroundColor: "#151a22", borderWidth: 1, borderColor: "rgba(251,191,36,0.3)", padding: spacing.xl, alignItems: "center", gap: 6 },
  fire: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(251,191,36,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#8b94a3", fontSize: 13, fontWeight: "500", textAlign: "center", lineHeight: 18 },
  reward: { flexDirection: "row", alignItems: "baseline", gap: 6, marginVertical: 8 },
  rewardAmount: { color: "#fbbf24", fontSize: 40, fontWeight: "900" },
  rewardLabel: { color: "#8b94a3", fontSize: 14, fontWeight: "700" },
  button: { alignSelf: "stretch", backgroundColor: "#fbbf24", borderRadius: radius.pill, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#0b0f14", fontSize: 15, fontWeight: "800" },
  later: { paddingVertical: 8 },
  laterText: { color: "#8b94a3", fontSize: 13, fontWeight: "600" },
});
