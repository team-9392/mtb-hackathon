import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
import { ConfirmCodeModal } from "@/ui/ConfirmCodeModal";
import { HeroGlow } from "@/ui/Glow";
import { Text } from "@/ui/Text";
import { TopUpSheet } from "@/ui/TopUpSheet";

/** Главная ребёнка — по макету: шапка, баланс, выглядывающая карта под углом, шторка с glassmorphism, копилка, операции. */
export default function ChildHomeScreen() {
    const { t, lang } = useI18n();
    const { state, showToast, refresh } = useStore();
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();
    const [topup, setTopup] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingCard, setPendingCard] = useState<CardInfo | null>(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [pulled, setPulled] = useState(false);
    const pull = useRef(new Animated.Value(0)).current;
    const pullRef = useRef(0);
    pull.addListener(({ value }) => {
        pullRef.current = value;
        setPulled(value > 30);
    });
    const base = useRef(0);
    const grantAt = useRef(0);
    const pullValue = useRef(0);
    const settle = (to: number) => {
        pullValue.current = to;
        Animated.spring(pull, { toValue: to, useNativeDriver: false, bounciness: 0, speed: 18 }).start();
    };
    const pullGesture = useRef(
        PanResponder.create({
            // любое касание ручки сразу становится жестом, ScrollView не перехватывает
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                base.current = pullValue.current;
                grantAt.current = Date.now();
            },
            onPanResponderMove: (_e, g) => {
                pull.setValue(Math.max(0, Math.min(190, base.current + g.dy)));
            },
            onPanResponderRelease: (_e, g) => {
                const tapped = Math.abs(g.dy) < 8 && Math.abs(g.dx) < 8 && Date.now() - grantAt.current < 350;
                if (tapped) {
                    settle(pullValue.current > 75 ? 0 : 150);
                    return;
                }
                const value = Math.max(0, Math.min(190, base.current + g.dy));
                if (value > 175 && g.vy > 0.4) {
                    void refresh().finally(() => settle(0));
                    return;
                }
                settle(value > 70 ? 150 : 0);
            },
            onPanResponderTerminate: () => settle(pullValue.current),
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
    const cards: CardInfo[] =
        state.cards && state.cards.length > 0
            ? state.cards
            : state.card.number.length > 0
                ? [state.card]
                : [];
    const goal = state.goal;
    const hasGoal = Boolean(state.goalId) || goal.target > 0;
    const progress =
        goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;

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
        {
            id: "transfer",
            icon: "swap-horizontal" as const,
            label: t("ch.transfer"),
            onPress: () => router.push("/child/accounts"),
        },
        {
            id: "goal",
            icon: "heart-outline" as const,
            label: t("ch.kopilka"),
            onPress: () => router.push("/child/goal"),
        },
        {
            id: "quests",
            icon: "checkbox-outline" as const,
            label: t("ch.quests"),
            onPress: () => router.push("/child/quests"),
        },
        {
            id: "game",
            icon: "game-controller-outline" as const,
            label: t("game.title"),
            onPress: () => router.push("/game-budget"),
        },
    ];

    // Плавный сдвиг нижней шторки при раскрытии карты
    const panelTranslateY = pull.interpolate({
        inputRange: [0, 150],
        outputRange: [0, 95],
        extrapolate: "clamp",
    });

    return (
        <SafeAreaView style={styles.root} edges={[]}>
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
                <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
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
                        <Pressable
                            onPress={() => router.push("/child/erip")}
                            hitSlop={10}
                            style={styles.headerIcon}
                        >
                            <Ionicons name="qr-code-outline" size={22} color="#ffffff" />
                        </Pressable>
                    </View>

                    {/* Баланс (отдельно над картой!) */}
                    <View style={[styles.balanceRow, pulled && styles.hidden]}>
                        <Text style={styles.balance}>
                            {refreshing ? "•••" : formatMoney(state.balance, 0).replace(" BYN", "")}
                        </Text>
                        <Text style={styles.currency}>BYN</Text>
                    </View>

                    {/* Блок банковской карты на всю ширину под балансом */}
                    <View style={styles.cardWrap}>
                        <CardPeek
                            cards={cards}
                            holder={state.child.name}
                            limitLeft={left}
                            scrollY={pull}
                            balance={state.balance}
                            onIssue={() => router.push("/child/accounts")}
                            refreshing={refreshing}
                            onDetails={(card) => setPendingCard(card)}
                            onRefresh={() => {
                                setRefreshing(true);
                                void refresh().finally(() => setRefreshing(false));
                            }}
                        />
                    </View>
                </View>

                {/* Перекрывающая нижняя шторка (Контент) */}
                <Animated.View
                    style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}
                >
                    <View style={styles.grabberWrap} {...pullGesture.panHandlers}>
                        <View style={styles.grabber} />
                    </View>

                    {/* Быстрые действия (кружки Glassmorphism) */}
                    <View style={styles.actions}>
                        {actions.map((action) => (
                            <Pressable key={action.id} onPress={action.onPress} style={styles.action}>
                                <View style={styles.actionCircle}>
                                    <Ionicons name={action.icon} size={25} color="#60a5fa" />
                                </View>
                                <Text style={styles.actionLabel} numberOfLines={1}>
                                    {action.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Виджет "Копилка" */}
                    {hasGoal ? (
                        <Pressable
                            style={styles.glassCard}
                            onPress={() => router.push("/child/goal")}
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
                            onPress={() => router.push("/child/goal")}
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
                            <Text style={styles.opsTitle}>{t("ch.lastOps")}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#8b94a3" />
                        </View>
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
                                                <Ionicons
                                                    name={income ? "download-outline" : "arrow-up-outline"}
                                                    size={20}
                                                    color="#60a5fa"
                                                />
                                            </View>
                                            <View style={styles.opText}>
                                                <Text style={styles.opTitle} numberOfLines={1}>
                                                    {lang === "be" ? txn.title.be : txn.title.ru}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.opAmount,
                                                        { color: income ? "#10b981" : "#ffffff" },
                                                    ]}
                                                >
                                                    {income ? "+" : "−"}
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
            <TopUpSheet visible={topup} onClose={() => setTopup(false)} />
            <ConfirmCodeModal
                visible={Boolean(pendingCard)}
                title={t("cf.title")}
                onClose={() => setPendingCard(null)}
                onConfirmed={async () => {
                    if (!pendingCard) return;
                    await requestDetails(pendingCard);
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
            overflow: "visible",
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
        cardWrap: {
            width: "104%",
            alignSelf: "center",
            zIndex: 1,
        },
        grabberWrap: {
            alignItems: "center",
            paddingVertical: 12,
            marginTop: -22,
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
            width: 58,
            height: 58,
            borderRadius: 29,
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
        opsTitle: {
            color: "#ffffff",
            fontSize: 15,
            fontWeight: "700",
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