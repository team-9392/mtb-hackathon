import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { radius, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

/** Настройки: тема, язык, Telegram, уведомления, выход. */
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang, setLang } = useI18n();
  const { mode, setMode, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const { showToast } = useStore();
  const [push, setPush] = useState(true);
  const [busy, setBusy] = useState(false);

  const bindTelegram = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const answer = await api<{ url?: string }>("/auth/telegram/link", { method: "POST", body: {} });
      if (answer?.url) {
        await Linking.openURL(answer.url);
      } else {
        showToast("Ссылка на привязку недоступна");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось привязать Telegram");
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
        <Text style={styles.title}>Настройки</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Внешний вид</Text>
        <View style={styles.row}>
          <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={18} color="#93c5fd" />
          <Text style={styles.rowTitle}>Тема</Text>
          <View style={styles.segment}>
            <Pressable style={[styles.segmentItem, mode === "dark" && styles.segmentActive]} onPress={() => setMode("dark")}>
              <Text style={[styles.segmentText, mode === "dark" && styles.segmentTextActive]}>Тёмная</Text>
            </Pressable>
            <Pressable style={[styles.segmentItem, mode === "light" && styles.segmentActive]} onPress={() => setMode("light")}>
              <Text style={[styles.segmentText, mode === "light" && styles.segmentTextActive]}>Светлая</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>Язык</Text>
        <View style={styles.row}>
          <Ionicons name="language-outline" size={18} color="#93c5fd" />
          <Text style={styles.rowTitle}>Интерфейс</Text>
          <View style={styles.segment}>
            <Pressable style={[styles.segmentItem, lang === "ru" && styles.segmentActive]} onPress={() => setLang("ru")}>
              <Text style={[styles.segmentText, lang === "ru" && styles.segmentTextActive]}>RU</Text>
            </Pressable>
            <Pressable style={[styles.segmentItem, lang === "be" && styles.segmentActive]} onPress={() => setLang("be")}>
              <Text style={[styles.segmentText, lang === "be" && styles.segmentTextActive]}>BE</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>Безопасность</Text>
        <Pressable style={styles.row} onPress={() => void bindTelegram()} disabled={busy}>
          <Ionicons name="paper-plane-outline" size={18} color="#93c5fd" />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Telegram</Text>
            <Text style={styles.rowHint}>Коды входа и реквизиты карты приходят в бота</Text>
          </View>
          <Text style={styles.action}>{busy ? "…" : "Привязать"}</Text>
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push("/parent/child-access")}>
          <Ionicons name="key-outline" size={18} color="#93c5fd" />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Доступ ребёнку</Text>
            <Text style={styles.rowHint}>Код входа и управление доступом</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#8b94a3" />
        </Pressable>

        <Text style={styles.section}>Уведомления</Text>
        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={18} color="#93c5fd" />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Push-уведомления</Text>
            <Text style={styles.rowHint}>Переводы, задания, достижения, ИИ-безопасность</Text>
          </View>
          <Switch
            value={push}
            onValueChange={setPush}
            trackColor={{ true: "#3b82f6", false: "#3a4150" }}
            thumbColor="#fff"
          />
        </View>
        <Pressable style={styles.row} onPress={() => router.push("/notifications")}>
          <Ionicons name="mail-unread-outline" size={18} color="#93c5fd" />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Центр уведомлений</Text>
            <Text style={styles.rowHint}>История всех событий</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#8b94a3" />
        </Pressable>

        <Text style={styles.section}>О приложении</Text>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={18} color="#93c5fd" />
          <Text style={styles.rowTitle}>Moby Family</Text>
          <Text style={styles.rowHint}>v{Constants.expoConfig?.version ?? "0.1.0"}</Text>
        </View>

        <Pressable
          style={styles.logout}
          onPress={async () => {
            await signOut();
            router.replace("/auth/phone");
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#f87171" />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </Pressable>
        {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0f14" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800" },
  scroll: { padding: spacing.lg, gap: 8, paddingBottom: 40 },
  section: { color: "#8b94a3", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: spacing.md, marginBottom: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#151a22", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.md },
  rowText: { flex: 1 },
  rowTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  rowHint: { color: "#8b94a3", fontSize: 11, fontWeight: "500", marginTop: 1 },
  action: { color: "#93c5fd", fontSize: 12, fontWeight: "700" },
  segment: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.pill, padding: 2, gap: 2 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  segmentActive: { backgroundColor: "#3b82f6" },
  segmentText: { color: "#8b94a3", fontSize: 11, fontWeight: "700" },
  segmentTextActive: { color: "#fff" },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(248,113,113,0.35)", backgroundColor: "rgba(248,113,113,0.1)", paddingVertical: 14 },
  logoutText: { color: "#f87171", fontSize: 14, fontWeight: "800" },
  phone: { color: "#8b94a3", fontSize: 11, fontWeight: "600", textAlign: "center", marginTop: spacing.md },
});
