import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError, OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";

/** Шаг регистрации: создать семейный пакет или войти в существующий по коду доступа. */
export default function FamilyScreen() {
  const { t } = useI18n();
  const { createFamily, joinFamily, user, signOut } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "create") {
        await createFamily(user?.full_name ?? "");
        router.replace("/parent/offer");
        return;
      }
      const claims = await joinFamily(accessCode.trim().toUpperCase());
      router.replace(claims.childId ? "/child" : "/");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await signOut();
        router.replace("/auth/phone");
        return;
      }
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{user?.full_name ?? t("auth.roleParent")}</Text>
          <Text style={styles.cardText}>{t("auth.familySubtitle")}</Text>
        </View>
      ) : (
        <View style={styles.field}>
          <TextInput
            value={accessCode}
            onChangeText={(text) => setAccessCode(text.toUpperCase().slice(0, 12))}
            placeholder="ANYA01"
            placeholderTextColor={palette.muted2}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />
        </View>
      )}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: palette.primarySoft,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: font.h3, fontWeight: "800", color: palette.ink },
  cardText: { fontSize: font.small, color: palette.ink2 },
  field: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.lg,
  },
  input: { paddingVertical: spacing.lg, fontSize: font.title, color: palette.ink, letterSpacing: 2 },
  error: { marginTop: spacing.md, fontSize: font.small, color: palette.danger, fontWeight: "600" },
});
