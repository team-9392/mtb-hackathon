import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { useI18n } from "@/i18n";
import { palette } from "@/theme/tokens";

export default function ChildTabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.child,
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
        name="quests"
        options={{
          title: t("qs.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller-outline" size={size} color={color as string} />,
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
