import React from "react";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

/** Мягкое размытое пятно (радиальный градиент) — замена CSS-blur. */
export function BlurSpot({ size, color, intensity = 1 }: { size: number; color: string; intensity?: number }) {
  const id = "blur" + color.replace(/[^a-zA-Z0-9]/g, "") + Math.round(size);
  const c = size / 2;
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.6 * intensity} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.3 * intensity} />
          <Stop offset="0.75" stopColor={color} stopOpacity={0.12 * intensity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill={"url(#" + id + ")"} />
    </Svg>
  );
}
