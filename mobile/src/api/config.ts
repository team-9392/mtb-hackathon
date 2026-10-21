import Constants from "expo-constants";

interface Extra {
  apiUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/**
 * Адрес API. Задаётся в app.json → expo.extra.apiUrl или переменной
 * EXPO_PUBLIC_API_URL. Пока адрес пустой, приложение честно работает
 * в демо-режиме на локальных данных — стенд не падает без сети.
 */
const DEFAULT_API_URL = "https://malanka.jaraslau.dev/moby";

export const API_URL = (extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");

export const isApiConfigured = API_URL.length > 0;
