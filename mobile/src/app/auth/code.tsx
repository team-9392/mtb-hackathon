import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { api, OfflineError } from "@/api/client";
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
  const [tgBusy, setTgBusy] = useState(false);
  const [tgLinked, setTgLinked] = useState(false);
  const attempted = useRef(false);

  /** Код без SMS: привязываем номер к Telegram-боту, код приходит туда. */
  const openTelegram = async () => {
    if (tgBusy) {
      return;
    }
    setTgBusy(true);
    try {
      const answer = await api<{ linked: boolean; url: string | null }>("/auth/telegram/link", {
        method: "POST",
        body: { phone: params.phone ?? "" },
        auth: false,
      });
      if (answer.url) {
        await Linking.openURL(answer.url);
      }
      if (answer.linked || answer.url) {
        setTgLinked(true);
      } else {
        setMessage(t("tg.notReady"));
      }
    } catch {
      setMessage(t("auth.connectFailed"));
    } finally {
      setTgBusy(false);
    }
  };

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
        router.replace("/auth/role");
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
          <Button label={t("common.continue")} onPress={() => void submit(code)} loading={busy} disabled={code.length < 4} />
          <Pressable onPress={() => void resend()} disabled={seconds > 0} style={styles.resend}>
            <Text style={[styles.resendText, seconds > 0 && styles.resendDisabled]}>
              {seconds > 0 ? t("auth.resendIn", { sec: String(seconds) }) : t("auth.resend")}
            </Text>
          </Pressable>
        </>
      }
    >
      <CodeInput length={4} value={code} onChange={setCode} error={error} autoFocus onComplete={(value) => void submit(value)} />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <Pressable style={styles.telegram} onPress={() => void openTelegram()} disabled={tgBusy}>
        <View style={styles.telegramHead}>
          <Ionicons name="send-outline" size={18} color={palette.primary} />
          <Text style={styles.telegramTitle}>{t("tg.otpTitle")}</Text>
        </View>
        <Text style={styles.telegramHint}>{t("tg.otpHint")}</Text>
        <Text style={styles.telegramLink}>
          {tgBusy ? t("tg.opening") : tgLinked ? t("tg.otpReady") : t("tg.otpButton")}
        </Text>
      </Pressable>

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
  telegram: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: palette.primarySoft,
    borderRadius: 20,
    gap: 6,
  },
  telegramHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  telegramTitle: { fontSize: font.body, fontWeight: "800", color: palette.ink },
  telegramHint: { fontSize: 13, color: palette.ink2, lineHeight: 18 },
  telegramLink: { fontSize: font.small, fontWeight: "700", color: palette.primary },
  change: { marginTop: spacing.lg, alignItems: "center" },
  changeText: { fontSize: font.small, color: palette.muted, fontWeight: "600" },
});
