import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { registerPush } from "@/api/push";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { I18nProvider } from "@/i18n";
import { StoreProvider, useStore } from "@/store/StoreProvider";
import { palette } from "@/theme/tokens";
import { Toast } from "@/ui/primitives";
import { Splash } from "@/ui/Splash";

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

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StoreProvider>
          <PushRegistrar />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.bg },
            }}
          />
          <ToastHost />
          {showSplash ? <Splash onDone={() => setShowSplash(false)} /> : null}
          </StoreProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
