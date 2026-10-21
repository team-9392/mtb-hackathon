import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";

import { api } from "@/api/client";
import { useI18n } from "@/i18n";
import type { Palette } from "@/theme/palette";
import { spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { CodeInput } from "@/ui/CodeInput";
import { Text } from "@/ui/Text";

/** Подтверждение кодом из Telegram перед отправкой CVV/PIN. */
export function ConfirmCodeModal({
  visible,
  title,
  onClose,
  onConfirmed,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirmed: () => Promise<void>;
}) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [stage, setStage] = useState<"code" | "success">("code");
  const [busy, setBusy] = useState(false);
  const scale = useRef(new Animated.Value(0.4)).current;

  const request = useCallback(async () => {
    try {
      const answer = await api<{ challengeId: string; channel: string }>("/me/confirm/request", { method: "POST", body: {} });
      setChallengeId(answer.challengeId);
      setMessage(t("cf.sent"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("auth.connectFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (!visible) return;
    setCode("");
    setStage("code");
    setMessage(null);
    scale.setValue(0.4);
    void request();
  }, [visible, request, scale]);

  const submit = async (value: string) => {
    if (busy || !challengeId) return;
    setBusy(true);
    try {
      await api("/me/confirm/verify", { method: "POST", body: { challengeId, code: value } });
      setStage("success");
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
      await onConfirmed();
      setTimeout(onClose, 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("auth.connectFailed"));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {stage === "success" ? (
            <View style={styles.successWrap}>
              <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
                <Ionicons name="checkmark" size={44} color="#fff" />
              </Animated.View>
              <Text style={styles.title}>{t("cf.success")}</Text>
              <Text style={styles.hint}>{t("cf.successHint")}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.hint}>{t("cf.hint")}</Text>
              <View style={styles.codeWrap}>
                <CodeInput length={4} value={code} onChange={setCode} autoFocus onComplete={(value) => void submit(value)} />
              </View>
              {message ? <Text style={styles.message}>{message}</Text> : null}
              <Pressable onPress={() => void request()} style={styles.resend}>
                <Text style={styles.resendText}>{t("cf.resend")}</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
    card: { width: "100%", backgroundColor: colors.panel, borderRadius: 28, borderWidth: 1, borderColor: colors.line, padding: spacing.xl, gap: spacing.sm, alignItems: "center" },
    title: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
    hint: { color: colors.muted, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 18 },
    codeWrap: { marginVertical: spacing.md, width: "100%" },
    message: { color: colors.danger, fontSize: 12, fontWeight: "600", textAlign: "center" },
    resend: { paddingVertical: 6 },
    resendText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
    cancel: { paddingVertical: 6 },
    cancelText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    successWrap: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
    successCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  });
