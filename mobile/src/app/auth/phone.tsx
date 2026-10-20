import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { OfflineError } from "@/api/client";
import { isApiConfigured } from "@/api/config";
import { formatPhoneInput, useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";

export default function PhoneScreen() {
  const { t } = useI18n();
  const { requestCode, phone: savedPhone } = useAuth();
  const router = useRouter();

  const [digits, setDigits] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = digits.length === 9;

  const submit = async () => {
    if (!ready || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fullPhone = "+375" + digits;
    try {
      const challenge = await requestCode(fullPhone);
      router.push({
        pathname: "/auth/code",
        params: {
          challengeId: challenge.challengeId,
          phone: fullPhone,
          demoCode: challenge.demoCode ?? "",
        },
      });
    } catch (caught) {
      setError(caught instanceof OfflineError ? t("auth.connectFailed") : t("auth.requestError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.phoneTitle")}
      subtitle={t("auth.phoneSubtitle")}
      footer={
        <>
          <Button
            label={t("auth.sendCode")}
            onPress={() => void submit()}
            loading={busy}
            disabled={!ready}
          />
          <Text style={styles.legal}>{t("auth.legalNote")}</Text>
        </>
      }
    >
      <Text style={styles.label}>{t("auth.phoneLabel")}</Text>
      <View style={styles.field}>
        <View style={styles.prefix}>
          <Text style={styles.prefixText}>+375</Text>
        </View>
        <TextInput
          value={formatPhoneInput(digits)}
          onChangeText={(text) => setDigits(text.replace(/[^0-9]/g, "").slice(0, 9))}
          placeholder="29 123 45 67"
          placeholderTextColor={palette.muted2}
          keyboardType="phone-pad"
          inputMode="tel"
          textContentType="telephoneNumber"
          style={styles.input}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
      </View>

      {savedPhone ? <Text style={styles.hint}>{"Прошлый вход: " + savedPhone}</Text> : null}

      {!isApiConfigured ? (
        <View style={styles.demoCard}>
          <Ionicons name="cloud-offline-outline" size={18} color={palette.muted} />
          <View style={styles.demoText}>
            <Text style={styles.demoTitle}>{t("auth.demoMode")}</Text>
            <Text style={styles.demoDesc}>{t("auth.phoneSubtitle")}</Text>
          </View>
          <Button
            variant="secondary"
            compact
            label={t("common.continue")}
            onPress={() => router.replace("/")}
          />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.small, fontWeight: "600", color: palette.muted, marginBottom: spacing.sm },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: "hidden",
  },
  prefix: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg - 2,
    backgroundColor: palette.surfaceAlt,
    borderRightWidth: 1,
    borderRightColor: palette.line,
  },
  prefixText: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg - 2,
    fontSize: font.h3,
    fontWeight: "600",
    color: palette.ink,
    letterSpacing: 0.5,
  },
  hint: { fontSize: font.tiny, color: palette.muted2, marginTop: spacing.md },
  demoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  demoText: { flex: 1, gap: 2 },
  demoTitle: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  demoDesc: { fontSize: font.tiny, color: palette.muted },
  legal: { fontSize: font.tiny, color: palette.muted2, textAlign: "center", lineHeight: 16 },
  error: { marginTop: spacing.md, fontSize: font.small, color: palette.danger, fontWeight: "600" },
});
