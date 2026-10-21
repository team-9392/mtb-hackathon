import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { font, spacing } from "@/theme/tokens";
import { HeroCard } from "@/ui/Hero";
import { Badge, Card, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const BENEFITS = [
  { icon: "card-outline", title: "p1.b1t", desc: "p1.b1d" },
  { icon: "calendar-outline", title: "p1.b2t", desc: "p1.b2d" },
  { icon: "trending-up-outline", title: "p1.b3t", desc: "p1.b3d" },
  { icon: "shield-checkmark-outline", title: "p1.b4t", desc: "p1.b4d" },
  { icon: "school-outline", title: "p1.b5t", desc: "p1.b5d" },
] as const;

const LOYALTY = [
  { label: "p1.loyalty1", tone: "primary" as const },
  { label: "p1.loyalty2", tone: "mint" as const },
  { label: "p1.loyalty3", tone: "child" as const },
] as const;

export default function OfferScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const router = useRouter();

  return (
    <Screen
      showBack
      title={t("p1.title")}
      subtitle={t("p1.subtitle")}
      footer={
        <>
          <SlideToConfirm
            label={t("p1.cta")}
            onConfirm={() => router.push("/parent/child-profile")}
            doneLabel={t("common.done")}
          />
          <Text style={styles.terms}>{t("p1.terms")}</Text>
        </>
      }
    >
      <HeroCard gradient="parent">
        <Badge label={t("p1.badge")} tone="primary" style={styles.badge} onDark />
        <Text style={styles.heroTitle}>{t("p1.title")}</Text>
        <Text style={styles.heroSubtitle}>{t("p1.subtitle")}</Text>
      </HeroCard>

      <Card>
        {BENEFITS.map((b, i) => (
          <View key={b.title} style={[styles.benefit, i > 0 && styles.benefitBorder]}>
            <View style={styles.benefitIcon}>
              <Ionicons name={b.icon} size={20} color={palette.primary} />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{t(b.title)}</Text>
              <Text style={styles.benefitDesc}>{t(b.desc)}</Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle>{t("p1.priceTitle")}</SectionTitle>
      <Card>
        <Row style={styles.priceRow}>
          <View style={styles.priceLeft}>
            <Text style={styles.priceLabel}>{t("p1.priceTitle")}</Text>
            <Text style={styles.priceValue}>{t("p1.priceValue")}</Text>
          </View>
          <Badge label={t("common.free")} tone="mint" />
        </Row>
        <Text style={styles.priceNote}>{t("p1.priceNote")}</Text>
      </Card>

      <SectionTitle>{t("p1.loyaltyTitle")}</SectionTitle>
      <Card>
        {LOYALTY.map((item, i) => (
          <Row key={item.label} style={[styles.loyaltyRow, i > 0 && styles.benefitBorder]}>
            <Ionicons name="pricetag" size={17} color={palette.violet} />
            <Text style={styles.loyaltyText}>{t(item.label)}</Text>
            <Badge label="%" tone={item.tone} />
          </Row>
        ))}
        <Text style={styles.loyaltyNote}>{t("p1.loyaltyNote")}</Text>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  badge: { backgroundColor: "rgba(255,255,255,0.22)", marginBottom: spacing.md },
  heroTitle: { color: palette.white, fontSize: font.h2, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: font.small, lineHeight: 19, marginTop: spacing.sm },
  benefit: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  benefitBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  benefitDesc: { fontSize: font.small, color: palette.muted, lineHeight: 18 },
  priceRow: { justifyContent: "space-between" },
  priceLeft: { flex: 1, gap: 2 },
  priceLabel: { fontSize: font.small, color: palette.muted, fontWeight: "600" },
  priceValue: { fontSize: font.h1, fontWeight: "800", color: palette.ink },
  priceNote: { fontSize: font.tiny, color: palette.muted, marginTop: spacing.sm },
  loyaltyRow: { gap: spacing.md, paddingVertical: spacing.sm + 2 },
  loyaltyText: { flex: 1, fontSize: font.small, color: palette.ink2, fontWeight: "600" },
  loyaltyNote: { fontSize: font.tiny, color: palette.muted, marginTop: spacing.md },
  terms: { textAlign: "center", fontSize: font.tiny, color: palette.muted2 },
  });
};
