import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";

import { radius, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

/** Высота дорожки по макету: 52 + 6 + 6 = 64. */
const TRACK_HEIGHT = 64;
const THUMB = 52;
const PADDING = 6;

/**
 * Подтверждение движением.
 *
 * Подпись лежит НА дорожке по центру, ручка едет поверх неё и перекрывает.
 * Ручка ходит строго внутри pill-дорожки: от PADDING до width - THUMB - PADDING.
 * Ширина берётся из onLayout самой дорожки, а не экрана, поэтому компонент
 * одинаково работает в шторках, ScrollView, модалках и карточках.
 * После подтверждения — зелёная заливка всей дорожки и галочка на ручке.
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
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [done, setDone] = useState(false);
  const translate = useRef(new Animated.Value(0)).current;
  const posRef = useRef(0);
  const travelRef = useRef(1);
  const doneRef = useRef(false);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmedRef = useRef(onConfirm);
  confirmedRef.current = onConfirm;

  const clamp = (value: number) =>
    Math.max(0, Math.min(travelRef.current, value));

  const reset = () => {
    posRef.current = 0;
    Animated.spring(translate, {
      toValue: 0,
      bounciness: 0,
      speed: 18,
      useNativeDriver: true,
    }).start();
  };

  const finish = () => {
    if (lockedRef.current) {
      return;
    }
    lockedRef.current = true;
    Animated.timing(translate, {
      toValue: travelRef.current,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      posRef.current = travelRef.current;
      doneRef.current = true;
      setDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      confirmedRef.current();

      timerRef.current = setTimeout(() => {
        lockedRef.current = false;
        doneRef.current = false;
        setDone(false);
        reset();
      }, 1300);
    });
  };

  // Колбэки для PanResponder: он создаётся один раз и читает актуальные через ref.
  const actionsRef = useRef({ finish, reset });
  actionsRef.current = { finish, reset };

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled &&
          !lockedRef.current &&
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => undefined,
          );
        },
        onPanResponderMove: (_, gesture) => {
          const next = clamp(gesture.dx);
          posRef.current = next;
          translate.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const travel = travelRef.current;
          if (travel > 40 && gesture.dx >= travel * 0.75) {
            actionsRef.current.finish();
            return;
          }
          actionsRef.current.reset();
        },
        onPanResponderTerminate: () => actionsRef.current.reset(),
      }),
    [disabled, translate],
  );

  const travel = Math.max(1, width - THUMB - PADDING * 2);

  // Заливка тянется следом за ручкой. Ширину анимировать нельзя нативным драйвером,
  // поэтому растягиваем её через scaleX.
  const fillScale = translate.interpolate({
    inputRange: [0, travel],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: done ? colors.mint : colors.line,
        },
        disabled && styles.trackDisabled,
      ]}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (next <= 0) {
          return;
        }
        setWidth(next);
        const maxTravel = Math.max(1, next - THUMB - PADDING * 2);
        travelRef.current = maxTravel;
        if (doneRef.current || posRef.current > maxTravel) {
          posRef.current = maxTravel;
          translate.setValue(maxTravel);
        }
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      {...responder.panHandlers}
    >
      {done ? (
        <View
          style={[
            styles.fillDone,
            { backgroundColor: colors.mint },
          ]}
        />
      ) : (
        <Animated.View
          style={[
            styles.fill,
            {
              width: Math.max(1, width),
              transformOrigin: "left",
              transform: [{ scaleX: fillScale }],
              backgroundColor: colors.primarySoft,
            },
          ]}
        />
      )}

      <Text
        secondary
        style={[
          styles.label,
          { color: done ? colors.white : colors.muted },
          done && styles.labelDone,
        ]}
        numberOfLines={1}
      >
        {done ? doneLabel ?? label : label}
      </Text>

      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: colors.white,
            transform: [{ translateX: translate }],
          },
        ]}
        pointerEvents="none"
      >
        <Ionicons
          name={done ? "checkmark" : "chevron-forward"}
          size={done ? 28 : 24}
          color={done ? colors.mint : colors.primary}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: PADDING,
  },
  trackDisabled: { opacity: 0.45 },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
  },
  fillDone: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.1,
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
  labelDone: { fontWeight: "700" },
  thumb: {
    position: "absolute",
    left: PADDING,
    top: PADDING,
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 2,
  },
});
