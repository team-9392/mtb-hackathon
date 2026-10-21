import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestCardDetailsApi } from "@/api/actions";
import { useI18n } from "@/i18n";
import { formatDate, formatMoney } from "@/lib/format";
import { spentThisMonth } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import type { CardInfo } from "@/store/types";
import type { Palette } from "@/theme/palette";
import { spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { CardPeek } from "@/ui/CardPeek";
import { HeroGlow } from "@/ui/Glow";
import { Text } from "@/ui/Text";
import { TopUpSheet } from "@/ui/TopUpSheet";

/** Главная ребёнка — по макету: шапка, баланс, выглядывающая карта, действия, копилка, операции. */
export default function ChildHomeScreen() {
  const { t, lang } = useI18n();
  const { state, showToast, refresh } = useStore();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [topup, setTopup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const busyPull = useRef(false);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });
  const maybeRefresh = (value: number) => {
    if (value < -90 && !busyPull.current) {
      busyPull.current = true;
      setRefreshing(true);
      void refresh().finally(() => {
        setRefreshing(false);
        busyPull.current = false;
      });
    }
  };

  const spent = spentThisMonth(state.txns);
  const left = Math.max(0, state.limits.monthly - spent);
  const cards: CardInfo[] = state.cards && state.cards.length > 0 ? state.cards : state.card.number.length > 0 ? [state.card] : [];
  const goal = state.goal;
  const progress = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;

  const requestDetails = useCallback(
    async (card: CardInfo) => {
      const childId = state.childId;
      if (!childId || !card.id) {
        showToast(t("card.detailsHint"));
        return;
      }
      try {
        await requestCardDetailsApi(childId, card.id);
        showToast(t("card.detailsSent"));
      } catch (error) {
        showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
      }
    },
    [showToast, state.childId, t],
  );

  const actions = [
    { id: "topup", icon: "add" as const, label: t("ch.topup"), onPress: () => setTopup(true) },
    { id: "transfer", icon: "swap-horizontal" as const, label: t("ch.transfer"), onPress: () => router.push("/child/accounts") },
    { id: "goal", icon: "heart-outline" as const, label: t("ch.kopilka"), onPress: () => router.push("/child/goal") },
    { id: "quests", icon: "checkbox-outline" as const, label: t("ch.quests"), onPress: () => router.push("/child/quests") },
  ];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        scrollEventThrottle={16}
        onScroll={(e) => {
          onScroll(e);
          maybeRefresh(e.nativeEvent.contentOffset.y);
        }}
      >
        <View style={styles.hero}>
          <HeroGlow />
          {refreshing ? (
            <View style={styles.refresh}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.refreshText}>Обновляем…</Text>
            </View>
          ) : null}
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>MobyFamily</Text>
              <Text style={styles.caption}>МТБанк • #9392</Text>
            </View>
            <Pressable onPress={() => router.push("/child/erip")} hitSlop={10} style={styles.headerIcon}>
              <Ionicons name="qr-code-outline" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balance}>{formatMoney(state.balance, 0)}</Text>
            <Text style={styles.currency}>BYN</Text>
          </View>

          <CardPeek
            cards={cards}
            holder={state.child.name}
            limitLeft={left}
            scrollY={scrollY}
            onIssue={() => router.push("/child/accounts")}
            onDetails={(card) => void requestDetails(card)}
          />
        </View>

        <View style={styles.panel}>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable key={action.id} onPress={action.onPress} style={styles.action}>
                <View style={styles.actionCircle}>
                  <Ionicons name={action.icon} size={26} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.goalCard} onPress={() => router.push("/child/goal")}>
            <View style={styles.goalHead}>
              <Ionicons name="heart" size={14} color={colors.muted} />
              <Text style={styles.goalLabel}>{t("ch.kopilka")}</Text>
              <Text style={styles.goalPercent}>{progress}%</Text>
            </View>
            <Text style={styles.goalTitle}>{lang === "be" ? goal.title.be : goal.title.ru}</Text>
            <Text style={styles.goalSum}>
              {formatMoney(goal.saved, 0)} / {formatMoney(goal.target, 0)} BYN
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progress + "%" }]} />
            </View>
          </Pressable>

          <View style={styles.opsCard}>
            <Text style={styles.opsTitle}>{t("ch.lastOps")}</Text>
            {state.txns.length === 0 ? (
              <Text style={styles.empty}>{t("ch.noOps")}</Text>
            ) : (
              state.txns.slice(0, 4).map((txn, index) => {
                const income = txn.amount > 0;
                return (
                  <View key={txn.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.opRow}>
                      <View style={styles.opIcon}>
                        <Ionicons name={income ? "download" : "arrow-up"} size={18} color={colors.primary} />
                      </View>
                      <View style={styles.opText}>
                        <Text style={styles.opTitle} numberOfLines={1}>
                          {lang === "be" ? txn.title.be : txn.title.ru}
                        </Text>
                        <Text style={[styles.opAmount, { color: income ? colors.mint : colors.text }]}>
                          {income ? "+" : "−"}
                          {formatMoney(Math.abs(txn.amount), 0)} BYN
                        </Text>
                        <Text style={styles.opDate}>{formatDate(txn.at, lang)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </Animated.ScrollView>
      <TopUpSheet visible={topup} onClose={() => setTopup(false)} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingBottom: 110 },
    refresh: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
    refreshText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
    hero: { overflow: "hidden",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: colors.bg,
    },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.lg },
    brand: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
    caption: { color: colors.muted, fontSize: 13, fontWeight: "600", marginTop: 2 },
    headerIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    balanceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginBottom: spacing.sm },
    balance: { color: colors.text, fontSize: 56, fontWeight: "800", letterSpacing: -1.5 },
    currency: { color: colors.muted, fontSize: 22, fontWeight: "800", letterSpacing: 1 },
    panel: {
      marginTop: -spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      backgroundColor: colors.panel,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.04)",
    },
    actions: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
    action: { alignItems: "center", gap: spacing.sm },
    actionCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
    goalCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
      gap: 6,
    },
    goalHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    goalLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", flex: 1 },
    goalPercent: { color: colors.primary, fontSize: 12, fontWeight: "700" },
    goalTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
    goalSum: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: spacing.sm },
    progressFill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },
    opsCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
    },
    opsTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: spacing.lg },
    empty: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: spacing.md },
    opRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    opIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(59,130,246,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    opText: { flex: 1 },
    opTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
    opAmount: { fontSize: 14, fontWeight: "800", marginTop: 2 },
    opDate: { color: colors.muted, fontSize: 11, fontWeight: "500", marginTop: 2 },
  });
