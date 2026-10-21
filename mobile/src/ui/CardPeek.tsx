import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";

import { formatPan } from "@/lib/card";
import type { CardInfo } from "@/store/types";
import { radius, spacing } from "@/theme/tokens";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Text } from "@/ui/Text";

const COLLAPSED = 200;
const PULL = 150;

/** Карта как в макете: чёрная, с водяным знаком MT, чипом, именем и логотипом системы. */
export function CardPeek({
  cards,
  holder,
  balance,
  limitLeft,
  scrollY,
  onIssue,
  onDetails,
  onIndexChange,
}: {
  cards: CardInfo[];
  holder: string;
  balance?: number;
  limitLeft?: number;
  scrollY: Animated.Value;
  onIssue?: () => void;
  onDetails?: (card: CardInfo) => void;
  onIndexChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(340);
  const shift = useRef(new Animated.Value(0)).current;
  const widthRef = useRef(340);
  widthRef.current = width;
  const indexValue = useRef(index);
  indexValue.current = index;
  const countValue = useRef(cards.length);
  countValue.current = cards.length;
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
      onPanResponderMove: (_e, g) => shift.setValue(Math.max(-widthRef.current * 0.4, Math.min(widthRef.current * 0.4, g.dx))),
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -50 && indexValue.current < countValue.current - 1) {
          setIndex(indexValue.current + 1);
        } else if (g.dx > 50 && indexValue.current > 0) {
          setIndex(indexValue.current - 1);
        }
        Animated.spring(shift, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;
  const indexRef = useRef(index);
  indexRef.current = index;
  const count = cards.length;
  const card = cards[Math.min(index, Math.max(0, count - 1))];

  useEffect(() => {
    setIndex((prev) => Math.min(prev, Math.max(0, cards.length - 1)));
  }, [cards.length]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  if (count === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="card-outline" size={28} color="rgba(255,255,255,0.7)" />
        <Text style={styles.emptyTitle}>Карта не выпущена</Text>
        <Text style={styles.emptyHint}>Выпустите карту ребёнку — займёт минуту</Text>
        {onIssue ? (
          <Pressable style={styles.emptyButton} onPress={onIssue}>
            <Text style={styles.emptyButtonText}>Выпустить карту</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const expandedHeight = Math.max(232, Math.round((width || 340) / 1.55));
  const height = scrollY.interpolate({ inputRange: [0, PULL], outputRange: [COLLAPSED, expandedHeight], extrapolate: "clamp" });
  const rotate = scrollY.interpolate({ inputRange: [0, PULL], outputRange: ["-4deg", "0deg"], extrapolate: "clamp" });
  const detailsOpacity = scrollY.interpolate({ inputRange: [50, PULL], outputRange: [0, 1], extrapolate: "clamp" });
  const edge = scrollY.interpolate({ inputRange: [0, PULL], outputRange: [0, 0], extrapolate: "clamp" });
  const watermarkOpacity = scrollY.interpolate({ inputRange: [0, PULL], outputRange: [0.9, 0.55], extrapolate: "clamp" });

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.sheet, { height, marginHorizontal: edge, transform: [{ rotate }, { translateX: shift }] }]} {...swipe.panHandlers}>
        <View style={styles.card}>
          <Animated.Text style={[styles.watermark, { opacity: watermarkOpacity }]}>MT</Animated.Text>


          <View style={styles.brandPos}>
            <PaymentBrand system={card.system} onDark />
          </View>

          <Text style={styles.holder} numberOfLines={1}>
            {(card.holder ?? holder).toUpperCase()}
          </Text>

          <Animated.View style={[styles.expanded, { opacity: detailsOpacity }]}>
            {typeof balance === "number" ? (
              <Text style={styles.balance}>{Math.round(balance).toLocaleString("ru-RU")} BYN</Text>
            ) : null}
            <Text style={styles.pan}>{formatPan(card.number)}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Срок: {card.expiry.length > 0 ? card.expiry : "••/••"}</Text>
              <Text style={styles.meta}>{card.type === "plastic" ? "Пластиковая" : "Виртуальная"}</Text>
            </View>
            <Pressable style={styles.details} onPress={() => onDetails?.(card)}>
              <Ionicons name="paper-plane-outline" size={14} color="#bfdbfe" />
              <Text style={styles.detailsText}>CVV и PIN — в Telegram</Text>
            </Pressable>
          </Animated.View>

          {count > 1 ? (
            <View style={styles.nav}>
              <Pressable style={styles.navButton} onPress={() => setIndex((prev) => Math.max(0, prev - 1))} hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.85)" />
              </Pressable>
              <Text style={styles.navText}>{(index + 1) + " / " + count}</Text>
              <Pressable style={styles.navButton} onPress={() => setIndex((prev) => Math.min(count - 1, prev + 1))} hitSlop={8}>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  sheet: { zIndex: 2 },
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    padding: spacing.lg,
    justifyContent: "flex-start",
  },
  watermark: {
    position: "absolute",
    alignSelf: "center",
    top: 24,
    fontSize: 150,
    fontWeight: "900",
    letterSpacing: -6,
    color: "#2236ff",
    opacity: 0.9,
  },

  holder: {
    position: "absolute",
    left: spacing.lg,
    top: 86,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1.2,
    maxWidth: "62%",
  },
  brandPos: { position: "absolute", right: spacing.lg, bottom: spacing.md },
  expanded: { marginTop: "auto", gap: 5, paddingBottom: 34 },
  balance: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  pan: { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: 2, fontFamily: "monospace" },
  metaRow: { flexDirection: "row", gap: spacing.md },
  meta: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
  details: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailsText: { color: "#dbeafe", fontSize: 11, fontWeight: "700" },
  nav: { position: "absolute", right: spacing.lg, bottom: spacing.md, flexDirection: "row", alignItems: "center", gap: 8 },
  navButton: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  navText: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700" },
  empty: { marginTop: spacing.sm, borderRadius: 24, backgroundColor: "#000", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.xl, gap: 6 },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  emptyHint: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  emptyButton: { marginTop: spacing.sm, alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "#3b82f6", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
