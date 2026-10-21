import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createPaymentApi } from "@/api/actions";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, radius, spacing } from "@/theme/tokens";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";
import { TextInput } from "@/ui/TextInput";

type Mode = "erip" | "phone";

/** ЕРИП и перевод по номеру. Ребёнок только просит – деньги уходят после подтверждения родителя. */
export default function ChildEripScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const { state, showToast } = useStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === "phone" ? "phone" : "erip");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) {
      return;
    }
    const value = Number(amount.replace(",", "."));
    if (!recipient.trim()) {
      showToast(t("pay.needRecipient"));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      showToast(t("pay.needAmount"));
      return;
    }
    const childId = state.childId;
    if (!childId) {
      showToast(t("pay.sent"));
      return;
    }
    setBusy(true);
    try {
      await createPaymentApi(childId, mode, Math.round(value * 100) / 100, recipient.trim());
      showToast(t("pay.sent"));
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("pay.sent"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Image
            source={require("../../../assets/brand/systems/erip.png")}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="ЕРИП"
            style={styles.eripLogo}
          />
          <Text style={styles.title}>{t("pay.title")}</Text>
        </View>
        <Text style={styles.subtitle}>{t("pay.pending")}</Text>

        <View style={styles.row}>
          {(["erip", "phone"] as Mode[]).map((value) => (
            <Pressable
              key={value}
              onPress={() => {
                setMode(value);
                setRecipient("");
              }}
              style={[styles.chip, mode === value && styles.chipActive]}
            >
              <Ionicons
                name={value === "erip" ? "qr-code-outline" : "call-outline"}
                size={16}
                color={mode === value ? (palette.white as string) : (palette.ink2 as string)}
              />
              <Text style={[styles.chipText, mode === value && styles.chipTextActive]}>
                {value === "erip" ? t("pay.erip") : t("pay.phone")}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{mode === "erip" ? t("pay.eripHint") : t("pay.phoneHint")}</Text>
          <TextInput
            value={recipient}
            onChangeText={setRecipient}
            placeholder={mode === "erip" ? "Например, 3-01-02-03" : "+375 29 000-00-00"}
            placeholderTextColor={palette.muted2}
            keyboardType={mode === "phone" ? "phone-pad" : "default"}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("pay.amount")}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={palette.muted2}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

        <SlideToConfirm
          label={t("common.swipeConfirm")}
          onConfirm={() => void submit()}
          disabled={busy}
          doneLabel={t("common.done")}
        />
        <Text style={styles.note}>{t("pay.note")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eripLogo: { width: 28, height: 28 },
  title: { fontSize: font.h2, fontWeight: "800", color: palette.ink, flexShrink: 1 },
  subtitle: { fontSize: font.small, color: palette.muted, marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipText: { fontSize: font.small, fontWeight: "600", color: palette.ink2 },
  chipTextActive: { color: palette.white },
  field: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.lg,
  },
  label: { fontSize: font.tiny, color: palette.muted, marginTop: spacing.sm, fontWeight: "600" },
  input: { paddingBottom: spacing.md, fontSize: font.title, color: palette.ink },
  note: { fontSize: font.small, color: palette.muted2, lineHeight: 18 },
  });
};
