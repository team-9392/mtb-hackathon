import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useI18n, useL } from "@/i18n";
import { formatMoney, formatPercent } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { font, palette, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { HeroCard } from "@/ui/Hero";
import { Badge, Card, ProgressBar, Row, SectionTitle, ToggleRow } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { SlideToConfirm } from "@/ui/SlideToConfirm";

export default function ChildGoalScreen() {
  const { t } = useI18n();
  const L = useL();
  const { state, addToGoal, showToast } = useStore();
  const [amount, setAmount] = useState(10);
  const adding = useRef(false);

  const ratio = state.goal.saved / Math.max(1, state.goal.target);
  const left = Math.max(0, state.goal.target - state.goal.saved);
  const achieved = state.goal.saved >= state.goal.target;

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

  return (
    <Screen title={t("gl.title")} subtitle={t("gl.hint")}>
      <HeroCard gradient="mint">
        <Row style={styles.heroTop}>
          <Text style={styles.emoji}>{state.goal.emoji}</Text>
          <Badge label={formatPercent(ratio)} tone="mint" style={styles.heroBadge} />
        </Row>
        <Text style={styles.heroTitle}>{L(state.goal.title)}</Text>
        <Text style={styles.heroValue}>{formatMoney(state.goal.saved)}</Text>
        <ProgressBar value={ratio} tone="neutral" height={12} />
        <Row style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>
            {t("gl.target")}: {formatMoney(state.goal.target, 0)}
          </Text>
          <Text style={styles.heroFooterText}>
            {t("gl.left")}: {formatMoney(left, 0)}
          </Text>
        </Row>
      </HeroCard>

      {achieved ? (
        <Card>
          <Row style={styles.achieved}>
            <Ionicons name="trophy" size={20} color={palette.warn} />
            <Text style={styles.achievedText}>{t("gl.achieved")}</Text>
          </Row>
        </Card>
      ) : null}

      <SectionTitle>{t("gl.auto")}</SectionTitle>
      <Card>
        <ToggleRow
          title={t("gl.auto")}
          desc={t("gl.autoDesc")}
          value={state.goal.autoSave}
          onChange={() => showToast(t("common.done"))}
        />
      </Card>

      <SectionTitle>{t("gl.add")}</SectionTitle>
      <Card tone="alt">
        <Row style={styles.addRow}>
          {[5, 10, 20].map((preset) => (
            <Button
              key={preset}
              variant={amount === preset ? "primary" : "secondary"}
              compact
              label={formatMoney(preset, 0)}
              onPress={() => setAmount(preset)}
              style={styles.addButton}
            />
          ))}
        </Row>
        <View style={styles.addConfirm}>
          <SlideToConfirm
            label={`${t("gl.add")} · ${formatMoney(amount, 0)}`}
            onConfirm={add}
            doneLabel={t("common.done")}
          />
        </View>
      </Card>

      <Card>
        <Row style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={18} color={palette.muted} />
          <Text style={styles.hint}>{t("gl.hint")}</Text>
        </Row>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: { justifyContent: "space-between", alignItems: "center" },
  emoji: { fontSize: 34 },
  heroBadge: { backgroundColor: "rgba(255,255,255,0.24)" },
  heroTitle: { color: "rgba(255,255,255,0.95)", fontSize: font.title, fontWeight: "700", marginTop: spacing.sm },
  heroValue: { color: palette.white, fontSize: 32, fontWeight: "800", marginBottom: spacing.md },
  heroFooter: { justifyContent: "space-between", marginTop: spacing.sm },
  heroFooterText: { color: "rgba(255,255,255,0.92)", fontSize: font.tiny, fontWeight: "700" },
  achieved: { gap: spacing.md },
  achievedText: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  addRow: { gap: spacing.sm },
  addButton: { flex: 1 },
  addConfirm: { marginTop: spacing.md },
  hintRow: { gap: spacing.md },
  hint: { flex: 1, fontSize: font.small, color: palette.muted, lineHeight: 18 },
});
