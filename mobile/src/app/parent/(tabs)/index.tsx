import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { issueMyCardApi, myCardsApi, requestMyCardDetailsApi } from "@/api/actions";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { formatDate, formatMoney } from "@/lib/format";
import { spentThisMonth } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import type { CardInfo } from "@/store/types";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { CardPeek } from "@/ui/CardPeek";
import { HeroGlow } from "@/ui/Glow";
import { ParentTopUpSheet } from "@/ui/ParentTopUpSheet";
import { Text } from "@/ui/Text";

/** Главная родителя — тот же стиль, что у ребёнка, но действия банка для семьи. */
export default function ParentHomeScreen() {
  const { t, lang } = useI18n();
  const { state, resolveRequest, showToast, refresh } = useStore();
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [topup, setTopup] = useState(false);
  const [myCards, setMyCards] = useState<CardInfo[]>([]);
  const [myCardBusy, setMyCardBusy] = useState(false);

  const loadMyCards = useCallback(async () => {
    try {
      const answer = await myCardsApi();
      setMyCards(
        (answer.cards ?? []).map((item) => ({
          id: item.id,
          status: item.status === "blocked" ? "blocked" : "active",
          physical: item.type === "plastic" ? "delivered" : "ordered",
          last4: item.last4,
          number: item.number,
          system: item.system as CardInfo["system"],
          type: item.type as CardInfo["type"],
          expiry: item.expiry,
        })),
      );
    } catch {
      // карта выпускается по кнопке
    }
  }, []);

  useEffect(() => {
    void loadMyCards();
  }, [loadMyCards]);

  const issueMyCard = useCallback(async () => {
    if (myCardBusy) return;
    setMyCardBusy(true);
    try {
      await issueMyCardApi({ type: "virtual", system: "visa" });
      showToast(t("card.issued"));
      await loadMyCards();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setMyCardBusy(false);
    }
  }, [loadMyCards, myCardBusy, showToast, t]);
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
  const childCards: CardInfo[] =
    state.cards && state.cards.length > 0
      ? state.cards.map((card) => ({ ...card, holder: state.child.name }))
      : state.card.number.length > 0
        ? [{ ...state.card, holder: state.child.name }]
        : [];
  const cards: CardInfo[] = [...myCards.map((card) => ({ ...card, holder: user?.full_name ?? "Моя карта" })), ...childCards];
  const goal = state.goal;
  const progress = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
  const pending = state.requests.filter((request) => request.status === "pending");
  const firstName = (user?.full_name ?? "").trim().split(" ")[0] ?? "родитель";

  const actions = [
    { id: "topup", icon: "add" as const, label: t("ov.transferChild"), onPress: () => setTopup(true) },
    { id: "limit", icon: "speedometer-outline" as const, label: t("ov.limitAction"), onPress: () => router.push("/parent/limits") },
    { id: "tasks", icon: "checkbox-outline" as const, label: t("ch.quests"), onPress: () => router.push("/parent/bonuses") },
    { id: "access", icon: "people-outline" as const, label: t("kid.title"), onPress: () => router.push("/parent/child-access") },
    { id: "task", icon: "create-outline" as const, label: t("pt.short"), onPress: () => router.push("/parent/task-new") },
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
            <Pressable onPress={() => router.push("/parent/settings")} hitSlop={10} style={styles.headerIcon}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balance}>{formatMoney(state.balance, 0).replace(" BYN", "")}</Text>
            <Text style={styles.currency}>BYN</Text>
          </View>
          <Text style={styles.greeting}>{firstName} · {state.child.name}</Text>

        </View>

        <View style={styles.panel}>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable key={action.id} onPress={action.onPress} style={styles.action}>
                <View style={styles.actionCircle}>
                  <Ionicons name={action.icon} size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

<View style={styles.cardWrap}>
            <CardPeek
                        cards={cards}
                        holder={user?.full_name ?? "Моя карта"}
                        limitLeft={left}
                        scrollY={scrollY}
                        onIssue={() => void issueMyCard()}
                        onDetails={(card) => {
                          if (!card.id) return;
                          void requestMyCardDetailsApi(card.id)
                            .then(() => showToast(t("card.detailsSent")))
                            .catch((error) => showToast(error instanceof Error ? error.message : t("auth.connectFailed")));
                        }}
                      />
          </View>

          {pending.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("ov.requests")}</Text>
              {pending.slice(0, 3).map((request) => (
                <View key={request.id} style={styles.requestRow}>
                  <Text style={styles.requestTitle} numberOfLines={1}>
                    {lang === "be" ? request.label.be : request.label.ru}
                  </Text>
                  <View style={styles.requestButtons}>
                    <Pressable style={[styles.requestButton, styles.approve]} onPress={() => resolveRequest(request.id, true)}>
                      <Text style={styles.requestButtonText}>{t("common.allow")}</Text>
                    </Pressable>
                    <Pressable style={[styles.requestButton, styles.deny]} onPress={() => resolveRequest(request.id, false)}>
                      <Text style={styles.requestButtonText}>{t("common.deny")}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable style={styles.card} onPress={() => router.push("/parent/kopilka")}>
            <View style={styles.goalHead}>
              <Ionicons name="heart" size={14} color={colors.muted} />
              <Text style={styles.goalLabel}>{t("ch.kopilka")}</Text>
              <Text style={styles.goalPercent}>{progress}%</Text>
            </View>
            <Text style={styles.goalTitle}>{lang === "be" ? goal.title.be : goal.title.ru}</Text>
            <Text style={styles.goalSum}>
              {formatMoney(goal.saved, 0)} / {formatMoney(goal.target, 0)}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progress + "%" }]} />
            </View>
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("ch.lastOps")}</Text>
            {state.txns.length === 0 ? (
              <Text style={styles.empty}>{t("ch.noOps")}</Text>
            ) : (
              state.txns.slice(0, 4).map((txn, index) => {
                const outgoing = txn.amount > 0;
                const income = false;
                return (
                  <View key={txn.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.opRow}>
                      <View style={styles.opIcon}>
                        <Ionicons name={income ? "download" : "arrow-up"} size={18} color={colors.primary} />
                      </View>
                      <View style={styles.opText}>
                        <Text style={styles.opTitle} numberOfLines={1}>
                          {outgoing ? t("ov.transferChild") : lang === "be" ? txn.title.be : txn.title.ru}
                        </Text>
                        <Text style={[styles.opAmount, { color: income ? colors.mint : outgoing ? colors.danger : colors.text }]}>
                          {outgoing ? "−" : income ? "+" : "−"}
                          {formatMoney(Math.abs(txn.amount), 0)}
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
      <ParentTopUpSheet visible={topup} onClose={() => setTopup(false)} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingBottom: 110 },
    refresh: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
    refreshText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
    hero: { overflow: "hidden", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, backgroundColor: colors.bg },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.lg },
    brand: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
    caption: { color: colors.muted, fontSize: 13, fontWeight: "600", marginTop: 2 },
    headerIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    balanceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
    balance: { color: colors.text, fontSize: 56, fontWeight: "800", letterSpacing: -1.5 },
    currency: { color: colors.muted, fontSize: 22, fontWeight: "800", letterSpacing: 1 },
    greeting: { color: colors.muted, fontSize: 13, fontWeight: "600", marginTop: 2, marginBottom: spacing.sm },
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
      borderTopColor: colors.line,
    },
    cardWrap: { marginHorizontal: spacing.xl, marginBottom: spacing.md },
    actions: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
    action: { alignItems: "center", gap: spacing.sm, width: 64 },
    actionCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", textAlign: "center" },
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.line,
      gap: 6,
    },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
    requestRow: { gap: spacing.sm, paddingVertical: spacing.sm },
    requestTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
    requestButtons: { flexDirection: "row", gap: spacing.sm },
    requestButton: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
    approve: { backgroundColor: "rgba(16,185,129,0.18)" },
    deny: { backgroundColor: "rgba(239,68,68,0.16)" },
    requestButtonText: { color: colors.text, fontSize: 12, fontWeight: "700" },
    goalHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    goalLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", flex: 1 },
    goalPercent: { color: colors.primary, fontSize: 12, fontWeight: "700" },
    goalTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
    goalSum: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: spacing.sm },
    progressFill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },
    empty: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.md },
    opRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    opIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(59,130,246,0.18)", alignItems: "center", justifyContent: "center" },
    opText: { flex: 1 },
    opTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
    opAmount: { fontSize: 14, fontWeight: "800", marginTop: 2 },
    opDate: { color: colors.muted, fontSize: 11, fontWeight: "500", marginTop: 2 },
  });
