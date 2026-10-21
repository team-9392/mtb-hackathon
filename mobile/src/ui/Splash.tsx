import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useI18n } from "@/i18n";
import { font, radius, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const WAVE_DURATION = 1500;
const BANDS = 4;

/**
 * Заставка: по экрану волнами проходят голубые полосы «под стеклом» с зерном,
 * затем появляется логотип, название и подпись.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const waves = useRef(Array.from({ length: BANDS }, () => new Animated.Value(0))).current;
  const glow = useRef(new Animated.Value(0)).current;

  const grain = useMemo(
    () =>
      Array.from({ length: 240 }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.6 + 0.6,
        opacity: Math.random() * 0.16 + 0.05,
      })),
    [],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(glow, { toValue: 1, duration: 500, useNativeDriver: true }),
      ...waves.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: WAVE_DURATION,
          delay: index * 110,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ]).start();

    Animated.sequence([
      Animated.delay(820),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 640, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.delay(900),
    ]).start(() => onDone());
  }, [glow, logoOpacity, logoScale, textOpacity, waves, onDone]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Голубые полосы-волны */}
      <View style={styles.waves} pointerEvents="none">
        {waves.map((value, index) => {
          const translateX = value.interpolate({
            inputRange: [0, 1],
            outputRange: [-width * 1.2 + index * 30, width * 1.2],
          });
          const opacity = value.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.9, 0.9, 0] });
          return (
            <Animated.View
              key={index}
              style={[
                styles.band,
                { top: height * (0.05 + index * 0.24), opacity, transform: [{ rotate: "-16deg" }, { translateX }] },
              ]}
            >
              <LinearGradient
                colors={["transparent", "rgba(147,197,253,0.30)", "rgba(96,165,250,0.18)", "rgba(255,255,255,0.22)", "transparent"]}
                locations={[0, 0.25, 0.55, 0.72, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bandFill}
              />
            </Animated.View>
          );
        })}
      </View>

      {/* Зерно под стеклом */}
      <View style={styles.grain} pointerEvents="none">
        {grain.map((dot, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              top: dot.top + "%",
              left: dot.left + "%",
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size,
              backgroundColor: "#ffffff",
              opacity: dot.opacity,
            }}
          />
        ))}
      </View>

      {/* Мягкое свечение под логотипом */}
      <Animated.View style={[styles.glow, { opacity: glow, backgroundColor: "rgba(96,165,250,0.18)" }]} pointerEvents="none" />

      <Animated.View
        style={[
          styles.mark,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
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
    overflow: "hidden",
  },
  waves: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  band: { position: "absolute", left: 0, width: "160%", height: 86, borderRadius: 60, overflow: "hidden" },
  bandFill: { flex: 1 },
  grain: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85 },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 130 },
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
