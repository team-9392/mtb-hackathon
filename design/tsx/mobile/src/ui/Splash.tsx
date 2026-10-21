import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { font, radius, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

/**
 * Экран открытия приложения.
 *
 * Пока это заглушка: градиентный знак, название и подпись.
 * Когда будет готов ролик или анимация — заменить содержимое на <Video /> из expo-video
 * и вызывать onDone() в onPlaybackEnd. Всё остальное вокруг уже работает.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.delay(750),
    ]).start(() => onDone());
  }, [cardOpacity, cardScale, textOpacity, onDone]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Animated.View
        style={[
          styles.mark,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
          },
        ]}
      >
        <Image source={require("../../assets/brand/logo.png")} style={styles.markInner} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={[styles.texts, { opacity: textOpacity }]}>
        <Text style={[styles.title, { color: colors.ink }]}>Moby Family</Text>
        <Text secondary style={[styles.tagline, { color: colors.muted }]}>
          {t("splash.tagline")}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  mark: {
    width: 104,
    height: 104,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 6,
  },
  markInner: { flex: 1, width: "100%", borderRadius: radius.lg },
  texts: { alignItems: "center", gap: 6 },
  title: { fontSize: font.h2, fontWeight: "700", letterSpacing: -0.4 },
  tagline: { fontSize: font.small },
});
