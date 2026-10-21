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
}: {
  cards: CardInfo[];
  holder: string;
  balance?: number;
  scrollY: Animated.Value;
  onIssue?: () => void;
  onDetails?: (card: CardInfo) => void;
  onIndexChange?: (index: number) => void;
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
                <Text style={styles.watermark}>MT</Text>
                <View style={styles.topRow}>
                  <Text style={styles.currency}>BYN</Text>
                  <View style={styles.bank}>
                    <View style={styles.bankBadge}><Ionicons name="snow" size={14} color="#000" /></View>
                    <Text style={styles.bankName}>МТбанк</Text>
                  </View>
                </View>
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
  card: { flex: 1, backgroundColor: "#000", overflow: "hidden", padding: spacing.lg },
  watermark: { position: "absolute", alignSelf: "center", top: 10, fontSize: 120, fontWeight: "900", color: "#1b2bff", letterSpacing: -4 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  currency: { color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: 0.8 },
  bank: { flexDirection: "row", alignItems: "center", gap: 6 },
  bankBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  bankName: { color: "#fff", fontSize: 16, fontWeight: "800" },
  holder: { position: "absolute", left: spacing.lg, top: 74, color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 1, maxWidth: "60%" },
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
