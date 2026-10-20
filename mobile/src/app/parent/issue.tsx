import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { HeroCard } from "@/ui/Hero";
import { Badge, Card, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

const SERVICES = ["p4.s1", "p4.s2", "p4.s3", "p4.s4", "p4.s5"] as const;

export default function IssueScreen() {
  const { t } = useI18n();
  const { state, issueProducts } = useStore();
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "issuing" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const start = () => {
    setPhase("issuing");
    timer.current = setTimeout(() => {
      issueProducts();
      setPhase("done");
    }, 1400);
  };

  const footer =
    phase === "done" ? (
      <Button label={t("p4.toAccess")} icon="key-outline" onPress={() => router.push("/parent/access")} />
    ) : (
      <Button
        label={phase === "issuing" ? t("p4.issuing") : t("p4.cta")}
        loading={phase === "issuing"}
        icon="card-outline"
        onPress={start}
      />
    );

  return (
    <Screen showBack title={t("p4.title")} subtitle={t("p4.subtitle")} footer={footer}>
      <HeroCard gradient={state.child.bracket === "teen_14_17" ? "ink" : "child"}>
        <Row style={styles.cardTop}>
          <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.85)" />
          <Text style={styles.cardBrand}>Moby Family</Text>
        </Row>
        <View style={styles.chip} />
        <Text style={styles.pan}>•••• •••• •••• {state.card.last4}</Text>
        <Row style={styles.cardBottom}>
          <View style={styles.cardHolder}>
            <Text style={styles.cardLabel}>{state.child.name.toUpperCase()}</Text>
            <Text style={styles.cardName}>{t("p4.virtual")}</Text>
          </View>
          <Badge
            label={phase === "done" ? t("common.on") : t("common.off")}
            tone={phase === "done" ? "mint" : "danger"}
            style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
          />
        </Row>
      </HeroCard>

      {phase === "done" ? (
        <Card>
          <Row style={styles.doneRow}>
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark" size={20} color={palette.white} />
            </View>
            <View style={styles.doneText}>
              <Text style={styles.doneTitle}>{t("p4.done")}</Text>
              <Text style={styles.doneDesc}>{t("p4.doneDesc")}</Text>
            </View>
          </Row>
        </Card>
      ) : null}

      <SectionTitle>{t("p4.cardTitle")}</SectionTitle>
      <Card>
        <Row style={styles.serviceRow}>
          <Ionicons name="flash-outline" size={18} color={palette.primary} />
          <View style={styles.serviceText}>
            <Text style={styles.serviceTitle}>{t("p4.virtual")}</Text>
            <Text style={styles.serviceDesc}>{t("p4.virtualReady")}</Text>
          </View>
          {phase === "done" ? <Badge label={t("common.on")} tone="mint" /> : null}
        </Row>
        <Row style={[styles.serviceRow, styles.serviceBorder]}>
          <Ionicons name="mail-outline" size={18} color={palette.violet} />
          <View style={styles.serviceText}>
            <Text style={styles.serviceTitle}>{t("p4.physical")}</Text>
            <Text style={styles.serviceDesc}>{t("p4.delivery")}</Text>
          </View>
          <Badge label={state.card.physical === "ordered" ? "2–3" : "OK"} tone="warn" />
        </Row>
      </Card>

      <SectionTitle>{t("p4.services")}</SectionTitle>
      <Card tone="alt">
        {SERVICES.map((key) => (
          <Row key={key} style={styles.serviceRow}>
            <Ionicons name="checkmark-circle" size={17} color={palette.mint} />
            <Text style={styles.serviceListText}>{t(key)}</Text>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTop: { justifyContent: "space-between" },
  cardBrand: { color: palette.white, fontSize: font.small, fontWeight: "800", letterSpacing: 0.5 },
  chip: {
    width: 40,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginTop: spacing.xl,
  },
  pan: { color: palette.white, fontSize: font.h3, fontWeight: "700", letterSpacing: 2, marginTop: spacing.md },
  cardBottom: { justifyContent: "space-between", marginTop: spacing.lg, alignItems: "flex-end" },
  cardHolder: { gap: 2 },
  cardLabel: { color: palette.white, fontSize: font.small, fontWeight: "700", letterSpacing: 1 },
  cardName: { color: "rgba(255,255,255,0.85)", fontSize: font.tiny },
  doneRow: { gap: spacing.md },
  doneIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: palette.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { flex: 1, gap: 3 },
  doneTitle: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  doneDesc: { fontSize: font.small, color: palette.muted },
  serviceRow: { gap: spacing.md, paddingVertical: spacing.sm + 2 },
  serviceBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  serviceText: { flex: 1, gap: 2 },
  serviceTitle: { fontSize: font.body, fontWeight: "600", color: palette.ink },
  serviceDesc: { fontSize: font.tiny, color: palette.muted },
  serviceListText: { flex: 1, fontSize: font.small, color: palette.ink2, fontWeight: "600" },
  cardTitleRow: { gap: spacing.md },
  cardRadius: { borderRadius: radius.lg },
});
