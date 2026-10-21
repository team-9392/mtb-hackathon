import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
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
  // ?preview=1 – веб-превью без анимации сплэша (скриншоты, проверка дизайна).
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
          gestureEnabled: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      <ToastHost />
      {showSplash ? <Splash onDone={() => setShowSplash(false)} /> : null}
    </>
  );
}

// react-native-svg на вебе пишет предупреждение про transform-origin – на натив не влияет.
LogBox.ignoreLogs(["Invalid DOM property", "transform-origin", "transformOrigin"]);

// react-native-svg на вебе шлёт невалидный DOM-атрибут transform-origin – глушим шум.
if (Platform.OS === "web") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && (first.includes("transform-origin") || first.includes("Invalid DOM property"))) {
      return;
    }
    originalError(...args);
  };
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
