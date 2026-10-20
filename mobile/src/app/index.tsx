import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, palette, radius, shadow, spacing } from "@/theme/tokens";
import { HeroCard } from "@/ui/Hero";
import { Segmented } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

export default function RoleSelectScreen() {
  const { t, lang, setLang } = useI18n();
  const { state, setRole, showToast } = useStore();
  const { demoMode, status, user, claims, signOut } = useAuth();
  const router = useRouter();

  const childReady = demoMode ? state.accessGranted : Boolean(claims?.childId);

  const openParent = () => {
    if (!demoMode && claims?.role !== "parent") {
      showToast(t("auth.accessClosed"));
      return;
    }
    setRole("parent");
    router.push(demoMode && !state.onboarded ? "/parent/offer" : "/parent");
  };

  const openChild = () => {
    if (!childReady || (!demoMode && claims?.role !== "child")) {
      showToast(t("auth.accessClosedDesc"));
      return;
    }
    setRole("child");
    router.push("/child");
  };

  if (!demoMode && status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!demoMode && status === "signedOut") {
    return <Redirect href="/auth/phone" />;
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <HeroCard gradient="parent" style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.logo}>
            <Ionicons name="wallet" size={20} color={palette.white} />
          </View>
          <Text style={styles.heroBrand}>{t("s1.brand")}</Text>
        </View>
        <Text style={styles.heroTag}>{t("s1.tag")}</Text>
        <Text style={styles.heroTitle}>{t("s1.title")}</Text>
        <Text style={styles.heroSubtitle}>{t("s1.subtitle")}</Text>
      </HeroCard>

      <View style={styles.langRow}>
        <Text style={styles.langLabel}>{t("common.lang")}</Text>
        <View style={styles.langSwitch}>
          <Segmented
            value={lang}
            onChange={setLang}
            options={[
              { value: "ru", label: "Русский" },
              { value: "be", label: "Беларуская" },
            ]}
          />
        </View>
      </View>

      <Pressable onPress={openParent} style={({ pressed }) => [styles.role, pressed && styles.pressed]}>
        <View style={[styles.roleIcon, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="people" size={24} color={palette.primary} />
        </View>
        <View style={styles.roleText}>
          <Text style={styles.roleTitle}>{t("s1.parentTitle")}</Text>
          <Text style={styles.roleDesc}>{t("s1.parentDesc")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted2} />
      </Pressable>

      <Pressable
        onPress={openChild}
        style={({ pressed }) => [
          styles.role,
          !childReady && styles.roleLocked,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.roleIcon,
            { backgroundColor: childReady ? palette.childSoft : palette.surfaceAlt },
          ]}
        >
          <Ionicons
            name={childReady ? "happy" : "lock-closed"}
            size={24}
            color={childReady ? palette.child : palette.muted2}
          />
        </View>
        <View style={styles.roleText}>
          <Text style={styles.roleTitle}>{t("s1.childTitle")}</Text>
          <Text style={styles.roleDesc}>{t("s1.childDesc")}</Text>
          {!childReady ? (
            <Text style={styles.roleLockedText}>{t("s1.childLocked")}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted2} />
      </Pressable>

      {!demoMode ? (
        <View style={styles.account}>
          <Ionicons name="phone-portrait-outline" size={16} color={palette.muted} />
          <Text style={styles.demoText}>{user?.phone ?? ""}</Text>
          <Pressable onPress={() => void signOut()} hitSlop={8}>
            <Text style={styles.signOut}>{t("auth.signOut")}</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable onPress={() => router.push("/demo")} style={styles.demoLink}>
        <Ionicons name="construct-outline" size={16} color={palette.muted} />
        <Text style={styles.demoText}>{t("dm.title")}</Text>
      </Pressable>

      <Text style={styles.hint}>{t("s1.demoHint")}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  hero: { gap: spacing.xs },
  heroTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBrand: { color: palette.white, fontSize: font.title, fontWeight: "800", letterSpacing: 0.4 },
  heroTag: {
    color: "rgba(255,255,255,0.85)",
    fontSize: font.tiny,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  heroTitle: { color: palette.white, fontSize: font.h2, fontWeight: "800", marginTop: spacing.xs },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: font.small,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  langLabel: { fontSize: font.small, color: palette.muted, fontWeight: "600" },
  langSwitch: { flex: 1, maxWidth: 230 },
  role: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  roleLocked: { opacity: 0.75 },
  pressed: { opacity: 0.85 },
  roleIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  roleText: { flex: 1, gap: 3 },
  roleTitle: { fontSize: font.title, fontWeight: "700", color: palette.ink },
  roleDesc: { fontSize: font.small, color: palette.muted, lineHeight: 18 },
  roleLockedText: { fontSize: font.tiny, color: palette.danger, fontWeight: "700", marginTop: 2 },
  demoLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  demoText: { fontSize: font.small, color: palette.muted, fontWeight: "600" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg },
  account: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  signOut: { fontSize: font.small, color: palette.primary, fontWeight: "700" },
  hint: { textAlign: "center", fontSize: font.tiny, color: palette.muted2 },
});
