import React, { forwardRef } from "react";
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextStyle,
} from "react-native";

import { familyForWeight } from "@/theme/fonts";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * TextInput с тем же шрифтом, что и Text, и с темным placeholder по умолчанию.
 * Явный fontFamily/placeholderTextColor в style всегда важнее.
 */
export const TextInput = forwardRef<
  React.ComponentRef<typeof RNTextInput>,
  TextInputProps
>(function AppTextInput({ style, placeholderTextColor, ...rest }, ref) {
  const { colors } = useTheme();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const family = flat?.fontFamily ?? familyForWeight(flat?.fontWeight);

  return (
    <RNTextInput
      ref={ref}
      {...rest}
      placeholderTextColor={placeholderTextColor ?? colors.muted2}
      style={[style, { fontFamily: family }]}
    />
  );
});

TextInput.displayName = "TextInput";
