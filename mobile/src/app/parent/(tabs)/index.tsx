import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
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
import { ConfirmCodeModal } from "@/ui/ConfirmCodeModal";
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
    const [activeIndex, setActiveIndex] = useState(0);
    const [parentBalance, setParentBalance] = useState(0);
    const [pendingCard, setPendingCard] = useState<CardInfo | null>(null);
    const [myCardBusy, setMyCardBusy] = useState(false);

    const loadMyCards = useCallback(async () => {
        try {
            const answer = await myCardsApi();
            setParentBalance(Number(answer.cards?.[0]?.balance ?? 0));
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
    const [pulled, setPulled] = useState(false);
    const pull = useRef(new Animated.Value(0)).current;
    const pullRef = useRef(0);
    pull.addListener(({ value }) => {
        pullRef.current = value;
        setPulled(value > 30);
    });
    const settle = (to: number) =>
        Animated.spring(pull, { toValue: to, useNativeDriver: false, bounciness: 0 }).start();
    const pullGesture = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_e, g) => g.dy > 8 && g.dy > Math.abs(g.dx),
            onPanResponderMove: (_e, g) => pull.setValue(Math.max(0, Math.min(190, g.dy))),
            onPanResponderRelease: (_e, g) => {
                if (g.dy > 230) {
                    void refresh().finally(() => settle(0));
                    return;
                }
                settle(g.dy > 70 ? 150 : 0);
            },
            onPanResponderTerminate: () => settle(0),
        }),
    ).current;
    const busyPull = useRef(false);

    const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
    });
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
    const cards: CardInfo[] = [
        ...myCards.map((card) => ({ ...card, holder: user?.full_name ?? "Моя карта" })),
        ...childCards,
    ];
    const goal = state.goal;
    const hasGoal = Boolean(state.goalId) || goal.target > 0;
    const progress =
        goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
    const pending = state.requests.filter((request) => request.status === "pending");
    const firstName = (user?.full_name ?? "").trim().split(" ")[0] ?? "родитель";

    const actions = [
        { id: "topup", icon: "add" as const, label: t("ov.transferChild"), onPress: () => setTopup(true) },
        {
            id: "limit",
            icon: "speedometer-outline" as const,
            label: t("ov.limitAction"),
            onPress: () => router.push("/parent/limits"),
        },
        {
            id: "tasks",
            icon: "checkbox-outline" as const,
            label: t("ch.quests"),
            onPress: () => router.push("/parent/bonuses"),
        },
        {
            id: "access",
            icon: "people-outline" as const,
            label: t("kid.title"),
            onPress: () => router.push("/parent/child-access"),
        },
        {
            id: "task",
            icon: "create-outline" as const,
            label: t("pt.short"),
            onPress: () => router.push("/parent/task-new"),
        },
    ];

    const activeBalance = myCards.length > 0 && activeIndex === 0 ? parentBalance : state.balance;

    const panelTranslateY = pull.interpolate({
        inputRange: [0, 150],
        outputRange: [0, 95],
        extrapolate: "clamp",
    });

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
                {/* Верхний блок с градиентным свечением, балансом и картой */}
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
                            <Text style={styles.caption}>
                                МТБанк • #9392 · {firstName} (
                                {myCards.length > 0 && activeIndex === 0 ? t("pr.myCard") : state.child.name})
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => router.push("/parent/settings")}
                            hitSlop={10}
                            style={styles.headerIcon}
                        >
                            <Ionicons name="settings-outline" size={22} color="#ffffff" />
                        </Pressable>
                    </View>

                    {/* Баланс отдельно над картой */}
                    <View style={[styles.balanceRow, pulled && styles.hidden]}>
                        <Text style={styles.balance}>
                            {refreshing ? "•••" : formatMoney(activeBalance, 0).replace(" BYN", "")}
                        </Text>
                        <Text style={styles.currency}>BYN</Text>
                    </View>

                    {/* Блок банковской карты под балансом */}
                    <View style={styles.cardWrap}>
                        <CardPeek
                            cards={cards}
                            holder={user?.full_name ?? "Моя карта"}
                            limitLeft={left}
                            scrollY={pull}
                            balance={activeBalance}
                            onIssue={() => void issueMyCard()}
                            activeIndex={activeIndex}
                            refreshing={refreshing}
                            onIndexChange={setActiveIndex}
                            onDetails={(card) => setPendingCard(card)}
                            onRefresh={() => {
                                setRefreshing(true);
                                void Promise.all([refresh(), loadMyCards()]).finally(() =>
                                    setRefreshing(false),
                                );
                            }}
                        />
                        <Pressable onPress={() => router.push("/parent/issue")} style={styles.addCard}>
                            <Ionicons name="add-circle-outline" size={14} color="#93c5fd" />
                            <Text style={styles.addCardText}>Выпустить ещё карту</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Нижняя шторка (Контент) */}
                <Animated.View
                    style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}
                >
                    <View style={styles.grabberWrap} {...pullGesture.panHandlers}>
                        <View style={styles.grabber} />
                    </View>

                    {/* Быстрые действия */}
                    <View style={styles.actions}>
                        {actions.map((action) => (
                            <Pressable key={action.id} onPress={action.onPress} style={styles.action}>
                                <View style={styles.actionCircle}>
                                    <Ionicons name={action.icon} size={24} color="#60a5fa" />
                                </View>
                                <Text style={styles.actionLabel} numberOfLines={1}>
                                    {action.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Запросы от ребёнка */}
                    {pending.length > 0 ? (
                        <View style={styles.glassCard}>
                            <Text style={styles.cardTitle}>{t("ov.requests")}</Text>
                            {pending.slice(0, 3).map((request) => (
                                <View key={request.id} style={styles.requestRow}>
                                    <Text style={styles.requestTitle} numberOfLines={1}>
                                        {lang === "be" ? request.label.be : request.label.ru}
                                    </Text>
                                    <View style={styles.requestButtons}>
                                        <Pressable
                                            style={[styles.requestButton, styles.approve]}
                                            onPress={() => resolveRequest(request.id, true)}
                                        >
                                            <Text style={styles.requestButtonText}>{t("common.allow")}</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.requestButton, styles.deny]}
                                            onPress={() => resolveRequest(request.id, false)}
                                        >
                                            <Text style={styles.requestButtonText}>{t("common.deny")}</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {/* Виджет "Копилка" */}
                    {hasGoal ? (
                        <Pressable
                            style={styles.glassCard}
                            onPress={() => router.push("/parent/kopilka")}
                        >
                            <View style={styles.goalHead}>
                                <Ionicons name="heart-outline" size={15} color="#8b94a3" />
                                <Text style={styles.goalLabel}>{t("ch.kopilka")}</Text>
                            </View>
                            <Text style={styles.goalTitle}>
                                {lang === "be" ? goal.title.be : goal.title.ru}
                            </Text>
                            <Text style={styles.goalSum}>
                                {formatMoney(goal.saved, 0)} из {formatMoney(goal.target, 0)}
                            </Text>
                            <View style={styles.progressRow}>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                                </View>
                                <Text style={styles.goalPercent}>{progress}%</Text>
                            </View>
                        </Pressable>
                    ) : (
                        <Pressable
                            style={styles.glassCard}
                            onPress={() => router.push("/parent/kopilka")}
                        >
                            <View style={styles.goalHead}>
                                <Ionicons name="add-circle-outline" size={16} color="#60a5fa" />
                                <Text style={styles.goalLabel}>{t("ch.kopilka")}</Text>
                            </View>
                            <Text style={styles.goalTitle}>{t("gl.create")}</Text>
                            <Text style={styles.goalSum}>{t("gl.createHint")}</Text>
                        </Pressable>
                    )}

                    {/* Последние операции */}
                    <View style={styles.glassCard}>
                        <View style={styles.opsHeader}>
                            <Text style={styles.cardTitle}>{t("ch.lastOps")}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#8b94a3" />
                        </View>
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
                                                <Ionicons
                                                    name={income ? "download-outline" : "arrow-up-outline"}
                                                    size={20}
                                                    color="#60a5fa"
                                                />
                                            </View>
                                            <View style={styles.opText}>
                                                <Text style={styles.opTitle} numberOfLines={1}>
                                                    {outgoing
                                                        ? t("ov.transferChild")
                                                        : lang === "be"
                                                            ? txn.title.be
                                                            : txn.title.ru}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.opAmount,
                                                        {
                                                            color: income
                                                                ? "#10b981"
                                                                : outgoing
                                                                    ? colors.danger
                                                                    : "#ffffff",
                                                        },
                                                    ]}
                                                >
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
                </Animated.View>
            </Animated.ScrollView>
            <ParentTopUpSheet visible={topup} onClose={() => setTopup(false)} />
            <ConfirmCodeModal
                visible={Boolean(pendingCard)}
                title={t("cf.title")}
                onClose={() => setPendingCard(null)}
                onConfirmed={async () => {
                    if (!pendingCard?.id) return;
                    await requestMyCardDetailsApi(pendingCard.id);
                    showToast(t("card.detailsSent"));
                }}
            />
        </SafeAreaView>
    );
}

const makeStyles = (_colors: Palette) =>
    StyleSheet.create({
        root: { flex: 1, backgroundColor: "#10151d" },
        scroll: { paddingBottom: 120 },
        hidden: { display: "none" },
        refresh: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: spacing.sm,
        },
        refreshText: { color: "#8b94a3", fontSize: 12, fontWeight: "700" },
        hero: {
            overflow: "hidden",
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
            backgroundColor: "#181b21",
            position: "relative",
        },
        heroRedSpot: {
            position: "absolute",
            top: -60,
            left: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "rgba(140, 40, 60, 0.26)",
        },
        heroBlueSpot: {
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "rgba(40, 80, 160, 0.28)",
        },
        header: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 20,
            zIndex: 10,
        },
        brand: {
            color: "#ffffff",
            fontSize: 22,
            fontWeight: "700",
            letterSpacing: -0.4,
        },
        caption: {
            color: "#8b94a3",
            fontSize: 13,
            fontWeight: "500",
            marginTop: 2,
        },
        headerIcon: {
            width: 40,
            height: 40,
            marginRight: -8,
            alignItems: "center",
            justifyContent: "center",
        },
        balanceRow: {
            flexDirection: "row",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 22,
            zIndex: 10,
        },
        balance: {
            color: "#ffffff",
            fontSize: 56,
            fontWeight: "700",
            letterSpacing: -1.5,
            lineHeight: 58,
        },
        currency: {
            color: "#9ca3af",
            fontSize: 24,
            fontWeight: "700",
            letterSpacing: 0.5,
        },
        addCard: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 5, marginTop: 8 },
        addCardText: { color: "#93c5fd", fontSize: 12, fontWeight: "700" },
        cardWrap: {
            width: "104%",
            alignSelf: "center",
            zIndex: 1,
        },
        grabberWrap: {
            alignItems: "center",
            paddingVertical: 4,
            marginTop: -24,
            marginBottom: 0,
        },
        grabber: {
            width: 42,
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.16)",
        },
        panel: {
            marginTop: -130,
            paddingHorizontal: 20,
            paddingTop: 26,
            paddingBottom: 32,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            backgroundColor: "#171f2c",
            gap: 20,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.1)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -15 },
            shadowOpacity: 0.45,
            shadowRadius: 24,
            elevation: 20,
            zIndex: 10,
        },
        actions: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingHorizontal: 2,
            marginBottom: 4,
        },
        action: {
            alignItems: "center",
            gap: 8,
            flex: 1,
        },
        actionCircle: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
        },
        actionLabel: {
            color: "#8b94a3",
            fontSize: 11,
            fontWeight: "500",
            textAlign: "center",
        },
        glassCard: {
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            position: "relative",
            overflow: "hidden",
        },
        cardTitle: {
            color: "#ffffff",
            fontSize: 15,
            fontWeight: "700",
        },
        requestRow: {
            gap: spacing.sm,
            paddingVertical: spacing.sm,
        },
        requestTitle: {
            color: "#ffffff",
            fontSize: 14,
            fontWeight: "600",
        },
        requestButtons: {
            flexDirection: "row",
            gap: spacing.sm,
        },
        requestButton: {
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: 6,
        },
        approve: { backgroundColor: "rgba(16,185,129,0.2)" },
        deny: { backgroundColor: "rgba(239,68,68,0.2)" },
        requestButtonText: {
            color: "#ffffff",
            fontSize: 12,
            fontWeight: "700",
        },
        goalHead: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
        },
        goalLabel: {
            color: "#8b94a3",
            fontSize: 12,
            fontWeight: "500",
        },
        goalTitle: {
            color: "#ffffff",
            fontSize: 20,
            fontWeight: "700",
            marginBottom: 4,
        },
        goalSum: {
            color: "#8b94a3",
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 14,
        },
        progressRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
        },
        progressTrack: {
            flex: 1,
            height: 8,
            borderRadius: 4,
            backgroundColor: "rgba(255,255,255,0.06)",
            overflow: "hidden",
        },
        progressFill: {
            height: "100%",
            borderRadius: 4,
            backgroundColor: "#3b82f6",
        },
        goalPercent: {
            color: "rgba(255,255,255,0.85)",
            fontSize: 12,
            fontWeight: "700",
        },
        opsHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
        },
        empty: {
            color: "#8b94a3",
            fontSize: 13,
            fontWeight: "500",
        },
        divider: {
            height: 1,
            backgroundColor: "rgba(255,255,255,0.05)",
            marginVertical: 14,
        },
        opRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
        },
        opIcon: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            borderWidth: 1,
            borderColor: "rgba(96, 165, 250, 0.2)",
            alignItems: "center",
            justifyContent: "center",
        },
        opText: { flex: 1 },
        opTitle: {
            color: "#ffffff",
            fontSize: 13,
            fontWeight: "600",
        },
        opAmount: {
            fontSize: 14,
            fontWeight: "700",
            marginTop: 2,
        },
        opDate: {
            color: "#8b94a3",
            fontSize: 11,
            fontWeight: "500",
            marginTop: 2,
        },
    });