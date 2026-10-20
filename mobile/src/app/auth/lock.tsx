import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { api, OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { font, palette, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";
import { CodeInput } from "@/ui/CodeInput";

/** Экран возврата в приложение: код приложения или выход другим номером. */
export default function LockScreen() {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (candidate: string) => {
    try {
      await api("/auth/app-code/verify", { method: "POST", body: { code: candidate } });
      router.replace("/");
    } catch (caught) {
      setError(true);
      setCode("");
      setMessage(caught instanceof OfflineError ? t("auth.connectFailed") : t("auth.codeError"));
      setTimeout(() => setError(false), 700);
    }
  };

  return (
    <AuthLayout
      title={t("auth.lockTitle")}
      subtitle={user?.phone ? user.phone : t("auth.lockSubtitle")}
      footer={
        <Pressable
          onPress={() => {
            void signOut();
            router.replace("/auth/phone");
          }}
          style={styles.link}
        >
          <Text style={styles.linkText}>{t("auth.otherPhone")}</Text>
        </Pressable>
      }
    >
      <CodeInput length={4} value={code} onChange={setCode} autoFocus error={error} onComplete={(value) => void submit(value)} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button variant="ghost" label={t("common.continue")} onPress={() => void submit(code)} style={styles.button} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  message: { marginTop: spacing.lg, fontSize: font.small, color: palette.danger, fontWeight: "600" },
  button: { marginTop: spacing.xl },
  link: { alignItems: "center", paddingVertical: spacing.sm },
  linkText: { fontSize: font.small, color: palette.primary, fontWeight: "700" },
});
