import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/i18n";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";

/** Шаг регистрации: кем входит человек. Родитель оформляет пакет, ребёнок вводит код доступа. */
export default function RoleScreen() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <AuthLayout title={t("auth.roleTitle")} subtitle={t("auth.roleSubtitle")}>
      <Pressable style={styles.card} onPress={() => router.push("/auth/name")}>
        <View style={[styles.icon, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="people-outline" size={22} color={palette.primary as string} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{t("auth.roleParent")}</Text>
          <Text style={styles.hint}>{t("auth.roleParentHint")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted2 as string} />
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push("/auth/join")}>
        <View style={[styles.icon, { backgroundColor: palette.childSoft }]}>
          <Ionicons name="happy-outline" size={22} color={palette.child as string} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{t("auth.roleChild")}</Text>
          <Text style={styles.hint}>{t("auth.roleChildHint")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted2 as string} />
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: spacing.md,
  },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 3 },
  title: { fontSize: font.title, fontWeight: "700", color: palette.ink },
  hint: { fontSize: font.small, color: palette.muted },
});
