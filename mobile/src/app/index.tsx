import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { palette } from "@/theme/tokens";

/** Вход в приложение: без экранов «кто сегодня зашёл» — сначала телефон, роль выбирается при регистрации. */
export default function EntryScreen() {
  const { status, claims } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (status === "signedOut") {
    return <Redirect href="/auth/phone" />;
  }

  if (!claims?.familyId) {
    return <Redirect href="/auth/role" />;
  }

  return <Redirect href={claims.role === "child" ? "/child" : "/parent"} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg },
});
