import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import type { Palette } from "@/theme/palette";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";

export default function ChildBlockedScreen() {
  const { colors } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t } = useI18n();
  const { state, toggleCardBlock, showToast } = useStore();
  const blocked = state.card.status === "blocked";

  return (
    <Screen showBack title={t("bl.title")}>
      <Card>
        <Row style={styles.row}>
          <View style={[styles.icon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="ban" size={19} color={palette.danger} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{t("bl.gambling")}</Text>
            <Text style={styles.desc}>{t("bl.gamblingDesc")}</Text>
          </View>
        </Row>
      </Card>

      <Card>
        <Row style={styles.row}>
          <View style={[styles.icon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="alert-circle-outline" size={19} color={palette.danger} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{t("bl.adult")}</Text>
            <Text style={styles.desc}>{t("bl.adultDesc")}</Text>
          </View>
        </Row>
      </Card>

      <Card tone="alt">
        <Row style={styles.row}>
          <View style={[styles.icon, { backgroundColor: palette.warnSoft }]}>
            <Ionicons name="speedometer-outline" size={19} color="#B26A00" />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{t("bl.limit")}</Text>
            <Text style={styles.desc}>{t("bl.limitDesc")}</Text>
          </View>
        </Row>
      </Card>

      <SectionTitle>{t("ct.rules")}</SectionTitle>
      <Card>
        <Row style={styles.row}>
          <View style={[styles.icon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="card-outline" size={19} color={palette.primary} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{t("bl.lost")}</Text>
            <Text style={styles.desc}>{t("bl.lostDesc")}</Text>
          </View>
        </Row>
        <Button
          variant={blocked ? "secondary" : "danger"}
          icon={blocked ? "lock-open-outline" : "lock-closed-outline"}
          label={blocked ? t("ov.unblock") : t("bl.block")}
          onPress={() => {
            toggleCardBlock();
            showToast(blocked ? t("ov.unblock") : t("bl.blocked"));
          }}
          style={styles.action}
        />
      </Card>

      <Card>
        <Row style={styles.row}>
          <View style={[styles.icon, { backgroundColor: palette.surfaceAlt }]}>
            <Ionicons name="help-buoy-outline" size={19} color={palette.ink2} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{t("bl.dispute")}</Text>
            <Text style={styles.desc}>{t("bl.disputeDesc")}</Text>
          </View>
        </Row>
      </Card>

      <Card tone="alt">
        <Row style={styles.row}>
          <Ionicons name="people-outline" size={18} color={palette.muted} />
          <Text style={styles.desc}>{t("ct.access")}</Text>
        </Row>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
  row: { gap: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 3 },
  title: { fontSize: font.small, fontWeight: "700", color: palette.ink },
  desc: { fontSize: font.tiny, color: palette.muted, lineHeight: 16 },
  action: { marginTop: spacing.lg },
  });
};
