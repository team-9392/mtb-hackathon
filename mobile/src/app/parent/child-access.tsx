import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";

import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { AgeBracket } from "@/store/types";
import { font, palette, radius, shadow, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Badge, Card, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { SlideToConfirm } from "@/ui/SlideToConfirm";

const BRACKETS: {
  id: AgeBracket;
  title: "p2.b1title" | "p2.b2title";
  desc: "p2.b1desc" | "p2.b2desc";
  icon: "happy-outline" | "rocket-outline";
}[] = [
  { id: "child_7_13", title: "p2.b1title", desc: "p2.b1desc", icon: "happy-outline" },
  { id: "teen_14_17", title: "p2.b2title", desc: "p2.b2desc", icon: "rocket-outline" },
];

const STEPS: ("kid.step1" | "kid.step2" | "kid.step3")[] = ["kid.step1", "kid.step2", "kid.step3"];

/** Разбивает код на группы по 4 символа для читаемости (ABCD EFGH IJKL). */
function groupCode(code: string): string {
  return code.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export default function ChildAccessScreen() {
  const { t } = useI18n();
  const { state, setChild, setBracket, createChild, grantAccess, revokeAccess, showToast } = useStore();
  const [creating, setCreating] = useState(false);

  const name = state.child.name;
  const bracket = state.child.bracket;
  const accessCode = state.accessCode ?? "";
  const hasProfile = Boolean(state.childId);

  const onCreate = async () => {
    if (!name.trim()) {
      showToast(t("kid.namePlaceholder"));
      return;
    }
    setCreating(true);
    try {
      await createChild(name.trim(), bracket);
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async () => {
    await Share.share({ message: "Moby Family: код доступа " + accessCode });
    showToast(t("kid.copied"));
  };

  return (
    <Screen showBack title={t("kid.title")} subtitle={t("kid.subtitle")}>
      {!hasProfile ? (
        <>
          <Text style={styles.need}>{t("kid.needProfile")}</Text>

          <TextInput
            value={name}
            onChangeText={(value) => setChild({ name: value })}
            placeholder={t("kid.namePlaceholder")}
            placeholderTextColor={palette.muted2}
            style={styles.input}
          />

          {BRACKETS.map((item) => {
            const active = bracket === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setBracket(item.id)}
                style={[styles.bracket, active && styles.bracketActive]}
              >
                <View style={[styles.bracketIcon, active && { backgroundColor: palette.primary }]}>
                  <Ionicons name={item.icon} size={22} color={active ? palette.white : palette.primary} />
                </View>
                <View style={styles.bracketText}>
                  <Text style={styles.bracketTitle}>{t(item.title)}</Text>
                  <Text style={styles.bracketDesc}>{t(item.desc)}</Text>
                </View>
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={active ? palette.primary : palette.muted2}
                />
              </Pressable>
            );
          })}

          <Button label={t("kid.create")} onPress={onCreate} loading={creating} />
        </>
      ) : (
        <>
          <Card style={styles.codeCard}>
            <Text style={styles.codeLabel}>{t("kid.codeLabel")}</Text>
            <Text style={styles.code}>{groupCode(accessCode)}</Text>
            <Text style={styles.codeHint}>{t("kid.codeHint")}</Text>
          </Card>

          <Button
            label={t("kid.copy")}
            icon="copy-outline"
            variant="secondary"
            onPress={onCopy}
          />

          <SectionTitle>{t("kid.title")}</SectionTitle>
          <Card>
            {STEPS.map((key, index) => (
              <View key={key} style={[styles.step, index > 0 && styles.stepBorder]}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{t(key)}</Text>
              </View>
            ))}
          </Card>

          <Card style={styles.accessCard}>
            <View style={styles.accessRow}>
              <Text style={styles.accessTitle}>{t("kid.codeLabel")}</Text>
              <Badge label={state.accessGranted ? t("kid.granted") : t("kid.blocked")} tone={state.accessGranted ? "mint" : "warn"} />
            </View>
            {state.accessGranted ? (
              <SlideToConfirm label={t("kid.deny")} onConfirm={revokeAccess} doneLabel={t("common.done")} />
            ) : (
              <SlideToConfirm label={t("kid.grant")} onConfirm={grantAccess} doneLabel={t("common.done")} />
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  need: { fontSize: font.body, color: palette.ink2, fontWeight: "600", marginTop: spacing.sm },
  input: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    fontSize: font.body,
    color: palette.ink,
    ...shadow.card,
  },
  bracket: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: "transparent",
    ...shadow.card,
  },
  bracketActive: { borderColor: palette.primary },
  bracketIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bracketText: { flex: 1, gap: 3 },
  bracketTitle: { fontSize: font.title, fontWeight: "700", color: palette.ink },
  bracketDesc: { fontSize: font.small, color: palette.muted, lineHeight: 18 },
  codeCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  codeLabel: { fontSize: font.small, color: palette.muted, fontWeight: "700" },
  code: {
    fontSize: 36,
    fontWeight: "800",
    color: palette.ink,
    letterSpacing: 6,
    fontFamily: "monospace",
    textAlign: "center",
  },
  codeHint: {
    fontSize: font.small,
    color: palette.muted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  stepBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontSize: font.small, fontWeight: "800", color: palette.primary },
  stepText: { flex: 1, fontSize: font.small, color: palette.ink2, fontWeight: "600", lineHeight: 19 },
  accessCard: { gap: spacing.md },
  accessRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  accessTitle: { flex: 1, fontSize: font.body, fontWeight: "700", color: palette.ink },
});
