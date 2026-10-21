import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ApiError, OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import {
  OPERATOR_CODES,
  composePhone,
  formatSubscriber,
  normalizeSubscriber,
  type OperatorCode,
  useSignupDraft,
} from "@/auth/signup/draft";
import { Field, SignupLayout } from "@/auth/signup/ui";
import { useI18n } from "@/i18n";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { TextInput } from "@/ui/TextInput";

/**
 * Шаг 1: номер телефона.
 * Код оператора выбирается из четырёх вариантов, дальше — 7 цифр номера.
 * Итоговый номер 375XXXXXXXXX.
 */
export default function PhoneScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { requestCode } = useAuth();
  const router = useRouter();
  const { draft, patch } = useSignupDraft();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const digits = draft.subscriber;
  const ready = digits.length === 7;

  const chooseOperator = (code: OperatorCode) => {
    patch({ operator: code, phone: composePhone(code, draft.subscriber) });
    setError(null);
  };

  const changeDigits = (text: string) => {
    const clean = normalizeSubscriber(text);
    patch({ subscriber: clean, phone: composePhone(draft.operator, clean) });
    setError(null);
  };

  const submit = async () => {
    if (!ready || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const local = "375" + draft.operator + digits;
    const fullPhone = "+" + local;
    try {
      const challenge = await requestCode(fullPhone);
      patch({ step: 2, phone: local });
      router.push({
        pathname: "/auth/code",
        params: {
          challengeId: challenge.challengeId,
          phone: fullPhone,
          channel: challenge.channel,
        },
      });
    } catch (caught) {
      // Нет привязки Telegram — не тупик: код можно запросить на экране кода.
      if (caught instanceof ApiError && caught.code === "telegram_not_linked") {
        patch({ step: 2, phone: local });
        router.push({
          pathname: "/auth/code",
          params: { phone: fullPhone, channel: "none" },
        });
        return;
      }
      if (caught instanceof ApiError && caught.code === "too_many_requests") {
        setError(t("auth.tooMany"));
        return;
      }
      setError(caught instanceof OfflineError ? t("auth.connectFailed") : t("auth.requestError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SignupLayout
      step={1}
      title={t("reg.phoneTitle")}
      subtitle={t("reg.phoneSubtitle")}
      footer={
        <>
          <Button
            label={t("reg.sendCode")}
            onPress={() => void submit()}
            loading={busy}
            disabled={!ready}
          />
          <Text secondary style={styles.legal}>
            {t("reg.legalNote")}
          </Text>
        </>
      }
    >
      <Text secondary style={styles.sectionLabel}>
        {t("reg.operator")}
      </Text>
      <View style={styles.operators}>
        {OPERATOR_CODES.map((code) => {
          const active = draft.operator === code;
          return (
            <Pressable
              key={code}
              onPress={() => chooseOperator(code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.operator,
                {
                  backgroundColor: active ? colors.primarySoft : colors.surface,
                  borderColor: active ? colors.primary : colors.line,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                secondary
                style={[styles.operatorPrefix, { color: active ? colors.primary : colors.muted2 }]}
              >
                375
              </Text>
              <Text style={[styles.operatorCode, { color: active ? colors.ink : colors.muted }]}>
                {code}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.fieldWrap}>
        <Field
          label={t("reg.phoneLabel")}
          hint={!error ? t("reg.phoneHint") : undefined}
          error={error}
          focused={focused}
        >
          <View style={styles.phoneRow}>
            <Text style={[styles.phonePrefix, { color: colors.ink }]}>+375 {draft.operator}</Text>
            <View style={[styles.phoneDivider, { backgroundColor: colors.line }]} />
            <TextInput
              value={formatSubscriber(digits)}
              onChangeText={changeDigits}
              placeholder={t("reg.phonePlaceholder")}
              placeholderTextColor={colors.muted2}
              keyboardType="number-pad"
              inputMode="tel"
              textContentType="telephoneNumber"
              style={[styles.phoneInput, { color: colors.ink }]}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              autoFocus
            />
          </View>
        </Field>
      </View>

      <View style={styles.preview}>
        <Text secondary style={[styles.previewLabel, { color: colors.muted }]}>
          {t("reg.phoneLabel")}
        </Text>
        <Text style={[styles.previewValue, { color: colors.ink }]}>
          {"+375 " + draft.operator + " " + (digits.length > 0 ? formatSubscriber(digits) : "• ••• •• ••")}
        </Text>
      </View>
    </SignupLayout>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.7,
      textTransform: "uppercase",
      color: palette.muted,
      marginBottom: spacing.sm,
    },
    operators: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
    operator: {
      flex: 1,
      borderRadius: radius.lg - 4,
      borderWidth: 1,
      paddingVertical: spacing.md,
      alignItems: "center",
      gap: 1,
    },
    operatorPrefix: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.4 },
    operatorCode: { fontSize: 20, fontWeight: "700", letterSpacing: 0.4 },
    fieldWrap: { marginBottom: spacing.md },
    phoneRow: { flexDirection: "row", alignItems: "center" },
    phonePrefix: { fontSize: 19, fontWeight: "700", paddingLeft: spacing.lg, letterSpacing: 0.3 },
    phoneDivider: { width: 1, alignSelf: "stretch", marginVertical: spacing.md, marginLeft: spacing.md },
    phoneInput: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      fontSize: 19,
      fontWeight: "700",
      letterSpacing: 0.6,
    },
    preview: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.line,
    },
    previewLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
    previewValue: { fontSize: 14, fontWeight: "700", letterSpacing: 0.4 },
    legal: {
      fontSize: 11,
      lineHeight: 15,
      textAlign: "center",
      color: palette.muted2,
      paddingHorizontal: spacing.md,
    },
  });
};
