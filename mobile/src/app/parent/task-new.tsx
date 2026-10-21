import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createTaskApi } from "@/api/actions";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";

const PRESETS = [20, 40, 60, 100];

/** Отдельный экран: родитель создаёт задание ребёнку с наградой в монетах. */
export default function NewTaskScreen() {
  const { t } = useI18n();
  const { state, showToast } = useStore();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState(20);
  const [custom, setCustom] = useState("");

  const changeCustom = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCustom(digits);
    const parsed = Number(digits);
    if (Number.isFinite(parsed) && parsed > 0) {
      setPoints(Math.min(1000, parsed));
    }
  };
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!state.childId || title.trim().length < 2 || busy || points < 1) return;
    setBusy(true);
    try {
      await createTaskApi(state.childId, title.trim(), points);
      showToast(t("pt.created"));
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("pt.newTitle")}</Text>
        <Text style={styles.subtitle}>{t("pt.newSubtitle")}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("pt.placeholder")}
          placeholderTextColor={styles.placeholder.color as string}
          style={styles.input}
          multiline
        />
        <Text style={styles.label}>{t("pt.coinsLabel")}</Text>
        <View style={styles.presets}>
          {PRESETS.map((value) => (
            <Pressable key={value} onPress={() => { setPoints(value); setCustom(String(value)); }} style={[styles.preset, points === value && styles.presetActive]}>
              <Text style={[styles.presetText, points === value && styles.presetTextActive]}>+{value}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={custom}
          onChangeText={changeCustom}
          placeholder={t("pt.customPlaceholder")}
          placeholderTextColor={styles.placeholder.color as string}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={4}
          inputMode="numeric"
        />
        <Button label={t("pt.create")} onPress={() => void create()} loading={busy} />
        <Pressable onPress={() => router.back()} style={styles.cancel}>
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md },
    title: { color: colors.text, fontSize: 22, fontWeight: "800" },
    subtitle: { color: colors.muted, fontSize: 13, fontWeight: "600", marginBottom: spacing.sm },
    input: { backgroundColor: colors.inputBg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, padding: spacing.md, fontSize: 15, minHeight: 88, textAlignVertical: "top" },
    placeholder: { color: colors.muted },
    label: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: spacing.sm },
    presets: { flexDirection: "row", gap: spacing.sm },
    preset: { flex: 1, alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingVertical: 10 },
    presetActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    presetText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
    presetTextActive: { color: colors.primary },
    cancel: { alignItems: "center", paddingVertical: spacing.md },
    cancelText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  });
