import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform, Pressable, StyleSheet, View } from "react-native";

import { api, ApiError, OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { font, spacing } from "@/theme/tokens";
import { AuthLayout } from "@/ui/AuthLayout";
import { Button } from "@/ui/Button";
import { CodeInput } from "@/ui/CodeInput";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const RESEND_SECONDS = 60;
/** Poller бота опрашивает Telegram раз в 5 секунд: ждём привязку с запасом. */
const LINK_ATTEMPTS = 6;
const LINK_RETRY_MS = 2_000;

type TelegramState = "not_linked" | "link_opened" | "code_sent";

export default function CodeScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const { requestCode, verifyCode } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    challengeId?: string;
    phone?: string;
    channel?: string;
  }>();

  const phone = params.phone ?? "";
  const initialChallengeId = params.challengeId ?? "";
  const codeAlreadySent = initialChallengeId.length > 0 || params.channel === "telegram";

  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(codeAlreadySent ? RESEND_SECONDS : 0);
  const [tgBusy, setTgBusy] = useState(false);
  const [tgState, setTgState] = useState<TelegramState>(codeAlreadySent ? "code_sent" : "not_linked");

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  /** Запрос кода: единственный канал – Telegram. */
  const requestTelegramCode = useCallback(async (): Promise<boolean> => {
    if (!phone) {
      setMessage(t("auth.requestError"));
      return false;
    }
    setTgBusy(true);
    setMessage(null);
    try {
      const challenge = await requestCode(phone);
      if (challenge.channel !== "telegram") {
        setTgState("not_linked");
        setMessage(t("tg.notLinkedHint"));
        return false;
      }
      setChallengeId(challenge.challengeId);
      setCode("");
      setError(false);
      setSeconds(RESEND_SECONDS);
      setTgState("code_sent");
      setMessage(t("tg.otpSent"));
      return true;
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.code === "telegram_not_linked") {
          setTgState("not_linked");
          setMessage(t("tg.notLinkedHint"));
          return false;
        }
        if (caught.code === "too_many_requests") {
          setSeconds(RESEND_SECONDS);
          setMessage(t("auth.tooMany"));
          return false;
        }
        if (caught.code === "telegram_failed") {
          setMessage(caught.message);
          return false;
        }
      }
      setMessage(caught instanceof OfflineError ? t("auth.connectFailed") : t("auth.requestError"));
      return false;
    } finally {
      setTgBusy(false);
    }
  }, [phone, requestCode, t]);

  /** Привязка Telegram: ссылка без номера телефона, только одноразовый токен. */
  const openTelegram = useCallback(async () => {
    if (tgBusy || !phone) {
      return;
    }
    setTgBusy(true);
    setMessage(null);
    try {
      const answer = await api<{ linked: boolean; url: string | null; botReady: boolean }>(
        "/auth/telegram/link",
        { method: "POST", body: { phone }, auth: false },
      );
      if (answer.linked) {
        await requestTelegramCode();
        return;
      }
      if (!answer.url) {
        setTgState("not_linked");
        setMessage(t("tg.notReady"));
        return;
      }
      await Linking.openURL(answer.url);
      setTgState("link_opened");
      setMessage(t("tg.otpOpened"));
    } catch (caught) {
      setMessage(
        caught instanceof ApiError && caught.code === "too_many_requests"
          ? t("auth.tooMany")
          : t("auth.connectFailed"),
      );
    } finally {
      setTgBusy(false);
    }
  }, [phone, requestTelegramCode, t, tgBusy]);

  /**
   * Возврат из Telegram: poller привязывает чат не мгновенно, поэтому
   * несколько раз пробуем запросить код, пока привязка не появится.
   */
  const finishLink = useCallback(async () => {
    if (tgBusy || !phone) {
      return;
    }
    setTgBusy(true);
    setMessage(t("tg.otpChecking"));
    try {
      for (let attempt = 0; attempt < LINK_ATTEMPTS; attempt += 1) {
        try {
          const challenge = await requestCode(phone);
          if (challenge.channel !== "telegram") {
            setTgState("not_linked");
            return;
          }
          setChallengeId(challenge.challengeId);
          setCode("");
          setError(false);
          setSeconds(RESEND_SECONDS);
          setTgState("code_sent");
          setMessage(t("tg.otpSent"));
          return;
        } catch (caught) {
          if (caught instanceof ApiError && caught.code === "telegram_not_linked") {
            await new Promise((resolve) => setTimeout(resolve, LINK_RETRY_MS));
            continue;
          }
          if (caught instanceof ApiError && caught.code === "too_many_requests") {
            setSeconds(RESEND_SECONDS);
            setMessage(t("auth.tooMany"));
            return;
          }
          setMessage(
            caught instanceof OfflineError ? t("auth.connectFailed") : t("auth.requestError"),
          );
          return;
        }
      }
      setMessage(t("tg.otpReturnHint"));
    } finally {
      setTgBusy(false);
    }
  }, [phone, requestCode, t, tgBusy]);

  // Пользователь ушёл в Telegram, нажал Start и вернулся – доводим сценарий.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && tgState === "link_opened") {
        void finishLink();
      }
    });
    return () => subscription.remove();
  }, [finishLink, tgState]);

  const submit = async (candidate: string) => {
    if (busy || challengeId.length === 0) {
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
      setMessage(
        caught instanceof OfflineError
          ? t("auth.connectFailed")
          : caught instanceof ApiError
            ? caught.message
            : t("auth.codeError"),
      );
      setTimeout(() => setError(false), 700);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (seconds > 0 || busy || tgBusy) {
      return;
    }
    await requestTelegramCode();
  };

  const telegramTitle =
    tgState === "code_sent" ? t("tg.otpSentTitle") : tgState === "link_opened" ? t("tg.otpOpenedTitle") : t("tg.otpTitle");

  const telegramAction =
    tgState === "code_sent"
      ? t("tg.otpSentHint")
      : tgState === "link_opened"
        ? t("tg.otpOpenedAction")
        : t("tg.otpButton");

  return (
    <AuthLayout
      showBack
      title={t("auth.codeTitle")}
      subtitle={t("auth.codeSubtitle", { phone })}
      footer={
        <>
          <Button
            label={t("common.continue")}
            onPress={() => void submit(code)}
            loading={busy}
            disabled={code.length < 4 || challengeId.length === 0}
          />
          {tgState === "code_sent" ? (
            <Pressable onPress={() => void resend()} disabled={seconds > 0} style={styles.resend}>
              <Text style={[styles.resendText, seconds > 0 && styles.resendDisabled]}>
                {seconds > 0 ? t("auth.resendIn", { sec: String(seconds) }) : t("auth.resend")}
              </Text>
            </Pressable>
          ) : null}
        </>
      }
    >
      <Pressable
        style={[styles.telegram, tgState === "not_linked" && styles.telegramPrimary]}
        onPress={() => {
          if (tgState === "link_opened") {
            void finishLink();
          } else if (tgState === "not_linked") {
            void openTelegram();
          }
        }}
        disabled={tgBusy || tgState === "code_sent"}
      >
        <View style={styles.telegramHead}>
          <Ionicons name="send-outline" size={18} color={palette.primary} />
          <Text style={styles.telegramTitle}>{telegramTitle}</Text>
        </View>
        <Text style={styles.telegramHint}>
          {tgState === "not_linked" ? t("tg.otpHint") : t("tg.otpSentHint")}
        </Text>
        <Text style={styles.telegramLink}>{tgBusy ? t("tg.otpWorking") : telegramAction}</Text>
      </Pressable>

      {tgState === "code_sent" ? (
        <CodeInput
          length={4}
          value={code}
          onChange={setCode}
          error={error}
          autoFocus
          onComplete={(value) => void submit(value)}
        />
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable onPress={() => router.replace("/auth/phone")} style={styles.change}>
        <Text style={styles.changeText}>{t("auth.changePhone")}</Text>
      </Pressable>
    </AuthLayout>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
    message: { marginTop: spacing.md, fontSize: font.small, color: palette.muted, fontWeight: "600" },
    resend: { alignItems: "center", paddingVertical: spacing.sm },
    resendText: { fontSize: font.small, color: palette.primary, fontWeight: "700" },
    resendDisabled: { color: palette.muted2 },
    telegram: {
      marginBottom: spacing.xl,
      padding: spacing.lg,
      backgroundColor: palette.primarySoft,
      borderRadius: 20,
      gap: 6,
    },
    telegramPrimary: {
      borderWidth: 1,
      borderColor: palette.primary,
    },
    telegramHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    telegramTitle: { fontSize: font.body, fontWeight: "800", color: palette.ink },
    telegramHint: { fontSize: 13, color: palette.ink2, lineHeight: 18 },
    telegramLink: { fontSize: font.small, fontWeight: "700", color: palette.primary },
    change: { marginTop: spacing.lg, alignItems: "center" },
    changeText: { fontSize: font.small, color: palette.muted, fontWeight: "600" },
  });
};
