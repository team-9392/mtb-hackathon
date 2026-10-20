import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";

export default function FamilyScreen() {
  const { t } = useI18n();
  const { createFamily, joinFamily, user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(user?.full_name ?? "");
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "create") {
        await createFamily(name.length > 0 ? name : "Родитель");
        router.replace("/parent/offer");
        return;
      }
      const claims = await joinFamily(accessCode.trim().toUpperCase());
      router.replace(claims.childId ? "/child" : "/");
    } catch (caught) {
      setMessage(caught instanceof OfflineError ? t("auth.connectFailed") : (caught as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={mode === "create" ? t("auth.createFamily") : t("auth.joinTitle")}
      subtitle={mode === "create" ? t("auth.familySubtitle") : t("auth.joinSubtitle")}
      footer={
        <>
          <Button
            label={mode === "create" ? t("auth.createFamily") : t("auth.join")}
            onPress={() => void submit()}
            loading={busy}
            disabled={mode === "join" && accessCode.trim().length < 4}
          />
          <Button
            variant="ghost"
            label={mode === "create" ? t("auth.joinTitle") : t("auth.createFamily")}
            onPress={() => {
              setMode(mode === "create" ? "join" : "create");
              setMessage(null);
            }}
          />
        </>
      }
    >
      {mode === "create" ? (
        <View style={styles.field}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("auth.familyTitle")}
            placeholderTextColor={palette.muted2}
            style={styles.input}
            autoFocus
          />
        </View>
      ) : (
        <View style={styles.field}>
          <TextInput
            value={accessCode}
            onChangeText={(text) => setAccessCode(text.toUpperCase().slice(0, 12))}
            placeholder="A1B2C3"
            placeholderTextColor={palette.muted2}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.input, styles.codeInput]}
            autoFocus
          />
        </View>
      )}

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
  input: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, fontSize: font.h3, color: palette.ink, fontWeight: "600" },
  codeInput: { letterSpacing: 4, textTransform: "uppercase" },
  error: { marginTop: spacing.md, fontSize: font.small, color: palette.danger, fontWeight: "600" },
});
