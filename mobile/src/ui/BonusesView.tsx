import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  buyRewardApi,
  loadBonuses,
  type BonusesDto,
  type QuestDto,
  type RewardDto,
} from "@/api/bonuses";
import { useI18n, type TKey } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { radius, shadow, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { PartnerLogo } from "@/ui/PartnerLogo";
import { EmptyState, SectionTitle, type IconName } from "@/ui/primitives";
import { Text } from "@/ui/Text";

const KIND_ICON: Record<string, IconName> = {
  lesson: "book-outline",
  quiz: "school-outline",
  mission: "flash-outline",
  promo: "pricetag-outline",
  theme: "color-palette-outline",
  perk: "sparkles-outline",
};

const KIND_LABEL: Record<string, TKey> = {
  lesson: "qs.kindLesson",
  quiz: "qs.kindQuiz",
  mission: "qs.kindMission",
};

type FilterId = "all" | "active" | "done";

const FILTERS: { id: FilterId; label: TKey }[] = [
  { id: "all", label: "qs.filterAll" },
  { id: "active", label: "qs.filterActive" },
  { id: "done", label: "qs.filterDone" },
];

const EMPTY_QUESTS: QuestDto[] = [];
const EMPTY_REWARDS: RewardDto[] = [];

/**
 * Монеты Moby: тесты и задания банка плюс магазин наград.
 * Компоновка – по макету mobyfamily_tasks_dark_theme.html: заголовок,
 * стеклянный виджет баланса, фильтры-таблетки и карточки с наградой.
 * Один экран для двух ролей: отличается только подпись баланса.
 */
export function BonusesView({ audience = "child" }: { audience?: "child" | "parent" }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { showToast } = useStore();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<BonusesDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<QuestDto | null>(null);

  const loc = useCallback(
    (ru: string | null, be: string | null) => (lang === "be" ? be ?? ru ?? "" : ru ?? be ?? ""),
    [lang],
  );

  const load = useCallback(async () => {
    try {
      setData(await loadBonuses());
    } catch {
      showToast(t("auth.connectFailed"));
    }
  }, [showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = async (id: string) => {
    setBusy(id);
    try {
      const result = await buyRewardApi(id);
      showToast(result.kind === "promo" ? t("qs.code") + ": " + result.code : t("qs.activated"));
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setBusy(null);
    }
  };

  const coins = data?.coins ?? 0;
  const quests = data?.quests ?? EMPTY_QUESTS;
  const rewards = data?.rewards ?? EMPTY_REWARDS;

  const counts = useMemo(
    () => ({
      all: quests.length,
      active: quests.filter((quest) => !quest.done).length,
      done: quests.filter((quest) => quest.done).length,
    }),
    [quests],
  );

  const donePoints = useMemo(
    () => quests.filter((quest) => quest.done).reduce((sum, quest) => sum + quest.points, 0),
    [quests],
  );

  const progress = counts.all > 0 ? counts.done / counts.all : 0;

  const visibleQuests = useMemo(
    () =>
      quests.filter((quest) =>
        filter === "all" ? true : filter === "done" ? quest.done : !quest.done,
      ),
    [filter, quests],
  );

  // Градиент полосы прогресса как в макете: синий → индиго → зелёный.
  const progressColors: readonly [string, string, ...string[]] = isDark
    ? ["#3b82f6", "#6366f1", "#34d399"]
    : ["#2563eb", "#4f46e5", "#10b981"];

  const startQuiz = () => {
    if (!selected) {
      return;
    }
    const id = selected.id;
    setSelected(null);
    router.push({ pathname: "/quiz/[id]", params: { id } });
  };

  const kindLabel = (quest: QuestDto) => t(KIND_LABEL[quest.kind] ?? "qs.kindQuiz");
  const kindIcon = (quest: QuestDto): IconName => KIND_ICON[quest.kind] ?? "school-outline";

  return (
    <View>
      {/* Виджет баланса: монеты и прогресс выполнения */}
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <Text style={styles.heroLabel}>
              {audience === "parent" ? t("bc.familyCoins") : t("qs.myCoins")}
            </Text>
            <View style={styles.heroValueRow}>
              <Text style={styles.heroValue}>{coins}</Text>
              <Text style={styles.heroUnit}>{t("qs.coinsShort")}</Text>
            </View>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="cash-outline" size={24} color={colors.mint} />
          </View>
        </View>

        <View style={styles.heroDivider} />
        <View style={styles.heroStats}>
          <Text style={styles.heroStat} numberOfLines={1}>
            {t("qs.weekDone", { done: String(counts.done), total: String(counts.all) })}
          </Text>
          <Text style={styles.heroStatEarned} numberOfLines={1}>
            {t("qs.weekEarned", { points: String(donePoints) })}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={progressColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: progress * 100 + "%" }]}
          />
        </View>
      </View>

      {/* Фильтры-таблетки: все / активные / выполненные */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filtersScroll}
      >
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filter, active ? styles.filterActive : styles.filterIdle]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : styles.filterTextIdle]}>
                {t(item.label)} ({counts[item.id]})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Карточки заданий и тестов */}
      {data && quests.length === 0 ? (
        <View style={styles.card}>
          <EmptyState icon="school-outline" title={t("qs.empty")} />
        </View>
      ) : null}

      <View style={styles.list}>
        {visibleQuests.map((quest) => (
          <Pressable
            key={quest.id}
            onPress={() => setSelected(quest)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
          >
            <View style={styles.cardTop}>
              <View style={styles.questIcon}>
                <Ionicons name={kindIcon(quest)} size={20} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <View style={[styles.status, quest.done ? styles.statusDone : styles.statusActive]}>
                    <Text style={[styles.statusText, quest.done ? styles.statusTextDone : styles.statusTextActive]}>
                      {quest.done ? "✓ " : ""}
                      {quest.done ? t("qs.done") : t("qs.inProgress")}
                    </Text>
                  </View>
                  <Text style={styles.category} numberOfLines={1}>
                    • {kindLabel(quest)}
                  </Text>
                </View>
                <Text style={styles.questTitle}>{loc(quest.title_ru, quest.title_be)}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="help-circle-outline" size={13} color={colors.muted2} />
                  <Text style={styles.meta}>
                    {t("qs.questionsCount", { n: String(quest.questionCount) })}
                  </Text>
                </View>
              </View>
              <View style={styles.rewardCol}>
                <Text style={[styles.reward, quest.done ? styles.rewardDone : null]}>
                  +{quest.points}
                </Text>
                <Text style={styles.rewardUnit}>
                  {quest.done ? t("qs.received") : t("qs.coinsShort")}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Магазин наград */}
      <SectionTitle>{t("qs.shop")}</SectionTitle>
      <View style={styles.list}>
        {rewards.map((reward) => (
          <View key={reward.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.questIcon}>
                <Ionicons name={KIND_ICON[reward.kind] ?? "gift-outline"} size={20} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.questTitle}>{loc(reward.title_ru, reward.title_be)}</Text>
                <Text style={styles.rewardDesc}>{loc(reward.desc_ru, reward.desc_be)}</Text>
                {reward.partnerName ? (
                  <View style={styles.partnerRow}>
                    <PartnerLogo file={reward.partnerLogo} size={20} />
                    <Text style={styles.partnerName}>{reward.partnerName}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.rewardCol}>
                <Text style={styles.price}>{reward.price}</Text>
                <Text style={styles.rewardUnit}>{t("qs.coinsShort")}</Text>
              </View>
            </View>

            {reward.code ? (
              <View style={styles.doneRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.mint} />
                <Text style={styles.doneText}>
                  {reward.kind === "promo" ? t("qs.code") + ": " + reward.code : t("qs.activated")}
                </Text>
              </View>
            ) : (
              <Button
                compact
                variant="secondary"
                label={coins >= reward.price ? t("qs.buy") : t("qs.notEnough")}
                onPress={() => void buy(reward.id)}
                loading={busy === reward.id}
                disabled={coins < reward.price}
                style={styles.buy}
              />
            )}
          </View>
        ))}
      </View>

      {/* Шторка выбранного задания – как в макете */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setSelected(null)}
            accessibilityRole="button"
            accessibilityLabel={t("qs.close")}
          />
          {selected ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetTop}>
                <View style={styles.sheetChips}>
                  <View style={styles.sheetChipPrimary}>
                    <Text style={styles.sheetChipPrimaryText}>{kindLabel(selected)}</Text>
                  </View>
                  <View style={styles.sheetChipMuted}>
                    <Ionicons name="help-circle-outline" size={12} color={colors.muted} />
                    <Text style={styles.sheetChipMutedText}>
                      {t("qs.questionsCount", { n: String(selected.questionCount) })}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setSelected(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("qs.close")}
                  style={styles.sheetClose}
                >
                  <Ionicons name="close" size={18} color={colors.ink2} />
                </Pressable>
              </View>

              <Text style={styles.sheetTitle}>{loc(selected.title_ru, selected.title_be)}</Text>
              {selected.desc_ru || selected.desc_be ? (
                <Text style={styles.sheetDesc}>{loc(selected.desc_ru, selected.desc_be)}</Text>
              ) : null}

              <View style={styles.sheetReward}>
                <View style={styles.sheetRewardText}>
                  <Text style={styles.sheetRewardLabel}>{t("qs.rewardFor")}</Text>
                  <Text style={styles.sheetRewardHint}>{t("qs.rewardHint")}</Text>
                </View>
                <Text style={styles.sheetRewardValue}>
                  +{selected.points}{" "}
                  <Text style={styles.sheetRewardUnit}>{t("qs.coinsShort")}</Text>
                </Text>
              </View>

              {selected.done ? (
                <View style={styles.sheetDone}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.mint} />
                  <Text style={styles.sheetDoneText}>{t("qs.done")}</Text>
                </View>
              ) : null}

              <Button
                variant={selected.done ? "secondary" : "primary"}
                label={selected.done ? t("qs.retake") : t("qs.take")}
                icon={selected.done ? "refresh-outline" : "play-outline"}
                onPress={startQuiz}
                style={styles.sheetAction}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
    hero: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: radius.lg,
      padding: spacing.lg,
      overflow: "hidden",
      marginBottom: spacing.md,
      ...shadow.card,
    },
    heroGlow: {
      position: "absolute",
      right: -32,
      top: -32,
      width: 112,
      height: 112,
      borderRadius: radius.pill,
      backgroundColor: palette.primarySoft,
    },
    heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    heroText: { flex: 1 },
    heroLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: palette.muted,
      marginBottom: 4,
    },
    heroValueRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    heroValue: { fontSize: 30, fontWeight: "800", letterSpacing: -0.8, color: palette.ink },
    heroUnit: { fontSize: 16, fontWeight: "700", color: palette.muted },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: palette.mintSoft,
      borderWidth: 1,
      borderColor: palette.mintSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    heroDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.line,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    heroStats: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginBottom: 6,
    },
    heroStat: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: palette.muted },
    heroStatEarned: { fontSize: 12, fontWeight: "700", color: palette.mint },
    progressTrack: {
      width: "100%",
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: palette.bgDeep,
      overflow: "hidden",
      marginTop: 6,
    },
    progressFill: { height: "100%", borderRadius: radius.pill },

    filtersScroll: { marginBottom: spacing.md },
    filters: { flexDirection: "row", gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.sm },
    filter: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
    filterActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
      ...shadow.card,
    },
    filterIdle: { backgroundColor: palette.glass, borderColor: palette.line },
    filterText: { fontSize: 12, fontWeight: "600" },
    filterTextActive: { color: palette.white },
    filterTextIdle: { color: palette.muted },

    list: { gap: spacing.md },
    card: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadow.card,
    },
    cardPressed: { opacity: 0.9 },
    cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
    questIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: palette.glass,
      borderWidth: 1,
      borderColor: palette.line,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    cardBody: { flex: 1, gap: 3 },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    status: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1 },
    statusActive: { backgroundColor: palette.primarySoft, borderColor: palette.primarySoftStrong },
    statusDone: { backgroundColor: palette.mintSoft, borderColor: palette.mintSoft },
    statusText: { fontSize: 10, fontWeight: "700" },
    statusTextActive: { color: palette.primary },
    statusTextDone: { color: palette.mint },
    category: { fontSize: 11, fontWeight: "500", color: palette.muted2 },
    questTitle: { fontSize: 14, fontWeight: "700", lineHeight: 19, color: palette.ink },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    meta: { fontSize: 11, fontWeight: "500", color: palette.muted },
    rewardCol: { alignItems: "flex-end", minWidth: 56, paddingTop: 2 },
    reward: { fontSize: 15, fontWeight: "800", color: palette.mint, letterSpacing: -0.2 },
    rewardDone: { color: palette.muted2, textDecorationLine: "line-through" },
    rewardUnit: { fontSize: 10, fontWeight: "500", color: palette.muted2, marginTop: 1 },
    rewardDesc: { fontSize: 12, lineHeight: 17, color: palette.muted },
    partnerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    partnerName: { fontSize: 11.5, fontWeight: "600", color: palette.ink2 },
    price: { fontSize: 15, fontWeight: "800", color: palette.ink2, letterSpacing: -0.2 },
    doneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
    doneText: { fontSize: 12.5, fontWeight: "600", color: palette.mint },
    buy: { marginTop: spacing.md, alignSelf: "stretch" },

    sheetRoot: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(2,6,23,0.66)",
    },
    sheetBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    sheet: {
      backgroundColor: palette.panel,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: palette.lineStrong,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      ...shadow.floating,
    },
    sheetHandle: {
      width: 48,
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: palette.lineStrong,
      alignSelf: "center",
      marginBottom: spacing.lg,
    },
    sheetTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    sheetChips: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, flexWrap: "wrap" },
    sheetChipPrimary: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: palette.primarySoft,
      borderWidth: 1,
      borderColor: palette.primarySoftStrong,
    },
    sheetChipPrimaryText: { fontSize: 11, fontWeight: "700", color: palette.primary },
    sheetChipMuted: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: palette.glass,
      borderWidth: 1,
      borderColor: palette.line,
    },
    sheetChipMutedText: { fontSize: 11, fontWeight: "600", color: palette.muted },
    sheetClose: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      backgroundColor: palette.glass,
      borderWidth: 1,
      borderColor: palette.line,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetTitle: { fontSize: 20, fontWeight: "700", lineHeight: 26, color: palette.ink, marginBottom: 8 },
    sheetDesc: { fontSize: 13.5, lineHeight: 20, color: palette.muted, marginBottom: spacing.lg },
    sheetReward: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: palette.mintSoft,
      borderWidth: 1,
      borderColor: palette.mintSoft,
      marginBottom: spacing.md,
    },
    sheetRewardText: { flex: 1, gap: 2 },
    sheetRewardLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: palette.mint,
    },
    sheetRewardHint: { fontSize: 11.5, color: palette.muted },
    sheetRewardValue: { fontSize: 24, fontWeight: "800", color: palette.mint, letterSpacing: -0.5 },
    sheetRewardUnit: { fontSize: 13, fontWeight: "700", color: palette.mint },
    sheetDone: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    sheetDoneText: { fontSize: 13, fontWeight: "700", color: palette.mint },
    sheetAction: { marginTop: spacing.sm },
  });
};
