import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { issueMyCardApi, myCardsApi } from "@/api/actions";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { formatPan } from "@/lib/card";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { PaymentBrand } from "@/ui/PaymentBrand";
import { Text } from "@/ui/Text";

/** Продукты семьи: карта родителя, карта ребёнка, пакет и связанные экраны. */
export default function ParentProductsScreen() {
  const { t } = useI18n();
  const { state, showToast } = useStore();
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [myCards, setMyCards] = useState<Array<{ id: string; number: string; expiry: string; system: "visa" | "mastercard" | "belkart" | "unionpay"; type: string }>>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const answer = await myCardsApi();
      setMyCards(answer.cards as typeof myCards);
    } catch {
      // карта ещё не выпущена
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const issue = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await issueMyCardApi({ type: "virtual", system: "visa" });
      showToast(t("card.issued"));
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("auth.connectFailed"));
    } finally {
      setBusy(false);
    }
  };

  const childCard = state.card;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t("pr.title")}</Text>
        <Text style={styles.subtitle}>{t("pr.subtitle")}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("pr.myCard")}</Text>
          {myCards.length === 0 ? (
            <Pressable style={styles.cta} onPress={() => void issue()}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.ctaText}>{busy ? t("pr.issuing") : t("pr.issue")}</Text>
            </Pressable>
          ) : (
            myCards.map((card) => (
              <View key={card.id} style={styles.row}>
                <PaymentBrand system={card.system} />
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{card.type === "plastic" ? t("card.plastic") : t("card.virtual")}</Text>
                  <Text style={styles.mono}>{formatPan(card.number)}</Text>
                </View>
                <Text style={styles.rowMeta}>{card.expiry}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("pr.childCard")}</Text>
          {childCard.number.length > 0 ? (
            <View style={styles.row}>
              <PaymentBrand system={childCard.system} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{childCard.type === "plastic" ? t("card.plastic") : t("card.virtual")}</Text>
                <Text style={styles.mono}>{formatPan(childCard.number)}</Text>
              </View>
              <Text style={styles.rowMeta}>{childCard.expiry}</Text>
            </View>
          ) : (
            <Pressable style={styles.cta} onPress={() => router.push("/parent/issue")}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.ctaText}>{t("pk.cardOfferCta")}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("pr.package")}</Text>
          <Text style={styles.rowTitle}>Фэмили · 9,90 BYN</Text>
          <Text style={styles.rowMeta2}>{user?.full_name ?? ""} · {state.child.name}</Text>
          <View style={styles.links}>
            <Pressable style={styles.link} onPress={() => router.push("/parent/consents")}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={styles.linkText}>{t("pr.consents")}</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={() => router.push("/parent/child-access")}>
              <Ionicons name="people-outline" size={16} color={colors.primary} />
              <Text style={styles.linkText}>{t("kid.title")}</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={() => router.push("/parent/settings")}>
              <Ionicons name="settings-outline" size={16} color={colors.primary} />
              <Text style={styles.linkText}>{t("pr.settings")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 110 },
    title: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
    subtitle: { color: colors.muted, fontSize: 13, fontWeight: "600", marginBottom: spacing.sm },
    card: { backgroundColor: colors.card, borderRadius: 24, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, gap: spacing.sm },
    cardTitle: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
    flex: { flex: 1, gap: 2 },
    rowTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
    rowMeta: { color: colors.muted, fontSize: 12, fontWeight: "600" },
    rowMeta2: { color: colors.muted, fontSize: 12, fontWeight: "600" },
    mono: { color: colors.text, fontSize: 13, fontWeight: "600", fontFamily: "monospace", letterSpacing: 1 },
    cta: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: spacing.sm },
    ctaText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
    links: { gap: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md },
    link: { flexDirection: "row", alignItems: "center", gap: 8 },
    linkText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  });
