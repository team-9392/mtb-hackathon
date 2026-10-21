import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Animated, Image, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { formatPan } from "@/lib/card";
import { translit } from "@/lib/translit";
import type { CardInfo } from "@/store/types";
import { radius, spacing } from "@/theme/tokens";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Text } from "@/ui/Text";

const LIFT = 150;
const CARD_HEIGHT = 208;

/**
 * Одна карта на экране: лицо — фото карты, вокруг тонкое свечение.
 * Свайп влево/вправо перелистывает на следующую карту, свайп вниз раскрывает реквизиты.
 */
export function CardPeek({
  cards,
  holder,
  balance,
  scrollY,
  activeIndex,
  onIndexChange,
  onIssue,
  onDetails,
  onRefresh,
  refreshing,
}: {
  cards: CardInfo[];
  holder: string;
  balance?: number;
  scrollY: Animated.Value;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  onIssue?: () => void;
  onDetails?: (card: CardInfo) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  limitLeft?: number;
}) {
  const { width } = useWindowDimensions();
  const [inner, setInner] = useState(0);
  const shift = useRef(new Animated.Value(0)).current;
  const count = cards.length;
  const index = Math.min(activeIndex ?? inner, Math.max(0, count - 1));
  const card = cards[index];
  const indexRef = useRef(index);
  indexRef.current = index;
  const countRef = useRef(count);
  countRef.current = count;

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        shift.setValue(Math.max(-width * 0.45, Math.min(width * 0.45, g.dx)));
      },
      onPanResponderRelease: (_e, g) => {
        const current = indexRef.current;
        const goTo = (next: number) => {
          if (next < 0 || next > countRef.current - 1) {
            return;
          }
          setInner(next);
          onIndexChange?.(next);
        };
        if (g.dx < -55 && current < countRef.current - 1) {
          Animated.timing(shift, { toValue: -width, duration: 170, useNativeDriver: true }).start(() => {
            goTo(current + 1);
            shift.setValue(width);
            Animated.spring(shift, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          });
          return;
        }
        if (g.dx > 55 && current > 0) {
          Animated.timing(shift, { toValue: width, duration: 170, useNativeDriver: true }).start(() => {
            goTo(current - 1);
            shift.setValue(-width);
            Animated.spring(shift, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          });
          return;
        }
        Animated.spring(shift, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(shift, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  if (!card) {
    return (
      <View style={styles.empty}>
        <Ionicons name="card-outline" size={26} color="rgba(255,255,255,0.7)" />
        <Text style={styles.emptyTitle}>Карта не выпущена</Text>
        <Text style={styles.emptyHint}>Выпустите карту — займёт минуту</Text>
        {onIssue ? (
          <Pressable style={styles.emptyButton} onPress={onIssue}>
            <Text style={styles.emptyButtonText}>Выпустить карту</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const expanded = scrollY.interpolate({
    inputRange: [0, LIFT * 0.35, LIFT],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });
  const lift = scrollY.interpolate({
    inputRange: [0, LIFT],
    outputRange: [0, -6],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.glow, { transform: [{ translateY: lift }] }]}>
        <Animated.View style={[styles.card, { transform: [{ translateX: shift }, { rotate: "-3deg" }, { translateY: lift }] }]} {...swipe.panHandlers}>
          <Image
            source={require("../../assets/brand/card-face-v2.png")}
            style={styles.face}
            resizeMode="cover"
          />

          {onRefresh ? (
            <Pressable onPress={onRefresh} hitSlop={12} style={styles.refresh}>
              <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          ) : null}

          <Text style={styles.holder} numberOfLines={1}>
            {translit((card.holder ?? holder) || "").toUpperCase()}
          </Text>
          <View style={styles.brand}>
            <PaymentBrand system={card.system} onDark />
          </View>

          <Animated.View style={[styles.details, { opacity: expanded }]}>
            <View style={styles.detailsRow}>
              <View style={{ flex: 1 }}>
                {typeof balance === "number" ? (
                  <Text style={styles.balance}>{Math.round(balance).toLocaleString("ru-RU")} BYN</Text>
                ) : null}
                <Text style={styles.pan}>{formatPan(card.number)}</Text>
                <Text style={styles.meta}>
                  {card.type === "plastic" ? "Пластиковая" : "Виртуальная"} · до {card.expiry || "••/••"}
                </Text>
              </View>
              <Pressable style={styles.detailButton} onPress={() => onDetails?.(card)}>
                <Ionicons name="paper-plane-outline" size={13} color="#bfdbfe" />
                <Text style={styles.detailButtonText}>CVV и PIN</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {count > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {cards.map((item, i) => (
            <View key={item.id ?? i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "94%", alignSelf: "center", height: CARD_HEIGHT + 26, justifyContent: "center" },
  glow: { width: "100%" },
  card: {
    width: "100%",
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",

    backgroundColor: "#000",
  },
  face: { width: "100%", height: "100%", transform: [{ scale: 1.06 }] },
  refresh: { position: "absolute", top: 14, right: 18, width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  holder: { position: "absolute", left: 12, top: 14, color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 1.4, maxWidth: "58%", backgroundColor: "#000", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  brand: { position: "absolute", right: 26, top: 46, transform: [{ scale: 1.25 }] },
  details: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  balance: { color: "#fff", fontSize: 16, fontWeight: "800" },
  pan: { color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 1.2, fontFamily: "monospace", marginTop: 2 },
  meta: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "600", marginTop: 1 },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  detailButtonText: { color: "#dbeafe", fontSize: 10, fontWeight: "700" },
  dots: { flexDirection: "row", alignSelf: "center", gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.22)" },
  dotActive: { backgroundColor: "#93c5fd", width: 16 },
  empty: { borderRadius: 24, backgroundColor: "#000", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.xl, gap: 6 },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  emptyHint: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  emptyButton: { marginTop: spacing.sm, alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "#3b82f6", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
