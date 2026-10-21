import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { useI18n } from "@/i18n";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";

type ApiNotification = {
  id: string;
  kind: string | null;
  title_ru: string | null;
  title_be: string | null;
  body_ru: string | null;
  body_be: string | null;
  created_at: string;
  read_at?: string | null;
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  request: "mail-unread-outline",
  reward: "trophy-outline",
  txn: "swap-horizontal-outline",
  txn_declined: "alert-circle-outline",
  security: "shield-checkmark-outline",
  access: "key-outline",
};

function formatWhen(value: string, lang: string): string {
  const date = new Date(value);
  return date.toLocaleString(lang === "be" ? "be-BY" : "ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Центр уведомлений: все события семьи, отметка прочитанного. */
export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const answer = await api<{ notifications: ApiNotification[] }>("/notifications");
      setItems(answer.notifications ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    try {
      await api("/notifications/" + id + "/read", { method: "POST", body: {} });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item)));
    } catch {
      // не критично
    }
  };

  const markAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      for (const item of items) {
        await api("/notifications/" + item.id + "/read", { method: "POST", body: {} });
      }
      setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Уведомления</Text>
        {items.length > 0 ? (
          <Pressable onPress={() => void markAll()} hitSlop={10}>
            <Text style={styles.markAll}>{busy ? "…" : "Прочитать все"}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={34} color="#8b94a3" />
            <Text style={styles.emptyTitle}>Пока тихо</Text>
            <Text style={styles.emptyHint}>Здесь появятся переводы, задания, достижения и предупреждения ИИ.</Text>
          </View>
        ) : (
          items.map((item) => {
            const unread = !item.read_at;
            const title = (lang === "be" ? item.title_be : item.title_ru) ?? item.title_ru ?? item.title_be ?? "Событие";
            const body = (lang === "be" ? item.body_be : item.body_ru) ?? item.body_ru ?? item.body_be;
            return (
              <Pressable key={item.id} style={[styles.row, unread && styles.rowUnread]} onPress={() => void markRead(item.id)}>
                <View style={styles.iconWrap}>
                  <Ionicons name={ICONS[item.kind ?? ""] ?? "notifications-outline"} size={18} color="#93c5fd" />
                </View>
                <View style={styles.text}>
                  <Text style={styles.rowTitle}>{title}</Text>
                  {body ? <Text style={styles.rowBody}>{body}</Text> : null}
                  <Text style={styles.rowMeta}>{formatWhen(item.created_at, lang)}</Text>
                </View>
                {unread ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0f14" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800" },
  markAll: { color: "#93c5fd", fontSize: 12, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: 8, paddingBottom: 40 },
  empty: { alignItems: "center", gap: 6, marginTop: 80, padding: spacing.lg },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  emptyHint: { color: "#8b94a3", fontSize: 12, fontWeight: "500", textAlign: "center", lineHeight: 17 },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: "#151a22", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: spacing.md },
  rowUnread: { borderColor: "rgba(147,197,253,0.3)", backgroundColor: "rgba(147,197,253,0.08)" },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(147,197,253,0.14)", alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  rowTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  rowBody: { color: "#c7d2e0", fontSize: 12, fontWeight: "500", lineHeight: 16 },
  rowMeta: { color: "#8b94a3", fontSize: 10, fontWeight: "600", marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#60a5fa", marginTop: 4 },
});
