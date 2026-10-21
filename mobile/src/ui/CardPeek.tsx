import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { formatPan } from "@/lib/card";
import type { CardInfo } from "@/store/types";
import { radius, spacing } from "@/theme/tokens";
import { BlurSpot } from "@/ui/BlurSpot";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Text } from "@/ui/Text";

const LIFT = 150;
const CARD_HEIGHT = 204;

/**
 * Одна карта на экране с блюр-свечением сверху. Свайп влево/вправо перелистывает
 * на следующую карту. Свайп вниз по экрану раскрывает реквизиты.
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

  const go = (next: number) => {
    if (next < 0 || next > countRef.current - 1) {
      return;
    }
    setInner(next);
    onIndexChange?.(next);
  };

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        shift.setValue(Math.max(-width * 0.45, Math.min(width * 0.45, g.dx)));
      },
      onPanResponderRelease: (_e, g) => {
        const current = indexRef.current;
        if (g.dx < -55 && current < countRef.current - 1) {
          Animated.timing(shift, { toValue: -width, duration: 180, useNativeDriver: true }).start(() => {
            go(current + 1);
            shift.setValue(width);
            Animated.spring(shift, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          });
          return;
        }
        if (g.dx > 55 && current > 0) {
          Animated.timing(shift, { toValue: width, duration: 180, useNativeDriver: true }).start(() => {
            go(current - 1);
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
  const rotateZ = scrollY.interpolate({
    inputRange: [0, LIFT],
    outputRange: ["-4deg", "0deg"],
    extrapolate: "clamp",
  });
  const translateY = scrollY.interpolate({
    inputRange: [0, LIFT],
    outputRange: [0, 10],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.wrap}>
      <Animated.View pointerEvents="none" style={[styles.topGlow, { transform: [{ rotateZ }, { translateY }] }]}>
        <BlurSpot size={300} color="#60a5fa" intensity={1.1} />
      </Animated.View>

      <Animated.View
        style={[styles.card, { transform: [{ translateX: shift }, { rotateZ }, { translateY }] }]}
        {...swipe.panHandlers}
      >
        <View pointerEvents="none" style={styles.topEdge} />
        <View pointerEvents="none" style={styles.watermarkWrap}>
          <Text style={styles.watermark}>MT</Text>
        </View>

        {onRefresh ? (
          <Pressable onPress={onRefresh} hitSlop={12} style={styles.refresh}>
            <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.75)" />
          </Pressable>
        ) : null}

        <View style={styles.chip}>
          <View style={styles.chipGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={[styles.chipCell, i === 4 && styles.chipCenter]} />
            ))}
          </View>
        </View>

        <Text style={styles.holder} numberOfLines={1}>
          {(card.holder ?? holder).toUpperCase()}
        </Text>
        <View style={styles.brandPos}>
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
                Срок: {card.expiry || "••/••"} · {card.type === "plastic" ? "Пластиковая" : "Виртуальная"}
              </Text>
            </View>
            <Pressable style={styles.detailButton} onPress={() => onDetails?.(card)}>
              <Ionicons name="paper-plane-outline" size={13} color="#bfdbfe" />
              <Text style={styles.detailButtonText}>CVV и PIN — в Telegram</Text>
            </Pressable>
          </View>
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
  wrap: { width: "94%", alignSelf: "center", height: 236, justifyContent: "center" },
  topGlow: { position: "absolute", top: -70, alignSelf: "center", width: 300, height: 300, alignItems: "center", justifyContent: "center" },
  card: {
    width: "100%",
    height: CARD_HEIGHT,
    backgroundColor: "#000000",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 18,
  },
  topEdge: { position: "absolute", top: 0, left: "12%", right: "12%", height: 1.5, backgroundColor: "rgba(191,219,254,0.45)" },
  watermarkWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  watermark: {
    fontSize: 158,
    fontWeight: "900",
    color: "#1520ff",
    letterSpacing: -6,
    marginLeft: 10,
    marginTop: 4,
    textShadowColor: "rgba(0,38,255,0.9)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  refresh: { position: "absolute", top: 18, right: 22, zIndex: 20, width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  chip: {
    position: "absolute",
    top: 42,
    left: 24,
    width: 42,
    height: 30,
    borderRadius: 5,
    backgroundColor: "#b8b8b8",
    borderWidth: 1,
    borderColor: "#7a7a7a",
    padding: 2,
    opacity: 0.92,
    zIndex: 10,
  },
  chipGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", borderWidth: 0.5, borderColor: "rgba(100,100,100,0.5)", borderRadius: 3 },
  chipCell: { width: "33.33%", height: "33.33%", borderWidth: 0.5, borderColor: "rgba(110,110,110,0.45)" },
  chipCenter: { borderRadius: 1, backgroundColor: "rgba(150,150,150,0.35)" },
  holder: {
    position: "absolute",
    left: 24,
    top: 84,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1.8,
    maxWidth: "65%",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    zIndex: 10,
  },
  brandPos: { position: "absolute", right: 24, top: 74, zIndex: 10 },
  details: { marginTop: "auto", paddingTop: 10, zIndex: 15 },
  detailsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  balance: { color: "#fff", fontSize: 18, fontWeight: "800" },
  pan: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 1.4, fontFamily: "monospace", marginTop: 2 },
  meta: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600", marginTop: 1 },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  detailButtonText: { color: "#dbeafe", fontSize: 10, fontWeight: "700" },
  dots: { flexDirection: "row", alignSelf: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.22)" },
  dotActive: { backgroundColor: "#93c5fd", width: 16 },
  empty: { borderRadius: 24, backgroundColor: "#000", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.xl, gap: 6 },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  emptyHint: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  emptyButton: { marginTop: spacing.sm, alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "#3b82f6", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
