import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { bracketLabel } from "@/store/permissions";
import { useStore } from "@/store/StoreProvider";
import type { ThemeMode } from "@/theme/palette";
import { font, radius, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Badge, Card, ListRow, SectionTitle, Segmented } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";

export default function ChildProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { state, setRole } = useStore();
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bracket = bracketLabel(state.child.bracket);

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "dark", label: t("theme.dark") },
    { value: "light", label: t("theme.light") },
  ];

  return (
    <Screen title={t("ct.profile")}>
      <Card>
        <View style={styles.head}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.primarySoftStrong }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(state.child.name || "M").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headText}>
            <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
              {state.child.name || t("common.child")}
            </Text>
            <Text secondary style={[styles.meta, { color: colors.muted }]}>
              {lang === "be" ? bracket.be : bracket.ru}
            </Text>
            <Badge label={t("ct.access")} tone="mint" style={styles.accessBadge} />
          </View>
        </View>
      </Card>

      <SectionTitle>{t("set.theme")}</SectionTitle>
      <Card>
        <Segmented value={mode} onChange={setMode} options={themeOptions} />
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

      <Pressable
        onPress={() => router.push("/child/request")}
        style={({ pressed }) => [
          styles.request,
          { backgroundColor: colors.primarySoft, borderColor: colors.primarySoftStrong },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="hand-right-outline" size={18} color={colors.primary} />
        <Text style={[styles.requestText, { color: colors.primary }]}>{t("rq.title")}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
    </Screen>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 20,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: font.h2, fontWeight: "700" },
    headText: { flex: 1, gap: 2 },
    name: { fontSize: font.title, fontWeight: "700" },
    meta: { fontSize: 12.5 },
    accessBadge: { marginTop: 6 },
    request: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      marginTop: spacing.lg,
    },
    requestText: { flex: 1, fontSize: font.body, fontWeight: "700" },
  });
