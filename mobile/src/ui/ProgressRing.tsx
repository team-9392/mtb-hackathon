import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Stop } from "react-native-svg";

export type RingGradient = readonly [string, string, ...string[]];

/**
 * Круговой прогресс копилки из макета: серое кольцо-подложка и градиентная
 * дуга со скруглёнными концами. Внутрь кладём иконку и процент.
 *
 * viewBox фиксированный (80×80), поэтому размер меняется целиком, а толщина
 * линии остаётся пропорциональной – как в прототипе.
 */
export function ProgressRing({
  value,
  size = 78,
  gradient,
  id,
  trackColor,
  children,
}: {
  value: number;
  size?: number;
  gradient: RingGradient;
  /** Уникальный id градиента: SVG ссылается на него через url(#id). */
  id: string;
  trackColor: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, value));
  const circumference = 2 * Math.PI * 33;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 80 80">
        <Circle cx={40} cy={40} r={33} stroke={trackColor} strokeWidth={6.5} fill="none" />
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            {gradient.map((color, index) => (
              <Stop
                key={color + index}
                offset={gradient.length > 1 ? (index / (gradient.length - 1)) * 100 + "%" : "0%"}
                stopColor={color}
              />
            ))}
          </LinearGradient>
        </Defs>
        {pct > 0 ? (
          <G rotation={-90} origin="40, 40">
            <Circle
              cx={40}
              cy={40}
              r={33}
              stroke={"url(#" + id + ")"}
              strokeWidth={6.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={[circumference, circumference]}
              strokeDashoffset={circumference * (1 - pct)}
            />
          </G>
        ) : null}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}
