import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import {
  emptySignupDraft,
  loadSignupDraft,
  persistSignupDraft,
  phoneParts,
  routeForStep,
  type SignupDraft,
  type SignupStep,
} from "@/auth/signup/draft";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";

/**
 * Переход после кода из Telegram.
 *
 * Экран кода ведёт сюда, поэтому здесь же восстанавливаем регистрацию:
 * если пакет ещё не оформлен — открываем шаг, на котором человек остановился
 * (минимум шаг 3, потому что номер уже подтверждён). Ребёнок может войти
 * по коду доступа со шага данных родителя.
 */
export default function RoleScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { status, claims, phone } = useAuth();
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (status === "loading" || startedRef.current) {
      return;
    }
    startedRef.current = true;
    let alive = true;

    void (async () => {
      if (status === "signedIn" && claims?.familyId) {
        router.replace(claims.role === "child" ? "/child" : "/parent");
        return;
      }

      const stored = await loadSignupDraft();
      if (!alive) {
        return;
      }
      const base = stored ?? emptySignupDraft();
      const parts = phoneParts(phone);
      const withPhone: SignupDraft =
        base.phone.length === 0 && parts.subscriber.length === 7
          ? { ...base, ...parts, phone: "375" + parts.operator + parts.subscriber }
          : base;
      const step = (withPhone.step < 3 ? 3 : withPhone.step) as SignupStep;
      const next: SignupDraft = { ...withPhone, step, updatedAt: new Date().toISOString() };
      await persistSignupDraft(next);
      if (!alive) {
        return;
      }
      router.replace(routeForStep(step, next));
    })();

    return () => {
      alive = false;
    };
  }, [status, claims, phone, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const makeStyles = (_colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, alignItems: "center", justifyContent: "center" },
  });
