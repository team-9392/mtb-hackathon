import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import type { AgeBracket, ConsentId } from "@/store/types";

/**
 * Черновик регистрации родителя.
 *
 * Шаги 1–6 идут по одному сценарию: телефон → код → данные родителя →
 * ребёнок → согласия → оплата пакета. Всё, что человек ввёл, сразу лежит
 * в этом черновике: если приложение закрыть, при следующем запуске
 * откроется тот же шаг (см. src/app/index.tsx и src/app/auth/role.tsx).
 */

export const SIGNUP_STORAGE_KEY = "moby.signupDraft";
export const SIGNUP_TOTAL_STEPS = 6;
/** Стоимость пакета «Фэмили», BYN в месяц. */
export const SIGNUP_PACKAGE_PRICE = 9.9;

export type SignupStep = 1 | 2 | 3 | 4 | 5 | 6;
export type OperatorCode = "29" | "33" | "44" | "25";
export type PaymentMethod = "account" | "card";

/** Коды операторов из макета: только эти четыре варианта. */
export const OPERATOR_CODES: OperatorCode[] = ["29", "33", "44", "25"];
export const CONSENT_IDS: ConsentId[] = ["legal", "pd", "access", "written14"];

export type ConsentDraft = Record<ConsentId, boolean>;

export interface SignupDraft {
  step: SignupStep;
  operator: OperatorCode;
  /** 7 цифр номера без кода оператора. */
  subscriber: string;
  /** Итоговый номер в формате 375XXXXXXXXX (12 цифр). */
  phone: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  childName: string;
  bracket: AgeBracket;
  consents: ConsentDraft;
  paymentMethod: PaymentMethod;
  updatedAt: string;
}

export const ID_NUMBER_PATTERN = /^\d{7}[A-Z]\d{3}[A-Z]{2}\d$/;
export const SUBSCRIBER_PATTERN = /^\d{7}$/;
export const PHONE_PATTERN = /^375(29|33|44|25)\d{7}$/;

export function emptySignupDraft(): SignupDraft {
  return {
    step: 1,
    operator: "29",
    subscriber: "",
    phone: "",
    firstName: "",
    lastName: "",
    idNumber: "",
    childName: "",
    bracket: "child_7_13",
    consents: { legal: false, pd: false, access: false, written14: false },
    paymentMethod: "account",
    updatedAt: new Date().toISOString(),
  };
}

/** ИН: только латиница и цифры, всегда в верхнем регистре, максимум 14 символов. */
export function normalizeIdNumber(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 14);
}

export function isValidIdNumber(value: string): boolean {
  return ID_NUMBER_PATTERN.test(value);
}

/** В номере только цифры: код оператора выбирается отдельно. */
export function normalizeSubscriber(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 7);
}

/** 7 цифр в читаемом виде: 123 45 67. */
export function formatSubscriber(raw: string): string {
  const clean = normalizeSubscriber(raw);
  return [clean.slice(0, 3), clean.slice(3, 5), clean.slice(5, 7)].filter((part) => part.length > 0).join(" ");
}

export function composePhone(operator: OperatorCode, subscriber: string): string {
  const clean = normalizeSubscriber(subscriber);
  return clean.length === 0 ? "" : "375" + operator + clean;
}

/** Разбирает сохранённый номер: +375 29 123 45 67 → 29 + 1234567. */
export function phoneParts(phone: string | null | undefined): { operator: OperatorCode; subscriber: string } {
  const digits = (phone ?? "").replace(/\D/g, "");
  const tail = digits.startsWith("375") ? digits.slice(3) : digits;
  const code = tail.slice(0, 2);
  const operator = (OPERATOR_CODES as string[]).includes(code) ? (code as OperatorCode) : "29";
  const subscriber = tail.slice(2, 9);
  return { operator, subscriber: SUBSCRIBER_PATTERN.test(subscriber) ? subscriber : "" };
}

