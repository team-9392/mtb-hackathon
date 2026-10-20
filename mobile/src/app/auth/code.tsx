import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { font, palette, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";
import { CodeInput } from "@/ui/CodeInput";

const RESEND_SECONDS = 60;

export default function CodeScreen() {
  const { t } = useI18n();
  const { requestCode, verifyCode } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ challengeId?: string; phone?: string; demoCode?: string }>();

  const [challengeId, setChallengeId] = useState(params.challengeId ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const attempted = useRef(false);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const phone = params.phone ?? "";
  const demoCode = params.demoCode && params.demoCode.length > 0 ? params.demoCode : null;

  const submit = async (candidate: string) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(false);
    setMessage(null);
    try {
      const claims = await verifyCode(challengeId, candidate, Platform.OS);
      if (!claims.familyId) {
        router.replace("/auth/family");
        return;
      }
      if (claims.role === "child" && !claims.childId) {
        router.replace("/auth/join");
        return;
      }
      router.replace("/");
    } catch (caught) {
      setError(true);
      setCode("");
      setMessage(caught instanceof OfflineError ? t("auth.connectFailed") : t("auth.codeError"));
      setTimeout(() => setError(false), 700);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (seconds > 0 || busy) {
      return;
    }
    try {
      const challenge = await requestCode(phone);
      setChallengeId(challenge.challengeId);
      setCode("");
      setSeconds(RESEND_SECONDS);
      setMessage(null);
    } catch {
      setMessage(t("auth.requestError"));
    }
  };

  return (
    <AuthLayout
      showBack
      title={t("auth.codeTitle")}
      subtitle={t("auth.codeSubtitle", { phone })}
      footer={
        <>
          <Button label={t("common.continue")} onPress={() => void submit(code)} loading={busy} disabled={code.length < 6} />
          <Pressable onPress={() => void resend()} disabled={seconds > 0} style={styles.resend}>
            <Text style={[styles.resendText, seconds > 0 && styles.resendDisabled]}>
              {seconds > 0 ? t("auth.resendIn", { sec: String(seconds) }) : t("auth.resend")}
            </Text>
          </Pressable>
        </>
      }
    >
      <CodeInput value={code} onChange={setCode} error={error} autoFocus onComplete={(value) => void submit(value)} />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {demoCode ? (
        <Pressable
          style={styles.demo}
          onPress={() => {
            if (attempted.current) {
              return;
            }
            attempted.current = true;
            setCode(demoCode);
            void submit(demoCode);
          }}
        >
          <Text style={styles.demoText}>{t("auth.demoHint")}</Text>
          <Text style={styles.demoLink}>{t("auth.demoFill")}</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={() => router.replace("/auth/phone")} style={styles.change}>
        <Text style={styles.changeText}>{t("auth.changePhone")}</Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { marginTop: spacing.md, fontSize: font.small, color: palette.danger, fontWeight: "600" },
  resend: { alignItems: "center", paddingVertical: spacing.sm },
  resendText: { fontSize: font.small, color: palette.primary, fontWeight: "700" },
  resendDisabled: { color: palette.muted2 },
  demo: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 20,
    gap: 4,
  },
  demoText: { fontSize: font.tiny, color: palette.muted, fontWeight: "700" },
  demoLink: { fontSize: font.small, color: palette.primary, fontWeight: "700" },
  change: { marginTop: spacing.lg, alignItems: "center" },
  changeText: { fontSize: font.small, color: palette.muted, fontWeight: "600" },
});
