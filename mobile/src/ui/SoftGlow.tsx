import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

/**
 * Мягкое радиальное свечение в углу карточки – замена CSS-blur из макета.
 * Радиальный градиент даёт тот же рассеянный блик без filter: blur.
 */
export function SoftGlow({
  id,
  size = 170,
  color,
  opacity = 0.35,
  style,
}: {
  /** Уникальный id градиента: SVG ссылается на него через url(#id). */
  id: string;
  size?: number;
  color: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[styles.wrap, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.6" stopColor={color} stopOpacity={opacity * 0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={"url(#" + id + ")"} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute" },
});
