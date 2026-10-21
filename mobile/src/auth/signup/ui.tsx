import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/i18n";
import type { Palette } from "@/theme/palette";
import { radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { ProgressBar, type IconName } from "@/ui/primitives";
import { Text } from "@/ui/Text";
import { TextInput } from "@/ui/TextInput";

import { SIGNUP_TOTAL_STEPS } from "./draft";

/**
 * Каркас шагов регистрации: прогресс, заголовок, прокручиваемая форма
 * и закреплённая внизу кнопка «Продолжить».
 */
export function SignupLayout({
  step,
  title,
  subtitle,
  onBack,
  footer,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const percent = Math.round((step / SIGNUP_TOTAL_STEPS) * 100);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityRole="button"
              style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <View style={styles.brand}>
            <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
              <Ionicons name="wallet-outline" size={14} color={colors.white} />
            </View>
            <Text style={[styles.brandText, { color: colors.ink2 }]}>Moby Family</Text>
          </View>
          <View style={styles.backPlaceholder} />
        </View>

        <View style={styles.progressRow}>
          <Text secondary style={[styles.stepLabel, { color: colors.muted }]}>
            {t("reg.step", { n: String(step), total: String(SIGNUP_TOTAL_STEPS) })}
          </Text>
          <Text secondary style={[styles.percent, { color: colors.muted2 }]}>
            {percent}%
          </Text>
        </View>
        <ProgressBar value={step / SIGNUP_TOTAL_STEPS} height={6} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
            {subtitle ? (
              <Text secondary style={[styles.subtitle, { color: colors.muted }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
        </ScrollView>

        {footer ? (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + spacing.md,
                backgroundColor: colors.bg,
                borderTopColor: colors.line,
              },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Карточка поля: подпись сверху, тёмная панель, подсказка или ошибка снизу. */
export function Field({
  label,
  hint,
  error,
  right,
  focused = false,
  style,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  right?: React.ReactNode;
  focused?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.line;

  return (
    <View style={style}>
      <View style={styles.labelRow}>
        <Text secondary style={[styles.label, { color: colors.muted }]}>
          {label}
        </Text>
        {right}
      </View>
      <View style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor }]}>{children}</View>
      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text secondary style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text secondary style={[styles.hintText, { color: colors.muted }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Поле ввода в стиле макета: крупный текст, скругление 24, подсветка фокуса. */
export function TextField({
  label,
  hint,
  error,
  right,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <Field label={label} hint={hint} error={error} right={right} focused={focused} style={style}>
      <TextInput
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, { color: colors.ink }, inputStyle]}
      />
    </Field>
  );
}

/** Крупный выбор: возрастная группа, способ оплаты, банковская карта. */
export function ChoiceCard({
  icon,
  title,
  hint,
  selected,
  onPress,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.line,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.choiceIcon,
            { backgroundColor: selected ? colors.primary : colors.surfaceAlt },
          ]}
        >
          <Ionicons name={icon} size={20} color={selected ? colors.white : colors.muted} />
        </View>
      ) : null}
      <View style={styles.choiceText}>
        <Text style={[styles.choiceTitle, { color: colors.ink }]}>{title}</Text>
        {hint ? (
          <Text secondary style={[styles.choiceHint, { color: colors.muted }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? colors.primary : colors.lineStrong,
            backgroundColor: selected ? colors.primary : "transparent",
          },
        ]}
      >
        {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
    </Pressable>
  );
}

/** Строка согласия: чекбокс, текст и честный статус «подписано / не подписано». */
export function ConsentRow({
  title,
  hint,
  checked,
  required,
  status,
  requiredLabel,
  notRequiredLabel,
  onToggle,
}: {
  title: string;
  hint: string;
  checked: boolean;
  required: boolean;
  status: string;
  requiredLabel: string;
  notRequiredLabel: string;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => [
        styles.consent,
        {
          backgroundColor: colors.surface,
          borderColor: checked ? colors.lineStrong : colors.line,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? colors.primary : colors.lineStrong,
            backgroundColor: checked ? colors.primary : "transparent",
          },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
      </View>
      <View style={styles.consentText}>
        <Text style={[styles.consentTitle, { color: colors.ink }]}>{title}</Text>
        <Text secondary style={[styles.consentHint, { color: colors.muted }]}>
          {hint}
        </Text>
        <View style={styles.consentStatusRow}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: checked ? colors.mintSoft : colors.surfaceAlt },
            ]}
          >
            <Ionicons
              name={checked ? "checkmark-circle" : "ellipse-outline"}
              size={12}
              color={checked ? colors.mint : colors.muted2}
            />
            <Text
              secondary
              style={[styles.statusText, { color: checked ? colors.mint : colors.muted2 }]}
            >
              {status}
            </Text>
          </View>
          <Text secondary style={[styles.optionalText, { color: colors.muted2 }]}>
            {required ? requiredLabel : notRequiredLabel}
          </Text>
        </View>
      </View>
      <Ionicons
        name={required ? "shield-checkmark-outline" : "information-circle-outline"}
        size={18}
        color={required ? colors.primary : colors.muted2}
      />
    </Pressable>
  );
}

/** Ненавязчивая плашка-пояснение. */
export function Notice({ icon = "information-circle-outline", text }: { icon?: IconName; text: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.notice, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text secondary style={[styles.noticeText, { color: colors.ink2 }]}>
        {text}
      </Text>
    </View>
  );
}

export function InfoLine({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.infoLine}>
      <View style={[styles.infoIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text secondary style={[styles.infoLabel, { color: colors.muted }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: colors.ink }]}>{value}</Text>
      </View>
    </View>
  );
}

export function makeStyles(_colors: Palette) {
  return StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    backPlaceholder: { width: 40, height: 40 },
    brand: { flexDirection: "row", alignItems: "center", gap: 8 },
    brandMark: {
      width: 24,
      height: 24,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    brandText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    stepLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.9,
      textTransform: "uppercase",
    },
    percent: { fontSize: 11, fontWeight: "600" },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    head: { marginBottom: spacing.xl, gap: spacing.sm },
    title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.8, lineHeight: 36 },
    subtitle: { fontSize: 14.5, lineHeight: 21 },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      gap: spacing.sm,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    label: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.7,
      textTransform: "uppercase",
    },
    fieldCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: "hidden",
    },
    input: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      fontSize: 19,
      fontWeight: "600",
    },
    messageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
    },
    errorText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 16 },
    hintText: { marginTop: 8, fontSize: 12, lineHeight: 17 },
    choice: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      minHeight: 84,
    },
    choiceIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    choiceText: { flex: 1, gap: 3 },
    choiceTitle: { fontSize: 16, fontWeight: "700" },
    choiceHint: { fontSize: 12.5, lineHeight: 17 },
    radio: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    consent: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 9,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    consentText: { flex: 1, gap: 4 },
    consentTitle: { fontSize: 14.5, fontWeight: "700", lineHeight: 19 },
    consentHint: { fontSize: 12, lineHeight: 16.5 },
    consentStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
      flexWrap: "wrap",
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusText: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.2 },
    optionalText: { fontSize: 10.5, fontWeight: "600" },
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    noticeText: { flex: 1, fontSize: 12.5, lineHeight: 17.5 },
    infoLine: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    infoText: { flex: 1, gap: 2 },
    infoLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
    infoValue: { fontSize: 14, fontWeight: "700" },
  });
}