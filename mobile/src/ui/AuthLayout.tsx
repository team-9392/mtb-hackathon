import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { font, palette, spacing } from "@/theme/tokens";

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

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {showBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/auth/phone"))}
            hitSlop={12}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={palette.ink} />
          </Pressable>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  head: { marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.sm },
  title: { fontSize: 32, fontWeight: "700", color: palette.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: font.body, color: palette.muted, lineHeight: 22 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
});
