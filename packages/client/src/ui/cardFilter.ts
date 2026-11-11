import { collectibleCards, FACTIONS, type CardDef } from "@tcg/cards";
import { cardName, type Translator } from "@tcg/i18n";

export interface CardFilter {
  faction: string;
  text: string;
  maxCost: number | null;
}

export const ALL = "all";
export const FILTER_FACTIONS: readonly string[] = [ALL, ...FACTIONS];

/** Collectible cards that match the filter, sorted by faction order, cost and name. */
export function filterCards(tr: Translator, f: CardFilter, extra: (c: CardDef) => boolean = () => true): CardDef[] {
  const text = f.text.trim().toLowerCase();
  return collectibleCards()
    .filter((c) => (f.faction === ALL || c.faction === f.faction) && extra(c))
    .filter((c) => f.maxCost === null || c.cost <= f.maxCost)
    .filter((c) => !text || cardName(tr, c.id).toLowerCase().includes(text))
    .sort((a, b) => FACTIONS.indexOf(a.faction) - FACTIONS.indexOf(b.faction) || a.cost - b.cost || a.id.localeCompare(b.id));
}
