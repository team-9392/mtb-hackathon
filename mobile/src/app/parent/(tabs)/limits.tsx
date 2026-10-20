import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { font, palette, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card, Divider, Row, SectionTitle, Segmented, ToggleRow } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

function Stepper({
  label,
  value,
  step,
  onChange,
  max,
}: {
  label: string;
  value: number;
  step: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <Row style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <Row style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - step))}
          style={styles.stepperButton}
          hitSlop={6}
        >
          <Ionicons name="remove" size={18} color={palette.ink} />
        </Pressable>
        <Text style={styles.stepperValue}>{formatMoney(value, 0)}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          style={styles.stepperButton}
          hitSlop={6}
        >
          <Ionicons name="add" size={18} color={palette.ink} />
        </Pressable>
      </Row>
    </Row>
  );
}

export default function ParentLimitsScreen() {
  const { t } = useI18n();
  const { state, updateLimits, togglePermission, showToast } = useStore();

  const operationAllowed = (id: "online" | "transfer" | "cash") =>
    state.permissions.find((p) => p.id === id)?.allowed ?? false;

  return (
    <Screen title={t("lm.title")}>
      <Card tone="alt">
        <Text style={styles.summary}>
          {t("lm.summary", {
            amount: formatMoney(state.limits.monthly, 0),
            txn: formatMoney(state.limits.perTxn, 0),
          })}
        </Text>
      </Card>

      <Card>
        <Stepper
          label={t("lm.monthly")}
          value={state.limits.monthly}
          step={10}
          max={500}
          onChange={(monthly) => updateLimits({ monthly })}
        />
        <Divider style={styles.zero} />
        <Stepper
          label={t("lm.perTxn")}
          value={state.limits.perTxn}
          step={5}
          max={state.limits.monthly}
          onChange={(perTxn) => updateLimits({ perTxn })}
        />
      </Card>

      <SectionTitle>{t("rg.operations")}</SectionTitle>
      <Card>
        <ToggleRow
          title={t("lm.online")}
          value={operationAllowed("online")}
          onChange={() => togglePermission("online")}
        />
        <Divider style={styles.zero} />
        <ToggleRow
          title={t("lm.transfers")}
          value={operationAllowed("transfer")}
          onChange={() => togglePermission("transfer")}
        />
        <Divider style={styles.zero} />
        <ToggleRow
          title={t("lm.cash")}
          value={operationAllowed("cash")}
          onChange={() => togglePermission("cash")}
        />
      </Card>

      <SectionTitle>{t("lm.confirm")}</SectionTitle>
      <Card>
        <ToggleRow
          title={t("lm.confirm")}
          desc={t("lm.confirmDesc")}
          value={state.limits.confirmEach}
          onChange={(confirmEach) => updateLimits({ confirmEach })}
        />
      </Card>

      <SectionTitle>{t("lm.pocket")}</SectionTitle>
      <Card>
        <Stepper
          label={t("lm.pocketAmount")}
          value={state.limits.pocketWeekly}
          step={5}
          max={200}
          onChange={(pocketWeekly) => updateLimits({ pocketWeekly })}
        />
        <Divider style={styles.zero} />
        <View style={styles.dayBlock}>
          <Text style={styles.stepperLabel}>{t("lm.pocketDay")}</Text>
          <Segmented
            value={state.limits.pocketDay}
            onChange={(pocketDay) => updateLimits({ pocketDay })}
            options={[
              { value: "friday", label: t("lm.dayFriday") },
              { value: "monday", label: t("lm.dayMonday") },
            ]}
          />
        </View>
      </Card>

      <Button
        variant="secondary"
        icon="save-outline"
        label={t("rg.save")}
        onPress={() => showToast(t("lm.saved"))}
        style={styles.save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: font.small, color: palette.ink2, fontWeight: "600", lineHeight: 19 },
  stepperRow: { justifyContent: "space-between", paddingVertical: spacing.sm },
  stepperLabel: { flex: 1, fontSize: font.body, color: palette.ink, fontWeight: "600" },
  stepper: { gap: spacing.sm },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { minWidth: 92, textAlign: "center", fontSize: font.small, fontWeight: "800", color: palette.ink },
  dayBlock: { gap: spacing.sm, paddingVertical: spacing.sm },
  zero: { marginVertical: spacing.sm },
  save: { marginTop: spacing.lg },
});
