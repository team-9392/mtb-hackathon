import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";

export default function JoinScreen() {
  const { t } = useI18n();
  const { joinFamily, signOut } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const claims = await joinFamily(code.trim().toUpperCase());
      router.replace(claims.childId ? "/child" : "/");
    } catch (caught) {
      setMessage(caught instanceof OfflineError ? t("auth.connectFailed") : (caught as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.joinTitle")}
      subtitle={t("auth.joinSubtitle")}
      showBack
      footer={
        <>
          <Button
            label={t("auth.join")}
            onPress={() => void submit()}
            loading={busy}
            disabled={code.trim().length < 4}
          />
          <Button
            variant="ghost"
            label={t("auth.otherPhone")}
            onPress={() => {
              void signOut();
              router.replace("/auth/phone");
            }}
          />
        </>
      }
    >
      <View style={styles.field}>
        <TextInput
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase().slice(0, 12))}
          placeholder="A1B2C3"
          placeholderTextColor={palette.muted2}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          style={styles.input}
        />
      </View>
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
  },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: font.h3,
    color: palette.ink,
    fontWeight: "700",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  error: { marginTop: spacing.md, fontSize: font.small, color: palette.danger, fontWeight: "600" },
});
