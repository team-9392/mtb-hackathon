import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/i18n";
import { bracketLabel } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { Badge, Card, ListRow, Row, SectionTitle, Segmented } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

export default function ChildProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { state, setRole } = useStore();
  const router = useRouter();
  const bracket = bracketLabel(state.child.bracket);

  return (
    <Screen title={t("ct.profile")}>
      <Card>
        <Row style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{state.child.name.charAt(0)}</Text>
          </View>
          <View style={styles.headText}>
            <Text style={styles.name}>{state.child.name}</Text>
            <Text style={styles.meta}>{lang === "be" ? bracket.be : bracket.ru}</Text>
          </View>
          <Badge label={t("ct.access")} tone="mint" />
        </Row>
      </Card>

      <SectionTitle>{t("ct.lang")}</SectionTitle>
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

      <SectionTitle>{t("ct.rules")}</SectionTitle>
      <Card>
        <ListRow
          icon="ban"
          tone="danger"
          title={t("bl.gambling")}
          subtitle={t("bl.gamblingDesc")}
          onPress={() => router.push("/child/blocked")}
        />
        <ListRow
          icon="alert-circle-outline"
          tone="danger"
          title={t("bl.adult")}
          subtitle={t("bl.adultDesc")}
          onPress={() => router.push("/child/blocked")}
        />
        <ListRow
          icon="card-outline"
          tone="warn"
          title={t("bl.lost")}
          subtitle={t("bl.lostDesc")}
          onPress={() => router.push("/child/blocked")}
        />
      </Card>

      <SectionTitle>{t("ct.demo")}</SectionTitle>
      <Card>
        <ListRow icon="construct-outline" title={t("dm.title")} onPress={() => router.push("/demo")} />
        <ListRow
          icon="log-out-outline"
          title={t("ct.logout")}
          onPress={() => {
            setRole(null);
            router.replace("/");
          }}
        />
      </Card>

      <Pressable onPress={() => router.push("/child/request")} style={styles.request}>
        <Ionicons name="hand-right-outline" size={18} color={palette.primary} />
        <Text style={styles.requestText}>{t("rq.title")}</Text>
        <Ionicons name="chevron-forward" size={18} color={palette.muted2} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: palette.childSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: font.h3, fontWeight: "800", color: palette.childDark },
  headText: { flex: 1, gap: 2 },
  name: { fontSize: font.title, fontWeight: "800", color: palette.ink },
  meta: { fontSize: font.small, color: palette.muted },
  request: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  requestText: { flex: 1, fontSize: font.body, fontWeight: "700", color: palette.primary },
});
