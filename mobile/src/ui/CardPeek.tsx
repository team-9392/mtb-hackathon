import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
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

  const cardHeight = 205;
  const expanded = scrollY.interpolate({
    inputRange: [0, LIFT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // В покое карта наклонена на -4deg (как в HTML-макете), а при свайпе вниз выравнивается в 0deg
  const rotateZ = scrollY.interpolate({
    inputRange: [0, LIFT],
    outputRange: ["-4deg", "0deg"],
    extrapolate: "clamp",
  });

  return (
      <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {/* Яркое бело-голубое свечение ЗА картой */}
        <Animated.View
            pointerEvents="none"
            style={[styles.backGlow, { transform: [{ rotateZ }] }]}
        />

        <View style={[styles.sheet, { height: cardHeight + 28 }]}>
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
                <View
                    key={item.id ?? item.last4 + i}
                    style={[styles.page, { width: Math.max(1, width), height: cardHeight + 28 }]}
                >
                  <Animated.View
                      style={[
                        styles.card,
                        { height: cardHeight, transform: [{ rotateZ }] },
                      ]}
                  >
                    {/* Фоновая неоновая надпись MT */}
                    <View style={styles.watermarkWrap} pointerEvents="none">
                      <Text style={styles.watermark}>MT</Text>
                    </View>

                    {/* Кнопка обновления справа вверху на карте */}
                    {onRefresh ? (
                        <Pressable
                            onPress={onRefresh}
                            hitSlop={10}
                            style={styles.refreshBtn}
                        >
                          <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.7)" />
                        </Pressable>
                    ) : null}

                    {/* Чип EMV (3x3 сетка контактов) */}
                    <View style={styles.chip}>
                      <View style={styles.chipGrid}>
                        <View style={styles.chipCell} />
                        <View style={styles.chipCell} />
                        <View style={styles.chipCell} />
                        <View style={styles.chipCell} />
                        <View style={[styles.chipCell, styles.chipCenter]} />
                        <View style={styles.chipCell} />
                        <View style={styles.chipCell} />
                        <View style={styles.chipCell} />
                        <View style={styles.chipCell} />
                      </View>
                    </View>

                    {/* Имя держателя и логотип платёжной системы (в верхней половине, чтобы не перекрывались шторкой) */}
                    <Text style={styles.holder} numberOfLines={1}>
                      {(item.holder ?? holder).toUpperCase()}
                    </Text>
                    <View style={styles.brandPos}>
                      <PaymentBrand system={item.system} onDark />
                    </View>

                    {/* Раскрывающиеся детали при оттягивании шторки вниз */}
                    <Animated.View style={[styles.details, { opacity: expanded }]}>
                      <View style={styles.detailsRow}>
                        <View style={{ flex: 1 }}>
                          {typeof balance === "number" ? (
                              <Text style={styles.balance}>
                                {Math.round(balance).toLocaleString("ru-RU")} BYN
                              </Text>
                          ) : null}
                          <Text style={styles.pan}>{formatPan(item.number)}</Text>
                          <Text style={styles.meta}>
                            Срок: {item.expiry || "••/••"} ·{" "}
                            {item.type === "plastic" ? "Пластиковая" : "Виртуальная"}
                          </Text>
                        </View>
                        <Pressable style={styles.detailButton} onPress={() => onDetails?.(item)}>
                          <Ionicons name="paper-plane-outline" size={13} color="#bfdbfe" />
                          <Text style={styles.detailButtonText}>CVV и PIN — в Telegram</Text>
                        </Pressable>
                      </View>
                    </Animated.View>
                  </Animated.View>
                </View>
            ))}
          </ScrollView>
        </View>

        {count > 1 ? (
            <View style={styles.nav}>
              <Pressable
                  style={styles.navButton}
                  onPress={() => setIndex(Math.max(0, index - 1))}
                  hitSlop={8}
              >
                <Ionicons name="chevron-back" size={16} color="#fff" />
              </Pressable>
              <Text style={styles.navText}>{index + 1 + " / " + count}</Text>
              <Pressable
                  style={styles.navButton}
                  onPress={() => setIndex(Math.min(count - 1, index + 1))}
                  hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={16} color="#fff" />
              </Pressable>
            </View>
        ) : null}
        <Text style={styles.cardLabel}>{card ? "" : ""}</Text>
      </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    position: "relative",
  },
  backGlow: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    width: "88%",
    height: 155,
    borderRadius: 40,
    backgroundColor: "rgba(147, 197, 253, 0.28)",
    shadowColor: "#60a5fa",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 36,
    elevation: 14,
  },
  sheet: {
    width: "100%",
    overflow: "visible",
  },
  pager: {
    width: "100%",
    overflow: "visible",
  },
  page: {
    paddingVertical: 12,
    paddingHorizontal: 2,
    overflow: "visible",
  },
  card: {
    flex: 1,
    backgroundColor: "#000000",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 18,
  },
  watermarkWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  watermark: {
    fontSize: 156,
    fontWeight: "900",
    color: "#1520ff",
    letterSpacing: -6,
    marginLeft: 12,
    marginTop: 4,
    textShadowColor: "rgba(0, 38, 255, 0.85)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  refreshBtn: {
    position: "absolute",
    top: 18,
    right: 22,
    zIndex: 20,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
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
  chipGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 0.5,
    borderColor: "rgba(100,100,100,0.5)",
    borderRadius: 3,
  },
  chipCell: {
    width: "33.33%",
    height: "33.33%",
    borderWidth: 0.5,
    borderColor: "rgba(110,110,110,0.45)",
  },
  chipCenter: {
    borderRadius: 1,
    backgroundColor: "rgba(150,150,150,0.35)",
  },
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
  brandPos: {
    position: "absolute",
    right: 24,
    top: 74,
    zIndex: 10,
  },
  details: {
    marginTop: "auto",
    paddingTop: 10,
    zIndex: 15,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  balance: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  pan: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.4,
    fontFamily: "monospace",
    marginTop: 2,
  },
  meta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
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
  detailButtonText: {
    color: "#dbeafe",
    fontSize: 10,
    fontWeight: "700",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 2,
    zIndex: 25,
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "700",
  },
  cardLabel: { height: 0 },
  empty: {
    borderRadius: 24,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: spacing.xl,
    gap: 6,
  },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  emptyHint: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" },
  emptyButton: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: "#3b82f6",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});