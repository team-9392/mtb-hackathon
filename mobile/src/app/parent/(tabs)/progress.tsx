import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useI18n, useL } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { font, palette, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { HeroCard } from "@/ui/Hero";
import { Badge, Card, ProgressBar, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

export default function ParentProgressScreen() {
  const { t } = useI18n();
  const L = useL();
  const { state, approveQuest, showToast } = useStore();

  const done = state.quests.filter((q) => q.status === "approved").length;
  const waiting = state.quests.filter((q) => q.status === "waiting");
  const lessonsDone = state.quests.filter((q) => q.kind === "lesson" && q.status === "approved").length;
  const lessonsTotal = state.quests.filter((q) => q.kind === "lesson").length;
  const goalRatio = state.goal.saved / Math.max(1, state.goal.target);

  return (
    <Screen title={t("pg.title")}>
      <HeroCard gradient="mint">
        <Row style={styles.heroTop}>
          <Text style={styles.heroLabel}>{t("pg.points")}</Text>
          <Badge label={state.child.name} tone="mint" style={styles.heroBadge} />
        </Row>
        <Text style={styles.heroValue}>{state.points}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t("pg.quests")}</Text>
            <Text style={styles.heroStatValue}>
              {done}/{state.quests.length}
            </Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t("pg.lessons")}</Text>
            <Text style={styles.heroStatValue}>
              {lessonsDone}/{lessonsTotal}
            </Text>
          </View>
        </View>
      </HeroCard>

      <SectionTitle>{t("pg.goal")}</SectionTitle>
      <Card>
        <Row style={styles.goalHead}>
          <Text style={styles.goalEmoji}>{state.goal.emoji}</Text>
          <View style={styles.goalText}>
            <Text style={styles.goalTitle}>{L(state.goal.title)}</Text>
            <Text style={styles.goalSub}>
              {formatMoney(state.goal.saved, 0)} / {formatMoney(state.goal.target, 0)}
            </Text>
          </View>
          <Badge label={Math.round(goalRatio * 100) + "%"} tone="primary" />
        </Row>
        <ProgressBar value={goalRatio} tone="primary" height={12} />
      </Card>

      <SectionTitle
        right={waiting.length ? <Badge label={String(waiting.length)} tone="warn" /> : undefined}
      >
        {t("pg.quests")}
      </SectionTitle>
      {state.quests.map((quest) => (
        <Card key={quest.id}>
          <Row style={styles.questRow}>
            <View
              style={[
                styles.questIcon,
                {
                  backgroundColor:
                    quest.status === "approved"
                      ? palette.mintSoft
                      : quest.status === "waiting"
                        ? palette.warnSoft
                        : palette.surfaceAlt,
                },
              ]}
            >
              <Ionicons
                name={quest.kind === "lesson" ? "school-outline" : "home-outline"}
                size={18}
                color={
                  quest.status === "approved"
                    ? palette.mint
                    : quest.status === "waiting"
                      ? "#B26A00"
                      : palette.muted
                }
              />
            </View>
            <View style={styles.questText}>
              <Text style={styles.questTitle}>{L(quest.title)}</Text>
              <Text style={styles.questSub}>
                {quest.from === "parent" ? t("qs.fromParent") : t("qs.fromMoby")} ·{" "}
                {quest.amount > 0 ? formatMoney(quest.amount, 0) : quest.points + " " + t("qs.points")}
              </Text>
            </View>
            {quest.status === "waiting" ? (
              <Button
                compact
                label={t("pg.approve")}
                onPress={() => {
                  approveQuest(quest.id);
                  showToast(t("pg.approved"));
                }}
              />
            ) : (
              <Badge
                label={quest.status === "approved" ? t("qs.done") : t("pg.awaiting")}
                tone={quest.status === "approved" ? "mint" : "neutral"}
              />
            )}
          </Row>
        </Card>
      ))}

      <SectionTitle>{t("pg.timeline")}</SectionTitle>
      <Card tone="alt">
        {state.notifications.slice(0, 4).map((n, i) => (
          <Row key={n.id} style={[styles.timeline, i > 0 && styles.timelineBorder]}>
            <View style={styles.timelineDot} />
            <View style={styles.questText}>
              <Text style={styles.timelineTitle}>{L(n.title)}</Text>
              <Text style={styles.questSub}>{L(n.body)}</Text>
            </View>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: { justifyContent: "space-between" },
  heroLabel: { color: "rgba(255,255,255,0.9)", fontSize: font.small, fontWeight: "600" },
  heroBadge: { backgroundColor: "rgba(255,255,255,0.24)" },
  heroValue: { color: palette.white, fontSize: 40, fontWeight: "800", marginTop: spacing.sm },
  heroStats: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  heroStat: { flex: 1, gap: 3 },
  heroStatLabel: { color: "rgba(255,255,255,0.8)", fontSize: font.tiny },
  heroStatValue: { color: palette.white, fontSize: font.title, fontWeight: "800" },
  goalHead: { gap: spacing.md, marginBottom: spacing.md },
  goalEmoji: { fontSize: 28 },
  goalText: { flex: 1, gap: 2 },
  goalTitle: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  goalSub: { fontSize: font.small, color: palette.muted },
  questRow: { gap: spacing.md },
  questIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  questText: { flex: 1, gap: 2 },
  questTitle: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  questSub: { fontSize: font.tiny, color: palette.muted },
  timeline: { gap: spacing.md, paddingVertical: spacing.sm + 2 },
  timelineBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary },
  timelineTitle: { fontSize: font.small, fontWeight: "700", color: palette.ink },
});
