import { CARDS, KEYWORDS } from "@tcg/cards";
import { LANGUAGES, RESOURCES } from "./index.ts";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function flatten(obj: Json, prefix: string, out: Map<string, string>): void {
  if (typeof obj === "string") {
    out.set(prefix, obj);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
}

function placeholders(s: string): string {
  return [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(",");
}

/**
 * Checks the locale files (plan, section 6.8):
 * every key exists in every language, the placeholders match, and every card has a name.
 */
export function checkLocales(): string[] {
  const problems: string[] = [];
  const namespaces = Object.keys(RESOURCES.en) as (keyof (typeof RESOURCES)["en"])[];
  for (const ns of namespaces) {
    const maps = new Map<string, Map<string, string>>();
    for (const lang of LANGUAGES) {
      const m = new Map<string, string>();
      flatten(RESOURCES[lang][ns] as Json, "", m);
      maps.set(lang, m);
    }
    const all = new Set<string>();
    for (const m of maps.values()) for (const k of m.keys()) all.add(k);
    for (const key of all) {
      const values = LANGUAGES.map((lang) => maps.get(lang)?.get(key));
      LANGUAGES.forEach((lang, i) => {
        if (values[i] === undefined) problems.push(`${lang}/${ns}: missing key "${key}"`);
      });
      const defined = values.filter((v): v is string => v !== undefined);
      const ph = new Set(defined.map(placeholders));
      if (ph.size > 1) problems.push(`${ns}: placeholders differ for "${key}"`);
    }
  }
  for (const lang of LANGUAGES) {
    const cards = RESOURCES[lang].cards as Record<string, { name?: string; flavor?: string }>;
    for (const id of Object.keys(CARDS)) {
      if (!cards[id]?.name) problems.push(`${lang}/cards: missing name for ${id}`);
      if (!CARDS[id]?.token && !cards[id]?.flavor) problems.push(`${lang}/cards: missing flavor for ${id}`);
    }
    for (const id of Object.keys(cards)) if (!CARDS[id]) problems.push(`${lang}/cards: unknown card ${id}`);
    const game = RESOURCES[lang].game as { keywords: Record<string, { name?: string; reminder?: string }> };
    for (const k of KEYWORDS) if (!game.keywords[k]?.name || !game.keywords[k]?.reminder) problems.push(`${lang}/game: keyword ${k} is incomplete`);
  }
  return problems;
}
