import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { font, palette, radius, spacing } from "@/theme/tokens";

const THUMB = 52;
const PADDING = 6;
const TRACK_HEIGHT = THUMB + PADDING * 2;

/**
 * Подтверждение движением: круглый ползунок идёт по скруглённой дорожке.
 * Под дорожкой — подпись, пока не провели; после подтверждения появляется галочка.
 * Жест ловит вся полоса (не только кружок), иначе ScrollView вокруг съедает движение.
 */
export function SlideToConfirm({
  label,
  onConfirm,
  disabled = false,
  doneLabel,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  doneLabel?: string;
}) {
  const [width, setWidth] = useState(0);
  const [done, setDone] = useState(false);
  const translate = useRef(new Animated.Value(0)).current;
  const maxRef = useRef(1);
  const widthRef = useRef(0);
  const confirmed = useRef(onConfirm);
  confirmed.current = onConfirm;
  const locked = useRef(false);

  const reset = useRef(() => {
    Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
  }).current;

  const finish = useRef(() => {
    if (locked.current) {
      return;
    }
    locked.current = true;
    Animated.timing(translate, { toValue: maxRef.current, duration: 120, useNativeDriver: true }).start(() => {
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      confirmed.current();
      setTimeout(() => {
        locked.current = false;
        setDone(false);
        reset();
      }, 1400);
    });
  }).current;

  const responder = useMemo(
    () =>
      PanResponder.create({
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
            finish();
            return;
          }
          reset();
        },
        onPanResponderTerminate: () => reset(),
      }),
    [disabled, finish, reset, translate],
  );

  const travel = Math.max(1, width - THUMB - PADDING * 2);

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.track, disabled && styles.trackDisabled]}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width;
          widthRef.current = next;
          maxRef.current = Math.max(1, next - THUMB - PADDING * 2);
          setWidth(next);
        }}
        {...responder.panHandlers}
      >
        {width > 0 ? (
          <Animated.View
            style={[
              styles.fill,
              done && styles.fillDone,
              {
                width: translate.interpolate({
                  inputRange: [0, travel],
                  outputRange: [THUMB + PADDING * 2, width],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        ) : null}
        <Text style={styles.trackLabel} numberOfLines={1} pointerEvents="none">
          {done ? "" : label}
        </Text>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: translate }] }]} pointerEvents="none">
          <Ionicons
            name={done ? "checkmark" : "chevron-forward"}
            size={done ? 26 : 24}
            color={done ? palette.white : palette.primary}
          />
        </Animated.View>
      </View>

      {done ? (
        <View style={styles.doneRow}>
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={14} color={palette.white} />
          </View>
          <Text style={styles.doneText}>{doneLabel ?? label}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.line,
    justifyContent: "center",
    overflow: "hidden",
    padding: PADDING,
  },
  trackDisabled: { opacity: 0.5 },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
  },
  fillDone: { backgroundColor: palette.mint },
  trackLabel: {
    textAlign: "center",
    color: palette.ink2,
    fontSize: font.small,
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
    shadowColor: "#0B1220",
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  hint: {
    textAlign: "center",
    fontSize: font.small,
    color: palette.muted,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
  },
  doneRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  doneBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: palette.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { fontSize: font.small, color: palette.mint, fontWeight: "800" },
});
