import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { formatPan } from "@/lib/card";
import type { CardInfo } from "@/store/types";
import { radius, spacing } from "@/theme/tokens";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Text } from "@/ui/Text";

const COLLAPSED = 168;
const EXPANDED = 300;
const PULL = 150;

/**
 * Карта на главной. Лежит под наклоном, пока интерфейс не потянули:
 * при скролле вниз плавно выпрямляется и раскрывается до полных реквизитов.
 * Свайп влево/вправо листает карты, если их несколько.
 */
export function CardPeek({
  cards,
  holder,
  limitLeft,
  scrollY,
  onIssue,
  onDetails,
}: {
  cards: CardInfo[];
  holder: string;
  limitLeft?: number;
  scrollY: Animated.Value;
  onIssue?: () => void;
  onDetails?: (card: CardInfo) => void;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(340);
  const shift = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(index);
  indexRef.current = index;
  const countRef = useRef(cards.length);
  countRef.current = cards.length;
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    setIndex((prev) => Math.min(prev, Math.max(0, cards.length - 1)));
  }, [cards.length]);

  const count = cards.length;
  const card = cards[Math.min(index, Math.max(0, count - 1))];

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderMove: (_e, g) => {
        shift.setValue(Math.max(-widthRef.current * 0.35, Math.min(widthRef.current * 0.35, g.dx)));
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -50 && indexRef.current < countRef.current - 1) {
          setIndex(indexRef.current + 1);
        } else if (g.dx > 50 && indexRef.current > 0) {
          setIndex(indexRef.current - 1);
        }
        Animated.spring(shift, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  if (count === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={28} color="rgba(255,255,255,0.7)" />
          <Text style={styles.emptyTitle}>Карта не выпущена</Text>
          <Text style={styles.emptyHint}>Выпустите карту ребёнку — займёт минуту</Text>
          {onIssue ? (
            <Pressable style={styles.emptyButton} onPress={onIssue}>
              <Text style={styles.emptyButtonText}>Выпустить карту</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const height = scrollY.interpolate({ inputRange: [0, PULL], outputRange: [COLLAPSED, EXPANDED], extrapolate: "clamp" });
  const rotate = scrollY.interpolate({ inputRange: [0, PULL], outputRange: ["-4deg", "0deg"], extrapolate: "clamp" });
  const scale = scrollY.interpolate({ inputRange: [0, PULL], outputRange: [0.97, 1], extrapolate: "clamp" });
  const glowOpacity = scrollY.interpolate({ inputRange: [0, PULL], outputRange: [0.4, 0.95], extrapolate: "clamp" });
  const detailsOpacity = scrollY.interpolate({ inputRange: [60, PULL], outputRange: [0, 1], extrapolate: "clamp" });
  const dotsOpacity = scrollY.interpolate({ inputRange: [0, 70], outputRange: [1, 0], extrapolate: "clamp" });
  const metaShift = scrollY.interpolate({ inputRange: [0, PULL], outputRange: [10, 0], extrapolate: "clamp" });
  const glowScale = scrollY.interpolate({ inputRange: [0, PULL], outputRange: [0.92, 1.08], extrapolate: "clamp" });

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View
        style={[styles.glow, { opacity: glowOpacity, transform: [{ scaleY: 0.7 }, { scale: glowScale }, { rotate: "-4deg" }] }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="cardGlow" cx="50%" cy="50%" r="60%">
              <Stop offset="0" stopColor="#bfdbfe" stopOpacity="0.55" />
              <Stop offset="0.6" stopColor="#93c5fd" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#93c5fd" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardGlow)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.sheet, { height, transform: [{ rotate }, { scale }, { translateX: shift }] }]} {...responder.panHandlers}>
        <LinearGradient colors={["#1d3159", "#16233f", "#11182c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.flex}>
              <Text style={styles.brand}>МОЯ КАРТА</Text>
              <Text style={styles.holder} numberOfLines={1}>
                {holder.toUpperCase()}
              </Text>
            </View>
            <PaymentBrand system={card.system} onDark />
          </View>

          <Animated.View style={[styles.center, { opacity: detailsOpacity }]}>
            <Text style={styles.pan}>{formatPan(card.number)}</Text>
            <Animated.View style={[styles.metaRow, { transform: [{ translateY: metaShift }] }]}>
              <Text style={styles.meta}>Срок: {card.expiry.length > 0 ? card.expiry : "••/••"}</Text>
              <Text style={styles.meta}>{card.type === "plastic" ? "Пластиковая" : "Виртуальная"}</Text>
              {typeof limitLeft === "number" ? <Text style={styles.meta}>Лимит: {Math.round(limitLeft)} BYN</Text> : null}
            </Animated.View>
          </Animated.View>

          <View style={styles.cardBottom}>
            <Animated.View style={[styles.dots, { opacity: dotsOpacity }]}>
              {cards.map((item, i) => (
                <View key={item.last4 + i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </Animated.View>
            <Animated.View style={{ opacity: detailsOpacity }}>
              <Pressable style={styles.details} onPress={() => onDetails?.(card)}>
                <Ionicons name="paper-plane-outline" size={14} color="#bfdbfe" />
                <Text style={styles.detailsText}>CVV и PIN — в Telegram</Text>
              </Pressable>
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.hintRow, { opacity: dotsOpacity }]} pointerEvents="none">
        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.5)" />
        <Text style={styles.hint}>Потяните вниз — карта раскроется</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  flex: { flex: 1 },
  glow: { position: "absolute", top: 26, left: "-2%", right: "-2%", height: 200 },
  sheet: { zIndex: 2 },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "space-between",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  brand: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  holder: { color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 4, letterSpacing: 0.6 },
  center: { alignItems: "flex-start", gap: 6 },
  pan: { color: "#fff", fontSize: 20, fontWeight: "700", letterSpacing: 2, fontFamily: "monospace" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  meta: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600" },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 24 },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: "#fff", width: 14 },
  details: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailsText: { color: "#dbeafe", fontSize: 11, fontWeight: "700" },
  hintRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: spacing.sm },
  hint: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "600" },
  emptyWrap: {},
  emptyCard: {
    borderRadius: 24,
    backgroundColor: "#262a31",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: spacing.xl,
    gap: 6,
  },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  emptyHint: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  emptyButton: { marginTop: spacing.sm, alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "#3b82f6", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
