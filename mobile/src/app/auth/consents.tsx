import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  CONSENT_IDS,
  checkedConsentIds,
  isConsentRequired,
  missingRequiredConsents,
  useSignupDraft,
} from "@/auth/signup/draft";
import { ConsentRow, Notice, SignupLayout } from "@/auth/signup/ui";
import { useI18n, type TKey } from "@/i18n";
import type { ConsentId } from "@/store/types";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { ProgressBar } from "@/ui/primitives";
import { Text } from "@/ui/Text";

const CONSENT_ITEMS: { id: ConsentId; title: TKey; hint: TKey }[] = [
  { id: "legal", title: "reg.consentLegal", hint: "reg.consentLegalHint" },
  { id: "pd", title: "reg.consentPd", hint: "reg.consentPdHint" },
  { id: "access", title: "reg.consentAccess", hint: "reg.consentAccessHint" },
  { id: "written14", title: "reg.consentWritten14", hint: "reg.consentWritten14Hint" },
];

/**
 * Шаг 5: согласия.
 * Показываем все четыре пункта и их статус, но требуем только те,
 * которые нужны возрастной группе ребёнка: written14 — для 14–17 лет.
 */
export default function ConsentsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const router = useRouter();
  const { draft, patch } = useSignupDraft();
  const [error, setError] = useState<string | null>(null);

  const required = CONSENT_IDS.filter((id) => isConsentRequired(id, draft.bracket));
  const missing = missingRequiredConsents(draft);
  const signedRequired = required.length - missing.length;
  const checkedTotal = checkedConsentIds(draft).length;
  const done = missing.length === 0;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/auth/child");
    }
  };

  const toggle = (id: ConsentId) => {
    patch({ consents: { ...draft.consents, [id]: !draft.consents[id] } });
    setError(null);
  };

  const signAll = () => {
    patch({
      consents: {
        legal: true,
        pd: true,
        access: true,
        written14: isConsentRequired("written14", draft.bracket) ? true : draft.consents.written14,
      },
    });
    setError(null);
  };

  const submit = () => {
    if (missing.length > 0) {
      setError(t("reg.consentMissing"));
      return;
    }
    setError(null);
    patch({ step: 6 });
    router.push("/auth/payment");
  };

  return (
    <SignupLayout
      step={5}
      title={t("reg.consentsTitle")}
      subtitle={t("reg.consentsSubtitle")}
      onBack={goBack}
      footer={
        <>
          {error ? (
            <Text secondary style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          ) : null}
          <Button label={t("common.continue")} onPress={submit} />
        </>
      }
    >
      <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryText}>
            <Text style={[styles.summaryValue, { color: colors.ink }]}>
              {signedRequired}
              <Text style={[styles.summaryTotal, { color: colors.muted2 }]}>{" / " + required.length}</Text>
            </Text>
            <Text secondary style={[styles.summaryLabel, { color: colors.muted }]}>
              {t("reg.consentSummary", {
                signed: String(signedRequired),
                total: String(required.length),
              })}
            </Text>
          </View>
          <Pressable
            onPress={signAll}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.signAll,
              { backgroundColor: colors.primarySoft, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
            <Text secondary style={[styles.signAllText, { color: colors.primary }]}>
              {t("reg.consentSignAll")}
            </Text>
          </Pressable>
        </View>
        <ProgressBar value={required.length === 0 ? 1 : signedRequired / required.length} tone={done ? "mint" : "primary"} height={6} />
      </View>

      <View style={styles.list}>
        {CONSENT_ITEMS.map((item) => {
          const isRequired = isConsentRequired(item.id, draft.bracket);
          const checked = draft.consents[item.id];
          return (
            <ConsentRow
              key={item.id}
              title={t(item.title)}
              hint={t(item.hint)}
              checked={checked}
              required={isRequired}
              status={checked ? t("reg.consentSigned") : t("reg.consentNotSigned")}
              requiredLabel={t("reg.consentRequiredBadge")}
              notRequiredLabel={t("reg.consentNotRequired")}
              onToggle={() => toggle(item.id)}
            />
          );
        })}
      </View>

      <View style={styles.checkedNote}>
        <Text secondary style={[styles.checkedText, { color: colors.muted2 }]}>
          {t("reg.consentSummary", {
            signed: String(checkedTotal),
            total: String(CONSENT_IDS.length),
          })}
        </Text>
      </View>

      <Notice icon="lock-closed-outline" text={t("reg.consentNote")} />
    </SignupLayout>
  );
}

const makeStyles = (_colors: Palette) => {
  return StyleSheet.create({
    summary: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    summaryTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    summaryText: { flex: 1, gap: 2 },
    summaryValue: { fontSize: 30, fontWeight: "700", letterSpacing: -0.6 },
    summaryTotal: { fontSize: 18, fontWeight: "600" },
    summaryLabel: { fontSize: 11.5, fontWeight: "600" },
    signAll: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.pill,
    },
    signAllText: { fontSize: 11.5, fontWeight: "700" },
    list: { gap: spacing.md },
    checkedNote: { alignItems: "center", marginTop: spacing.md },
    checkedText: { fontSize: 11, fontWeight: "600" },
    error: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  });
};