/** +375 29 123 45 67 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const parts = phoneParts(phone);
  if (!SUBSCRIBER_PATTERN.test(parts.subscriber)) {
    return "+375 " + parts.operator;
  }
  return "+375 " + parts.operator + " " + formatSubscriber(parts.subscriber);
}

/** Буквы, пробел, дефис и апостроф; минимум две буквы. */
export function isValidName(value: string): boolean {
  const clean = (value ?? "").trim();
  if (clean.length < 2) {
    return false;
  }
  if (!/^[A-Za-zА-Яа-яЁёЎўІі]/.test(clean)) {
    return false;
  }
  return /^[A-Za-zА-Яа-яЁёЎўІі'’ -]+$/.test(clean);
}

/** Письменное согласие нужно только подростку 14–17. */
export function isConsentRequired(id: ConsentId, bracket: AgeBracket): boolean {
  return id === "written14" ? bracket === "teen_14_17" : true;
}

export function checkedConsentIds(draft: SignupDraft): ConsentId[] {
  return CONSENT_IDS.filter((id) => draft.consents[id]);
}

export function missingRequiredConsents(draft: SignupDraft): ConsentId[] {
  return CONSENT_IDS.filter((id) => isConsentRequired(id, draft.bracket) && !draft.consents[id]);
}

export function fullNameOf(draft: SignupDraft): string {
  return [(draft.firstName ?? "").trim(), (draft.lastName ?? "").trim()].filter((part) => part.length > 0).join(" ");
}

/**
 * Первый незаполненный шаг. По нему экран оплаты не даёт уйти вперёд,
 * а старт приложения открывает именно тот шаг, на котором человек остановился.
 */
export function firstIncompleteStep(draft: SignupDraft): SignupStep | null {
  const parentReady =
    isValidName(draft.firstName) && isValidName(draft.lastName) && isValidIdNumber(draft.idNumber);
  if (!parentReady) {
    return 3;
  }
  if (!isValidName(draft.childName)) {
    return 4;
  }
  if (missingRequiredConsents(draft).length > 0) {
    return 5;
  }
  return null;
}

export function routeForStep(step: SignupStep, draft?: SignupDraft | null): string {
  switch (step) {
    case 2: {
      const phone = draft?.phone ?? "";
      return phone.length > 0
        ? "/auth/code?phone=" + encodeURIComponent(phone) + "&channel=none"
        : "/auth/phone";
    }
    case 3:
      return "/auth/parent-data";
    case 4:
      return "/auth/child";
    case 5:
      return "/auth/consents";
    case 6:
      return "/auth/payment";
    default:
      return "/auth/phone";
  }
}

type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function webStorage(): WebStorage | null {
  try {
    return (globalThis as unknown as { localStorage?: WebStorage }).localStorage ?? null;
  } catch {
    return null;
  }
}

let cache: SignupDraft | null = null;
let loaded = false;

function sanitize(raw: unknown): SignupDraft | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<SignupDraft>;
  const base = emptySignupDraft();
  const stepNumber = typeof data.step === "number" ? Math.round(data.step) : 1;
  const step = (stepNumber >= 1 && stepNumber <= SIGNUP_TOTAL_STEPS ? stepNumber : 1) as SignupStep;
  const operator = (OPERATOR_CODES as string[]).includes(String(data.operator))
    ? (data.operator as OperatorCode)
    : base.operator;
  const subscriber = normalizeSubscriber(String(data.subscriber ?? ""));
  const storedPhone = String(data.phone ?? "");
  const phone =
    subscriber.length === 7
      ? composePhone(operator, subscriber)
      : PHONE_PATTERN.test(storedPhone)
        ? storedPhone
        : "";
  const consents = data.consents && typeof data.consents === "object" ? data.consents : {};
  return {
    ...base,
    step,
    operator,
    subscriber,
    phone,
    firstName: String(data.firstName ?? "").slice(0, 40),
    lastName: String(data.lastName ?? "").slice(0, 40),
    idNumber: normalizeIdNumber(String(data.idNumber ?? "")),
    childName: String(data.childName ?? "").slice(0, 40),
    bracket: data.bracket === "teen_14_17" ? "teen_14_17" : "child_7_13",
    consents: {
      legal: Boolean((consents as Partial<ConsentDraft>).legal),
      pd: Boolean((consents as Partial<ConsentDraft>).pd),
      access: Boolean((consents as Partial<ConsentDraft>).access),
      written14: Boolean((consents as Partial<ConsentDraft>).written14),
    },
    paymentMethod: data.paymentMethod === "card" ? "card" : "account",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : base.updatedAt,
  };
}

