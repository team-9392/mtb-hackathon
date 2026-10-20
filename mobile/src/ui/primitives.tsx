import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { font, palette, radius, shadow, spacing } from "@/theme/tokens";

export type Tone = "neutral" | "primary" | "mint" | "warn" | "danger" | "child";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: palette.surfaceAlt, fg: palette.ink2 },
  primary: { bg: palette.primarySoft, fg: palette.primary },
  mint: { bg: palette.mintSoft, fg: palette.mint },
  warn: { bg: palette.warnSoft, fg: "#B26A00" },
  danger: { bg: palette.dangerSoft, fg: palette.danger },
  child: { bg: palette.childSoft, fg: palette.childDark },
};

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
  return (
    <View
      style={[
        styles.card,
        padded && styles.cardPadded,
        tone === "alt" && { backgroundColor: palette.surfaceAlt },
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
  return (
    <View style={[styles.sectionTitle, style]}>
      <Text style={styles.sectionTitleText}>{children}</Text>
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function Badge({
  label,
  tone = "neutral",
  style,
}: {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
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
  const t = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? t.bg : palette.surface, borderColor: selected ? t.fg : palette.line },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? t.fg : palette.muted }]}>{label}</Text>
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
  const t = tones[tone];
  return (
    <View style={styles.stat}>
      {icon ? (
        <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={16} color={t.fg} />
        </View>
      ) : null}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export function ProgressBar({
  value,
  tone = "primary",
  height = 10,
}: {
  value: number;
  tone?: Tone;
  height?: number;
}) {
  const t = tones[tone];
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.progressFill,
          { width: pct + "%", backgroundColor: t.fg, borderRadius: height / 2 },
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
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleTitle, disabled && { color: palette.muted2 }]}>{title}</Text>
        {desc ? <Text style={styles.toggleDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: palette.primary, false: palette.line }}
        thumbColor={palette.white}
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
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
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
  const t = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, pressed && onPress ? { opacity: 0.7 } : null]}
    >
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: danger ? palette.dangerSoft : t.bg }]}>
          <Ionicons name={icon} size={18} color={danger ? palette.danger : t.fg} />
        </View>
      ) : null}
      <View style={styles.listText}>
        <Text style={[styles.listTitle, danger && { color: palette.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.listSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={palette.muted2} /> : null)}
    </Pressable>
  );
}

export function EmptyState({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={26} color={palette.muted2} />
      <Text style={styles.emptyText}>{title}</Text>
    </View>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <View style={styles.toast} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={18} color={palette.white} />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  cardPadded: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionTitleText: {
    fontSize: font.small,
    color: palette.muted,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: spacing.md },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: font.tiny, fontWeight: "700" },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: font.small, fontWeight: "600" },
  stat: { flex: 1, gap: 4 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statLabel: { fontSize: font.tiny, color: palette.muted, fontWeight: "600" },
  statValue: { fontSize: font.title, color: palette.ink, fontWeight: "800" },
  statHint: { fontSize: font.tiny, color: palette.muted2 },
  progressTrack: { backgroundColor: palette.surfaceAlt, overflow: "hidden" },
  progressFill: { height: "100%" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: font.body, color: palette.ink, fontWeight: "600" },
  toggleDesc: { fontSize: font.tiny, color: palette.muted },
  segmented: {
    flexDirection: "row",
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
  },
  segment: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.pill, flex: 1, alignItems: "center" },
  segmentActive: { backgroundColor: palette.surface, ...shadow.card },
  segmentText: { fontSize: font.small, color: palette.muted, fontWeight: "600" },
  segmentTextActive: { color: palette.ink },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  listIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listText: { flex: 1, gap: 2 },
  listTitle: { fontSize: font.body, color: palette.ink, fontWeight: "600" },
  listSubtitle: { fontSize: font.tiny, color: palette.muted },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { fontSize: font.small, color: palette.muted2 },
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 96,
    backgroundColor: palette.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.floating,
  },
  toastText: { color: palette.white, fontSize: font.small, fontWeight: "600", flex: 1 },
});
