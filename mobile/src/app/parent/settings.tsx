import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card, Row, SectionTitle, Segmented } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

/** Один экран настроек вместо разбросанных заглушек. */
export default function ParentSettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const { state, showToast } = useStore();
  const router = useRouter();

  const openTelegram = async () => {
    try {
      const answer = await api<{ linked: boolean; url: string | null }>("/telegram/link");
      if (answer.linked) {
        showToast(t("tg.linked"));
        return;
      }
      if (answer.url) {
        await Linking.openURL(answer.url);
        showToast(t("tg.openBot"));
        return;
      }
      showToast(t("tg.notReady"));
    } catch {
      showToast(t("auth.connectFailed"));
    }
  };

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; route?: string; onPress?: () => void }[] = [
    { icon: "person-outline", label: t("set.child"), route: "/parent/child-profile" },
    { icon: "options-outline", label: t("set.rights"), route: "/parent/rights" },
    { icon: "speedometer-outline", label: t("set.limits"), route: "/parent/limits" },
    { icon: "document-text-outline", label: t("set.consents"), route: "/parent/consents" },
    { icon: "card-outline", label: t("set.card"), route: "/parent/issue" },
    { icon: "send-outline", label: t("set.telegram"), onPress: () => void openTelegram() },
  ];

  return (
    <Screen showBack title={t("set.title")} subtitle={t("set.subtitle")}>
      <Card>
        <Row style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.full_name ?? "M").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{user?.full_name ?? t("auth.roleParent")}</Text>
            <Text style={styles.phone}>{user?.phone ?? ""}</Text>
          </View>
        </Row>
      </Card>

      <SectionTitle>{t("set.title")}</SectionTitle>
      <Card>
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            onPress={() => (row.route ? router.push(row.route as never) : row.onPress?.())}
            style={[styles.row, index > 0 && styles.border]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={row.icon} size={18} color={palette.primary} />
            </View>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.muted2} />
          </Pressable>
        ))}
      </Card>
      <Text style={styles.hint}>{t("set.telegramHint")}</Text>

      <SectionTitle>{t("set.lang")}</SectionTitle>
      <Segmented
        value={lang}
        onChange={setLang}
        options={[
          { value: "ru", label: "Русский" },
          { value: "be", label: "Беларуская" },
        ]}
      />

      <SectionTitle>{state.child.name}</SectionTitle>
      <Button variant="ghost" label={t("set.signOut")} onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { gap: spacing.md },
  profileText: { flex: 1, gap: 2 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: font.h3, fontWeight: "800", color: palette.primary },
  name: { fontSize: font.title, fontWeight: "800", color: palette.ink },
  phone: { fontSize: font.small, color: palette.muted },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  border: { borderTopWidth: 1, borderTopColor: palette.line },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: font.body, fontWeight: "600", color: palette.ink },
  hint: { fontSize: 13, color: palette.muted, marginTop: spacing.sm },
});
