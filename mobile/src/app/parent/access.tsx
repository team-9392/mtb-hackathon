import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card, Row } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

const DIGITS = () => String(Math.floor(100000 + Math.random() * 900000));

export default function AccessScreen() {
  const { t } = useI18n();
  const { state, grantAccess, revokeAccess, showToast } = useStore();
  const router = useRouter();
  const [code] = useState(DIGITS);

  const granted = state.accessGranted;

  return (
    <Screen
      showBack
      title={t("p5.title")}
      subtitle={t("p5.subtitle")}
      footer={
        granted ? (
          <Button label={t("p5.cta")} icon="options-outline" onPress={() => router.replace("/parent")} />
        ) : (
          <Button
            label={t("p5.grant")}
            icon="key-outline"
            onPress={() => {
              grantAccess();
              showToast(t("p5.granted"));
            }}
          />
        )
      }
    >
      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>{t("p5.code")}</Text>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.qrHint}>{t("p5.qr")}</Text>
        <Row style={styles.dots}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.dot, granted && { backgroundColor: palette.mint }]} />
          ))}
        </Row>
      </Card>

      <Card>
        <Row style={styles.deviceRow}>
          <View style={[styles.deviceIcon, granted && { backgroundColor: palette.mintSoft }]}>
            <Ionicons
              name={granted ? "phone-portrait" : "phone-portrait-outline"}
              size={22}
              color={granted ? palette.mint : palette.muted}
            />
          </View>
          <View style={styles.deviceText}>
            <Text style={styles.deviceTitle}>{t("p5.childDevice")}</Text>
            <Text style={styles.deviceDesc}>{granted ? t("p5.connected") : t("p5.waiting")}</Text>
          </View>
          {granted ? (
            <View style={styles.onlineDot} />
          ) : (
            <Ionicons name="ellipsis-horizontal" size={18} color={palette.muted2} />
          )}
        </Row>
      </Card>

      {granted ? (
        <Pressable onPress={revokeAccess} style={styles.revoke}>
          <Ionicons name="close-circle-outline" size={18} color={palette.danger} />
          <View style={styles.revokeText}>
            <Text style={styles.revokeTitle}>{t("p5.revoke")}</Text>
            <Text style={styles.revokeDesc}>{t("p5.revokeDesc")}</Text>
          </View>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  codeLabel: { fontSize: font.small, color: palette.muted, fontWeight: "700" },
  code: { fontSize: 42, fontWeight: "800", color: palette.ink, letterSpacing: 8 },
  qrHint: { fontSize: font.small, color: palette.muted, textAlign: "center", paddingHorizontal: spacing.lg },
  dots: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.line },
  deviceRow: { gap: spacing.md },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceText: { flex: 1, gap: 3 },
  deviceTitle: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  deviceDesc: { fontSize: font.small, color: palette.muted },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.mint },
  revoke: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.dangerSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  revokeText: { flex: 1, gap: 2 },
  revokeTitle: { fontSize: font.body, fontWeight: "700", color: palette.danger },
  revokeDesc: { fontSize: font.tiny, color: palette.danger },
});
