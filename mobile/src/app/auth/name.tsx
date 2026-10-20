import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError, OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";

/** Шаг регистрации: имя и фамилия. Проверка простая: хотя бы один символ в каждом поле. */
export default function NameScreen() {
  const { t } = useI18n();
  const { saveProfile, signOut } = useAuth();
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (busy) {
      return;
    }
    const firstClean = first.trim();
    const lastClean = last.trim();
    if (firstClean.length < 1 || lastClean.length < 1) {
      setMessage(t("auth.nameRequired"));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await saveProfile((firstClean + " " + lastClean).trim());
      router.push("/auth/family");
    } catch (caught) {
      // Токен от удалённого аккаунта: не показываем техническую ошибку — просто входим заново.
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
      title={t("auth.nameTitle")}
      subtitle={t("auth.nameSubtitle")}
      footer={<Button label={t("common.continue")} onPress={() => void submit()} loading={busy} />}
    >
      <View style={styles.field}>
        <Text style={styles.label}>{t("auth.firstName")}</Text>
        <TextInput
          value={first}
          onChangeText={(text) => {
            setFirst(text);
            setMessage(null);
          }}
          placeholder="Ольга"
          placeholderTextColor={palette.muted2}
          style={styles.input}
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{t("auth.lastName")}</Text>
        <TextInput
          value={last}
          onChangeText={(text) => {
            setLast(text);
            setMessage(null);
          }}
          placeholder="Дубицкая"
          placeholderTextColor={palette.muted2}
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
      </View>
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  label: { fontSize: font.tiny, color: palette.muted, marginTop: spacing.sm, fontWeight: "600" },
  input: { paddingBottom: spacing.md, fontSize: font.title, color: palette.ink },
  error: { marginTop: spacing.sm, fontSize: font.small, color: palette.danger, fontWeight: "600" },
});
