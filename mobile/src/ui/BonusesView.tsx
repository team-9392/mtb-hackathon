import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { buyRewardApi, completeQuestApi, loadBonuses, type BonusesDto } from "@/api/bonuses";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, gradients, palette, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Badge, Card, EmptyState, Row, SectionTitle } from "@/ui/primitives";

const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  lesson: "book-outline",
  quiz: "help-circle-outline",
  mission: "flash-outline",
  promo: "pricetag-outline",
  theme: "color-palette-outline",
  perk: "sparkles-outline",
};

/** Монеты Moby: квесты от банка и магазин наград. Один экран для родителя и ребёнка. */
export function BonusesView() {
  const { t, lang } = useI18n();
  const { showToast } = useStore();
  const [data, setData] = useState<BonusesDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  const complete = async (id: string, points: number) => {
    setBusy(id);
    try {
      await completeQuestApi(id);
      showToast("+" + points + " " + t("qs.coinsShort"));
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setBusy(null);
    }
  };

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

  return (
    <View>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroLabel}>{t("qs.myCoins")}</Text>
        <Text style={styles.heroValue}>{coins}</Text>
        <Text style={styles.heroHint}>{t("qs.coinsHint")}</Text>
      </LinearGradient>

      <SectionTitle>{t("qs.quests")}</SectionTitle>
      {data && data.quests.length === 0 ? (
        <Card tone="alt">
          <EmptyState icon="sparkles-outline" title={t("qs.empty")} />
        </Card>
      ) : null}
      {(data?.quests ?? []).map((quest) => (
        <Card key={quest.id}>
          <Row style={styles.head}>
            <View style={styles.iconCircle}>
              <Ionicons name={KIND_ICON[quest.kind] ?? "star-outline"} size={18} color={palette.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.title}>{loc(quest.title_ru, quest.title_be)}</Text>
              {quest.desc_ru || quest.desc_be ? (
                <Text style={styles.desc}>{loc(quest.desc_ru, quest.desc_be)}</Text>
              ) : null}
            </View>
            <Badge label={"+" + quest.points} tone="mint" />
          </Row>
          {quest.done ? (
            <Row style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={18} color={palette.mint} />
              <Text style={styles.doneText}>{t("qs.done")}</Text>
            </Row>
          ) : (
            <Button
              compact
              label={t("qs.take")}
              onPress={() => void complete(quest.id, quest.points)}
              loading={busy === quest.id}
              style={styles.action}
            />
          )}
        </Card>
      ))}

      <SectionTitle>{t("qs.shop")}</SectionTitle>
      {(data?.rewards ?? []).map((reward) => (
        <Card key={reward.id}>
          <Row style={styles.head}>
            <View style={styles.iconCircle}>
              <Ionicons name={KIND_ICON[reward.kind] ?? "gift-outline"} size={18} color={palette.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.title}>{loc(reward.title_ru, reward.title_be)}</Text>
              <Text style={styles.desc}>{loc(reward.desc_ru, reward.desc_be)}</Text>
            </View>
            <Text style={styles.price}>{reward.price}</Text>
          </Row>
          {reward.code ? (
            <Row style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={18} color={palette.mint} />
              <Text style={styles.doneText}>
                {reward.kind === "promo" ? t("qs.code") + ": " + reward.code : t("qs.activated")}
              </Text>
            </Row>
          ) : (
            <Button
              compact
              variant="secondary"
              label={coins >= reward.price ? t("qs.buy") : t("qs.notEnough")}
              onPress={() => void buy(reward.id)}
              loading={busy === reward.id}
              disabled={coins < reward.price}
              style={styles.action}
            />
          )}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: font.small, fontWeight: "600" },
  heroValue: { color: palette.white, fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  heroHint: { color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 2 },
  head: { gap: spacing.md, alignItems: "flex-start" },
  flex: { flex: 1, gap: 2 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  desc: { fontSize: 13, color: palette.muted, lineHeight: 18 },
  price: { fontSize: font.body, fontWeight: "800", color: palette.ink2 },
  action: { marginTop: spacing.sm, alignSelf: "flex-start" },
  doneRow: { gap: spacing.xs, marginTop: spacing.sm },
  doneText: { fontSize: 13.5, color: palette.mint, fontWeight: "600" },
});