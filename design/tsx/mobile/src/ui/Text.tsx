import React, { forwardRef } from "react";
import {
  StyleSheet,
  Text as RNText,
  type TextProps,
  type TextStyle,
} from "react-native";

import { familyForWeight } from "@/theme/fonts";

export type AppTextProps = TextProps & {
  /** Второстепенная подпись: переключает шрифт на Inter. */
  secondary?: boolean;
};

/**
 * Глобальный Text приложения.
 *
 * По умолчанию — TikTok Sans; вес подбирается по fontWeight (в RN каждый вес
 * это отдельный файл). Inter включается пропом secondary или явным fontFamily.
 * Существующие экраны просто импортируют Text отсюда — размеры не меняются.
 */
export const Text = forwardRef<React.ComponentRef<typeof RNText>, AppTextProps>(function AppText(
  { style, secondary = false, ...rest },
  ref,
) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const family = flat?.fontFamily ?? familyForWeight(flat?.fontWeight, secondary);

  return <RNText ref={ref} {...rest} style={[style, { fontFamily: family }]} />;
});

Text.displayName = "Text";
