import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, TextInput, View } from "react-native";

import { font, radius } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

interface CodeInputProps {
  value: string;
  onChange(next: string): void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
  onComplete?(code: string): void;
}

/**
 * Ячейки кода с одним скрытым полем: работает автозаполнение из SMS,
 * вставка из буфера и посимвольный ввод. При ошибке — короткий сдвиг.
 */
export function CodeInput({ value, onChange, length = 6, autoFocus, error, onComplete }: CodeInputProps) {
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();
  const cells = Array.from({ length }, (_, index) => value[index] ?? "");

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shake]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length && onComplete) {
      onComplete(digits);
    }
  };

  return (
    <Pressable style={styles.wrapper} onPress={() => inputRef.current?.focus()}>
      <Animated.View
        style={[
          styles.row,
          { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }] },
        ]}
      >
        {cells.map((digit, index) => {
          const filled = digit.length > 0;
          const active = index === Math.min(value.length, length - 1) && !error;
          return (
            <View
              key={index}
              style={[
                styles.cell,
                { backgroundColor: colors.surface, borderColor: colors.line },
                filled && { borderColor: colors.primary },
                active && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                error && { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
              ]}
            >
              <Text style={[styles.cellText, { color: colors.ink }]}>{digit}</Text>
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 0 },
  row: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 60,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: { fontSize: font.h2, fontWeight: "700" },
  hidden: { position: "absolute", opacity: 0, height: 1, width: 1 },
});
