import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  View,
  ViewStyle,
} from "react-native";

import type { Palette } from "@/theme/palette";
import { palette, radius, shadow, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

export type Tone = "neutral" | "primary" | "mint" | "warn" | "danger" | "child";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export type ToneColors = { bg: string; fg: string; border: string };

/** Цвета статусов для текущей темы. */
export function getTones(colors: Palette): Record<Tone, ToneColors> {
  return {
    neutral: { bg: colors.surfaceAlt, fg: colors.ink2, border: colors.line },
    primary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoftStrong },
    mint: { bg: colors.mintSoft, fg: colors.mint, border: colors.mintSoft },
    warn: { bg: colors.warnSoft, fg: colors.warn, border: colors.warnSoft },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    child: { bg: colors.childSoft, fg: colors.childDark, border: colors.childSoft },
  };
}

/** Совместимость: статический набор для тёмной темы. */
export const tones: Record<Tone, ToneColors> = getTones(palette);

export function Card({
  children,
  style,
  padded = true,
  tone = "surface",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: "surface" | "alt";
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        padded && styles.cardPadded,
        {
          backgroundColor: tone === "alt" ? colors.surfaceAlt : colors.surface,
          borderColor: colors.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = spacing.sm,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

export function SectionTitle({
  children,
  right,
  style,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionTitle, style]}>
      <Text secondary style={[styles.sectionTitleText, { color: colors.muted }]} numberOfLines={1}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.line }, style]} />;
}

export function Badge({
  label,
  tone = "neutral",
  style,
  onDark = false,
}: {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  /** Бейдж поверх градиентной карточки: белый текст и стеклянный фон. */
  onDark?: boolean;
}) {
  const { colors } = useTheme();
  const t = getTones(colors)[tone];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: onDark ? "rgba(255,255,255,0.18)" : t.bg,
          borderColor: onDark ? "rgba(255,255,255,0.24)" : t.border,
        },
        style,
      ]}
    >
      <Text secondary style={[styles.badgeText, { color: onDark ? "#ffffff" : t.fg }]}>
        {label}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  tone = "primary",
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: Tone;
}) {
  const { colors } = useTheme();
  const t = getTones(colors)[tone];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? t.bg : colors.surface,
          borderColor: selected ? t.fg : colors.line,
        },
      ]}
    >
      <Text secondary style={[styles.chipText, { color: selected ? t.fg : colors.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const t = getTones(colors)[tone];
  return (
    <View style={styles.stat}>
      {icon ? (
        <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={16} color={t.fg} />
        </View>
      ) : null}
      <Text secondary style={[styles.statLabel, { color: colors.muted }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
      {hint ? (
        <Text secondary style={[styles.statHint, { color: colors.muted2 }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  value,
  tone = "primary",
  height = 8,
  onDark = false,
}: {
  value: number;
  tone?: Tone;
  height?: number;
  /** Белая полоса на градиентной карточке. */
  onDark?: boolean;
}) {
  const { colors } = useTheme();
  const t = getTones(colors)[tone];
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      style={[
        styles.progressTrack,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: onDark ? "rgba(255,255,255,0.22)" : colors.surfaceAlt,
          borderColor: onDark ? "transparent" : colors.line,
        },
      ]}
    >
      <View
        style={[
          styles.progressFill,
          {
            width: pct + "%",
            backgroundColor: onDark ? "#ffffff" : t.fg,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

export function ToggleRow({
  title,
  desc,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  desc?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleTitle, { color: disabled ? colors.muted2 : colors.ink }]}>
          {title}
        </Text>
        {desc ? (
          <Text secondary style={[styles.toggleDesc, { color: colors.muted }]}>
            {desc}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.lineStrong }}
        thumbColor={colors.white}
      />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              active && [
                styles.segmentActive,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ],
            ]}
          >
            <Text
              secondary
              style={[styles.segmentText, { color: active ? colors.ink : colors.muted }]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  tone = "neutral",
  danger = false,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  tone?: Tone;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const t = getTones(colors)[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, pressed && onPress ? { opacity: 0.7 } : null]}
    >
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: danger ? colors.dangerSoft : t.bg }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.danger : t.fg} />
        </View>
      ) : null}
      <View style={styles.listText}>
        <Text style={[styles.listTitle, { color: danger ? colors.danger : colors.ink }]}>{title}</Text>
        {subtitle ? (
          <Text secondary style={[styles.listSubtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted2} /> : null)}
    </Pressable>
  );
}

export function EmptyState({ icon, title }: { icon: IconName; title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
        <Ionicons name={icon} size={24} color={colors.muted2} />
      </View>
      <Text secondary style={[styles.emptyText, { color: colors.muted }]}>
        {title}
      </Text>
    </View>
  );
}

export function Toast({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.toast,
        {
          backgroundColor: colors.toastBg,
          borderColor: colors.toastBorder,
        },
      ]}
      pointerEvents="none"
    >
      <Ionicons name="checkmark-circle" size={18} color={colors.mint} />
      <Text style={[styles.toastText, { color: colors.toastText }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadow.card,
  },
  cardPadded: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: "600" },
  stat: { flex: 1, gap: 4 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
  statValue: { fontSize: 17, fontWeight: "700" },
  statHint: { fontSize: 11 },
  progressTrack: { overflow: "hidden", borderWidth: 1, width: "100%" },
  progressFill: { height: "100%" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 15, fontWeight: "600" },
  toggleDesc: { fontSize: 12, lineHeight: 16 },
  segmented: {
    flexDirection: "row",
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
    borderWidth: 1,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flex: 1,
    alignItems: "center",
  },
  segmentActive: { borderWidth: 1 },
  segmentText: { fontSize: 12.5, fontWeight: "600" },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  listIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listText: { flex: 1, gap: 2 },
  listTitle: { fontSize: 15, fontWeight: "600" },
  listSubtitle: { fontSize: 11.5, lineHeight: 15 },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 13, textAlign: "center" },
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 96,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.floating,
  },
  toastText: { fontSize: 13, fontWeight: "600", flex: 1 },
});
