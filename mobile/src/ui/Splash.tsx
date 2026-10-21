import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

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
/** Синусоидальная волна, залитая градиентом. */
function wavePath(width: number, amp: number, height: number): string {
  const mid = height / 2;
  const step = width / 6;
  let d = "M 0 " + mid;
  for (let i = 0; i < 6; i += 1) {
    const x0 = i * step;
    const up = i % 2 === 0 ? -amp : amp;
    d += " C " + (x0 + step * 0.25) + " " + (mid + up) + ", " + (x0 + step * 0.75) + " " + (mid + up) + ", " + (x0 + step) + " " + mid;
  }
  d += " L " + width + " " + height + " L 0 " + height + " Z";
  return d;
}

export function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const bandWidth = Math.round(width * 1.7);
  const bandHeight = 110;
  const paths = useMemo(() => Array.from({ length: BANDS }, (_, i) => wavePath(bandWidth, 22 + i * 7, bandHeight)), [bandWidth]);
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
                { top: height * (0.05 + index * 0.24), opacity, transform: [{ rotate: "-9deg" }, { translateX }] },
              ]}
            >
              <Svg width={bandWidth} height={bandHeight}>
                <Defs>
                  <SvgLinearGradient id={"wave" + index} x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#93c5fd" stopOpacity="0" />
                    <Stop offset="0.22" stopColor="#93c5fd" stopOpacity="0.42" />
                    <Stop offset="0.55" stopColor="#60a5fa" stopOpacity="0.3" />
                    <Stop offset="0.72" stopColor="#ffffff" stopOpacity="0.34" />
                    <Stop offset="1" stopColor="#93c5fd" stopOpacity="0" />
                  </SvgLinearGradient>
                </Defs>
                <Path d={paths[index]} fill={"url(#wave" + index + ")"} />
              </Svg>
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
      <Animated.View style={[styles.glow, { opacity: glow }]} pointerEvents="none">
        <Svg width={340} height={340}>
          <Defs>
            <RadialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#60a5fa" stopOpacity="0.6" />
              <Stop offset="0.45" stopColor="#3b82f6" stopOpacity="0.3" />
              <Stop offset="0.75" stopColor="#1d4ed8" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#1d4ed8" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="170" cy="170" r="170" fill="url(#logoGlow)" />
        </Svg>
      </Animated.View>

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
  band: { position: "absolute", left: 0 },
  bandFill: { flex: 1 },
  grain: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85 },
  glow: { position: "absolute", width: 340, height: 340, alignItems: "center", justifyContent: "center" },
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
