import React from "react";
import { Image, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

import type { CardSystem } from "@/store/types";

/**
 * Официальные логотипы платёжных систем (PNG с прозрачным фоном, 520 px по ширине).
 * На тёмной карте цветные знаки теряются, поэтому кладём их на белую плашку;
 * на светлом фоне плашка не нужна.
 */
const LOGOS: Record<CardSystem, ImageSourcePropType> = {
  visa: require("../../assets/brand/systems/visa.png"),
  mastercard: require("../../assets/brand/systems/mastercard.png"),
  belkart: require("../../assets/brand/systems/belkart.png"),
  unionpay: require("../../assets/brand/systems/unionpay.png"),
};

export function PaymentBrand({ system, onDark = false }: { system: CardSystem; onDark?: boolean }) {
  const logo = (
    <Image
      source={LOGOS[system]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel={system}
      style={onDark ? styles.darkLogo : styles.lightLogo}
    />
  );

  if (onDark) {
    return <View style={styles.plate}>{logo}</View>;
  }
  return <View style={styles.lightBox}>{logo}</View>;
}

const styles = StyleSheet.create({
  /* Плашка 34×22, radius 4, внутренний отступ 3 px. */
  plate: {
    width: 34,
    height: 22,
    borderRadius: 4,
    padding: 3,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  darkLogo: { width: 28, height: 16 },
  /* На светлом фоне логотип крупнее и без подложки. */
  lightBox: { width: 96, height: 30, justifyContent: "center" },
  lightLogo: { width: 96, height: 30 },
});
