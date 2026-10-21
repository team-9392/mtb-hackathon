import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { signConsentsApi } from "@/api/actions";
import { ApiError, OfflineError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import {
  SIGNUP_PACKAGE_PRICE,
  checkedConsentIds,
  firstIncompleteStep,
  fullNameOf,
  routeForStep,
  useSignupDraft,
} from "@/auth/signup/draft";
import { payPackage, type PackagePaymentResult } from "@/auth/signup/payment";
import { ChoiceCard, InfoLine, SignupLayout, TextField } from "@/auth/signup/ui";
import { useI18n, type TKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import type { IconName } from "@/ui/primitives";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import { Text } from "@/ui/Text";

const CARD_DIGITS = 16;

const INCLUDED: { icon: IconName; title: TKey; hint: TKey }[] = [
  { icon: "card-outline", title: "reg.incCard", hint: "reg.incCardHint" },
  { icon: "shield-checkmark-outline", title: "reg.incLimits", hint: "reg.incLimitsHint" },
  { icon: "trophy-outline", title: "reg.incQuests", hint: "reg.incQuestsHint" },
  { icon: "heart-outline", title: "reg.incGoal", hint: "reg.incGoalHint" },
];

type CardErrors = { number?: string; expiry?: string; cvc?: string };

function cardDigitsOf(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, CARD_DIGITS);
}

function formatCardNumber(raw: string): string {
  const digits = cardDigitsOf(raw);
  const groups: string[] = [];
  for (let index = 0; index < digits.length; index += 4) {
    groups.push(digits.slice(index, index + 4));
  }
  return groups.join(" ");
}

/** Проверка контрольной суммы номера карты. */
function luhnOk(digits: string): boolean {
  if (digits.length !== CARD_DIGITS) {
    return false;
  }
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let value = Number(digits[index]);
    if ((digits.length - index) % 2 === 0) {
      value *= 2;
      if (value > 9) {
        value -= 9;
      }
    }
    sum += value;
  }
  return sum % 10 === 0;
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : digits.slice(0, 2) + "/" + digits.slice(2);
}

function expiryOk(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const month = Number(match[1]);
  if (month < 1 || month > 12) {
    return false;
  }
  const year = 2000 + Number(match[2]);
  return new Date(year, month, 1).getTime() > Date.now();
}

/**
 * Шаг 6: оплата пакета «Фэмили».
 *
 * Оплата подтверждается локально (серверного эндпоинта пока нет), после чего
 * один запрос POST /auth/family создаёт семью, ребёнка, права и счета.
 * Согласия из шага 5 отправляются сразу после создания ребёнка.
 */
