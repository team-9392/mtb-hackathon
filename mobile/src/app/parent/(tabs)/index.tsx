import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { useI18n, useL } from "@/i18n";
import { formatPan } from "@/lib/card";
import { formatDate, formatMoney } from "@/lib/format";
import { bracketLabel, spentThisMonth } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { HeroCard } from "@/ui/Hero";
import { ParentTopUpSheet } from "@/ui/ParentTopUpSheet";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Badge, Card, EmptyState, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { SlideToConfirm } from "@/ui/SlideToConfirm";

let cardOfferShown = false;

/** Главный экран родителя: счёт ребёнка, три главных действия, ниже — запросы и операции. */
export default function ParentOverviewScreen() {
  const { t, lang } = useI18n();
  const L = useL();
  const { state, toggleCardBlock, resolveRequest, showToast } = useStore();
  const { user } = useAuth();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const cardIssued = state.card.number.length > 0;
  const [offer, setOffer] = useState(() => !cardOfferShown && state.card.number.length === 0);
  const dismissOffer = () => {
    cardOfferShown = true;
    setOffer(false);
  };
  const startIssue = () => {
    cardOfferShown = true;
    setOffer(false);
    router.push("/parent/issue");
  };

  useEffect(() => {
    if (cardIssued && offer) {
      cardOfferShown = true;
      setOffer(false);
    }
  }, [cardIssued, offer]);

  const spent = spentThisMonth(state.txns);
  const left = Math.max(0, state.limits.monthly - spent);
  const pendingRequests = state.requests.filter((request) => request.status === "pending");
  const blocked = state.card.status === "blocked";
  const bracket = bracketLabel(state.child.bracket);
  const firstName = (user?.full_name ?? "").trim().split(" ")[0] ?? "";

  return (
    <Screen
      title={firstName.length > 0 ? t("ov.helloName", { name: firstName }) : t("ov.hello")}
      subtitle={state.child.name + " · " + (lang === "be" ? bracket.be : bracket.ru)}
      right={
        <Pressable onPress={() => router.push("/parent/settings")} style={styles.settings} hitSlop={8}>
          <Ionicons name="settings-outline" size={20} color={palette.ink} />
        </Pressable>
      }
    >
      <HeroCard gradient={blocked ? "ink" : "parent"}>
        <Row style={styles.heroTop}>
          <Text style={styles.heroLabel}>{t("ov.balance")}</Text>
          <Row style={styles.heroRight}>
            <PaymentBrand system={state.card.system} onDark />
            <Badge
              label={blocked ? t("ov.blocked") : t(state.card.type === "plastic" ? "card.plastic" : "card.virtual")}
              tone={blocked ? "danger" : "mint"}
              style={styles.heroBadge}
            />
          </Row>
        </Row>
        <Text style={styles.heroValue}>{formatMoney(state.balance)}</Text>
        <Text style={styles.heroCard}>{formatPan(state.card.number)}</Text>
        <Text style={styles.heroOwner}>
          {state.child.name} · {state.card.expiry.length > 0 ? state.card.expiry : "••/••"}
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t("ov.spentMonth")}</Text>
            <Text style={styles.heroStatValue}>{formatMoney(spent, 0)}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t("ov.saved")}</Text>
            <Text style={styles.heroStatValue}>{formatMoney(state.savedOnGoal, 0)}</Text>
          </View>
        </View>
      </HeroCard>

      {!cardIssued ? (
        <Pressable onPress={() => router.push("/parent/issue")} style={styles.offer}>
          <View style={styles.offerIcon}>
            <Ionicons name="card-outline" size={20} color={palette.primary} />
          </View>
          <View style={styles.offerText}>
            <Text style={styles.offerTitle}>{t("pk.cardOfferTitle")}</Text>
            <Text style={styles.offerHint}>{t("pk.cardOfferText")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.muted2} />
        </Pressable>
      ) : null}

      <Pressable onPress={() => router.push("/parent/child-access")} style={styles.childRow}>
        <View style={styles.childIcon}>
          <Ionicons name="people-outline" size={20} color={palette.childDark} />
        </View>
        <View style={styles.offerText}>
          <Text style={styles.childTitle}>{t("kid.title")}</Text>
          <Text style={styles.childHint}>{state.childId ? t("kid.subtitle") : t("kid.needProfile")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted2} />
      </Pressable>

      <View style={styles.actions}>
        <ActionTile
          icon="arrow-up-circle-outline"
          label={t("ov.transferChild")}
          onPress={() => setSheet(true)}
          primary
        />
        <ActionTile
          icon="speedometer-outline"
          label={t("ov.limitAction")}
          hint={t("ov.limitShort", { amount: formatMoney(left, 0) })}
          onPress={() => router.push("/parent/limits")}
        />
        <ActionTile
          icon={blocked ? "lock-open-outline" : "lock-closed-outline"}
          label={blocked ? t("ov.unblock") : t("ov.block")}
          onPress={() => {
            toggleCardBlock();
            showToast(blocked ? t("ov.unblock") : t("ov.blocked"));
          }}
        />
      </View>

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
            <View style={styles.requestButtons}>
              <SlideToConfirm
                label={t("common.swipeConfirm")}
                onConfirm={() => {
                  resolveRequest(request.id, true);
                  showToast(t("common.approve"));
                }}
              />
              <Button
                compact
                variant="ghost"
                label={t("common.decline")}
                onPress={() => resolveRequest(request.id, false)}
              />
            </View>
          </Card>
        ))
      )}

      <SectionTitle>{t("ov.feed")}</SectionTitle>
      <Card>
        {state.txns.length === 0 ? (
          <EmptyState icon="receipt-outline" title={t("ov.empty")} />
        ) : (
          state.txns.map((txn, index) => (
            <Row key={txn.id} style={[styles.txn, index > 0 && styles.txnBorder]}>
              <View
                style={[
                  styles.txnIcon,
                  { backgroundColor: txn.status === "declined" ? palette.dangerSoft : palette.surfaceAlt },
                ]}
              >
                <Ionicons
                  name={txn.status === "declined" ? "ban" : txn.amount > 0 ? "arrow-down" : "arrow-up"}
                  size={16}
                  color={txn.status === "declined" ? palette.danger : txn.amount > 0 ? palette.mint : palette.ink2}
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
        {state.notifications.length === 0 ? (
          <EmptyState icon="notifications-outline" title={t("ov.empty")} />
        ) : (
          state.notifications.slice(0, 4).map((n, index) => (
            <Row key={n.id} style={[styles.notif, index > 0 && styles.txnBorder]}>
              <Ionicons
                name={
                  n.kind === "request"
                    ? "hand-right-outline"
                    : n.kind === "reward"
                      ? "gift-outline"
                      : "notifications-outline"
                }
                size={17}
                color={palette.primary}
              />
              <View style={styles.txnText}>
                <Text style={styles.notifTitle}>{L(n.title)}</Text>
                <Text style={styles.txnDate}>{L(n.body)}</Text>
              </View>
            </Row>
          ))
        )}
      </Card>

      <Modal visible={offer} transparent animationType="fade" onRequestClose={dismissOffer}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="card" size={26} color={palette.white} />
            </View>
            <Text style={styles.modalTitle}>{t("pk.cardOfferTitle")}</Text>
            <Text style={styles.modalText}>{t("pk.cardOfferText")}</Text>
            <Button label={t("pk.cardOfferCta")} onPress={startIssue} />
            <Button variant="ghost" label={t("pk.cardOfferLater")} onPress={dismissOffer} />
          </View>
        </View>
      </Modal>

      <ParentTopUpSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}

function ActionTile({
  icon,
  label,
  hint,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        primary && styles.tilePrimary,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.tileIcon, primary && styles.tileIconPrimary]}>
        <Ionicons name={icon} size={22} color={primary ? palette.white : palette.primary} />
      </View>
      <Text style={[styles.tileLabel, primary && styles.tileLabelPrimary]} numberOfLines={2}>
        {label}
      </Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </Pressable>
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
  heroValue: { color: palette.white, fontSize: 38, fontWeight: "800", marginTop: spacing.sm, letterSpacing: -1 },
  heroCard: { color: palette.white, fontSize: font.body, fontWeight: "700", letterSpacing: 1.2, marginTop: 6 },
  heroOwner: { color: "rgba(255,255,255,0.72)", fontSize: font.tiny, marginTop: 3 },
  heroRight: { alignItems: "center", gap: spacing.sm },
  heroStats: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  heroStat: { flex: 1, gap: 3 },
  heroStatLabel: { color: "rgba(255,255,255,0.75)", fontSize: font.tiny },
  heroStatValue: { color: palette.white, fontSize: font.title, fontWeight: "800" },
  offer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  offerIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
  },
  offerText: { flex: 1, gap: 2 },
  offerTitle: { fontSize: font.small, fontWeight: "800", color: palette.ink },
  offerHint: { fontSize: 12, color: palette.ink2, lineHeight: 16 },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  childIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.childSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  childTitle: { fontSize: font.small, fontWeight: "800", color: palette.ink },
  childHint: { fontSize: 12, color: palette.muted, lineHeight: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,18,32,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: "center",
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: font.h3, fontWeight: "800", color: palette.ink, textAlign: "center" },
  modalText: { fontSize: font.small, color: palette.muted, textAlign: "center", lineHeight: 20 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.line,
  },
  tilePrimary: { backgroundColor: palette.primary, borderColor: palette.primary },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tileIconPrimary: { backgroundColor: "rgba(255,255,255,0.22)" },
  tileLabel: { fontSize: 13, fontWeight: "700", color: palette.ink },
  tileLabelPrimary: { color: palette.white },
  tileHint: { fontSize: 11.5, color: "rgba(255,255,255,0.8)" },
  requestTop: { gap: spacing.sm, marginBottom: spacing.md },
  requestTitle: { flex: 1, fontSize: font.body, fontWeight: "700", color: palette.ink },
  requestButtons: { gap: spacing.sm },
  txn: { gap: spacing.md, paddingVertical: spacing.md },
  txnBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  txnIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txnText: { flex: 1, gap: 2 },
  txnTitle: { fontSize: font.small, fontWeight: "600", color: palette.ink },
  txnDate: { fontSize: font.tiny, color: palette.muted2 },
  txnAmount: { fontSize: font.small, fontWeight: "800", color: palette.ink },
  notif: { gap: spacing.md, paddingVertical: spacing.sm + 2 },
  notifTitle: { fontSize: font.small, fontWeight: "700", color: palette.ink },
});
