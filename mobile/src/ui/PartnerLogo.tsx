import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { API_URL } from "@/api/config";
import type { Palette } from "@/theme/palette";
import { useThemedStyles } from "@/theme/ThemeProvider";


/** Логотип партнёра приходит файлом с сервера: команда кладёт PNG, приложение подхватывает. */
export function PartnerLogo({ file, size = 40 }: { file: string | null; size?: number }) {
  const styles = useThemedStyles(makeStyles);

  if (!file) {
    return null;
  }
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 3 }]}>
      <Image
        source={{ uri: API_URL + "/partners/" + encodeURIComponent(file) }}
        style={{ width: size, height: size, borderRadius: size / 3 }}
        resizeMode="contain"
      />
    </View>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  wrap: { backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
  });
};
