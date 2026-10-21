import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

/**
 * Стеклянная карточка макетов профиля и копилки.
 *
 * Тёмная тема – полупрозрачное стекло с тонкой обводкой, светлая – белая
 * поверхность с обводкой colors.line: на светлом фоне стекло не читается.
 */
export function GlassCard({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Внутренние отступы карточки (по умолчанию 20, как p-5 в макете). */
  padded?: boolean;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        {
          backgroundColor: isDark ? colors.glass : colors.surface,
          borderColor: isDark ? colors.glassBorder : colors.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    borderWidth: 1,
  },
  padded: { padding: 20 },
});
