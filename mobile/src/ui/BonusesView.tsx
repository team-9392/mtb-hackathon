import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { buyRewardApi, loadBonuses, type BonusesDto } from "@/api/bonuses";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, gradients, palette, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { PartnerLogo } from "@/ui/PartnerLogo";
import { Badge, Card, EmptyState, Row, SectionTitle } from "@/ui/primitives";

const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  lesson: "book-outline",
  quiz: "school-outline",
  mission: "flash-outline",
  promo: "pricetag-outline",
  theme: "color-palette-outline",
  perk: "sparkles-outline",
};

/** Монеты Moby: тесты по финансовой грамотности и магазин наград. Один экран для родителя и ребёнка. */
export function BonusesView() {
  const { t, lang } = useI18n();
  const router = useRouter();
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
  const quests = data?.quests ?? [];
  const rewards = data?.rewards ?? [];

  return (
    <View>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroLabel}>{t("qs.myCoins")}</Text>
        <Text style={styles.heroValue}>{coins}</Text>
        <Text style={styles.heroHint}>{t("qs.coinsHint")}</Text>
      </LinearGradient>

      <SectionTitle>{t("qs.quests")}</SectionTitle>
      {data && quests.length === 0 ? (
        <Card tone="alt">
          <EmptyState icon="school-outline" title={t("qs.empty")} />
        </Card>
      ) : null}
      <View style={styles.list}>
        {quests.map((quest) => (
          <Card key={quest.id}>
            <Row style={styles.head}>
              <View style={styles.iconCircle}>
                <Ionicons name={KIND_ICON[quest.kind] ?? "school-outline"} size={18} color={palette.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.title}>{loc(quest.title_ru, quest.title_be)}</Text>
                {quest.desc_ru || quest.desc_be ? (
                  <Text style={styles.desc}>{loc(quest.desc_ru, quest.desc_be)}</Text>
                ) : null}
                <Row style={styles.metaRow}>
                  <Ionicons name="help-circle-outline" size={14} color={palette.muted} />
                  <Text style={styles.meta}>
                    {t("qs.questionsCount", { n: String(quest.questionCount) })}
                  </Text>
                </Row>
              </View>
              <Badge label={"+" + quest.points} tone="mint" />
            </Row>
            {quest.done ? (
              <Row style={styles.doneRow}>
                <Ionicons name="checkmark-circle" size={18} color={palette.mint} />
                <Text style={styles.doneText}>{t("qs.done")}</Text>
              </Row>
            ) : null}
            <Button
              compact
              variant={quest.done ? "secondary" : "primary"}
              label={quest.done ? t("qs.retake") : t("qs.take")}
              onPress={() =>
                router.push({ pathname: "/quiz/[id]", params: { id: quest.id } })
              }
              style={styles.action}
            />
          </Card>
        ))}
      </View>

      <SectionTitle>{t("qs.shop")}</SectionTitle>
      <View style={styles.list}>
        {rewards.map((reward) => (
          <Card key={reward.id}>
            <Row style={styles.head}>
              <View style={styles.iconCircle}>
                <Ionicons name={KIND_ICON[reward.kind] ?? "gift-outline"} size={18} color={palette.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.title}>{loc(reward.title_ru, reward.title_be)}</Text>
                <Text style={styles.desc}>{loc(reward.desc_ru, reward.desc_be)}</Text>
                {reward.partnerName ? (
                  <Row style={styles.partnerRow}>
                    <PartnerLogo file={reward.partnerLogo} size={22} />
                    <Text style={styles.partnerName}>{reward.partnerName}</Text>
                  </Row>
                ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: font.small, fontWeight: "600" },
  heroValue: { color: palette.white, fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  heroHint: { color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 2 },
  list: { gap: spacing.md },
  head: { gap: spacing.md, alignItems: "flex-start" },
  flex: { flex: 1, gap: 2 },
  metaRow: { gap: 4, marginTop: 2 },
  meta: { fontSize: 12.5, color: palette.muted, fontWeight: "600" },
  partnerRow: { gap: 6, marginTop: 4, alignItems: "center" },
  partnerName: { fontSize: 12, color: palette.ink2, fontWeight: "700" },
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
  action: { marginTop: spacing.md, alignSelf: "stretch" },
  doneRow: { gap: spacing.xs, marginTop: spacing.sm },
  doneText: { fontSize: 13.5, color: palette.mint, fontWeight: "600" },
});
