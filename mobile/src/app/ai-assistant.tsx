import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";

type Turn = { role: "user" | "assistant"; text: string };

const SAMPLES = [
  "На что я трачу больше всего?",
  "Как быстрее накопить на велосипед?",
  "Сколько можно тратить в неделю?",
];

/** ИИ-ассистент «Спроси Моби»: вопросы про бюджет, траты и копилку. Данные обезличены. */
export default function AiAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", text: "Привет! Я Моби. Спроси про траты, лимиты или как накопить на цель. Я вижу только суммы и категории – без имён и реквизитов." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = useCallback(
    async (value: string) => {
      const message = value.trim();
      if (!message || busy) {
        return;
      }
      setInput("");
      const history = turns.slice(-8);
      setTurns((prev) => [...prev, { role: "user", text: message }]);
      setBusy(true);
      try {
        const answer = await api<{ answer: string }>("/ai/chat", { method: "POST", body: { message, history } });
        setTurns((prev) => [...prev, { role: "assistant", text: answer.answer }]);
      } catch (error) {
        setTurns((prev) => [
          ...prev,
          { role: "assistant", text: error instanceof Error ? error.message : "Не получилось ответить, попробуй ещё раз." },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, turns],
  );

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Спроси Моби</Text>
          <Text style={styles.subtitle}>ИИ-помощник · данные обезличены</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={14} color="#93c5fd" />
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {turns.map((turn, index) => (
            <View key={index} style={[styles.bubble, turn.role === "user" ? styles.userBubble : styles.botBubble]}>
              <Text style={turn.role === "user" ? styles.userText : styles.botText}>{turn.text}</Text>
            </View>
          ))}
          {busy ? (
            <View style={[styles.bubble, styles.botBubble]}>
              <Text style={styles.botText}>Думаю…</Text>
            </View>
          ) : null}
          {turns.length <= 1 ? (
            <View style={styles.samples}>
              {SAMPLES.map((sample) => (
                <Pressable key={sample} style={styles.sample} onPress={() => void send(sample)}>
                  <Text style={styles.sampleText}>{sample}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Спроси про деньги…"
            placeholderTextColor="#8b94a3"
            style={styles.input}
            multiline
            maxLength={500}
            onSubmitEditing={() => void send(input)}
          />
          <Pressable style={[styles.send, (!input.trim() || busy) && styles.sendDisabled]} onPress={() => void send(input)} disabled={busy}>
            <Ionicons name="arrow-up" size={20} color="#0b0f14" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0f14" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.lg, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  subtitle: { color: "#8b94a3", fontSize: 11, fontWeight: "600", marginTop: 1 },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(147,197,253,0.14)", alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: 10, paddingBottom: 20 },
  bubble: { maxWidth: "86%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#3b82f6", borderBottomRightRadius: 6 },
  botBubble: { alignSelf: "flex-start", backgroundColor: "#151a22", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderBottomLeftRadius: 6 },
  userText: { color: "#fff", fontSize: 15, lineHeight: 21, fontWeight: "600" },
  botText: { color: "#dbe4f0", fontSize: 15, lineHeight: 21, fontWeight: "500" },
  samples: { gap: 8, marginTop: 6 },
  sample: { borderWidth: 1, borderColor: "rgba(147,197,253,0.28)", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, alignSelf: "flex-start" },
  sampleText: { color: "#93c5fd", fontSize: 13, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: spacing.lg, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", backgroundColor: "#0b0f14" },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "#151a22", color: "#fff", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#93c5fd", alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.4 },
});