export default function PaymentScreen() {
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { createFamily, reload, signOut } = useAuth();
  const { showToast } = useStore();
  const router = useRouter();
  const { draft, ready, patch, clear } = useSignupDraft();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);
  const paymentRef = useRef<PackagePaymentResult | null>(null);

  const incomplete = ready ? firstIncompleteStep(draft) : null;

  // Глубокие ссылки и старый черновик: не даём оплатить неполный пакет.
  useEffect(() => {
    if (!ready || doneRef.current || incomplete === null) {
      return;
    }
    router.replace(routeForStep(incomplete, draft));
  }, [ready, incomplete, draft, router]);

  const cardDigits = cardDigitsOf(cardNumber);
  const cardReady =
    cardDigits.length === CARD_DIGITS && luhnOk(cardDigits) && expiryOk(expiry) && cvc.length === 3;
  const canPay = draft.paymentMethod === "account" || cardReady;
  const methodLabel = () => {
    if (draft.paymentMethod === "card") {
      return t("reg.methodCard", { last4: cardDigits.slice(-4) });
    }
    return t("reg.methodAccount");
  };

  const validateCard = (): boolean => {
    if (draft.paymentMethod !== "card") {
      return true;
    }
    const next: CardErrors = {};
    if (!(cardDigits.length === CARD_DIGITS && luhnOk(cardDigits))) {
      next.number = t("reg.cardNumberError");
    }
    if (!expiryOk(expiry)) {
      next.expiry = t("reg.cardExpiryError");
    }
    if (cvc.length !== 3) {
      next.cvc = t("reg.cardCvcError");
    }
    setCardErrors(next);
    return Object.keys(next).length === 0;
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/auth/consents");
    }
  };

  const pay = async () => {
    if (busy || doneRef.current || !canPay) {
      return;
    }
    if (!validateCard()) {
      setError(t("reg.cardFillHint"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Имитация банковского шлюза: 1,2 с и номер платежа для чека.
      // При повторной попытке используем тот же платёж, чтобы не списать дважды.
      const payment =
        paymentRef.current ??
        (await payPackage({
          amount: SIGNUP_PACKAGE_PRICE,
          method: draft.paymentMethod,
          description: t("reg.package"),
        }));
      paymentRef.current = payment;

      // Реальное создание семьи и ребёнка одним запросом.
      const created = await createFamily({
        fullName: fullNameOf(draft),
        idNumber: draft.idNumber,
        childName: (draft.childName ?? "").trim(),
        bracket: draft.bracket,
      });

      const kinds = checkedConsentIds(draft);
      if (created.child?.id && kinds.length > 0) {
        try {
          await signConsentsApi(created.child.id, kinds);
        } catch {
          // Согласия можно подписать повторно на экране согласий — оплата уже прошла.
        }
      }

      doneRef.current = true;
      await clear();
      showToast(t("reg.paySuccess"));
      router.replace({
        pathname: "/auth/card-setup",
        params: {
          childId: created.child?.id ?? "",
          childName: (draft.childName ?? "").trim(),
          amount: String(payment.amount),
          method: methodLabel(),
          paidAt: payment.paidAt,
          receipt: payment.paymentId,
          bracket: draft.bracket,
        },
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError(t("reg.paySession"));
        await signOut();
        router.replace("/auth/phone");
        return;
      }
      // Семья уже создана (повтор после сетевого сбоя) — пакет считаем оформленным.
      if (caught instanceof ApiError && caught.status === 409) {
        const payment = paymentRef.current;
        doneRef.current = true;
        await reload();
        await clear();
        showToast(t("reg.paySuccess"));
        router.replace({
          pathname: "/auth/success",
          params: {
            childName: (draft.childName ?? "").trim(),
            amount: String(payment?.amount ?? SIGNUP_PACKAGE_PRICE),
            method: methodLabel(),
            paidAt: payment?.paidAt ?? new Date().toISOString(),
            receipt: payment?.paymentId ?? "MF-" + Date.now().toString(36).toUpperCase(),
            bracket: draft.bracket,
          },
        });
        return;
      }
      setError(
        caught instanceof OfflineError
          ? t("auth.connectFailed")
          : caught instanceof ApiError
            ? caught.message
            : t("reg.payError"),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!ready || incomplete !== null) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const priceLabel = formatMoney(SIGNUP_PACKAGE_PRICE);
  const priceBig = SIGNUP_PACKAGE_PRICE.toFixed(2).replace(".", ",");

  return (
    <SignupLayout
      step={6}
      title={t("reg.paymentTitle")}
      subtitle={t("reg.paymentSubtitle")}
      onBack={goBack}
      footer={
        <>
          <SlideToConfirm
            label={t("reg.slide", { amount: priceLabel })}
            doneLabel={t("reg.slideDone")}
            disabled={!canPay || busy}
            onConfirm={() => void pay()}
          />
          {busy ? (
            <View style={styles.payingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text secondary style={[styles.payingText, { color: colors.muted }]}>
                {t("reg.paying")}
              </Text>
            </View>
          ) : null}
          {error ? (
            <Text secondary style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          ) : null}
          <Text secondary style={[styles.secure, { color: colors.muted2 }]}>
            {t("reg.paymentSecure")}
          </Text>
        </>
      }
    >
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color={colors.white} />
            <Text style={styles.heroBadgeText}>{t("reg.package")}</Text>
          </View>
          <Ionicons name="card-outline" size={22} color="rgba(255,255,255,0.7)" />
        </View>
        <Text style={styles.heroDesc}>{t("reg.packageDesc")}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{priceBig}</Text>
          <Text style={styles.currency}>BYN</Text>
        </View>
        <Text style={styles.heroNote}>
          {t("reg.perMonth") + " · " + t("reg.priceNote")}
        </Text>
      </LinearGradient>

      <View style={[styles.cardBlock, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text secondary style={[styles.blockTitle, { color: colors.muted }]}>
          {t("reg.included")}
        </Text>
        <View style={styles.includeList}>
          {INCLUDED.map((item) => (
            <View key={item.title} style={styles.includeRow}>
              <View style={[styles.includeIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.includeText}>
                <Text style={[styles.includeTitle, { color: colors.ink }]}>{t(item.title)}</Text>
                <Text secondary style={[styles.includeHint, { color: colors.muted }]}>
                  {t(item.hint)}
                </Text>
              </View>
              <Ionicons name="checkmark" size={16} color={colors.mint} />
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.cardBlock, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.blockHead}>
          <Text secondary style={[styles.blockTitle, { color: colors.muted }]}>
            {t("reg.childCard")}
          </Text>
          <Pressable onPress={() => router.push("/auth/child")} accessibilityRole="button">
            <Text secondary style={[styles.edit, { color: colors.primary }]}>
              {t("reg.childEdit")}
            </Text>
          </Pressable>
        </View>
        <InfoLine icon="person-outline" label={t("reg.childName")} value={draft.childName} />
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <InfoLine
          icon="calendar-outline"
          label={t("reg.bracket")}
          value={draft.bracket === "teen_14_17" ? t("reg.bracket1417") : t("reg.bracket713")}
        />
      </View>

      <View style={styles.methodBlock}>
        <Text secondary style={[styles.blockTitle, { color: colors.muted }]}>
          {t("reg.payMethod")}
        </Text>
        <View style={styles.methodList}>
          <ChoiceCard
            icon="business-outline"
            title={t("reg.payAccount")}
            hint={t("reg.payAccountHint")}
            selected={draft.paymentMethod === "account"}
            onPress={() => patch({ paymentMethod: "account" })}
          />
          <ChoiceCard
            icon="add-circle-outline"
            title={t("reg.payCard")}
            hint={t("reg.payCardHint")}
            selected={draft.paymentMethod === "card"}
            onPress={() => patch({ paymentMethod: "card" })}
          />
        </View>

        {draft.paymentMethod === "account" ? (
          <View style={[styles.account, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
            <View style={[styles.accountIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.accountText}>
              <Text style={[styles.accountName, { color: colors.ink }]}>{t("reg.accountName")}</Text>
              <Text secondary style={[styles.accountHint, { color: colors.muted }]}>
                {t("reg.accountHint")}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={colors.mint} />
          </View>
        ) : (
          <View style={styles.cardFields}>
            <TextField
              label={t("reg.cardNumber")}
              value={cardNumber}
              onChangeText={(text) => {
                setCardNumber(formatCardNumber(text));
                setCardErrors((prev) => ({ ...prev, number: undefined }));
              }}
              placeholder={t("reg.cardNumberPlaceholder")}
              error={cardErrors.number}
              keyboardType="number-pad"
              inputMode="numeric"
              autoCorrect={false}
              maxLength={19}
              returnKeyType="next"
              inputStyle={styles.cardNumberInput}
              onBlur={() => {
                if (cardDigits.length > 0) {
                  setCardErrors((prev) => ({
                    ...prev,
                    number:
                      cardDigits.length === CARD_DIGITS && luhnOk(cardDigits)
                        ? undefined
                        : t("reg.cardNumberError"),
                  }));
                }
              }}
            />
            <View style={styles.cardRow}>
              <TextField
                label={t("reg.cardExpiry")}
                value={expiry}
                onChangeText={(text) => {
                  setExpiry(formatExpiry(text));
                  setCardErrors((prev) => ({ ...prev, expiry: undefined }));
                }}
                placeholder={t("reg.cardExpiryPlaceholder")}
                error={cardErrors.expiry}
                keyboardType="number-pad"
                inputMode="numeric"
                autoCorrect={false}
                maxLength={5}
                style={styles.cardHalf}
                onSubmitEditing={() => undefined}
                onBlur={() => {
                  if (expiry.length > 0 && !expiryOk(expiry)) {
                    setCardErrors((prev) => ({ ...prev, expiry: t("reg.cardExpiryError") }));
                  }
                }}
              />
              <TextField
                label={t("reg.cardCvc")}
                value={cvc}
                onChangeText={(text) => {
                  setCvc(text.replace(/\D/g, "").slice(0, 3));
                  setCardErrors((prev) => ({ ...prev, cvc: undefined }));
                }}
                placeholder={t("reg.cardCvcPlaceholder")}
                error={cardErrors.cvc}
                keyboardType="number-pad"
                inputMode="numeric"
                autoCorrect={false}
                secureTextEntry
                maxLength={3}
                style={styles.cardHalf}
                onBlur={() => {
                  if (cvc.length > 0 && cvc.length !== 3) {
                    setCardErrors((prev) => ({ ...prev, cvc: t("reg.cardCvcError") }));
                  }
                }}
              />
            </View>
            {!cardReady ? (
              <Text secondary style={[styles.cardFillHint, { color: colors.muted2 }]}>
                {t("reg.cardFillHint")}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.summaryRow}>
          <Text secondary style={[styles.summaryLabel, { color: colors.muted }]}>
            {t("reg.totalToday")}
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.ink }]}>{priceLabel}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <View style={styles.summaryRow}>
          <Text secondary style={[styles.summaryMuted, { color: colors.muted }]}>
            {t("reg.monthlyNote", { amount: priceLabel })}
          </Text>
          <Ionicons name="repeat-outline" size={15} color={colors.muted2} />
        </View>
      </View>
    </SignupLayout>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    hero: {
      borderRadius: radius.xl,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      overflow: "hidden",
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
    },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
    },
    heroBadgeText: { color: palette.white, fontSize: 11.5, fontWeight: "700" },
    heroDesc: { color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 18 },
    priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 },
    price: { color: palette.white, fontSize: 46, fontWeight: "700", letterSpacing: -1.8, lineHeight: 54 },
    currency: { color: "rgba(255,255,255,0.66)", fontSize: 17, fontWeight: "700", paddingBottom: 8 },
    heroNote: { color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: "500", marginTop: 2 },
    cardBlock: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    blockHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    blockTitle: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.7,
      textTransform: "uppercase",
    },
    edit: { fontSize: 12, fontWeight: "700" },
    includeList: { gap: spacing.md },
    includeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    includeIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    includeText: { flex: 1, gap: 2 },
    includeTitle: { fontSize: 14, fontWeight: "700" },
    includeHint: { fontSize: 11.5, lineHeight: 15 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
    methodBlock: { marginBottom: spacing.lg, gap: spacing.md },
    methodList: { gap: spacing.md },
    account: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
    },
    accountIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    accountText: { flex: 1, gap: 2 },
    accountName: { fontSize: 14, fontWeight: "700" },
    accountHint: { fontSize: 12, lineHeight: 16 },
    cardFields: { gap: spacing.lg, marginTop: spacing.xs },
    cardRow: { flexDirection: "row", gap: spacing.md },
    cardHalf: { flex: 1 },
    cardNumberInput: { letterSpacing: 1.4, fontSize: 17 },
    cardFillHint: { fontSize: 11.5, textAlign: "center", marginTop: -4 },
    summary: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    summaryLabel: { fontSize: 12, fontWeight: "600" },
    summaryAmount: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
    summaryMuted: { fontSize: 11.5, lineHeight: 15, flex: 1 },
    payingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    payingText: { fontSize: 12, fontWeight: "600" },
    error: { fontSize: 12, fontWeight: "600", textAlign: "center" },
    secure: { fontSize: 10.5, lineHeight: 14, textAlign: "center" },
  });
};
