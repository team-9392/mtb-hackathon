import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";

/** Универсальная карточка-ссылка на экран. */
export function LinkCard({ icon, title, subtitle, href, emoji }: { icon?: keyof typeof Ionicons.glyphMap; emoji?: string; title: string; subtitle?: string; href: string }) {
  const router = useRouter();
  return (
    <Pressable style={styles.card} onPress={() => router.push(href as never)}>
      <View style={styles.icon}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : <Ionicons name={icon ?? "chevron-forward"} size={20} color="#93c5fd" />}
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#8b94a3" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#151a22", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(147,197,253,0.14)", alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 19 },
  text: { flex: 1 },
  title: { color: "#fff", fontSize: 14, fontWeight: "800" },
  subtitle: { color: "#8b94a3", fontSize: 11, fontWeight: "600", marginTop: 1 },
});
