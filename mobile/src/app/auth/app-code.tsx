import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet } from "react-native";

import { api, OfflineError } from "@/api/client";
import { useI18n } from "@/i18n";
import { font, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";
import { CodeInput } from "@/ui/CodeInput";
import type { Palette } from "@/theme/palette";
import { useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const LENGTH = 4;

export default function AppCodeScreen() {
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [repeat, setRepeat] = useState("");
  const [stage, setStage] = useState<"first" | "repeat">("first");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const next = (value: string) => {
    if (stage === "first") {
      setFirst(value);
      setStage("repeat");
      setRepeat("");
      setMessage(null);
      return;
    }
    setRepeat(value);
    if (value !== first) {
      setError(true);
      setMessage(t("auth.appCodeMismatch"));
      setTimeout(() => {
        setError(false);
        setRepeat("");
      }, 700);
      return;
    }
    void save(value);
  };

  const save = async (code: string) => {
    setBusy(true);
    try {
      await api("/auth/app-code", { method: "POST", body: { code } });
      setMessage(t("auth.saveCode") + ": " + t("common.done"));
      setTimeout(() => router.replace("/"), 600);
    } catch (caught) {
      setMessage(caught instanceof OfflineError ? t("auth.connectFailed") : (caught as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      showBack
      title={t("auth.appCodeTitle")}
      subtitle={stage === "first" ? t("auth.appCodeSubtitle") : t("auth.appCodeRepeat")}
      footer={
        stage === "repeat" ? (
          <Button variant="ghost" label={t("common.back")} onPress={() => setStage("first")} />
        ) : undefined
      }
    >
      <CodeInput
        key={stage}
        length={LENGTH}
        value={stage === "first" ? first : repeat}
        onChange={next}
        autoFocus
        error={error}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {busy ? <Text style={styles.message}>{t("auth.saveCode") + "…"}</Text> : null}
    </AuthLayout>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  message: { marginTop: spacing.lg, fontSize: font.small, color: palette.muted, fontWeight: "600" },
  });
};
