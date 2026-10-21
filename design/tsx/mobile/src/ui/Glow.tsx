import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/** Мягкое свечение фона: красное слева, синее справа — как в макете. */
export function HeroGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glowRed" cx="0%" cy="0%" r="75%">
            <Stop offset="0" stopColor="#8c283c" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#8c283c" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowBlue" cx="100%" cy="0%" r="80%">
            <Stop offset="0" stopColor="#2850a0" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#2850a0" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowCyan" cx="50%" cy="50%" r="60%">
            <Stop offset="0" stopColor="#93c5fd" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#93c5fd" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowRed)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowBlue)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowCyan)" opacity="0.12" />
      </Svg>
    </View>
  );
}
