import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { CARD_SYSTEMS, CARD_TYPES, formatPan } from "@/lib/card";
import { useStore } from "@/store/StoreProvider";
import type { CardSystem, CardType } from "@/store/types";
import { font, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { HeroCard } from "@/ui/Hero";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Badge, Card, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const SYSTEM_LABEL: Record<CardSystem, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  belkart: "Белкарт",
  unionpay: "UnionPay",
};

/** Выпуск карты: виртуальная или пластиковая, любая платёжная система. */
export default function IssueScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const { state, issueCard, showToast } = useStore();
  const router = useRouter();
  const [type, setType] = useState<CardType>(state.card.type);
  const [system, setSystem] = useState<CardSystem>(state.card.system);
  const [busy, setBusy] = useState(false);

  const matches = state.card.number.length > 0 && state.card.type === type && state.card.system === system;
  const preview = matches ? formatPan(state.card.number) : "•••• •••• •••• " + state.card.last4;
  const expiry = matches && state.card.expiry.length > 0 ? state.card.expiry : "••/••";

  const submit = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    let ok = false;
    try {
      ok = await issueCard(type, system);
    } finally {
      // Спиннер не должен остаться, что бы ни случилось.
      setBusy(false);
    }
    if (ok) {
      // Реквизиты приходят в состояние, а из выпуска сразу уходим в главное меню.
      showToast(t("card.issuedSent"));
      router.replace("/parent");
    }
  };

  return (
    <Screen
      showBack
      title={t("p4.title")}
      subtitle={t("p4.subtitle")}
      footer={
        <SlideToConfirm
          label={state.card.status === "active" && matches ? t("card.reissue") : t("card.issue")}
          onConfirm={() => void submit()}
          disabled={busy}
          doneLabel={t("common.done")}
        />
      }
    >
      <HeroCard gradient={type === "plastic" ? "ink" : "child"}>
        <Row style={styles.cardTop}>
          <Text style={styles.brand}>{t("card.brand")}</Text>
          <PaymentBrand system={system} onDark />
        </Row>
        <View style={styles.cardChip} />
        <Text style={styles.cardPan}>{preview}</Text>
        <Row style={styles.cardBottom}>
          <View style={styles.cardHolder}>
            <Text style={styles.cardLabel}>{t("card.holder")}</Text>
            <Text style={styles.cardValue}>{(state.child.name || "MOBY FAMILY").toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>{t("card.expiry")}</Text>
            <Text style={styles.cardValue}>{expiry}</Text>
          </View>
        </Row>
      </HeroCard>

      <SectionTitle>{t("card.type")}</SectionTitle>
      <Row style={styles.grid}>
        {CARD_TYPES.map((option) => (
          <Pressable
            key={option}
            onPress={() => setType(option)}
            style={[styles.option, type === option && styles.optionActive]}
          >
            <Ionicons
              name={option === "virtual" ? "phone-portrait-outline" : "card-outline"}
              size={20}
              color={type === option ? palette.primary : palette.ink2}
            />
            <Text style={[styles.optionTitle, type === option && styles.optionTitleActive]}>
              {t(option === "virtual" ? "card.virtual" : "card.plastic")}
            </Text>
            <Text style={styles.optionHint}>{t(option === "virtual" ? "card.virtualHint" : "card.plasticHint")}</Text>
          </Pressable>
        ))}
      </Row>

      <SectionTitle>{t("card.system")}</SectionTitle>
      <Row style={styles.systemRow}>
        {CARD_SYSTEMS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setSystem(option)}
            style={[styles.systemOption, system === option && styles.systemOptionActive]}
          >
            <PaymentBrand system={option} />
            <Text style={styles.systemLabel}>{SYSTEM_LABEL[option]}</Text>
          </Pressable>
        ))}
      </Row>

      {matches ? (
        <Card>
          <Row style={styles.issuedTop}>
            <Text style={styles.issuedTitle}>{t("card.issued")}</Text>
            <Badge label={t(type === "virtual" ? "card.virtual" : "card.plastic")} tone="mint" />
          </Row>
          <Row style={styles.issuedRow}>
            <Text style={styles.issuedLabel}>{t("card.number")}</Text>
            <Text style={styles.issuedValue}>{formatPan(state.card.number)}</Text>
          </Row>
          <Row style={styles.issuedRow}>
            <Text style={styles.issuedLabel}>{t("card.expiry")}</Text>
            <Text style={styles.issuedValue}>{state.card.expiry}</Text>
          </Row>
          <Row style={styles.issuedRow}>
            <Text style={styles.issuedLabel}>{t("card.system")}</Text>
            <Text style={styles.issuedValue}>{SYSTEM_LABEL[state.card.system]}</Text>
          </Row>
          <Text style={styles.issuedHint}>{t("card.fullHint")}</Text>
          <Button
            compact
            variant="ghost"
            icon="key-outline"
            label={t("card.toAccess")}
            onPress={() => router.push("/parent/access")}
            style={styles.toAccess}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  cardTop: { justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: font.small, fontWeight: "800", color: "rgba(255,255,255,0.92)", letterSpacing: 0.4 },
  cardChip: {
    width: 34,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginTop: spacing.lg,
  },
  cardPan: {
    fontSize: 19,
    fontWeight: "700",
    color: palette.white,
    letterSpacing: 1.5,
    marginTop: spacing.md,
  },
  cardBottom: { justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.lg },
  cardHolder: { flex: 1 },
  cardLabel: { fontSize: 9.5, color: "rgba(255,255,255,0.7)", letterSpacing: 0.6, textTransform: "uppercase" },
  cardValue: { fontSize: font.small, fontWeight: "700", color: palette.white, marginTop: 2 },
  grid: { gap: spacing.sm },
  option: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.md,
    gap: 6,
  },
  optionActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  optionTitle: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  optionTitleActive: { color: palette.primary },
  optionHint: { fontSize: 11.5, color: palette.muted, lineHeight: 15 },
  systemRow: { flexWrap: "wrap", gap: spacing.sm },
  systemOption: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 8,
    alignItems: "flex-start",
  },
  systemOptionActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  systemLabel: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  issuedTop: { justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  issuedTitle: { fontSize: font.body, fontWeight: "800", color: palette.ink },
  issuedRow: { justifyContent: "space-between", paddingVertical: 6 },
  issuedLabel: { fontSize: font.small, color: palette.muted },
  issuedValue: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  issuedHint: { fontSize: 12, color: palette.muted, marginTop: spacing.sm, lineHeight: 16 },
  toAccess: { marginTop: spacing.md },
  });
};
