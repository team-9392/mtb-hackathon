import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import {
  clearSignupDraft,
  loadSignupDraft,
  routeForStep,
  type SignupStep,
} from "@/auth/signup/draft";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";


/**
 * Вход в приложение.
 *
 * Без сессии – телефон. Если остался незавершённый черновик регистрации,
 * открываем тот шаг, на котором человек остановился. После оформления пакета
 * черновик удаляем и ведём в приложение по роли.
 */
export default function EntryScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { status, claims } = useAuth();
  const [resume, setResume] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    let alive = true;
    void (async () => {
      const draft = await loadSignupDraft();
      if (!alive) {
        return;
      }
      if (status === "signedIn" && claims?.familyId) {
        if (draft) {
          await clearSignupDraft();
        }
        setChecked(true);
        return;
      }
      if (draft) {
        // После подтверждения кода шаг 2 уже пройден: минимум – данные родителя.
        const step = (status === "signedIn" ? Math.max(3, draft.step) : draft.step) as SignupStep;
        setResume(routeForStep(step, draft));
      }
      setChecked(true);
    })();
    return () => {
      alive = false;
    };
  }, [status, claims?.familyId]);

  if (status === "loading" || !checked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (status === "signedOut") {
    return <Redirect href={resume ?? "/auth/phone"} />;
  }

  if (!claims?.familyId) {
    return <Redirect href={resume ?? "/auth/role"} />;
  }

  return <Redirect href={claims.role === "child" ? "/child" : "/parent"} />;
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg },
  });
};
