import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/auth/AuthProvider";
import { I18nProvider } from "@/i18n";
import { StoreProvider, useStore } from "@/store/StoreProvider";
import { palette } from "@/theme/tokens";
import { Toast } from "@/ui/primitives";

function ToastHost() {
  const { toast } = useStore();
  if (!toast) {
    return null;
  }
  return <Toast message={toast} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StoreProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.bg },
            }}
          />
          <ToastHost />
          </StoreProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
