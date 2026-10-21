import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { loadQuiz, submitQuizApi, type QuizDto } from "@/api/bonuses";
import { useI18n } from "@/i18n";
import { useStore } from "@/store/StoreProvider";
import { font, palette, radius, spacing } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Badge, Card, ProgressBar, Row, SectionTitle } from "@/ui/primitives";
import { Screen } from "@/ui/Screen";

type QuizResult = Awaited<ReturnType<typeof submitQuizApi>>;

/** Тест по финансовой грамотности: один вопрос за раз, проверка на сервере. */
export default function QuizScreen() {
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

  /** Контент приходит на двух языках — берём нужный. */
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
        <Card>
          <Text style={styles.stateText}>{t("quiz.loading")}</Text>
        </Card>
      </Screen>
    );
  }

  if (error || !quiz) {
    return (
      <Screen showBack>
        <Card>
          <Text style={styles.stateText}>{error ?? t("quiz.error")}</Text>
          <Button label={t("quiz.retry")} icon="refresh-outline" onPress={() => void load()} style={styles.retry} />
        </Card>
      </Screen>
    );
  }

  // quiz.reward — метка награды; баллы и монеты показываем рядом с ней.
  const rewardLabel = t("quiz.reward") + " +" + quiz.points + " " + t("qs.coinsShort");

  const footer = result ? (
    <Row style={styles.footerRow}>
      <Button variant="secondary" label={t("quiz.retake")} onPress={retake} style={styles.footerButton} />
      <Button label={t("quiz.finish")} onPress={() => router.back()} style={styles.footerButton} />
    </Row>
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
      {quiz.done && !result ? <Badge label={t("quiz.alreadyDone")} tone="warn" /> : null}

      {!result ? (
        <>
          <Row style={styles.progressHead}>
            <Text style={styles.progressText}>
              {t("quiz.progress", { n: String(index + 1), m: String(total) })}
            </Text>
          </Row>
          <ProgressBar value={total > 0 ? (index + 1) / total : 0} />

          {quiz.desc_ru || quiz.desc_be ? (
            <Text style={styles.desc}>{loc(quiz.desc_ru, quiz.desc_be)}</Text>
          ) : null}

          <Card>
            <Text style={styles.questionText}>
              {question ? loc(question.text_ru, question.text_be) : ""}
            </Text>

            <View style={styles.options}>
              {(question ? (lang === "be" ? question.options_be : question.options_ru) : []).map(
                (option, optionIndex) => {
                  const active = selected === optionIndex;
                  return (
                    <Pressable
                      key={String(optionIndex)}
                      onPress={() => selectOption(optionIndex)}
                      style={[styles.option, active && styles.optionActive]}
                    >
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
                    </Pressable>
                  );
                },
              )}
            </View>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <Row style={styles.summaryRow}>
              <Ionicons
                name={result.ok ? "checkmark-circle" : "close-circle"}
                size={26}
                color={result.ok ? palette.mint : palette.danger}
              />
              <Text style={styles.summaryText}>
                {t(result.ok ? "quiz.resultGood" : "quiz.resultBad", {
                  n: String(result.correct),
                  m: String(result.total),
                })}
              </Text>
            </Row>
            {result.ok && result.points > 0 ? (
              <Badge
                label={t("quiz.reward") + " +" + result.points + " " + t("qs.coinsShort")}
                tone="mint"
                style={styles.rewardBadge}
              />
            ) : null}
          </Card>

          <SectionTitle>{t("quiz.explanation")}</SectionTitle>
          {quiz.questions.map((item, questionIndex) => {
            const correct = result.results[questionIndex] === true;
            return (
              <Card key={item.id}>
                <Row style={styles.resultRow}>
                  <Ionicons
                    name={correct ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={correct ? palette.mint : palette.danger}
                  />
                  <Text style={[styles.resultText, { color: correct ? palette.mint : palette.danger }]}>
                    {correct ? t("quiz.correct") : t("quiz.wrong")}
                  </Text>
                </Row>
                <Text style={styles.resultQuestion}>{loc(item.text_ru, item.text_be)}</Text>
                <Text style={styles.why}>{loc(item.why_ru, item.why_be)}</Text>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressHead: { justifyContent: "space-between", marginTop: spacing.sm },
  progressText: { fontSize: font.small, fontWeight: "700", color: palette.ink2 },
  desc: { fontSize: font.small, color: palette.muted, lineHeight: 19 },
  questionText: { fontSize: font.h3, fontWeight: "800", color: palette.ink, lineHeight: 25 },
  options: { gap: spacing.sm, marginTop: spacing.lg },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  optionActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.muted2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: palette.primary },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: palette.primary },
  optionText: { flex: 1, fontSize: font.body, color: palette.ink, fontWeight: "600" },
  optionTextActive: { color: palette.primary },
  stateText: { fontSize: font.body, color: palette.muted, lineHeight: 21 },
  retry: { marginTop: spacing.lg },
  summaryRow: { gap: spacing.md },
  summaryText: { flex: 1, fontSize: font.title, fontWeight: "800", color: palette.ink },
  rewardBadge: { marginTop: spacing.md },
  resultRow: { gap: spacing.sm },
  resultText: { fontSize: font.small, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  resultQuestion: { fontSize: font.body, fontWeight: "700", color: palette.ink, marginTop: spacing.sm },
  why: { fontSize: font.small, color: palette.muted, lineHeight: 19, marginTop: spacing.sm },
  footerRow: { gap: spacing.sm },
  footerButton: { flex: 1 },
});
