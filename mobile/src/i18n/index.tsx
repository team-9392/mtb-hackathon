import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { Lang } from "@/lib/format";
import { be } from "./be";
import { ru, type TKey } from "./ru";
import type { Localized } from "@/store/types";

const dicts = { ru, be } as const;

type Vars = Record<string, string | number>;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLang = "ru",
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);

  const t = useCallback(
    (key: TKey, vars?: Vars) => {
      let out: string = dicts[lang][key];
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          out = out.split("{" + name + "}").join(String(value));
        }
      }
      return out;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return ctx;
}

export function useL(): (value: Localized) => string {
  const { lang } = useI18n();
  return useCallback((value: Localized) => (lang === "be" ? value.be : value.ru), [lang]);
}

export type { TKey };
