import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { font, radius, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Тихий каркас экранов входа: много воздуха, одна кнопка, ничего лишнего. */
export function AuthLayout({ title, subtitle, showBack, footer, children }: AuthLayoutProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {showBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/auth/phone"))}
            hitSlop={12}
            style={[
              styles.back,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
            {subtitle ? (
              <Text secondary style={[styles.subtitle, { color: colors.muted }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  back: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  head: { marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.sm },
  title: { fontSize: 32, fontWeight: "700", letterSpacing: -0.8 },
  subtitle: { fontSize: font.body, lineHeight: 22 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
});
