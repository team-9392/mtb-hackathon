import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { isValidName, useSignupDraft } from "@/auth/signup/draft";
import { ChoiceCard, Notice, SignupLayout, TextField } from "@/auth/signup/ui";
import { useI18n } from "@/i18n";
import type { AgeBracket } from "@/store/types";
import type { Palette } from "@/theme/palette";
import { spacing } from "@/theme/tokens";
import { useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";

/**
 * Шаг 4: ребёнок.
 * Без имени и возрастной группы пакет не оформляется: сервер создаёт
 * ребёнка тем же запросом, что и семью.
 */
export default function ChildScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const router = useRouter();
  const { draft, patch } = useSignupDraft();
  const [error, setError] = useState<string | null>(null);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/auth/parent-data");
    }
  };

  const chooseBracket = (bracket: AgeBracket) => {
    patch({ bracket });
  };

  const submit = () => {
    if (!isValidName(draft.childName)) {
      setError(t("reg.childNameError"));
      return;
    }
    setError(null);
    patch({ step: 5 });
    router.push("/auth/consents");
  };

  return (
    <SignupLayout
      step={4}
      title={t("reg.childTitle")}
      subtitle={t("reg.childSubtitle")}
      onBack={goBack}
      footer={<Button label={t("common.continue")} onPress={submit} />}
    >
      <TextField
        label={t("reg.childName")}
        value={draft.childName}
        onChangeText={(text) => {
          patch({ childName: text });
          setError(null);
        }}
        placeholder={t("reg.childNamePlaceholder")}
        hint={!error ? t("reg.childNameHint") : undefined}
        error={error}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={submit}
        onBlur={() => {
          if (draft.childName.length > 0 && !isValidName(draft.childName)) {
            setError(t("reg.childNameError"));
          }
        }}
      />

      <View style={styles.bracketBlock}>
        <Text secondary style={styles.sectionLabel}>
          {t("reg.bracket")}
        </Text>
        <View style={styles.bracketList}>
          <ChoiceCard
            icon="happy-outline"
            title={t("reg.bracket713")}
            hint={t("reg.bracket713Hint")}
            selected={draft.bracket === "child_7_13"}
            onPress={() => chooseBracket("child_7_13")}
          />
          <ChoiceCard
            icon="rocket-outline"
            title={t("reg.bracket1417")}
            hint={t("reg.bracket1417Hint")}
            selected={draft.bracket === "teen_14_17"}
            onPress={() => chooseBracket("teen_14_17")}
          />
        </View>
      </View>

      <Notice icon="people-outline" text={t("reg.childRequired")} />
    </SignupLayout>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
    bracketBlock: { marginTop: spacing.xl },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.7,
      textTransform: "uppercase",
      color: palette.muted,
      marginBottom: spacing.sm,
    },
    bracketList: { gap: spacing.md },
  });
};