async function readRaw(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return webStorage()?.getItem(SIGNUP_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
  try {
    if (await SecureStore.isAvailableAsync()) {
      return await SecureStore.getItemAsync(SIGNUP_STORAGE_KEY);
    }
  } catch {
    // Keychain недоступен – черновик проживёт до перезапуска.
  }
  return null;
}

async function writeRaw(value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      const storage = webStorage();
      if (!storage) {
        return;
      }
      if (value === null) {
        storage.removeItem(SIGNUP_STORAGE_KEY);
      } else {
        storage.setItem(SIGNUP_STORAGE_KEY, value);
      }
    } catch {
      // Приватный режим браузера – черновик остаётся в памяти.
    }
    return;
  }
  try {
    if (!(await SecureStore.isAvailableAsync())) {
      return;
    }
    if (value === null) {
      await SecureStore.deleteItemAsync(SIGNUP_STORAGE_KEY);
    } else {
      await SecureStore.setItemAsync(SIGNUP_STORAGE_KEY, value);
    }
  } catch {
    // ignore
  }
}

/** Чтение черновика. Результат кэшируется до конца сессии. */
export async function loadSignupDraft(): Promise<SignupDraft | null> {
  if (loaded) {
    return cache;
  }
  const raw = await readRaw();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = null;
    }
  }
  cache = sanitize(parsed);
  loaded = true;
  return cache;
}

/** Синхронный снимок для экранов, которые уже загрузили черновик. */
export function readSignupDraft(): SignupDraft | null {
  return cache;
}

/** Сохранить черновик сразу (навигация, уход с экрана, оплата). */
export async function persistSignupDraft(draft: SignupDraft): Promise<void> {
  cache = draft;
  loaded = true;
  await writeRaw(JSON.stringify(draft));
}

export async function clearSignupDraft(): Promise<void> {
  cache = null;
  loaded = true;
  await writeRaw(null);
}

/** Обновить кэш без записи: хук пишет на диск с небольшой задержкой. */
export function rememberSignupDraft(draft: SignupDraft): void {
  cache = draft;
  loaded = true;
}

/**
 * Черновик как состояние экрана: любое поле сразу попадает в кэш,
 * а на диск уходит с задержкой 250 мс, чтобы не дёргать Keychain на каждую букву.
 */
export function useSignupDraft() {
  const [draft, setDraft] = useState<SignupDraft>(() => cache ?? emptySignupDraft());
  const [ready, setReady] = useState<boolean>(loaded);
  const ref = useRef(draft);
  ref.current = draft;
  const dirtyRef = useRef(false);
  const clearedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loaded) {
      setReady(true);
      return;
    }
    let alive = true;
    void loadSignupDraft().then((stored) => {
      if (!alive) {
        return;
      }
      if (stored && !dirtyRef.current) {
        ref.current = stored;
        setDraft(stored);
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (dirtyRef.current && !clearedRef.current) {
      void persistSignupDraft(ref.current);
    }
  }, []);

  /** Регистрация завершена: черновик удаляем и больше не сохраняем при размонтировании. */
  const clear = useCallback(async () => {
    clearedRef.current = true;
    dirtyRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await clearSignupDraft();
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (dirtyRef.current && !clearedRef.current) {
        void persistSignupDraft(ref.current);
      }
    },
    [],
  );

  const patch = useCallback((update: Partial<SignupDraft>) => {
    if (clearedRef.current) {
      return;
    }
    const next: SignupDraft = { ...ref.current, ...update, updatedAt: new Date().toISOString() };
    ref.current = next;
    dirtyRef.current = true;
    setDraft(next);
    rememberSignupDraft(next);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persistSignupDraft(ref.current);
    }, 250);
  }, []);

  return { draft, ready, patch, flush, clear };
}