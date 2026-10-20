import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { font, palette, spacing } from "@/theme/tokens";

export function Screen({
  children,
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  scroll = true,
  footer,
  contentStyle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const goBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const header = title || showBack ? (
    <View style={styles.header}>
      {showBack ? (
        <Pressable onPress={goBack} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={palette.ink} />
        </Pressable>
      ) : null}
      <View style={styles.headerText}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: (footer ? 132 : spacing.xxl) + insets.bottom },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.contentStatic}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: font.h3, fontWeight: "800", color: palette.ink },
  subtitle: { fontSize: font.tiny, color: palette.muted, lineHeight: 16 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  contentStatic: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    gap: spacing.sm,
  },
});
