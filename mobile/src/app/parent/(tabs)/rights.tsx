import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useI18n, useL, type TKey } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { CategoryId, OperationId, ProductId } from "@/store/types";
import { font, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Badge, Card, Chip, Divider, Row, SectionTitle, ToggleRow } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { SlideToConfirm } from "@/ui/SlideToConfirm";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

const PRODUCT_LABEL: Record<ProductId, TKey> = {
  card: "rg.prod.card",
  pocket: "rg.prod.pocket",
  savings: "rg.prod.savings",
  deposit: "rg.prod.deposit",
  insurance: "rg.prod.insurance",
  subscriptions: "rg.prod.subscriptions",
};

const OPERATION_LABEL: Record<OperationId, TKey> = {
  pay: "rg.op.pay",
  online: "rg.op.online",
  transfer: "rg.op.transfer",
  cash: "rg.op.cash",
};

const CATEGORY_LABEL: Record<CategoryId, TKey> = {
  kids: "rg.op.kids",
  fun: "rg.op.fun",
  pharmacy: "rg.op.pharmacy",
  groceries: "rg.op.groceries",
  gambling: "rg.gambling",
  adult: "rg.adult",
};

const ALLOWED_CATEGORIES: CategoryId[] = ["kids", "fun", "pharmacy", "groceries"];

export default function ParentRightsScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const L = useL();
  const { state, togglePermission, resolveRequest, showToast } = useStore();

  const products = state.permissions.filter((p) => p.kind === "product");
  const operations = state.permissions.filter((p) => p.kind === "operation");
  const pending = state.requests.filter((r) => r.status === "pending");

  return (
    <Screen title={t("rg.title")} subtitle={t("rg.subtitle")}>
      {pending.length > 0 ? (
        <Card>
          <Row style={styles.pendingHead}>
            <Ionicons name="hand-right-outline" size={18} color={palette.warn} />
            <Text style={styles.pendingTitle}>{t("rg.pending")}</Text>
          </Row>
          {pending.map((request) => (
            <View key={request.id} style={styles.pendingItem}>
              <Text style={styles.pendingLabel}>{L(request.label)}</Text>
              <View style={styles.pendingButtons}>
                <SlideToConfirm label={t("common.swipeConfirm")} onConfirm={() => resolveRequest(request.id, true)} />
                <Button
                  compact
                  variant="ghost"
                  label={t("common.decline")}
                  onPress={() => resolveRequest(request.id, false)}
                  style={styles.pendingButton}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <SectionTitle>{t("rg.products")}</SectionTitle>
      <Card>
        {products.map((perm, i) => (
          <View key={perm.id}>
            {i > 0 ? <Divider style={styles.divider} /> : null}
            <ToggleRow
              title={t(PRODUCT_LABEL[perm.id as ProductId])}
              desc={!perm.hasConsent ? t("rg.consentNeeded") : undefined}
              value={perm.allowed}
              disabled={!perm.hasConsent}
              onChange={() => togglePermission(perm.id)}
            />
          </View>
        ))}
      </Card>

      <SectionTitle>{t("rg.operations")}</SectionTitle>
      <Card>
        {operations.map((perm, i) => (
          <View key={perm.id}>
            {i > 0 ? <Divider style={styles.divider} /> : null}
            <ToggleRow
              title={t(OPERATION_LABEL[perm.id as OperationId])}
              value={perm.allowed}
              onChange={() => togglePermission(perm.id)}
            />
          </View>
        ))}
      </Card>

      <SectionTitle>{t("rg.categories")}</SectionTitle>
      <Card>
        <Row style={styles.chips}>
          {ALLOWED_CATEGORIES.map((category) => (
            <Chip key={category} label={t(CATEGORY_LABEL[category])} selected onPress={() => undefined} />
          ))}
        </Row>
      </Card>

      <SectionTitle>{t("rg.hard")}</SectionTitle>
      <Card tone="alt">
        <Row style={styles.hardRow}>
          <View style={styles.hardIcon}>
            <Ionicons name="ban" size={17} color={palette.danger} />
          </View>
          <View style={styles.hardText}>
            <Text style={styles.hardTitle}>{t("rg.gambling")}</Text>
            <Text style={styles.hardDesc}>{t("rg.adult")}</Text>
          </View>
          <Badge label={t("common.locked")} tone="danger" />
        </Row>
        <Text style={styles.hardNote}>{t("rg.hardDesc")}</Text>
      </Card>

      <Button
        variant="secondary"
        icon="save-outline"
        label={t("rg.save")}
        onPress={() => showToast(t("rg.saved"))}
        style={styles.save}
      />
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  pendingHead: { gap: spacing.sm, marginBottom: spacing.sm },
  pendingTitle: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  pendingItem: { gap: spacing.sm, paddingVertical: spacing.sm },
  pendingLabel: { fontSize: font.small, color: palette.ink2, fontWeight: "600" },
  pendingButtons: { gap: spacing.sm },
  pendingButton: { flex: 1 },
  divider: { marginVertical: 0 },
  chips: { flexWrap: "wrap", gap: spacing.sm },
  hardRow: { gap: spacing.md },
  hardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: palette.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  hardText: { flex: 1, gap: 2 },
  hardTitle: { fontSize: font.body, fontWeight: "700", color: palette.ink },
  hardDesc: { fontSize: font.small, color: palette.muted },
  hardNote: { fontSize: font.tiny, color: palette.muted, marginTop: spacing.md, lineHeight: 16 },
  save: { marginTop: spacing.lg },
  });
};
