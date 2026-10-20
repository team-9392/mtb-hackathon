import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useI18n, type TKey } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, palette, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card, ListRow, Row, SectionTitle, Segmented } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

const PARENT_STEPS: { label: TKey; route: string }[] = [
  { label: "p1.title", route: "/parent/offer" },
  { label: "p2.title", route: "/parent/child-profile" },
  { label: "p3.title", route: "/parent/consents" },
  { label: "p4.title", route: "/parent/issue" },
  { label: "p5.title", route: "/parent/access" },
  { label: "ov.tab", route: "/parent" },
  { label: "rg.tab", route: "/parent/rights" },
  { label: "lm.tab", route: "/parent/limits" },
  { label: "pg.tab", route: "/parent/progress" },
];

const CHILD_STEPS: { label: TKey; route: string }[] = [
  { label: "ch.tab", route: "/child" },
  { label: "gl.tab", route: "/child/goal" },
  { label: "qs.tab", route: "/child/quests" },
  { label: "ct.profile", route: "/child/profile" },
  { label: "rq.title", route: "/child/request" },
  { label: "bl.title", route: "/child/blocked" },
];

export default function DemoScreen() {
  const { t, lang, setLang } = useI18n();
  const { state, reset, setRole } = useStore();
  const router = useRouter();

  return (
    <Screen
      showBack
      title={t("dm.title")}
      subtitle={t("s1.demoHint")}
      footer={
        <Button
          variant="danger"
          icon="refresh"
          label={t("dm.reset")}
          onPress={() => {
            reset();
            router.replace("/");
          }}
        />
      }
    >
      <Card tone="alt">
        <Row style={styles.statusRow}>
          <Ionicons name="phone-portrait-outline" size={17} color={palette.primary} />
          <Text style={styles.statusText}>{t("dm.sync")}</Text>
          <Text style={styles.statusValue}>{t("dm.syncOff")}</Text>
        </Row>
        <Row style={[styles.statusRow, styles.border]}>
          <Ionicons name="person-outline" size={17} color={palette.primary} />
          <Text style={styles.statusText}>{t("common.status")}</Text>
          <Text style={styles.statusValue}>
            {state.role === "child" ? t("common.child") : state.role === "parent" ? t("common.parent") : "—"}
            {state.accessGranted ? " · " + t("p5.granted") : ""}
          </Text>
        </Row>
      </Card>

      <SectionTitle>{t("dm.language")}</SectionTitle>
      <Card>
        <Segmented
          value={lang}
          onChange={setLang}
          options={[
            { value: "ru", label: "Русский" },
            { value: "be", label: "Беларуская" },
          ]}
        />
      </Card>

      <SectionTitle>{t("dm.parent")}</SectionTitle>
      <Card>
        {PARENT_STEPS.map((step, i) => (
          <View key={step.route}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <ListRow
              icon="chevron-forward"
              title={t(step.label)}
              subtitle={i + 1 + " / " + PARENT_STEPS.length}
              onPress={() => {
                setRole("parent");
                router.push(step.route);
              }}
            />
          </View>
        ))}
      </Card>

      <SectionTitle>{t("dm.child")}</SectionTitle>
      <Card>
        {CHILD_STEPS.map((step, i) => (
          <View key={step.route}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <ListRow
              icon="chevron-forward"
              title={t(step.label)}
              subtitle={i + 1 + " / " + CHILD_STEPS.length}
              onPress={() => {
                setRole("child");
                router.push(step.route);
              }}
            />
          </View>
        ))}
      </Card>

      <SectionTitle>{t("dm.role")}</SectionTitle>
      <Card>
        <ListRow
          icon="people-outline"
          title={t("s1.parentTitle")}
          onPress={() => {
            setRole("parent");
            router.replace("/parent");
          }}
        />
        <ListRow
          icon="happy-outline"
          title={t("s1.childTitle")}
          onPress={() => {
            setRole("child");
            router.replace("/child");
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { gap: spacing.md, paddingVertical: spacing.sm },
  border: { borderTopWidth: 1, borderTopColor: palette.line },
  statusText: { flex: 1, fontSize: font.small, color: palette.ink2, fontWeight: "600" },
  statusValue: { fontSize: font.tiny, color: palette.muted, fontWeight: "700" },
  divider: { height: 1, backgroundColor: palette.line },
});
