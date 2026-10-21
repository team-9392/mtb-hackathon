import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createGoalApi, depositGoalApi, editGoalApi } from "@/api/actions";
import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import { Text } from "@/ui/Text";

const PRESETS = [5, 10, 20];

/** Копилка: заблокированные средства на карте ребёнка. Создаёт и пополняет родитель. */
export default function ParentKopilkaScreen() {
  const { t, lang } = useI18n();
  const { state, addToGoal, showToast, refresh } = useStore();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const goal = state.goal;
  const [title, setTitle] = useState(lang === "be" ? goal.title.be : goal.title.ru);
  const [target, setTarget] = useState(String(goal.target || 100));
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState(false);
  const progress = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;

  const save = async () => {
    const childId = state.childId;
    const value = Number(target);
    if (!childId || title.trim().length < 2 || !Number.isFinite(value) || value <= 0 || busy) return;
    setBusy(true);
    try {
      if (state.goalId) {
        await editGoalApi(childId, state.goalId, { title: title.trim(), target: value });
      } else {
        await createGoalApi(childId, title.trim(), value);
      }
      await refresh();
      showToast(t("gl.saved"));
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
          <Text style={styles.title}>{t("ch.kopilka")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("gl.target")}</Text>
          <Text style={styles.big}>
            {lang === "be" ? goal.title.be : goal.title.ru}
          </Text>
          <Text style={styles.meta}>
            {formatMoney(goal.saved, 0)} / {formatMoney(goal.target, 0)}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: progress + "%" }]} />
          </View>
          <Text style={styles.hint}>{t("gl.blockedHint")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("gl.editTitle")}</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder={t("gl.namePlaceholder")} placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={target} onChangeText={setTarget} keyboardType="numeric" placeholder="100" placeholderTextColor={colors.muted} style={styles.input} />
          <Pressable style={styles.save} onPress={() => void save()} disabled={busy}>
            <Text style={styles.saveText}>{t("common.save")}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("gl.topUp")}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>Сумма, BYN</Text>
          <TextInput
            value={String(amount)}
            onChangeText={(value: string) => setAmount(Math.min(100000, Number(value.replace(/[^0-9]/g, "")) || 0))}
            keyboardType="numeric"
            style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 12 }}
          />
          <View style={styles.presets}>
            {PRESETS.map((value) => (
              <Pressable key={value} onPress={() => setAmount(value)} style={[styles.preset, amount === value && styles.presetActive]}>
                <Text style={[styles.presetText, amount === value && styles.presetTextActive]}>{value} BYN</Text>
              </Pressable>
            ))}
          </View>
          <SlideToConfirm label={t("gl.topUp") + " · " + amount + " BYN"} onConfirm={() => addToGoal(amount)} doneLabel={t("common.done")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, gap: spacing.md },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    back: { color: colors.text, fontSize: 26, fontWeight: "700", paddingHorizontal: 6 },
    title: { color: colors.text, fontSize: 22, fontWeight: "800" },
    card: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
    label: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
    big: { color: colors.text, fontSize: 22, fontWeight: "800" },
    meta: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden", marginTop: spacing.sm },
    fill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },
    hint: { color: colors.muted, fontSize: 12, fontWeight: "500", marginTop: spacing.sm, lineHeight: 17 },
    input: { backgroundColor: colors.inputBg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14 },
    save: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 10, alignItems: "center" },
    saveText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    presets: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
    preset: { flex: 1, alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingVertical: 8 },
    presetActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    presetText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
    presetTextActive: { color: colors.primary },
  });
