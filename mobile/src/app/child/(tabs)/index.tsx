import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n, useL } from "@/i18n";
import { formatPan } from "@/lib/card";
import { formatDate, formatMoney } from "@/lib/format";
import { spentThisMonth } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import { font, palette, shadow, spacing } from "@/theme/tokens";
import { HeroCard } from "@/ui/Hero";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Badge, Card, EmptyState, Row, SectionTitle } from "@/ui/primitives";
import { PrimaryAction } from "@/ui/banking";
import { TopUpSheet } from "@/ui/TopUpSheet";
import { Screen } from "@/ui/Screen";

export default function ChildHomeScreen() {
  const { t, lang } = useI18n();
  const L = useL();
  const { state, showToast } = useStore();
  const router = useRouter();
  const [topup, setTopup] = useState(false);

  const spent = spentThisMonth(state.txns);
  const left = Math.max(0, state.limits.monthly - spent);
  const myTxns = state.txns.filter((t) => t.byChild).slice(0, 4);
  const canTransfer = state.permissions.find((p) => p.id === "transfer")?.allowed ?? false;
  const canOnline = state.permissions.find((p) => p.id === "online")?.allowed ?? false;
  const cardIssued = state.card.number.length > 0;

  const quick = [
    { id: "pay", icon: "qr-code-outline" as const, label: t("pay.erip"), allowed: true, route: "/child/erip" },
    {
      id: "transfer",
      icon: "call-outline" as const,
      label: t("pay.phone"),
      allowed: canTransfer,
      route: "/child/erip?mode=phone",
    },
    { id: "topup", icon: "wallet-outline" as const, label: t("acc.tab"), allowed: true, route: "/child/accounts" },
  ];

  return (
    <Screen title={t("ch.hello", { name: state.child.name })} subtitle={t("ch.pocketNext")}>
      <HeroCard gradient="child">
        <Row style={styles.heroTop}>
          <Text style={styles.heroLabel}>{t("ch.card")}</Text>
          <Row style={styles.heroRight}>
            {cardIssued ? <PaymentBrand system={state.card.system} onDark /> : null}
            <Badge
              label={cardIssued ? t(state.card.type === "plastic" ? "card.plastic" : "card.virtual") : t("card.notIssued")}
              tone={cardIssued ? "child" : "warn"}
              style={styles.heroBadge}
            />
          </Row>
        </Row>
        <Text style={styles.heroValue}>{formatMoney(state.balance)}</Text>
        <Text style={styles.heroPan}>{cardIssued ? formatPan(state.card.number) : "•••• •••• •••• ••••"}</Text>
        <Row style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>
            {cardIssued
              ? t("card.expiry") + ": " + (state.card.expiry.length > 0 ? state.card.expiry : "••/••")
              : t("card.notIssuedChild")}
          </Text>
          {cardIssued ? (
            <Text style={styles.heroFooterText}>
              {t("ch.limitLeft")}: {formatMoney(left, 0)}
            </Text>
          ) : null}
        </Row>
      </HeroCard>

      <PrimaryAction
        icon="add-circle"
        label={t("ch.topupMoney")}
        hint={t("ch.topupHint")}
        onPress={() => setTopup(true)}
      />
      <TopUpSheet visible={topup} onClose={() => setTopup(false)} />

      <SectionTitle>{t("ch.quick")}</SectionTitle>
      <Row style={styles.quickRow}>
        {quick.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              if (!item.allowed) {
                showToast(t("ch.lockedTitle"));
                router.push("/child/blocked");
                return;
              }
              router.push(item.route);
            }}
            style={({ pressed }) => [styles.quick, pressed && { opacity: 0.8 }]}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: item.allowed ? palette.childSoft : palette.surfaceAlt },
              ]}
            >
              <Ionicons
                name={item.allowed ? item.icon : "lock-closed"}
                size={20}
                color={item.allowed ? palette.child : palette.muted2}
              />
            </View>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </Row>

      {!canOnline ? (
        <Card tone="alt">
          <Row style={styles.lockedRow}>
            <Ionicons name="lock-closed-outline" size={18} color={palette.muted} />
            <View style={styles.lockedText}>
              <Text style={styles.lockedTitle}>{t("ch.lockedTitle")}</Text>
              <Text style={styles.lockedDesc}>{t("ch.lockedDesc")}</Text>
            </View>
            <Pressable onPress={() => router.push("/child/request")}>
              <Text style={styles.link}>{t("common.request")}</Text>
            </Pressable>
          </Row>
        </Card>
      ) : null}

      <SectionTitle
        right={
          <Pressable onPress={() => router.push("/child/blocked")} hitSlop={8}>
            <Text style={styles.link}>{t("bl.title")}</Text>
          </Pressable>
        }
      >
        {t("ch.recent")}
      </SectionTitle>
      <Card>
        {myTxns.length === 0 ? (
          <EmptyState icon="receipt-outline" title={t("ch.empty")} />
        ) : (
          myTxns.map((txn, i) => (
            <Row key={txn.id} style={[styles.txn, i > 0 && styles.txnBorder]}>
              <View
                style={[
                  styles.txnIcon,
                  { backgroundColor: txn.status === "declined" ? palette.dangerSoft : palette.childSoft },
                ]}
              >
                <Ionicons
                  name={txn.status === "declined" ? "ban" : txn.amount > 0 ? "arrow-down" : "arrow-up"}
                  size={16}
                  color={txn.status === "declined" ? palette.danger : palette.childDark}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: { justifyContent: "space-between" },
  heroLabel: { color: "rgba(255,255,255,0.9)", fontSize: font.small, fontWeight: "600" },
  heroBadge: { backgroundColor: "rgba(255,255,255,0.24)" },
  heroValue: { color: palette.white, fontSize: 36, fontWeight: "800", marginTop: spacing.sm },
  heroRight: { alignItems: "center", gap: spacing.sm },
  heroPan: { color: palette.white, fontSize: font.body, fontWeight: "700", letterSpacing: 1.2, marginTop: 6 },
  heroFooter: { justifyContent: "space-between", marginTop: spacing.sm },
  heroFooterText: { color: "rgba(255,255,255,0.9)", fontSize: font.tiny, fontWeight: "600" },
  quickRow: { gap: spacing.md },
  quick: { flex: 1, alignItems: "center", gap: spacing.sm },
  quickIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  quickLabel: { fontSize: font.tiny, color: palette.ink2, fontWeight: "700", textAlign: "center" },
  lockedRow: { gap: spacing.md },
  lockedText: { flex: 1, gap: 2 },
  lockedTitle: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  lockedDesc: { fontSize: font.tiny, color: palette.muted },
  link: { fontSize: font.small, color: palette.primary, fontWeight: "700" },
  txn: { gap: spacing.md, paddingVertical: spacing.md },
  txnBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  txnIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txnText: { flex: 1, gap: 2 },
  txnTitle: { fontSize: font.small, fontWeight: "600", color: palette.ink },
  txnDate: { fontSize: font.tiny, color: palette.muted2 },
  txnAmount: { fontSize: font.small, fontWeight: "800", color: palette.ink },
});
