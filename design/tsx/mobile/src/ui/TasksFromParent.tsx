import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { childTasksApi, createTaskApi, updateTaskApi } from "@/api/actions";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

type Task = { id: string; title: string; points: number; status: string };
const PRESETS = [20, 40, 60];

/** Задания от родителя: родитель создаёт, ребёнок отмечает, родитель подтверждает. */
export function TasksFromParent({ mode }: { mode: "parent" | "child" }) {
  const { t } = useI18n();
  const { state, showToast } = useStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const childId = state.childId;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState(20);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const answer = await childTasksApi(childId);
      setTasks(answer.tasks ?? []);
    } catch {
      // заданий ещё нет
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!childId || title.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      await createTaskApi(childId, title.trim(), points);
      setTitle("");
      showToast(t("pt.created"));
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setBusy(false);
    }
  };

  const move = async (task: Task, status: "done" | "approved") => {
    if (!childId || busy) return;
    setBusy(true);
    try {
      await updateTaskApi(childId, task.id, status);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!childId) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="list-outline" size={16} color={colors.primary} />
        <Text style={styles.headText}>{t("pt.title")}</Text>
      </View>

      {mode === "parent" ? (
        <View style={styles.form}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("pt.placeholder")}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <View style={styles.presets}>
            {PRESETS.map((value) => (
              <Pressable key={value} onPress={() => setPoints(value)} style={[styles.preset, points === value && styles.presetActive]}>
                <Text style={[styles.presetText, points === value && styles.presetTextActive]}>+{value}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.add} onPress={() => void create()} disabled={busy}>
              <Text style={styles.addText}>{t("pt.add")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {tasks.length === 0 ? <Text style={styles.empty}>{t("pt.empty")}</Text> : null}
      {tasks.map((task) => (
        <View key={task.id} style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.title}>{task.title}</Text>
            <Text style={styles.meta}>
              +{task.points} · {task.status === "new" ? t("pt.statusNew") : task.status === "done" ? t("pt.statusDone") : t("pt.statusApproved")}
            </Text>
          </View>
          {mode === "child" && task.status === "new" ? (
            <Pressable style={styles.action} onPress={() => void move(task, "done")}>
              <Text style={styles.actionText}>{t("pt.markDone")}</Text>
            </Pressable>
          ) : null}
          {mode === "parent" && task.status === "done" ? (
            <Pressable style={styles.action} onPress={() => void move(task, "approved")}>
              <Text style={styles.actionText}>{t("pt.approve")}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
    head: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.xs },
    headText: { color: colors.text, fontSize: 15, fontWeight: "700" },
    form: { gap: spacing.sm, marginBottom: spacing.sm },
    input: { backgroundColor: colors.inputBg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14 },
    presets: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    preset: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
    presetActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    presetText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
    presetTextActive: { color: colors.primary },
    add: { marginLeft: "auto", backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
    addText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    empty: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm },
    flex: { flex: 1, gap: 2 },
    title: { color: colors.text, fontSize: 14, fontWeight: "600" },
    meta: { color: colors.muted, fontSize: 12, fontWeight: "600" },
    action: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
    actionText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  });
