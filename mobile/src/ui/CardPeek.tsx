import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";

import { formatPan } from "@/lib/card";
import type { CardInfo } from "@/store/types";
import { palette, radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";
import { PaymentBrand } from "@/ui/PaymentBrand";

const COLLAPSED = 186;
const EXPANDED = 306;
const ROTATE = "-4deg";

/**
 * Карта на главной: выглядывает из-под панели, тянется вниз и раскрывается.
 * Пока карт несколько — свайп влево/вправо листает их с анимацией.
 */
export function CardPeek({
  cards,
  holder,
  limitLeft,
  onIssue,
  onDetails,
}: {
  cards: CardInfo[];
  holder: string;
  limitLeft?: number;
  onIssue?: () => void;
  onDetails?: (card: CardInfo) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const height = useRef(new Animated.Value(COLLAPSED)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const stateRef = useRef({ expanded: false, index: 0, width: 0 });
  stateRef.current = { expanded, index, width };

  const cardsList = cards;
  const count = cardsList.length;
  const card = cardsList[Math.min(index, Math.max(0, count - 1))];
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  const setOpen = (open: boolean) => {
    setExpanded(open);
    Animated.spring(height, { toValue: open ? EXPANDED : COLLAPSED, useNativeDriver: false, bounciness: 0, speed: 16 }).start();
    void HapticsSafe();
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 || Math.abs(g.dx) > 6,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dy) > Math.abs(g.dx)) {
            const base = stateRef.current.expanded ? EXPANDED : COLLAPSED;
            const next = Math.min(EXPANDED + 40, Math.max(COLLAPSED - 40, base + g.dy));
            height.setValue(next);
          } else if (stateRef.current.width > 0) {
            shift.setValue(Math.max(-stateRef.current.width * 0.5, Math.min(stateRef.current.width * 0.5, g.dx)));
          }
        },
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dy) > Math.abs(g.dx)) {
            setOpen(g.dy > 30 ? true : g.dy < -30 ? false : stateRef.current.expanded);
          } else {
            const threshold = Math.max(40, stateRef.current.width * 0.18);
            const total = cardsList.length;
            if (g.dx < -threshold && stateRef.current.index < total - 1) {
              setIndex(stateRef.current.index + 1);
            } else if (g.dx > threshold && stateRef.current.index > 0) {
              setIndex(stateRef.current.index - 1);
            }
            Animated.spring(shift, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(height, { toValue: stateRef.current.expanded ? EXPANDED : COLLAPSED, useNativeDriver: false }).start();
          Animated.spring(shift, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardsList.length, height, shift],
  );

  if (count === 0) {
    return (
      <View style={styles.wrap}>
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={30} color="rgba(255,255,255,0.75)" />
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

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.glow} />
      <Animated.View style={[styles.sheet, { height }]} {...responder.panHandlers}>
        <LinearGradient
          colors={["#1d3159", "#16233f", "#11182c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { transform: [{ rotate: ROTATE }] }]}
        >
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.brand}>МОЯ КАРТА</Text>
              <Text style={styles.holder}>{holder.toUpperCase()}</Text>
            </View>
            <PaymentBrand system={card.system} onDark />
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{card.type === "plastic" ? "Пластиковая" : "Виртуальная"}</Text>
            </View>
            <View style={styles.cardDots}>
              {cardsList.map((item, i) => (
                <View key={item.last4 + i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          </View>

          <Animated.View style={[styles.cardBottom, !expanded && styles.hidden]}>
            <Text style={styles.pan}>{formatPan(card.number)}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Срок действия: {card.expiry.length > 0 ? card.expiry : "••/••"}</Text>
              {typeof limitLeft === "number" ? <Text style={styles.meta}>Остаток лимита: {Math.round(limitLeft)} BYN</Text> : null}
            </View>
          </Animated.View>

          <Pressable
            style={styles.toggle}
            onPress={() => setOpen(!expanded)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Свернуть карту" : "Раскрыть карту"}
          >
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="rgba(255,255,255,0.75)" />
          </Pressable>
        </LinearGradient>
      </Animated.View>

      {expanded && card ? (
        <Pressable
          style={styles.details}
          onPress={() => {
            void HapticsSafe();
            onDetails?.(card);
          }}
        >
          <Ionicons name="paper-plane-outline" size={16} color={palette.primary} />
          <Text style={styles.detailsText}>CVV и PIN — в Telegram</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

async function HapticsSafe(): Promise<void> {
  try {
    const haptics = await import("expo-haptics");
    await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
  } catch {
    // вибрация недоступна — не критично
  }
}

const styles = StyleSheet.create({
  wrap: { height: EXPANDED + 18, justifyContent: "flex-start", marginTop: spacing.sm },
  glow: {
    position: "absolute",
    top: 40,
    left: "8%",
    right: "8%",
    height: 150,
    borderRadius: 80,
    backgroundColor: "rgba(147,197,253,0.35)",
    transform: [{ rotate: ROTATE }, { scaleY: 0.55 }],
  },
  sheet: { overflow: "visible", zIndex: 2 },
  card: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  holder: { color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 4, letterSpacing: 0.6 },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeBadge: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cardDots: { flexDirection: "row", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: "#fff", width: 14 },
  cardBottom: { gap: 6 },
  pan: { color: "#fff", fontSize: 20, fontWeight: "700", letterSpacing: 2, fontFamily: "monospace" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  meta: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600" },
  toggle: { position: "absolute", right: spacing.lg, bottom: spacing.sm, padding: 4 },
  hidden: { opacity: 0 },
  emptyWrap: {},
  emptyCard: {
    marginTop: spacing.sm,
    borderRadius: 24,
    backgroundColor: "#262a31",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: spacing.xl,
    alignItems: "flex-start",
    gap: 6,
  },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  emptyHint: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  emptyButton: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  details: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "#22272e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    zIndex: 3,
  },
  detailsText: { color: palette.primary, fontSize: 12, fontWeight: "700" },
});
