import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useI18n, useL, type TKey } from "@/i18n";
import { be } from "@/i18n/be";
import { ru } from "@/i18n/ru";
import { useStore } from "@/store/StoreProvider";
import type { ProductId } from "@/store/types";
import { font, palette, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Badge, Card, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

type Target = ProductId | "limit";

const TARGETS: { target: Target; label: TKey; icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap }[] = [
  { target: "deposit", label: "rq.deposit", icon: "trending-up-outline" },
  { target: "subscriptions", label: "rq.subscriptions", icon: "albums-outline" },
  { target: "limit", label: "rq.higherLimit", icon: "speedometer-outline" },
];

export default function ChildRequestScreen() {
  const { t } = useI18n();
  const L = useL();
  const { state, requestAccess, showToast } = useStore();

  const statusOf = (target: Target) => {
    if (target === "limit") {
      const request = state.requests.find((r) => r.target === "limit");
      return request ? request.status : "none";
    }
    const perm = state.permissions.find((p) => p.id === target);
    if (perm?.allowed) {
      return "approved";
    }
    if (perm?.pendingRequest) {
      return "pending";
    }
    const request = state.requests.find((r) => r.target === target);
    return request ? request.status : "none";
  };

  const labelOf = (target: Target) =>
    TARGETS.find((item) => item.target === target)?.label ?? "rq.deposit";

  return (
    <Screen showBack title={t("rq.title")} subtitle={t("rq.subtitle")}>
      <SectionTitle>{t("rq.product")}</SectionTitle>
      {TARGETS.map((item) => {
        const status = statusOf(item.target);
        return (
          <Card key={item.target}>
            <Row style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name={item.icon} size={19} color={palette.primary} />
              </View>
              <View style={styles.text}>
                <Text style={styles.title}>{t(item.label)}</Text>
                {status === "pending" ? (
                  <Text style={styles.sub}>{t("rq.pending")}</Text>
                ) : status === "declined" ? (
                  <Text style={styles.sub}>{t("rq.declined")}</Text>
                ) : null}
              </View>
              {status === "approved" ? (
                <Badge label={t("rq.approved")} tone="mint" />
              ) : status === "pending" ? (
                <Badge label={t("common.requested")} tone="warn" />
              ) : status === "declined" ? (
                <Badge label={t("rq.declined")} tone="danger" />
              ) : (
                <Button
                  compact
                  label={t("rq.send")}
                  onPress={() => {
                    requestAccess(item.target, { ru: ru[item.label], be: be[item.label] });
                    showToast(t("rq.sent"));
                  }}
                />
              )}
            </Row>
          </Card>
        );
      })}

      {state.requests.length > 0 ? (
        <>
          <SectionTitle>{t("nt.title")}</SectionTitle>
          <Card tone="alt">
            {state.requests.map((item, i) => (
              <Row key={item.id} style={[styles.requestRow, i > 0 && styles.border]}>
                <Ionicons
                  name={
                    item.status === "approved"
                      ? "checkmark-circle"
                      : item.status === "declined"
                        ? "close-circle"
                        : "time-outline"
                  }
                  size={17}
                  color={
                    item.status === "approved"
                      ? palette.mint
                      : item.status === "declined"
                        ? palette.danger
                        : palette.warn
                  }
                />
                <Text style={styles.requestText}>
                  {L(item.label)} · {t(labelOf(item.target))}
                </Text>
                <Badge
                  label={
                    item.status === "approved"
                      ? t("rq.approved")
                      : item.status === "declined"
                        ? t("rq.declined")
                        : t("rq.pending")
                  }
                  tone={item.status === "approved" ? "mint" : item.status === "declined" ? "danger" : "warn"}
                />
              </Row>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  sub: { fontSize: font.tiny, color: palette.muted },
  requestRow: { gap: spacing.md, paddingVertical: spacing.sm + 2 },
  border: { borderTopWidth: 1, borderTopColor: palette.line },
  requestText: { flex: 1, fontSize: font.small, color: palette.ink2, fontWeight: "600" },
});
