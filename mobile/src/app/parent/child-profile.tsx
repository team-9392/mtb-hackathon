import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { rightKeys } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import type { AgeBracket } from "@/store/types";
import { font, radius, shadow, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";
import { TextInput } from "@/ui/TextInput";

const BRACKETS: { id: AgeBracket; title: "p2.b1title" | "p2.b2title"; desc: "p2.b1desc" | "p2.b2desc"; icon: "happy-outline" | "rocket-outline" }[] = [
  { id: "child_7_13", title: "p2.b1title", desc: "p2.b1desc", icon: "happy-outline" },
  { id: "teen_14_17", title: "p2.b2title", desc: "p2.b2desc", icon: "rocket-outline" },
];

const RIGHTS = ["p2.r1", "p2.r2", "p2.r3", "p2.r4", "p2.r5"] as const;
const PACKAGE = ["p2.pack1", "p2.pack2", "p2.pack3", "p2.pack4", "p2.pack5"] as const;

export default function ChildProfileScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const { state, setChild, setBracket } = useStore();
  const router = useRouter();
  const bracket = state.child.bracket;
  const rights = rightKeys(bracket);

  return (
    <Screen
      showBack
      title={t("p2.title")}
      subtitle={t("p2.subtitle")}
      footer={<Button label={t("p2.cta")} onPress={() => router.push("/parent/consents")} />}
    >
      <Text style={styles.label}>{t("p2.name")}</Text>
      <TextInput
        value={state.child.name}
        onChangeText={(name) => setChild({ name })}
        placeholder={t("p2.namePlaceholder")}
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

      <SectionTitle>{t("p2.rightsTitle")}</SectionTitle>
      <Card>
        {RIGHTS.map((key, i) => {
          const allowed = rights[i];
          return (
            <View key={key} style={[styles.rightRow, i > 0 && styles.rightBorder]}>
              <Ionicons
                name={allowed ? "checkmark-circle" : "close-circle"}
                size={20}
                color={allowed ? palette.mint : palette.muted2}
              />
              <Text style={[styles.rightText, !allowed && { color: palette.muted2 }]}>{t(key)}</Text>
              {!allowed ? <Text style={styles.rightHint}>{t("p3.optional")}</Text> : null}
            </View>
          );
        })}
      </Card>

      <SectionTitle>{t("p2.packageFor")}</SectionTitle>
      <Card tone="alt">
        <View style={styles.packageWrap}>
          {PACKAGE.map((key) => (
            <View key={key} style={styles.packageChip}>
              <Ionicons name="checkmark" size={13} color={palette.primary} />
              <Text style={styles.packageText}>{t(key)}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  label: { fontSize: font.small, fontWeight: "700", color: palette.muted, marginTop: spacing.sm },
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
  rightRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm + 2 },
  rightBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  rightText: { flex: 1, fontSize: font.small, color: palette.ink2, fontWeight: "600" },
  rightHint: { fontSize: font.tiny, color: palette.muted2, maxWidth: 110, textAlign: "right" },
  packageWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  packageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  packageText: { fontSize: font.small, color: palette.ink2, fontWeight: "600" },
  });
};
