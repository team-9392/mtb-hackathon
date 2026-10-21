import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { useI18n } from "@/i18n";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/ThemeProvider";

export default function ChildTabsLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted2,
        tabBarStyle: {
          backgroundColor: colors.nav,
          borderTopColor: colors.line,
          paddingTop: 6,
          // react-native-web сжимает подпись в стандартных 49px, на телефоне хватает дефолта.
          ...(Platform.OS === "web" ? { height: 70, paddingBottom: 8 } : null),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", fontFamily: fonts.secondaryMedium, lineHeight: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("ch.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="goal"
        options={{
          title: t("gl.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="save-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: t("acc.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: t("qs.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("ct.profile"),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
