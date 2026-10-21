import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";

/** Вход в «Центр наград»: достижения, скины, дуэль и питомец. */
export function GameCenterLink() {
  const router = useRouter();
  return (
    <Pressable style={styles.card} onPress={() => router.push("/game-center")}>
      <View style={styles.icon}><Text style={styles.emoji}>🏆</Text></View>
      <View style={styles.text}>
        <Text style={styles.title}>Центр наград</Text>
        <Text style={styles.subtitle}>Достижения, скины карты, дуэль и Мобик</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#8b94a3" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "rgba(147,197,253,0.1)", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(147,197,253,0.3)", padding: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(147,197,253,0.16)", alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 20 },
  text: { flex: 1 },
  title: { color: "#fff", fontSize: 14, fontWeight: "800" },
  subtitle: { color: "#8b94a3", fontSize: 11, fontWeight: "600", marginTop: 1 },
});
