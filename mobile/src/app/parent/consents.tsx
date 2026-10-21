import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { ConsentId } from "@/store/types";
import { font, radius, spacing } from "@/theme/tokens";
import { Card } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const TEXT: Record<ConsentId, { title: string; desc: string }> = {
  legal: { title: "p3.c1t", desc: "p3.c1d" },
  pd: { title: "p3.c2t", desc: "p3.c2d" },
  access: { title: "p3.c3t", desc: "p3.c3d" },
  written14: { title: "p3.c4t", desc: "p3.c4d" },
};

export default function ConsentsScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const { state, toggleConsent, signAllConsents, showToast } = useStore();
  const router = useRouter();
  const allSigned = state.consents.every((c) => c.signedAt !== null);

  const next = () => {
    if (!allSigned) {
      showToast(t("p3.mustSign"));
      return;
    }
    router.push("/parent/issue");
  };

  return (
    <Screen
      showBack
      title={t("p3.title")}
      subtitle={t("p3.subtitle")}
      footer={
        <SlideToConfirm
          label={t("p3.cta")}
          onConfirm={next}
          disabled={!allSigned}
          doneLabel={t("common.done")}
        />
      }
    >
      {state.consents.map((consent) => {
        const text = TEXT[consent.id];
        const signed = consent.signedAt !== null;
        return (
          <Pressable
            key={consent.id}
            onPress={() => toggleConsent(consent.id)}
            style={[styles.row, signed && styles.rowSigned]}
          >
            <View style={[styles.check, signed && { backgroundColor: palette.mint }]}>
              <Ionicons
                name={signed ? "checkmark" : "ellipse-outline"}
                size={signed ? 16 : 20}
                color={signed ? palette.white : palette.muted2}
              />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{t(text.title as "p3.c1t")}</Text>
              <Text secondary style={styles.desc}>{t(text.desc as "p3.c1d")}</Text>
            </View>
          </Pressable>
        );
      })}

      {state.child.bracket === "child_7_13" ? (
        <Card tone="alt">
          <View style={styles.optionalRow}>
            <Ionicons name="information-circle-outline" size={18} color={palette.muted2} />
            <Text style={styles.optionalText}>
              {t("p3.c4t")} — {t("p3.optional")}
            </Text>
          </View>
        </Card>
      ) : null}

      <SlideToConfirm
        label={allSigned ? t("p3.signedAll") : t("p3.signAll")}
        onConfirm={signAllConsents}
        disabled={allSigned}
        doneLabel={t("common.done")}
      />

      <Text style={styles.note}>{t("p3.note")}</Text>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: "transparent",
  },
  rowSigned: { borderColor: palette.mint, backgroundColor: palette.mintSoft },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  text: { flex: 1, gap: 4 },
  title: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  desc: { fontSize: font.small, color: palette.muted, lineHeight: 18 },
  optionalRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  optionalText: { flex: 1, fontSize: font.small, color: palette.muted },
  note: { fontSize: font.tiny, color: palette.muted2, textAlign: "center", marginTop: spacing.sm },
  });
};
