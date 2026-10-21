import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  isValidIdNumber,
  isValidName,
  normalizeIdNumber,
  useSignupDraft,
} from "@/auth/signup/draft";
import { SignupLayout, TextField } from "@/auth/signup/ui";
import { useI18n } from "@/i18n";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";

type Errors = { first?: string; last?: string; id?: string };

/**
 * Шаг 3: данные родителя.
 * Имя и фамилия – как в договоре, идентификационный номер проверяется
 * строго по формату из 14 символов. Пока формат неверный, дальше не пускаем.
 */
export default function ParentDataScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const router = useRouter();
  const { draft, patch } = useSignupDraft();
  const [errors, setErrors] = useState<Errors>({});

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/auth/phone");
    }
  };

  const validateId = (value: string): string | undefined => {
    if (value.length === 0) {
      return t("reg.idNumberEmpty");
    }
    return isValidIdNumber(value) ? undefined : t("reg.idNumberError");
  };

  const submit = () => {
    const next: Errors = {};
    if (!isValidName(draft.firstName)) {
      next.first = t("reg.firstNameError");
    }
    if (!isValidName(draft.lastName)) {
      next.last = t("reg.lastNameError");
    }
    const idError = validateId(draft.idNumber);
    if (idError) {
      next.id = idError;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }
    patch({ step: 4 });
    router.push("/auth/child");
  };

  return (
    <SignupLayout
      step={3}
      title={t("reg.parentTitle")}
      subtitle={t("reg.parentSubtitle")}
      onBack={goBack}
      footer={
        <>
          <Button label={t("common.continue")} onPress={submit} />
          <Pressable
            onPress={() => router.replace("/auth/join")}
            accessibilityRole="button"
            style={styles.childLink}
          >
            <Ionicons name="key-outline" size={16} color={colors.primary} />
            <Text secondary style={[styles.childLinkText, { color: colors.primary }]}>
              {t("reg.childLink")}
            </Text>
          </Pressable>
        </>
      }
    >
      <View style={styles.fields}>
        <TextField
          label={t("reg.firstName")}
          value={draft.firstName}
          onChangeText={(text) => {
            patch({ firstName: text });
            setErrors((prev) => ({ ...prev, first: undefined }));
          }}
          placeholder={t("reg.firstNamePlaceholder")}
          hint={!errors.first ? t("reg.firstNameHint") : undefined}
          error={errors.first}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onBlur={() => {
            if (draft.firstName.length > 0 && !isValidName(draft.firstName)) {
              setErrors((prev) => ({ ...prev, first: t("reg.firstNameError") }));
            }
          }}
        />

        <TextField
          label={t("reg.lastName")}
          value={draft.lastName}
          onChangeText={(text) => {
            patch({ lastName: text });
            setErrors((prev) => ({ ...prev, last: undefined }));
          }}
          placeholder={t("reg.lastNamePlaceholder")}
          hint={!errors.last ? t("reg.lastNameHint") : undefined}
          error={errors.last}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onBlur={() => {
            if (draft.lastName.length > 0 && !isValidName(draft.lastName)) {
              setErrors((prev) => ({ ...prev, last: t("reg.lastNameError") }));
            }
          }}
        />

        <TextField
          label={t("reg.idNumber")}
          value={draft.idNumber}
          onChangeText={(text) => {
            patch({ idNumber: normalizeIdNumber(text) });
            setErrors((prev) => ({ ...prev, id: undefined }));
          }}
          placeholder={t("reg.idNumberPlaceholder")}
          hint={t("reg.idNumberHint") + " · " + t("reg.idNumberExample")}
          error={errors.id}
          right={
            <Text secondary style={[styles.counter, { color: colors.muted2 }]}>
              {draft.idNumber.length}/14
            </Text>
          }
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={14}
          inputMode="text"
          returnKeyType="done"
          inputStyle={styles.idInput}
          onBlur={() => {
            if (draft.idNumber.length > 0) {
              setErrors((prev) => ({ ...prev, id: validateId(draft.idNumber) }));
            }
          }}
          onSubmitEditing={submit}
        />
      </View>

      <View style={[styles.note, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        <Text secondary style={[styles.noteText, { color: colors.ink2 }]}>
          {t("reg.idNumberNote")}
        </Text>
      </View>
    </SignupLayout>
  );
}

const makeStyles = (_colors: Palette) => {
  return StyleSheet.create({
    fields: { gap: spacing.lg },
    idInput: { letterSpacing: 1.6, fontWeight: "700" },
    counter: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginTop: spacing.xl,
    },
    noteText: { flex: 1, fontSize: 12, lineHeight: 17 },
    childLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: spacing.sm,
    },
    childLinkText: { fontSize: 12.5, fontWeight: "600" },
  });
};