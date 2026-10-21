import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { SPEND_CATEGORY_KEY, groupSpending, spendCategoryColor } from "@/lib/spend";
import { bracketLabel, spentThisMonth } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { GlassCard } from "@/ui/GlassCard";
import { HeroGlow } from "@/ui/Glow";
import { ListRow, SectionTitle, Segmented } from "@/ui/primitives";
import { SpendCard } from "@/ui/SpendCard";
import { Text } from "@/ui/Text";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "M";
  }
  return parts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
}

/** Профиль ребёнка — 1:1 к макету profile: карточка, аналитика трат, лимиты. */
export default function ChildProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { state, setRole, showToast } = useStore();
  const router = useRouter();
  const { colors, mode, setMode, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const bracket = bracketLabel(state.child.bracket);
  const name = state.child.name || t("common.child");
  const initials = initialsOf(name);

  const groups = groupSpending(state.txns, lang);
  const categories = groups.map((group) => ({
    id: group.id,
    name: t(SPEND_CATEGORY_KEY[group.id]),
    color: spendCategoryColor(colors, group.id),
    amount: group.amount,
    items: group.items,
  }));
  const totalSpent = groups.reduce((sum, group) => sum + group.amount, 0);

  const spent = spentThisMonth(state.txns);
  const monthly = state.limits.monthly;
  const hasLimit = monthly > 0;
  const limitRatio = hasLimit ? Math.min(1, spent / monthly) : 0;
  const limitPercent = Math.round(limitRatio * 100);
  const limitLeft = Math.max(0, monthly - spent);

  const themeOptions = [
    { value: "dark" as const, label: t("theme.dark") },
    { value: "light" as const, label: t("theme.light") },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {isDark ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow]}>
          <HeroGlow />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>{t("ct.profile")}</Text>
            <Text secondary style={styles.headerSubtitle}>
              {t("sp.profileSubtitle")}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => showToast(t("ov.notifications"))}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: isDark ? colors.glass : colors.surface },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={() => showToast(t("ov.settings"))}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: isDark ? colors.glass : colors.surface },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <GlassCard style={styles.userCard}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={["#2563eb", "#4f46e5", "#38bdf8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarBorder}
            >
              <View
                style={[
                  styles.avatarInner,
                  { backgroundColor: isDark ? "#111927" : colors.surface },
                ]}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </LinearGradient>
            <View
              style={[
                styles.check,
                {
                  backgroundColor: colors.mint,
                  borderColor: isDark ? "#111927" : colors.surface,
                },
              ]}
            >
              <Ionicons name="checkmark" size={13} color={colors.white} />
            </View>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text secondary style={styles.meta}>
            {lang === "be" ? bracket.be : bracket.ru}
          </Text>
          <View style={styles.accessPill}>
            <Text secondary style={styles.accessText}>
              {t("ct.access")}
            </Text>
          </View>
        </GlassCard>

        <SpendCard
          categories={categories}
          total={totalSpent}
          periodLabel={t("sp.periodMonth")}
          onPeriod={() => showToast(t("sp.periodMonth"))}
        />

        <GlassCard style={styles.limitsCard}>
          <View style={styles.limitsHead}>
            <View style={styles.limitsTitleWrap}>
              <Ionicons name="shield-checkmark" size={16} color={colors.mint} />
              <Text style={styles.limitsTitle}>{t("sp.limitsParent")}</Text>
            </View>
            <Pressable
              onPress={() => router.push("/child/request")}
              style={({ pressed }) => [styles.requestPill, pressed && styles.pressed]}
            >
              <Text secondary style={styles.requestText}>
                {t("sp.request")}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.limitBody,
              { backgroundColor: isDark ? colors.glass : colors.surfaceAlt },
            ]}
          >
            <View style={styles.limitRow}>
              <Text secondary style={styles.limitLabel}>
                {t("sp.monthLimit")}
              </Text>
              {hasLimit ? (
                <Text style={styles.limitValue}>
                  {formatMoney(spent, 0).replace(" BYN", "")}{" "}
                  <Text secondary style={styles.limitOf}>
                    {t("sp.of")} {formatMoney(monthly, 0)}
                  </Text>
                </Text>
              ) : (
                <Text secondary style={styles.limitLabel}>
                  {t("sp.notSet")}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.track,
                { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : colors.surfaceAlt },
              ]}
            >
              <LinearGradient
                colors={[colors.primary, colors.cyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fill, { width: limitPercent + "%" }]}
              />
            </View>
            {hasLimit ? (
              <View style={styles.limitFooter}>
                <Text secondary style={styles.limitFootText}>
                  {t("sp.left")}: {formatMoney(limitLeft, 0)}
                </Text>
                <Text secondary style={styles.limitSpent}>
                  {t("sp.spentPct", { n: limitPercent })}
                </Text>
              </View>
            ) : null}
          </View>
        </GlassCard>

        <SectionTitle>{t("set.theme")}</SectionTitle>
        <GlassCard style={styles.segmentCard}>
          <Segmented value={mode} onChange={setMode} options={themeOptions} />
        </GlassCard>

        <SectionTitle>{t("ct.lang")}</SectionTitle>
        <GlassCard style={styles.segmentCard}>
          <Segmented
            value={lang}
            onChange={setLang}
            options={[
              { value: "ru", label: "Русский" },
              { value: "be", label: "Беларуская" },
            ]}
          />
        </GlassCard>

        <SectionTitle>{t("ct.rules")}</SectionTitle>
        <GlassCard style={styles.listCard}>
          <ListRow
            icon="ban"
            tone="danger"
            title={t("bl.gambling")}
            subtitle={t("bl.gamblingDesc")}
            onPress={() => router.push("/child/blocked")}
          />
          <ListRow
            icon="alert-circle-outline"
            tone="danger"
            title={t("bl.adult")}
            subtitle={t("bl.adultDesc")}
            onPress={() => router.push("/child/blocked")}
          />
          <ListRow
            icon="card-outline"
            tone="warn"
            title={t("bl.lost")}
            subtitle={t("bl.lostDesc")}
            onPress={() => router.push("/child/blocked")}
          />
        </GlassCard>

        <SectionTitle>{t("ct.demo")}</SectionTitle>
        <GlassCard style={styles.listCard}>
          <ListRow icon="construct-outline" title={t("dm.title")} onPress={() => router.push("/demo")} />
          <ListRow
            icon="log-out-outline"
            title={t("ct.logout")}
            onPress={() => {
              setRole(null);
              router.replace("/");
            }}
          />
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    glow: { opacity: 0.55 },
    content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120, gap: 16 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingBottom: 2,
    },
    headerTexts: { flex: 1, gap: 2 },
    headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4, color: colors.ink },
    headerSubtitle: { fontSize: 12, color: colors.muted },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.line,
    },
    pressed: { opacity: 0.7 },
    userCard: { padding: 24, alignItems: "center" },
    avatarWrap: { marginBottom: 12 },
    avatarBorder: { width: 80, height: 80, borderRadius: 24, padding: 2 },
    avatarInner: { flex: 1, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 24, fontWeight: "700", letterSpacing: 1, color: colors.ink },
    check: {
      position: "absolute",
      right: -4,
      bottom: -4,
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    name: { fontSize: 20, fontWeight: "700", color: colors.ink, lineHeight: 25 },
    meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
    accessPill: {
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.mintSoft,
    },
    accessText: { fontSize: 10, fontWeight: "600", color: colors.mint },
    limitsCard: { padding: 20, gap: 16 },
    limitsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    limitsTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    limitsTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
    requestPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
    },
    requestText: { fontSize: 11, fontWeight: "600", color: colors.primary },
    limitBody: {
      padding: 16,
      borderRadius: 16,
      gap: 10,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.line,
    },
    limitRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    limitLabel: { fontSize: 12, fontWeight: "500", color: colors.muted },
    limitValue: { fontSize: 12, fontWeight: "700", color: colors.ink },
    limitOf: { fontSize: 12, fontWeight: "400", color: colors.muted2 },
    track: { height: 8, borderRadius: 4, overflow: "hidden", width: "100%" },
    fill: { height: "100%", borderRadius: 4 },
    limitFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    limitFootText: { fontSize: 10, color: colors.muted },
    limitSpent: { fontSize: 10, fontWeight: "600", color: colors.amber },
    segmentCard: { padding: 16 },
    listCard: { padding: 16 },
  });
