import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TasksFromParent } from "@/ui/TasksFromParent";
import React from "react";

import { useI18n } from "@/i18n";
import { BonusesView } from "@/ui/BonusesView";
import { Pressable, View } from "react-native";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";

export default function ChildQuestsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Screen title={t("qs.title")} subtitle={t("qs.subtitle")}>
      <Pressable onPress={() => router.push("/game-budget")} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1d2430", borderRadius: 20, borderWidth: 1, borderColor: "rgba(147,197,253,0.3)", padding: 16, marginBottom: 12 }}>
        <Ionicons name="game-controller" size={22} color="#93c5fd" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Недельный бюджет</Text>
          <Text style={{ color: "#8b94a3", fontSize: 12, fontWeight: "600", marginTop: 2 }}>Игра с ИИ: тратить или экономить</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#8b94a3" />
      </Pressable>
      <TasksFromParent mode="child" />
<BonusesView audience="child" />
    </Screen>
  );
}
