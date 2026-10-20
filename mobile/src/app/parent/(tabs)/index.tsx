import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n, useL } from "@/i18n";
import { formatDate, formatMoney } from "@/lib/format";
import { bracketLabel, spentThisMonth } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import { font, palette, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { HeroCard } from "@/ui/Hero";
import { Badge, Card, EmptyState, ProgressBar, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

export default function ParentOverviewScreen() {
  const { t, lang } = useI18n();
  const L = useL();
  const { state, toggleCardBlock, resolveRequest, showToast } = useStore();
  const router = useRouter();

  const spent = spentThisMonth(state.txns);
  const left = Math.max(0, state.limits.monthly - spent);
  const pendingRequests = state.requests.filter((r) => r.status === "pending");
  const blocked = state.card.status === "blocked";
  const bracket = bracketLabel(state.child.bracket);

  return (
    <Screen
      title={t("ov.hello")}
      subtitle={state.child.name + " · " + (lang === "be" ? bracket.be : bracket.ru)}
      right={
        <Pressable onPress={() => router.push("/demo")} style={styles.settings} hitSlop={8}>
          <Ionicons name="settings-outline" size={20} color={palette.ink} />
        </Pressable>
      }
    >
      <HeroCard gradient={blocked ? "ink" : "parent"}>
        <Row style={styles.heroTop}>
          <Text style={styles.heroLabel}>{t("ov.balance")}</Text>
          <Badge
            label={blocked ? t("ov.blocked") : t("ov.child")}
            tone={blocked ? "danger" : "mint"}
            style={styles.heroBadge}
          />
        </Row>
        <Text style={styles.heroValue}>{formatMoney(state.balance)}</Text>
        <Text style={styles.heroCard}>•••• {state.card.last4} · {state.child.name}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t("ov.spentMonth")}</Text>
            <Text style={styles.heroStatValue}>{formatMoney(spent, 0)}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t("ov.limitLeft")}</Text>
            <Text style={styles.heroStatValue}>{formatMoney(left, 0)}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t("ov.saved")}</Text>
            <Text style={styles.heroStatValue}>{formatMoney(state.savedOnGoal, 0)}</Text>
          </View>
        </View>
        <View style={styles.heroProgress}>
          <ProgressBar value={spent / Math.max(1, state.limits.monthly)} tone="mint" />
        </View>
      </HeroCard>

      <SectionTitle
        right={pendingRequests.length ? <Badge label={String(pendingRequests.length)} tone="danger" /> : undefined}
      >
        {t("ov.requests")}
      </SectionTitle>
      {pendingRequests.length === 0 ? (
        <Card tone="alt">
          <EmptyState icon="checkmark-done-outline" title={t("ov.noRequests")} />
        </Card>
      ) : (
        pendingRequests.map((request) => (
          <Card key={request.id}>
            <Row style={styles.requestTop}>
              <Ionicons name="hand-right-outline" size={18} color={palette.warn} />
              <Text style={styles.requestTitle}>{L(request.label)}</Text>
            </Row>
            <Row style={styles.requestButtons}>
              <Button
                compact
                label={t("common.approve")}
                icon="checkmark"
                onPress={() => {
                  resolveRequest(request.id, true);
                  showToast(t("common.approve"));
                }}
                style={styles.requestButton}
              />
              <Button
                compact
                variant="ghost"
                label={t("common.decline")}
                onPress={() => resolveRequest(request.id, false)}
                style={styles.requestButton}
              />
            </Row>
          </Card>
        ))
      )}

      <SectionTitle>{t("ov.feed")}</SectionTitle>
      <Card>
        {state.txns.length === 0 ? (
          <EmptyState icon="receipt-outline" title={t("ov.empty")} />
        ) : (
          state.txns.map((txn, i) => (
            <Row key={txn.id} style={[styles.txn, i > 0 && styles.txnBorder]}>
              <View
                style={[
                  styles.txnIcon,
                  {
                    backgroundColor: txn.status === "declined" ? palette.dangerSoft : palette.surfaceAlt,
                  },
                ]}
              >
                <Ionicons
                  name={
                    txn.status === "declined"
                      ? "ban"
                      : txn.amount > 0
                        ? "arrow-down"
                        : "arrow-up"
                  }
                  size={16}
                  color={
                    txn.status === "declined"
                      ? palette.danger
                      : txn.amount > 0
                        ? palette.mint
                        : palette.ink2
                  }
                />
              </View>
              <View style={styles.txnText}>
                <Text style={styles.txnTitle} numberOfLines={1}>
                  {L(txn.title)}
                </Text>
                <Text style={styles.txnDate}>{formatDate(txn.at, lang)}</Text>
              </View>
              {txn.status === "declined" ? (
                <Badge label={t("common.locked")} tone="danger" />
              ) : (
                <Text style={[styles.txnAmount, txn.amount > 0 && { color: palette.mint }]}>
                  {formatMoney(txn.amount)}
                </Text>
              )}
            </Row>
          ))
        )}
      </Card>

      <SectionTitle>{t("ov.notifications")}</SectionTitle>
      <Card tone="alt">
        {state.notifications.slice(0, 3).map((n, i) => (
          <Row key={n.id} style={[styles.notif, i > 0 && styles.txnBorder]}>
            <Ionicons
              name={n.kind === "request" ? "hand-right-outline" : n.kind === "reward" ? "gift-outline" : "notifications-outline"}
              size={17}
              color={palette.primary}
            />
            <View style={styles.txnText}>
              <Text style={styles.notifTitle}>{L(n.title)}</Text>
              <Text style={styles.txnDate}>{L(n.body)}</Text>
            </View>
          </Row>
        ))}
      </Card>

      <View style={styles.cardControl}>
        <Button
          variant={blocked ? "secondary" : "danger"}
          icon={blocked ? "lock-open-outline" : "lock-closed-outline"}
          label={blocked ? t("ov.unblock") : t("ov.block")}
          onPress={() => {
            toggleCardBlock();
            showToast(blocked ? t("ov.unblock") : t("ov.blocked"));
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  settings: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTop: { justifyContent: "space-between" },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: font.small, fontWeight: "600" },
  heroBadge: { backgroundColor: "rgba(255,255,255,0.24)" },
  heroValue: { color: palette.white, fontSize: 36, fontWeight: "800", marginTop: spacing.sm },
  heroCard: { color: "rgba(255,255,255,0.85)", fontSize: font.small, marginTop: 2 },
  heroStats: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  heroStat: { flex: 1, gap: 3 },
  heroStatLabel: { color: "rgba(255,255,255,0.75)", fontSize: font.tiny },
  heroStatValue: { color: palette.white, fontSize: font.title, fontWeight: "800" },
  heroProgress: { marginTop: spacing.lg },
  requestTop: { gap: spacing.sm, marginBottom: spacing.md },
  requestTitle: { flex: 1, fontSize: font.body, fontWeight: "700", color: palette.ink },
  requestButtons: { gap: spacing.sm },
  requestButton: { flex: 1 },
  txn: { gap: spacing.md, paddingVertical: spacing.md },
  txnBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  txnIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txnText: { flex: 1, gap: 2 },
  txnTitle: { fontSize: font.small, fontWeight: "600", color: palette.ink },
  txnDate: { fontSize: font.tiny, color: palette.muted2 },
  txnAmount: { fontSize: font.small, fontWeight: "800", color: palette.ink },
  notif: { gap: spacing.md, paddingVertical: spacing.sm + 2 },
  notifTitle: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  cardControl: { marginTop: spacing.lg },
});
