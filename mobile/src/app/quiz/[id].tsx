import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { loadQuiz, submitQuizApi, type QuizDto } from "@/api/bonuses";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import type { Palette } from "@/theme/palette";
import { font, radius, shadow, spacing } from "@/theme/tokens";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";

type QuizResult = Awaited<ReturnType<typeof submitQuizApi>>;

/** Тест по финансовой грамотности: один вопрос за раз, проверка на сервере. */
export default function QuizScreen() {
  const { colors, isDark } = useTheme();
  const palette = colors;
  const styles = useThemedStyles(makeStyles);

  const { t, lang } = useI18n();
  const { showToast } = useStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id;

  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Контент приходит на двух языках – берём нужный. */
  const loc = useCallback(
    (ru: string | null, be: string | null) => (lang === "be" ? be ?? ru ?? "" : ru ?? be ?? ""),
    [lang],
  );

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError(t("quiz.error"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await loadQuiz(id);
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(-1));
      setIndex(0);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("quiz.error"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = quiz?.questions.length ?? 0;
  const question = quiz?.questions[index];
  const selected = answers[index] ?? -1;
  const isLast = index === total - 1;

  const selectOption = (option: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = option;
      return next;
    });
  };

  const submit = async () => {
    if (!id || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitQuizApi(id, answers);
      setResult(data);
      // Монеты растут, только если сервер начислил баллы за этот проход.
      if (data.ok && data.points > 0) {
        showToast("+" + data.points + " " + t("qs.coinsShort"));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("quiz.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (isLast) {
      void submit();
      return;
    }
    setIndex((prev) => prev + 1);
  };

  const retake = () => {
    setResult(null);
    setIndex(0);
    setAnswers(new Array(total).fill(-1));
  };

  if (loading) {
    return (
      <Screen showBack>
        <View style={styles.stateCard}>
          <Ionicons name="hourglass-outline" size={24} color={palette.muted} />
          <Text style={styles.stateText}>{t("quiz.loading")}</Text>
        </View>
      </Screen>
    );
  }

  if (error || !quiz) {
    return (
      <Screen showBack>
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={24} color={palette.danger} />
          <Text style={styles.stateText}>{error ?? t("quiz.error")}</Text>
          <Button label={t("quiz.retry")} icon="refresh-outline" onPress={() => void load()} style={styles.retry} />
        </View>
      </Screen>
    );
  }

  // quiz.reward – метка награды; баллы и монеты показываем рядом с ней.
  const rewardLabel = t("quiz.reward") + " +" + quiz.points + " " + t("qs.coinsShort");
  const progressValue = total > 0 ? (index + 1) / total : 0;
  const progressPercent = Math.round(progressValue * 100);

  // Полоса прогресса как в макете: синий → голубой.
  const progressColors: readonly [string, string, ...string[]] = isDark
    ? ["#3b82f6", "#38bdf8"]
    : ["#2563eb", "#0ea5e9"];

  const footer = result ? (
    <View style={styles.footerRow}>
      <Button variant="secondary" label={t("quiz.retake")} onPress={retake} style={styles.footerButton} />
      <Button label={t("quiz.finish")} onPress={() => router.back()} style={styles.footerButton} />
    </View>
  ) : (
    <Button
      label={isLast ? t("quiz.check") : t("quiz.next")}
      icon={isLast ? "checkmark-outline" : "arrow-forward-outline"}
      disabled={selected < 0}
      loading={submitting}
      onPress={next}
    />
  );

  return (
    <Screen showBack title={loc(quiz.title_ru, quiz.title_be)} subtitle={rewardLabel} footer={footer}>
      {quiz.done && !result ? (
        <View style={styles.donePill}>
          <Ionicons name="checkmark-circle" size={15} color={palette.mint} />
          <Text style={styles.donePillText}>{t("quiz.alreadyDone")}</Text>
        </View>
      ) : null}

      {!result ? (
        <>
          <View style={styles.progressCard}>
            <View style={styles.progressHead}>
              <Text style={styles.progressText}>
                {t("quiz.progress", { n: String(index + 1), m: String(total) })}
              </Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={progressColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: progressValue * 100 + "%" }]}
              />
            </View>
          </View>

          {quiz.desc_ru || quiz.desc_be ? (
            <Text style={styles.desc}>{loc(quiz.desc_ru, quiz.desc_be)}</Text>
          ) : null}

          <View style={styles.questionCard}>
            <View style={styles.questionTop}>
              <View style={styles.questionBadge}>
                <Text style={styles.questionBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>
                {question ? loc(question.text_ru, question.text_be) : ""}
              </Text>
            </View>

            <View style={styles.options}>
              {(question ? (lang === "be" ? question.options_be : question.options_ru) : []).map(
                (option, optionIndex) => {
                  const active = selected === optionIndex;
                  return (
                    <Pressable
                      key={String(optionIndex)}
                      onPress={() => selectOption(optionIndex)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [
                        styles.option,
                        active ? styles.optionActive : null,
                        pressed ? styles.optionPressed : null,
                      ]}
                    >
                      <View style={[styles.radio, active ? styles.radioActive : null]}>
                        {active ? <Ionicons name="checkmark" size={13} color={palette.white} /> : null}
                      </View>
                      <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={[styles.summaryIcon, result.ok ? styles.summaryIconOk : styles.summaryIconBad]}>
                <Ionicons
                  name={result.ok ? "checkmark" : "close"}
                  size={24}
                  color={result.ok ? palette.mint : palette.danger}
                />
              </View>
              <Text style={styles.summaryText}>
                {t(result.ok ? "quiz.resultGood" : "quiz.resultBad", {
                  n: String(result.correct),
                  m: String(result.total),
                })}
              </Text>
            </View>
            {result.ok && result.points > 0 ? (
              <LinearGradient
                colors={isDark ? ["#0d2b24", "#14232b"] : ["#e6faf2", "#f2fffa"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rewardBox}
              >
                <View style={styles.rewardText}>
                  <Text style={styles.rewardLabel}>{t("quiz.reward")}</Text>
                  <Text style={styles.rewardHint}>{t("qs.rewardHint")}</Text>
                </View>
                <Text style={styles.rewardValue}>
                  +{result.points}{" "}
                  <Text style={styles.rewardUnit}>{t("qs.coinsShort")}</Text>
                </Text>
              </LinearGradient>
            ) : null}
          </View>

          <SectionTitle>{t("quiz.explanation")}</SectionTitle>
          {quiz.questions.map((item, questionIndex) => {
            const correct = result.results[questionIndex] === true;
            return (
              <View key={item.id} style={styles.explainCard}>
                <View style={styles.explainHead}>
                  <Ionicons
                    name={correct ? "checkmark-circle" : "close-circle"}
                    size={19}
                    color={correct ? palette.mint : palette.danger}
                  />
                  <Text style={[styles.explainStatus, correct ? styles.explainStatusOk : styles.explainStatusBad]}>
                    {correct ? t("quiz.correct") : t("quiz.wrong")}
                  </Text>
                </View>
                <Text style={styles.explainQuestion}>{loc(item.text_ru, item.text_be)}</Text>
                <Text style={styles.explainWhy}>{loc(item.why_ru, item.why_be)}</Text>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const palette = colors;
  return StyleSheet.create({
    stateCard: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      ...shadow.card,
    },
    stateText: { fontSize: font.body, color: palette.muted, lineHeight: 21 },
    retry: { alignSelf: "stretch" },

    donePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: palette.mintSoft,
      borderWidth: 1,
      borderColor: palette.mintSoft,
    },
    donePillText: { fontSize: 11.5, fontWeight: "700", color: palette.mint },

    progressCard: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      ...shadow.card,
    },
    progressHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    progressText: { fontSize: 12.5, fontWeight: "700", color: palette.ink2 },
    progressPercent: { fontSize: 12, fontWeight: "700", color: palette.primary },
    progressTrack: {
      width: "100%",
      height: 7,
      borderRadius: radius.pill,
      backgroundColor: palette.bgDeep,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: radius.pill },

    desc: { fontSize: 13.5, color: palette.muted, lineHeight: 19 },

    questionCard: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadow.card,
    },
    questionTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
    questionBadge: {
      minWidth: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: palette.primarySoft,
      borderWidth: 1,
      borderColor: palette.primarySoftStrong,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    questionBadgeText: { fontSize: 13, fontWeight: "800", color: palette.primary },
    questionText: { flex: 1, fontSize: 19, fontWeight: "800", color: palette.ink, lineHeight: 26 },

    options: { gap: spacing.sm, marginTop: spacing.lg },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: palette.line,
      backgroundColor: palette.surfaceAlt,
    },
    optionActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
    optionPressed: { opacity: 0.88 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: palette.muted2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioActive: { borderColor: palette.primary, backgroundColor: palette.primary },
    optionText: { flex: 1, fontSize: 14.5, color: palette.ink, fontWeight: "600", lineHeight: 20 },
    optionTextActive: { color: palette.primary },

    summaryCard: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      ...shadow.card,
    },
    summaryTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    summaryIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryIconOk: { backgroundColor: palette.mintSoft, borderColor: palette.mintSoft },
    summaryIconBad: { backgroundColor: palette.dangerSoft, borderColor: palette.dangerSoft },
    summaryText: { flex: 1, fontSize: font.h3, fontWeight: "800", color: palette.ink, lineHeight: 25 },

    rewardBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: palette.mint,
    },
    rewardText: { flex: 1, gap: 2 },
    rewardLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.7,
      textTransform: "uppercase",
      color: palette.mint,
    },
    rewardHint: { fontSize: 11.5, color: palette.muted },
    rewardValue: { fontSize: 24, fontWeight: "800", color: palette.mint, letterSpacing: -0.5 },
    rewardUnit: { fontSize: 13, fontWeight: "700", color: palette.mint },

    explainCard: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadow.card,
    },
    explainHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    explainStatus: {
      fontSize: 11.5,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    explainStatusOk: { color: palette.mint },
    explainStatusBad: { color: palette.danger },
    explainQuestion: { fontSize: font.body, fontWeight: "700", color: palette.ink, marginTop: spacing.sm, lineHeight: 21 },
    explainWhy: { fontSize: font.small, color: palette.muted, lineHeight: 19, marginTop: spacing.sm },

    footerRow: { flexDirection: "row", gap: spacing.sm },
    footerButton: { flex: 1 },
  });
};
