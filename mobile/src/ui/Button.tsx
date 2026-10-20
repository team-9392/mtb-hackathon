import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

import { font, palette, radius, shadow, spacing } from "@/theme/tokens";
import type { IconName } from "./primitives";

export type ButtonVariant = "primary" | "child" | "secondary" | "ghost" | "danger";

const backgrounds: Record<ButtonVariant, string> = {
  primary: palette.primary,
  child: palette.child,
  secondary: palette.primarySoft,
  ghost: "transparent",
  danger: palette.dangerSoft,
};

const foregrounds: Record<ButtonVariant, string> = {
  primary: palette.white,
  child: palette.white,
  secondary: palette.primary,
  ghost: palette.primary,
  danger: palette.danger,
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  style,
  compact = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const fg = foregrounds[variant];
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: backgrounds[variant],
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: palette.line,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        },
        variant !== "ghost" && shadow.card,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.label, { color: fg }, compact && styles.labelCompact]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  buttonCompact: { height: 40, borderRadius: radius.sm, paddingHorizontal: spacing.md },
  label: { fontSize: font.body, fontWeight: "700" },
  labelCompact: { fontSize: font.small },
});
