import { api } from "./client";

export interface QuestDto {
  id: string;
  kind: "lesson" | "quiz" | "mission";
  points: number;
  title_ru: string;
  title_be: string;
  desc_ru: string | null;
  desc_be: string | null;
  questionCount: number;
  done: boolean;
}

export interface RewardDto {
  id: string;
  kind: "promo" | "theme" | "perk";
  price: number;
  title_ru: string;
  title_be: string;
  desc_ru: string | null;
  desc_be: string | null;
  value: string;
  partnerName: string | null;
  partnerLogo: string | null;
  code: string | null;
}

export interface BonusesDto {
  coins: number;
  theme: string;
  quests: QuestDto[];
  rewards: RewardDto[];
}

export const loadBonuses = (): Promise<BonusesDto> => api<BonusesDto>("/bonuses");

export const completeQuestApi = (id: string): Promise<{ ok: boolean; coins: number; points: number }> =>
  api("/quests/" + id + "/complete", { method: "POST", body: {} });

export const buyRewardApi = (id: string): Promise<{ ok: boolean; coins: number; code: string; kind: string }> =>
  api("/rewards/" + id + "/buy", { method: "POST", body: {} });

export interface QuizQuestionDto {
  id: string;
  text_ru: string;
  text_be: string;
  options_ru: string[];
  options_be: string[];
  why_ru: string;
  why_be: string;
}

export interface QuizDto {
  id: string;
  points: number;
  done: boolean;
  title_ru: string;
  title_be: string;
  desc_ru: string | null;
  desc_be: string | null;
  questions: QuizQuestionDto[];
}

export const loadQuiz = (id: string): Promise<QuizDto> => api<QuizDto>("/quizzes/" + id);

export const submitQuizApi = (
  id: string,
  answers: number[],
): Promise<{ ok: boolean; correct: number; total: number; results: boolean[]; coins: number; points: number }> =>
  api("/quests/" + id + "/quiz", { method: "POST", body: { answers } });
