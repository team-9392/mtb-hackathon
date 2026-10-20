import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { font, palette, radius } from "@/theme/tokens";

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
                filled && styles.cellFilled,
                active && styles.cellActive,
                error && styles.cellError,
              ]}
            >
              <Text style={styles.cellText}>{digit}</Text>
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
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.line,
    alignItems: "center",
    justifyContent: "center",
  },
  cellFilled: { borderColor: palette.primary, backgroundColor: palette.surface },
  cellActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  cellError: { borderColor: palette.danger, backgroundColor: palette.dangerSoft },
  cellText: { fontSize: font.h2, fontWeight: "700", color: palette.ink },
  hidden: { position: "absolute", opacity: 0, height: 1, width: 1 },
});
