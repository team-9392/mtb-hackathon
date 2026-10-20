import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { font, palette, radius, spacing } from "@/theme/tokens";

const THUMB = 56;
const PADDING = 5;

/**
 * Подтверждение движением: проведите пальцем слева направо.
 * Жест ловит вся полоса (а не только кружок), внутри скролла не отдаёт его родителю —
 * иначе скролл перехватывает движение и слайдер «не работает».
 */
export function SlideToConfirm({
  label,
  onConfirm,
  disabled = false,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [done, setDone] = useState(false);
  const translate = useRef(new Animated.Value(0)).current;
  const maxRef = useRef(1);
  const confirmed = useRef(onConfirm);
  confirmed.current = onConfirm;

  const reset = useRef(() => {
    Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  }).current;

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Забираем жест сразу: иначе ScrollView вокруг съедает движение.
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gesture) => {
          const max = maxRef.current;
          translate.setValue(Math.min(max, Math.max(0, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          const max = maxRef.current;
          if (max > 40 && gesture.dx >= max * 0.75) {
            Animated.timing(translate, { toValue: max, duration: 110, useNativeDriver: true }).start(() => {
              setDone(true);
              confirmed.current();
              setTimeout(() => {
                setDone(false);
                reset();
              }, 900);
            });
            return;
          }
          reset();
        },
        onPanResponderTerminate: () => reset(),
      }),
    [disabled, reset, translate],
  );

  const travel = Math.max(1, width - THUMB - PADDING * 2);

  return (
    <View
      style={[styles.track, disabled && styles.trackDisabled]}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        maxRef.current = Math.max(1, next - THUMB - PADDING * 2);
        setWidth(next);
      }}
      {...responder.panHandlers}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: translate.interpolate({
              inputRange: [0, travel],
              outputRange: [THUMB + PADDING * 2, width],
              extrapolate: "clamp",
            }),
          },
        ]}
      />
      <Text style={styles.label} numberOfLines={1} pointerEvents="none">
        {done ? "Готово" : label}
      </Text>
      <Animated.View style={[styles.thumb, { transform: [{ translateX: translate }] }]} pointerEvents="none">
        <Ionicons name={done ? "checkmark" : "arrow-forward"} size={24} color={palette.primary as string} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: THUMB + PADDING * 2,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceAlt,
    justifyContent: "center",
    overflow: "hidden",
    padding: PADDING,
  },
  trackDisabled: { opacity: 0.5 },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: palette.primarySoft },
  label: {
    textAlign: "center",
    color: palette.ink2,
    fontSize: font.body,
    fontWeight: "700",
    paddingHorizontal: THUMB + spacing.md,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
