import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

import { gradients, radius, shadow } from "@/theme/tokens";

export function HeroCard({
  children,
  gradient = "parent",
  style,
}: {
  children: React.ReactNode;
  gradient?: keyof typeof gradients;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={gradients[gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: 22,
    ...shadow.floating,
  },
});
