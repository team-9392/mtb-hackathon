import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useI18n, useL } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { font, palette, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { HeroCard } from "@/ui/Hero";
import { Badge, Card, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

export default function ChildQuestsScreen() {
  const { t } = useI18n();
  const L = useL();
  const { state, completeQuest, showToast } = useStore();

  const lessons = state.quests.filter((q) => q.kind === "lesson");
  const tasks = state.quests.filter((q) => q.kind === "task");

  return (
    <Screen title={t("qs.title")}>
      <HeroCard gradient="parent">
        <Row style={styles.heroTop}>
          <Text style={styles.heroLabel}>{t("qs.total")}</Text>
          <Ionicons name="sparkles" size={20} color="rgba(255,255,255,0.9)" />
        </Row>
        <Text style={styles.heroValue}>{state.points}</Text>
        <Text style={styles.heroSub}>{t("qs.points")}</Text>
      </HeroCard>

      <SectionTitle>{t("qs.lesson")}</SectionTitle>
      {lessons.map((quest) => (
        <Card key={quest.id}>
          <Row style={styles.row}>
            <View style={[styles.icon, { backgroundColor: palette.primarySoft }]}>
              <Ionicons name="school-outline" size={19} color={palette.primary} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{L(quest.title)}</Text>
              <Text style={styles.sub}>
                {t("qs.fromMoby")} · +{quest.points} {t("qs.points")}
              </Text>
            </View>
            {quest.status === "approved" ? (
              <Badge label={t("qs.approved")} tone="mint" />
            ) : (
              <Button
                compact
                label={t("qs.finish")}
                onPress={() => {
                  completeQuest(quest.id);
                  showToast(t("qs.lessonDone"));
                }}
              />
            )}
          </Row>
        </Card>
      ))}

      <SectionTitle>{t("qs.fromParent")}</SectionTitle>
      {tasks.map((quest) => (
        <Card key={quest.id}>
          <Row style={styles.row}>
            <View style={[styles.icon, { backgroundColor: palette.childSoft }]}>
              <Ionicons name="home-outline" size={19} color={palette.childDark} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{L(quest.title)}</Text>
              <Text style={styles.sub}>
                {t("qs.fromParent")} · {formatMoney(quest.amount, 0)}
              </Text>
            </View>
            {quest.status === "approved" ? (
              <Badge label={t("qs.approved")} tone="mint" />
            ) : quest.status === "waiting" ? (
              <Badge label={t("qs.wait")} tone="warn" />
            ) : (
              <Button
                compact
                label={t("qs.start")}
                onPress={() => {
                  completeQuest(quest.id);
                  showToast(t("qs.wait"));
                }}
              />
            )}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: { justifyContent: "space-between" },
  heroLabel: { color: "rgba(255,255,255,0.9)", fontSize: font.small, fontWeight: "700" },
  heroValue: { color: palette.white, fontSize: 38, fontWeight: "800", marginTop: spacing.sm },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: font.small },
  row: { gap: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  title: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  sub: { fontSize: font.tiny, color: palette.muted },
});
