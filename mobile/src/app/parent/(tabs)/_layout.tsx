import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { useI18n } from "@/i18n";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/ThemeProvider";

/** Вкладки родителя: Обзор, Продукты, Задания, Права (лимиты — внутри прав). */
export default function ParentTabsLayout() {
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
          ...(Platform.OS === "web" ? { height: 70, paddingBottom: 8 } : null),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", fontFamily: fonts.secondaryMedium, lineHeight: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("ov.overview"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t("ov.tabProducts"),
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="bonuses"
        options={{
          title: t("ov.tasksTab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="checkbox-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="rights"
        options={{
          title: t("rg.tab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="options-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen name="limits" options={{ title: t("lm.tab"), href: null }} />
    </Tabs>
  );
}
