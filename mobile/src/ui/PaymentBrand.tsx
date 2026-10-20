import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CardSystem } from "@/store/types";

/**
 * Логотипы платёжных систем рисуем примитивами: никаких картинок,
 * поэтому они чёткие на любом экране и не весят ничего.
 */
export function PaymentBrand({ system, onDark = false }: { system: CardSystem; onDark?: boolean }) {
  if (system === "visa") {
    return <Text style={[styles.visa, onDark && styles.white]}>VISA</Text>;
  }
  if (system === "mastercard") {
    return (
      <View style={styles.mastercard}>
        <View style={[styles.circle, { backgroundColor: "#EB001B" }]} />
        <View style={[styles.circle, styles.circleSecond, { backgroundColor: "#F79E1B" }]} />
      </View>
    );
  }
  if (system === "belkart") {
    return (
      <View style={styles.belkart}>
        <Text style={styles.belkartText}>БЕЛКАРТ</Text>
      </View>
    );
  }
  return (
    <View style={styles.union}>
      <View style={styles.unionBars}>
        <View style={[styles.bar, { backgroundColor: "#D71920" }]} />
        <View style={[styles.bar, { backgroundColor: "#00447C" }]} />
        <View style={[styles.bar, { backgroundColor: "#007B84" }]} />
      </View>
      <Text style={[styles.unionText, onDark && styles.white]}>UnionPay</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  visa: { fontSize: 20, fontWeight: "900", fontStyle: "italic", letterSpacing: 1, color: "#1A1F71" },
  white: { color: "#fff" },
  mastercard: { flexDirection: "row", alignItems: "center" },
  circle: { width: 20, height: 20, borderRadius: 10 },
  circleSecond: { marginLeft: -8 },
  belkart: { backgroundColor: "#00A651", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  belkartText: { fontSize: 10, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  union: { alignItems: "flex-end", gap: 1 },
  unionBars: { flexDirection: "row", gap: 1 },
  bar: { width: 7, height: 3, borderRadius: 1 },
  unionText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.4, color: "#00447C" },
});
