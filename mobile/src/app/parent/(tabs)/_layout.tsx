import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { useI18n } from "@/i18n";
import { palette } from "@/theme/tokens";

export default function ParentTabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted2,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.line,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("ov.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="rights"
        options={{
          title: t("rg.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="options-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="limits"
        options={{
          title: t("lm.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t("pg.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="ribbon-outline" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
