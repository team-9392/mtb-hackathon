import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { API_URL, isApiConfigured } from "./config";

const ACCESS_KEY = "moby.accessToken";
const REFRESH_KEY = "moby.refreshToken";

const memory: Record<string, string | null> = {};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class OfflineError extends Error {
  constructor() {
    super("Сервер недоступен");
  }
}

const canUseSecureStore = Platform.OS !== "web";
const canUseWebStore = Platform.OS === "web" && typeof globalThis.sessionStorage !== "undefined";

async function setItem(key: string, value: string | null): Promise<void> {
  memory[key] = value;
  if (canUseWebStore) {
    try {
      if (value === null) {
        globalThis.sessionStorage.removeItem(key);
      } else {
        globalThis.sessionStorage.setItem(key, value);
      }
    } catch {
      // Приватный режим браузера – остаёмся на памяти.
    }
    return;
  }
  if (!canUseSecureStore) {
    return;
  }
  if (value === null) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (memory[key] !== undefined) {
    return memory[key] ?? null;
  }
  if (canUseWebStore) {
    try {
      const stored = globalThis.sessionStorage.getItem(key);
      memory[key] = stored;
      return stored;
    } catch {
      return null;
    }
  }
  if (!canUseSecureStore) {
    return null;
  }
  const value = await SecureStore.getItemAsync(key);
  memory[key] = value;
  return value;
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setItem(ACCESS_KEY, accessToken);
  await setItem(REFRESH_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await setItem(ACCESS_KEY, null);
  await setItem(REFRESH_KEY, null);
}

export async function hasSession(): Promise<boolean> {
  return (await getItem(REFRESH_KEY)) !== null;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
}

/** Дольше этого не ждём: лучше показать ошибку, чем вечный спиннер. */
const REQUEST_TIMEOUT_MS = 20000;

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.auth !== false) {
    const token = await getItem(ACCESS_KEY);
    if (token) {
      headers.authorization = "Bearer " + token;
    }
  }

  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(API_URL + path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw controller.signal.aborted
      ? new ApiError(0, "timeout", "Сервер не ответил – попробуйте ещё раз")
      : new OfflineError();
  } finally {
    clearTimeout(timer);
  }
  return response;
}

/** Запрос к API с автоматическим обновлением access-токена. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured) {
    throw new OfflineError();
  }

  let response = await send(path, options);

  if (response.status === 401 && options.retry !== false && options.auth !== false) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await send(path, { ...options, retry: false });
    }
  }

  const text = await response.text();
  const payload = text.length > 0 ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const record = (payload ?? {}) as { error?: string; message?: string };
    throw new ApiError(response.status, record.error ?? "http_" + response.status, record.message ?? "Ошибка сервера");
  }

  return payload as T;
}

export async function refreshSession(): Promise<boolean> {
  const refreshToken = await getItem(REFRESH_KEY);
  if (!refreshToken) {
    return false;
  }
  try {
    const response = await send("/auth/refresh", { method: "POST", body: { refreshToken }, auth: false });
    if (!response.ok) {
      await clearTokens();
      return false;
    }
    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    await saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/** Токен для WebSocket. Если access протух – обновляем сессию. */
export async function accessTokenForSocket(): Promise<string | null> {
  const token = await getItem(ACCESS_KEY);
  if (token) {
    return token;
  }
  return (await refreshSession()) ? await getItem(ACCESS_KEY) : null;
}

export async function rememberPhone(phone: string): Promise<void> {
  await setItem("moby.phone", phone);
}

export async function lastPhone(): Promise<string | null> {
  return getItem("moby.phone");
}
