import i18next, { type i18n as I18nInstance, type TOptions } from "i18next";
import itGame from "../locales/it/game.json" with { type: "json" };
import itCards from "../locales/it/cards.json" with { type: "json" };
import enGame from "../locales/en/game.json" with { type: "json" };
import enCards from "../locales/en/cards.json" with { type: "json" };

export const LANGUAGES = ["it", "en"] as const;
export type Lang = (typeof LANGUAGES)[number];
export const FALLBACK_LANG: Lang = "en";

/** Every locale file, by language and namespace. The i18n check tool reads them too. */
export const RESOURCES = {
  it: { game: itGame, cards: itCards },
  en: { game: enGame, cards: enCards },
} as const;

export interface Translator {
  lang: Lang;
  /** Translates a key of the "game" namespace. */
  t(key: string, options?: TOptions): string;
  /** Returns an array or an object from the "game" namespace. */
  raw<T>(key: string): T;
  i18n: I18nInstance;
}

export function isLang(value: string): value is Lang {
  return (LANGUAGES as readonly string[]).includes(value);
}

/** Picks a language from a locale string such as "it_IT.UTF-8" or "en-US". */
export function detectLang(locale: string | undefined): Lang {
  const code = (locale ?? "").slice(0, 2).toLowerCase();
  return isLang(code) ? code : FALLBACK_LANG;
}

/** Creates a translator. The setup is synchronous because the resources are bundled. */
export function createTranslator(lang: Lang): Translator {
  const instance = i18next.createInstance();
  void instance.init({
    lng: lang,
    fallbackLng: FALLBACK_LANG,
    ns: ["game", "cards"],
    defaultNS: "game",
    resources: RESOURCES as unknown as Record<string, Record<string, object>>,
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
    showSupportNotice: false,
  });
  return {
    lang,
    i18n: instance,
    t: (key, options) => String(instance.t(key, (options ?? {}) as never)),
    raw: <T>(key: string) => instance.t(key, { returnObjects: true }) as unknown as T,
  };
}

export * from "./text.ts";
export * from "./describe.ts";
export { checkLocales } from "./check.ts";
