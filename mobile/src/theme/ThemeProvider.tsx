import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";

import {
  colorsFor,
  gradientsFor,
  type Gradients,
  type Palette,
  type ThemeMode,
} from "./palette";

const STORAGE_KEY = "moby.themeMode";

export type ThemeValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: Palette;
  gradients: Gradients;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const initialColors = colorsFor("dark");
const initialGradients = gradientsFor("dark");

const ThemeContext = createContext<ThemeValue>({
  mode: "dark",
  isDark: true,
  colors: initialColors,
  gradients: initialGradients,
  setMode: () => undefined,
  toggle: () => undefined,
});

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "dark" || value === "light";
}

/** Веб-превью: ?theme=dark|light — удобно для скриншотов и проверки дизайна. */
function readPreviewMode(): ThemeMode | null {
  if (Platform.OS !== "web") {
    return null;
  }
  try {
    const search = globalThis.location?.search ?? "";
    if (search.includes("theme=light")) {
      return "light";
    }
    if (search.includes("theme=dark")) {
      return "dark";
    }
  } catch {
    // ignore
  }
  return null;
}

function readWebMode(): ThemeMode | null {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      const stored = globalThis.localStorage.getItem(STORAGE_KEY);
      return isThemeMode(stored) ? stored : null;
    }
  } catch {
    // Приватный режим браузера — остаёмся на тёмной теме.
  }
  return null;
}

async function readStoredMode(): Promise<ThemeMode | null> {
  if (Platform.OS === "web") {
    return readWebMode();
  }

  try {
    if (await SecureStore.isAvailableAsync()) {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      return isThemeMode(stored) ? stored : null;
    }
  } catch {
    // Keychain недоступен — тема просто не запомнится.
  }
  return null;
}

async function persistMode(mode: ThemeMode): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (typeof globalThis.localStorage !== "undefined") {
        globalThis.localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch {
      // ignore
    }
    return;
  }

  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(STORAGE_KEY, mode);
    }
  } catch {
    // ignore
  }
}

/**
 * Тема приложения. По умолчанию — тёмная, как в макетах.
 * Выбор пользователя сохраняется: SecureStore на телефоне, localStorage на вебе.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const preview = readPreviewMode();
    if (preview) {
      return preview;
    }
    return Platform.OS === "web" ? readWebMode() ?? "dark" : "dark";
  });

  useEffect(() => {
    if (readPreviewMode()) {
      return;
    }
    let alive = true;
    void readStoredMode().then((stored) => {
      if (alive && stored) {
        setModeState(stored);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void persistMode(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      void persistMode(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      colors: colorsFor(mode),
      gradients: gradientsFor(mode),
      setMode,
      toggle,
    }),
    [mode, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Текущая тема. Вне провайдера безопасно отдаёт тёмную тему. */
export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/**
 * Стили, зависящие от темы. Фабрику объявляйте на уровне модуля:
 * makeStyles = (colors: Palette) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
