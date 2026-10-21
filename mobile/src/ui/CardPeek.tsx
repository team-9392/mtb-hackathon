import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { formatPan } from "@/lib/card";
import type { CardInfo } from "@/store/types";
import { radius, spacing } from "@/theme/tokens";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Text } from "@/ui/Text";

const LIFT = 150;

/** Карты листаются горизонтальным свайпом (нативно на iOS/Android и на вебе). */
export function CardPeek({
  cards,
  holder,
  balance,
  scrollY,
  onIssue,
  onDetails,
  onIndexChange,
  onRefresh,
}: {
  cards: CardInfo[];
  holder: string;
  balance?: number;
  scrollY: Animated.Value;
  onIssue?: () => void;
  onDetails?: (card: CardInfo) => void;
  onIndexChange?: (index: number) => void;
  onRefresh?: () => void;
  limitLeft?: number;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(340);

  const count = cards.length;
  const card = cards[Math.min(index, Math.max(0, count - 1))];

  if (count === 0) {
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

  const cardHeight = Math.max(210, Math.round((width || 340) / 1.6));
  const expanded = scrollY.interpolate({ inputRange: [0, LIFT], outputRange: [0, 1], extrapolate: "clamp" });


  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.sheet, { height: cardHeight }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={count > 1}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
            setIndex(Math.min(count - 1, Math.max(0, next)));
            onIndexChange?.(next);
          }}
          style={styles.pager}
        >
          {cards.map((item, i) => (
            <View key={item.id ?? item.last4 + i} style={[styles.page, { width: Math.max(1, width), height: cardHeight }]}>
              <View style={styles.card}>
                <View style={styles.watermarkBox} pointerEvents="none">
                  <Text style={styles.watermark}>MT</Text>
                </View>
                {/* EMV-чип и кнопка обновления — по макету */}
                <View style={styles.chip}>
                  <View style={styles.chipLineH} />
                  <View style={styles.chipLineV} />
                </View>
                {onRefresh ? (
                  <Pressable style={styles.refreshButton} onPress={onRefresh} hitSlop={8}>
                    <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.7)" />
                  </Pressable>
                ) : null}
                <Text style={styles.holder} numberOfLines={1}>{(item.holder ?? holder).toUpperCase()}</Text>
                <View style={styles.brandPos}><PaymentBrand system={item.system} onDark /></View>
                <Animated.View style={[styles.details, { opacity: expanded }]}>
                  {typeof balance === "number" ? <Text style={styles.balance}>{Math.round(balance).toLocaleString("ru-RU")} BYN</Text> : null}
                  <Text style={styles.pan}>{formatPan(item.number)}</Text>
                  <Text style={styles.meta}>Срок: {item.expiry || "••/••"} · {item.type === "plastic" ? "Пластиковая" : "Виртуальная"}</Text>
                  <Pressable style={styles.detailButton} onPress={() => onDetails?.(item)}>
                    <Ionicons name="paper-plane-outline" size={13} color="#bfdbfe" />
                    <Text style={styles.detailButtonText}>CVV и PIN — в Telegram</Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {count > 1 ? (
        <View style={styles.nav}>
          <Pressable style={styles.navButton} onPress={() => setIndex(Math.max(0, index - 1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={16} color="#fff" />
          </Pressable>
          <Text style={styles.navText}>{(index + 1) + " / " + count}</Text>
          <Pressable style={styles.navButton} onPress={() => setIndex(Math.min(count - 1, index + 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.cardLabel}>{card ? "" : ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  sheet: { width: "100%", overflow: "hidden" },
  pager: { width: "100%" },
  page: { overflow: "hidden" },
  card: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 16,
    bottom: 16,
    backgroundColor: "#000",
    overflow: "hidden",
    padding: spacing.lg,
    transform: [{ rotate: "-4deg" }],
  },
  watermarkBox: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  watermark: {
    fontSize: 160,
    fontWeight: "900",
    color: "#1a1aff",
    letterSpacing: -6,
    opacity: 0.95,
    textShadowColor: "rgba(40,40,255,0.75)",
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 0 },
    includeFontPadding: false,
  },
  chip: { position: "absolute", top: 40, left: spacing.lg, width: 42, height: 30, borderRadius: 6, backgroundColor: "#c2c2c2", borderWidth: 1, borderColor: "#7a7a7a", overflow: "hidden", opacity: 0.92, zIndex: 5 },
  chipLineH: { position: "absolute", left: 0, right: 0, top: 14, height: 1, backgroundColor: "rgba(90,90,90,0.65)" },
  chipLineV: { position: "absolute", top: 0, bottom: 0, left: 20, width: 1, backgroundColor: "rgba(90,90,90,0.65)" },
  refreshButton: { position: "absolute", top: 16, right: 16, width: 30, height: 30, alignItems: "center", justifyContent: "center", zIndex: 6 },
  holder: { position: "absolute", left: spacing.lg, top: 78, color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 2, maxWidth: "60%" },
  brandPos: { position: "absolute", right: spacing.lg, top: 72 },
  details: { marginTop: "auto", gap: 4 },
  balance: { color: "#fff", fontSize: 22, fontWeight: "800" },
  pan: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 1.5, fontFamily: "monospace" },
  meta: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" },
  detailButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, marginTop: 2, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  detailButtonText: { color: "#dbeafe", fontSize: 10, fontWeight: "700" },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: spacing.sm },
  navButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  navText: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700" },
  cardLabel: { height: 0 },
  empty: { borderRadius: 24, backgroundColor: "#000", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: spacing.xl, gap: 6 },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  emptyHint: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  emptyButton: { marginTop: spacing.sm, alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "#3b82f6", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
