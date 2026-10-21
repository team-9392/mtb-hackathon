import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View, TextInput } from "react-native";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n, useL } from "@/i18n";
import { formatDate, formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { GlassCard } from "@/ui/GlassCard";
import { PetCard } from "@/ui/PetCard";
import { HeroGlow } from "@/ui/Glow";
import { ProgressRing } from "@/ui/ProgressRing";
import { SoftGlow } from "@/ui/SoftGlow";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import { Text } from "@/ui/Text";

const GOAL_GRADIENT = ["#9333ea", "#ec4899", "#f43f5e"] as const;

/** Копилка ребёнка – 1:1 к макету kopilka: шапка, сумма, цель, пополнение. */
export default function ChildGoalScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { t, lang } = useI18n();
  const L = useL();
  const router = useRouter();
  const { state, addToGoal, showToast } = useStore();
  const [amount, setAmount] = useState(10);
  const adding = useRef(false);

  const ratio = state.goal.saved / Math.max(1, state.goal.target);
  const percent = Math.round(ratio * 100);
  const left = Math.max(0, state.goal.target - state.goal.saved);
  const achieved = state.goal.saved >= state.goal.target;
  const savedValue = formatMoney(state.goal.saved, 0).replace(" BYN", "");
  const targetValue = formatMoney(state.goal.target, 0).replace(" BYN", "");
  const income = state.txns.filter((txn) => txn.amount > 0 && txn.status === "done").slice(0, 2);

  const add = () => {
    if (adding.current) {
      return;
    }
    adding.current = true;
    addToGoal(amount);
    showToast(t("gl.added"));
    setTimeout(() => {
      adding.current = false;
    }, 1400);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/child");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {isDark ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow]}>
          <HeroGlow />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerTop}>
          <Pressable onPress={goBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{t("sp.kopilkaTitle")}</Text>
            <Pressable onPress={() => router.push("/kopilka")} hitSlop={8} style={{ marginLeft: 10 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>{t("gl.target")}</Text>
            </Pressable>
            <View style={styles.brandPill}>
              <Text secondary style={styles.brandText}>
                MobyFamily
              </Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <Text secondary style={styles.subtitle}>
          {t("sp.kopilkaSubtitle")}
        </Text>

        <PetCard />

        {!state.goalId && state.goal.target === 0 ? (
          <Pressable style={styles.createGoal} onPress={() => router.push("/kopilka")}>
            <Ionicons name="add" size={18} color="#0b0f14" />
            <Text style={styles.createGoalText}>Создать копилку</Text>
          </Pressable>
        ) : null}

        <View
          style={[
            styles.goalCard,
            {
              backgroundColor: isDark ? colors.glass : colors.surface,
              borderColor: isDark ? colors.glassBorder : colors.line,
            },
          ]}
        >
          <View style={styles.goalRow}>
            <View style={styles.ring}>
              <ProgressRing
                value={ratio}
                gradient={GOAL_GRADIENT}
                id="goal-ring"
                trackColor={isDark ? "rgba(255,255,255,0.08)" : colors.line}
              >
                <View style={styles.ringCenter}>
                  <Text style={styles.ringEmoji}>{state.goal.emoji}</Text>
                  <Text style={styles.ringPercent}>{percent}%</Text>
                </View>
              </ProgressRing>
            </View>

            <View style={styles.goalTexts}>
              <View style={styles.goalHead}>
                <Text style={styles.goalName} numberOfLines={1}>
                  {L(state.goal.title)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </View>
              <Text style={styles.goalSum}>
                <Text style={styles.goalSumStrong}>{savedValue}</Text> {t("sp.of")} {targetValue} BYN
              </Text>
              <View
                style={[
                  styles.goalTrack,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : colors.surfaceAlt },
                ]}
              >
                <LinearGradient
                  colors={GOAL_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.goalFill, { width: Math.min(100, percent) + "%" }]}
                />
              </View>
              <Text secondary style={styles.goalLeft}>
                {t("gl.left")} <Text style={styles.goalLeftStrong}>{formatMoney(left, 0)}</Text>
              </Text>
            </View>
          </View>
        </View>

        {achieved ? (
          <GlassCard style={styles.achievedCard}>
            <Ionicons name="trophy" size={20} color={colors.amber} />
            <Text style={styles.achievedText}>{t("gl.achieved")}</Text>
          </GlassCard>
        ) : null}

        <View
          style={[
            styles.tipCard,
            {
              backgroundColor: isDark ? colors.glass : colors.surface,
              borderColor: isDark ? "rgba(59,130,246,0.28)" : colors.line,
            },
          ]}
        >
          <View style={[styles.tipIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
          </View>
          <View style={styles.tipTexts}>
            <Text style={styles.tipTitle}>{t("gl.auto")}</Text>
            <Text secondary style={styles.tipDesc}>
              {t("gl.autoDesc")}
            </Text>
          </View>
          <Switch
            value={state.goal.autoSave}
            onValueChange={() => showToast(t("common.done"))}
            trackColor={{ true: colors.primary, false: colors.lineStrong }}
            thumbColor={colors.white}
          />
        </View>

        <GlassCard style={styles.addCard}>
          <Text style={styles.addTitle}>{t("sp.addTitle")}</Text>
          <View style={styles.addRow}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>Сумма, BYN</Text>
          <TextInput
            value={String(amount)}
            onChangeText={(value: string) => setAmount(Math.min(100000, Number(value.replace(/[^0-9]/g, "")) || 0))}
            keyboardType="numeric"
            style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 12 }}
          />
          {[5, 10, 20].map((preset) => {
              const active = amount === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setAmount(preset)}
                  style={[
                    styles.quick,
                    {
                      backgroundColor: active
                        ? colors.primarySoft
                        : isDark
                          ? colors.glass
                          : colors.surfaceAlt,
                      borderColor: active ? colors.primary : colors.line,
                    },
                  ]}
                >
                  <Text
                    secondary
                    style={[styles.quickText, { color: active ? colors.primary : colors.ink2 }]}
                  >
                    +{preset} BYN
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.addConfirm}>
            <SlideToConfirm
              label={`${t("gl.add")} · ${formatMoney(amount, 0)}`}
              onConfirm={add}
              doneLabel={t("common.done")}
            />
          </View>
          <Text secondary style={styles.hint}>
            {t("gl.hint")}
          </Text>
        </GlassCard>

        {income.length > 0 ? (
          <View style={styles.recent}>
            <Text style={styles.recentTitle}>{t("sp.recent")}</Text>
            <GlassCard style={styles.recentCard} padded={false}>
              {income.map((txn, index) => (
                <View
                  key={txn.id}
                  style={[
                    styles.recentRow,
                    index > 0 && [styles.recentBorder, { borderTopColor: colors.line }],
                  ]}
                >
                  <View style={[styles.recentIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="download" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.recentTexts}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {lang === "be" ? txn.title.be : txn.title.ru}
                    </Text>
                    <Text secondary style={styles.recentDate}>
                      {formatDate(txn.at, lang)}
                    </Text>
                  </View>
                  <Text style={[styles.recentAmount, { color: colors.mint }]}>
                    +{formatMoney(txn.amount, 0)}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    glow: { opacity: 0.55 },
    content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120, gap: 14 },
    headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    back: {
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
    headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4, color: colors.ink },
    brandPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primarySoftStrong,
    },
    brandText: { fontSize: 11, fontWeight: "500", color: colors.primary },
    headerSpacer: { width: 40, height: 40 },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 4 },
  brandLogo: { width: 18, height: 18 },
  brandName: { color: "#8b94a3", fontSize: 12, fontWeight: "700" },
  subtitle: { fontSize: 13, color: colors.muted, paddingLeft: 4, marginTop: -6 },
    createGoal: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#93c5fd", borderRadius: 999, paddingVertical: 14, marginBottom: 12 },
  createGoalText: { color: "#0b0f14", fontSize: 15, fontWeight: "800" },
  totalCard: { padding: 16, overflow: "hidden", borderRadius: 16, marginTop: 2 },
    totalGlow: { right: -50, bottom: -60 },
    totalLabel: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.muted,
      marginBottom: 2,
    },
    totalRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    totalValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: colors.ink },
    totalUnit: { fontSize: 14, fontWeight: "700", color: colors.muted },
    goalCard: { borderRadius: 24, borderWidth: 1, padding: 16 },
    goalRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    ring: { width: 78, height: 78, alignItems: "center", justifyContent: "center" },
    ringCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
    ringEmoji: { fontSize: 16, lineHeight: 20 },
    ringPercent: { fontSize: 11, fontWeight: "700", color: colors.ink, marginTop: 1 },
    goalTexts: { flex: 1, minWidth: 0 },
    goalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
    goalName: { fontSize: 16, fontWeight: "700", color: colors.ink, flex: 1 },
    goalSum: { fontSize: 13, fontWeight: "600", color: colors.ink2, marginTop: 2 },
    goalSumStrong: { color: colors.ink, fontWeight: "700" },
    goalTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 10, width: "100%" },
    goalFill: { height: "100%", borderRadius: 4 },
    goalLeft: { fontSize: 11, fontWeight: "500", color: colors.muted, marginTop: 8 },
    goalLeftStrong: { color: colors.ink2, fontWeight: "600" },
    achievedCard: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
    achievedText: { fontSize: 15, fontWeight: "700", color: colors.ink, flex: 1 },
    tipCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    tipIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    tipTexts: { flex: 1, gap: 2 },
    tipTitle: { fontSize: 13, fontWeight: "700", color: colors.ink },
    tipDesc: { fontSize: 12, lineHeight: 16, color: colors.muted },
    addCard: { padding: 16, gap: 14 },
    addTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
    addRow: { flexDirection: "row", gap: 8 },
    quick: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
    },
    quickText: { fontSize: 12, fontWeight: "600" },
    addConfirm: { marginTop: 2 },
    hint: { fontSize: 11, lineHeight: 16, color: colors.muted2 },
    recent: { gap: 10, paddingTop: 4 },
    recentTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, paddingHorizontal: 4 },
    recentCard: { padding: 8, borderRadius: 24 },
    recentRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
    recentBorder: { borderTopWidth: StyleSheet.hairlineWidth },
    recentIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    recentTexts: { flex: 1, gap: 2, minWidth: 0 },
    recentName: { fontSize: 13, fontWeight: "600", color: colors.ink },
    recentDate: { fontSize: 11, color: colors.muted },
    recentAmount: { fontSize: 12, fontWeight: "700" },
  });
