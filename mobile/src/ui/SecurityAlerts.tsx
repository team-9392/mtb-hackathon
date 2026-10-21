import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { api } from "@/api/client";
import { spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";

type Alert = { id: string; title_ru: string; body_ru: string | null; created_at: string };

/** ИИ-антифрод: алерты родителю о необычных операциях (обезличенные признаки). */
export function SecurityAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void api<{ alerts: Alert[] }>("/ai/fraud/alerts")
      .then((answer) => {
        if (alive) setAlerts(answer.alerts ?? []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const visible = open ? alerts : alerts.slice(0, 1);

  return (
    <Pressable style={styles.card} onPress={() => setOpen((prev) => !prev)}>
      <View style={styles.head}>
        <Ionicons name="shield-checkmark-outline" size={15} color="#fbbf24" />
        <Text style={styles.title}>
        {alerts.length > 0 ? "ИИ-безопасность · " + alerts.length : "ИИ-безопасность"}
      </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color="#8b94a3" />
      </View>
      {alerts.length === 0 ? <Text style={styles.alertBody}>Пока всё спокойно – ИИ следит за операциями и предупредит о необычных тратах.</Text> : null}
      {visible.map((alert) => (
        <View key={alert.id} style={styles.row}>
          <Text style={styles.alertTitle}>{alert.title_ru}</Text>
          {alert.body_ru ? <Text style={styles.alertBody}>{alert.body_ru}</Text> : null}
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(251,191,36,0.08)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(251,191,36,0.26)", padding: spacing.md, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { flex: 1, color: "#fbbf24", fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  row: { gap: 2 },
  alertTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  alertBody: { color: "#c7d2e0", fontSize: 12, fontWeight: "500", lineHeight: 16 },
});
