import { api } from "./client";

export interface QuestDto {
  id: string;
  kind: "lesson" | "quiz" | "mission";
  points: number;
  title_ru: string;
  title_be: string;
  desc_ru: string | null;
  desc_be: string | null;
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
