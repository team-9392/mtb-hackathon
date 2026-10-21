import React from "react";
import { Image, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

import type { CardSystem } from "@/store/types";

/**
 * Официальные логотипы платёжных систем (PNG с прозрачным фоном, 520 px по ширине).
 * Белкарт — только эмблема без надписи (квадрат 520×520), поэтому для неё
 * предусмотрен отдельный квадратный бокс: широкий бокс оставлял бы пустые поля.
 * На тёмной карте цветные знаки теряются, поэтому кладём их на белую плашку;
 * на светлом фоне плашка не нужна.
 */
const LOGOS: Record<CardSystem, ImageSourcePropType> = {
  visa: require("../../assets/brand/systems/visa.png"),
  mastercard: require("../../assets/brand/systems/mastercard.png"),
  belkart: require("../../assets/brand/systems/belkart.png"),
  unionpay: require("../../assets/brand/systems/unionpay.png"),
};

/** Квадратные эмблемы (без надписи) вместо широких логотипов. */
const SQUARE_LOGOS: Partial<Record<CardSystem, true>> = { belkart: true };

export function PaymentBrand({ system, onDark = false }: { system: CardSystem; onDark?: boolean }) {
  if (system === "belkart") {
    return (
      <Image
        source={LOGOS.belkart}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="belkart"
        style={onDark ? styles.belkartDark : styles.belkartLight}
      />
    );
  }
  const square = SQUARE_LOGOS[system] === true;
  const logo = (
    <Image
      source={LOGOS[system]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel={system}
      style={onDark ? (square ? styles.squareDarkLogo : styles.darkLogo) : square ? styles.squareLightLogo : styles.lightLogo}
    />
  );

  if (onDark) {
    return <View style={[styles.plate, square && styles.squarePlate]}>{logo}</View>;
  }
  return <View style={[styles.lightBox, square && styles.squareLightBox]}>{logo}</View>;
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
  /* Квадратная эмблема: плашка 28×28, внутри 22×22. */
  squarePlate: { width: 28, height: 28 },
  squareDarkLogo: { width: 22, height: 22 },
  /* На светлом фоне логотип крупнее и без подложки. */
  lightBox: { width: 96, height: 30, justifyContent: "center" },
  lightLogo: { width: 96, height: 30 },
  /* Квадратная эмблема на светлом фоне — бокс 30×30, без пустых полей слева. */
  squareLightBox: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  squareLightLogo: { width: 30, height: 30 },
  /* Белкарт: только эмблема, без белой плашки, крупнее. */
  belkartDark: { width: 34, height: 34 },
  belkartLight: { width: 44, height: 44 },
});
