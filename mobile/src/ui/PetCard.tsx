import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { api } from "@/api/client";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/ui/Text";

type Pet = { name: string; emoji: string; title: string; speech: string; saved: number; nextAt: number | null; nextTitle: string | null; progress: number };

/** Питомец Мобик: растёт от накоплений в копилке — чем больше накопил, тем круче. */
export function PetCard() {
  const [pet, setPet] = useState<Pet | null>(null);
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    void api<{ pet?: Pet }>("/gamification/state")
      .then((answer) => {
        if (alive && answer.pet) setPet(answer.pet);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, [bounce]);

  if (!pet) {
    return null;
  }

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.face, { transform: [{ translateY }] }]}>
        <Text style={styles.emoji}>{pet.emoji}</Text>
      </Animated.View>
      <View style={styles.text}>
        <Text style={styles.title}>{pet.name} · {pet.title}</Text>
        <Text style={styles.speech}>{pet.speech}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: Math.round(pet.progress * 100) + "%" }]} />
        </View>
        <Text style={styles.progress}>
          {pet.nextAt ? "Накоплено " + pet.saved + " BYN · до «" + pet.nextTitle + "» " + Math.max(0, pet.nextAt - pet.saved) + " BYN" : "Накоплено " + pet.saved + " BYN · максимальная форма!"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: spacing.md, alignItems: "center", backgroundColor: "rgba(147,197,253,0.1)", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(147,197,253,0.28)", padding: spacing.md },
  face: { width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(147,197,253,0.16)", alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 34 },
  text: { flex: 1, gap: 2 },
  title: { color: "#fff", fontSize: 14, fontWeight: "800" },
  speech: { color: "#c7d2e0", fontSize: 11, fontWeight: "500", lineHeight: 15 },
  track: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden", marginTop: 3 },
  fill: { height: "100%", backgroundColor: "#60a5fa" },
  progress: { color: "#8b94a3", fontSize: 10, fontWeight: "700" },
});
