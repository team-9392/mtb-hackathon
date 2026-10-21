import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { api } from "@/api/client";
import type { Palette } from "@/theme/palette";
import { useThemedStyles } from "@/theme/ThemeProvider";
import { GlassCard } from "@/ui/GlassCard";
import { Text } from "@/ui/Text";

/** ИИ-аналитика трат: короткие выводы от ProxyAPI. */
export function AiInsights() {
  const styles = useThemedStyles(makeStyles);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void api<{ insights: string[] }>("/ai/insights", { method: "POST", body: {} })
      .then((answer) => {
        if (alive) setInsights(answer.insights ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading || insights.length === 0) {
    return null;
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={15} color="#93c5fd" />
        <Text style={styles.title}>ИИ-аналитика трат</Text>
      </View>
      {insights.map((item, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

const makeStyles = (_colors: Palette) =>
  StyleSheet.create({
    card: { gap: 8 },
    head: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
    title: { color: "#93c5fd", fontSize: 13, fontWeight: "800" },
    row: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
    bullet: { color: "#93c5fd", fontSize: 13, fontWeight: "800" },
    text: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "500" },
  });
