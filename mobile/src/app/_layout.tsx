import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { registerPush } from "@/api/push";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { I18nProvider } from "@/i18n";
import { StoreProvider, useStore } from "@/store/StoreProvider";
import { fontSources } from "@/theme/fonts";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { Toast } from "@/ui/primitives";
import { Splash } from "@/ui/Splash";

// Держим нативный сплэш, пока грузятся шрифты: иначе первые кадры мигают системным шрифтом.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function ToastHost() {
  const { toast } = useStore();
  if (!toast) {
    return null;
  }
  return <Toast message={toast} />;
}

/** Регистрируем устройство для push, как только человек вошёл. */
function PushRegistrar() {
  const { status } = useAuth();
  useEffect(() => {
    if (status === "signedIn") {
      void registerPush();
    }
  }, [status]);
  return null;
}

function AppShell() {
  const { colors, isDark } = useTheme();
  // ?preview=1 — веб-превью без анимации сплэша (скриншоты, проверка дизайна).
  const [showSplash, setShowSplash] = useState(
    () => !(Platform.OS === "web" && typeof window !== "undefined" && window.location.search.includes("preview=1")),
  );

  return (
    <>
      <PushRegistrar />
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      <ToastHost />
      {showSplash ? <Splash onDone={() => setShowSplash(false)} /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontSources);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <StoreProvider>
              <AppShell />
            </StoreProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
