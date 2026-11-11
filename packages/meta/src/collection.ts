import { CARDS, collectibleCards, expandDeck, MAX_COPIES, MAX_LEGENDARY_COPIES, STARTER_DECKS, validateDeck, type CardDef, type DeckList, type DeckProblem, type Rarity } from "@tcg/cards";
import { Random } from "./random.ts";

/**
 * The collection of the player (plan, section 5.2).
 * The player gets cards from wins and from the Expedition. Duplicates become Shards. Shards create cards.
 */
export interface Collection {
  /** Copies of each card. */
  cards: Record<string, number>;
  shards: number;
}

/** Shards that a card gives when the player breaks it. */
export const SHARD_VALUE: Readonly<Record<Rarity, number>> = { common: 5, uncommon: 20, rare: 50, legendary: 200 };
/** Shards that a new card costs. */
export const CRAFT_COST: Readonly<Record<Rarity, number>> = { common: 20, uncommon: 60, rare: 200, legendary: 800 };
/** Chance of each rarity in a reward. */
export const RARITY_WEIGHTS: Readonly<Record<Rarity, number>> = { common: 70, uncommon: 22, rare: 7, legendary: 1 };

export function maxCopies(def: CardDef): number {
  return def.rarity === "legendary" ? MAX_LEGENDARY_COPIES : MAX_COPIES;
}

/** The first collection: every card of the starter decks, with the copies that the decks use. */
export function starterCollection(): Collection {
  const cards: Record<string, number> = {};
  for (const list of Object.values(STARTER_DECKS)) {
    for (const [id, n] of Object.entries(list)) cards[id] = Math.max(cards[id] ?? 0, n);
  }
  return { cards, shards: 100 };
}

export function owned(c: Collection, cardId: string): number {
  return c.cards[cardId] ?? 0;
}

export function addCards(c: Collection, ids: readonly string[]): void {
  for (const id of ids) c.cards[id] = owned(c, id) + 1;
}

/** Picks one random collectible card. The rarity follows RARITY_WEIGHTS. */
export function randomCard(rng: Random, factions?: readonly string[]): string {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng.next() * total;
  let rarity: Rarity = "common";
  for (const [r, w] of Object.entries(RARITY_WEIGHTS) as [Rarity, number][]) {
    if (roll < w) {
      rarity = r;
      break;
    }
    roll -= w;
  }
  const inFactions = (c: CardDef) => !factions || factions.includes(c.faction) || c.faction === "neutral";
  let pool = collectibleCards().filter((c) => c.rarity === rarity && inFactions(c));
  if (pool.length === 0) pool = collectibleCards().filter(inFactions);
  return rng.pick(pool).id;
}

/** A reward of n random cards. */
export function rewardCards(rng: Random, n: number, factions?: readonly string[]): string[] {
  return Array.from({ length: n }, () => randomCard(rng, factions));
}

/** Breaks one copy of a card into Shards. Returns false if the player has no copy. */
export function breakCard(c: Collection, cardId: string): boolean {
  const def = CARDS[cardId];
  if (!def || owned(c, cardId) === 0) return false;
  c.cards[cardId] = owned(c, cardId) - 1;
  if (c.cards[cardId] === 0) delete c.cards[cardId];
  c.shards += SHARD_VALUE[def.rarity];
  return true;
}

/** Creates one copy of a card with Shards. Returns false if the player has too few Shards. */
export function craftCard(c: Collection, cardId: string): boolean {
  const def = CARDS[cardId];
  if (!def || def.token) return false;
  const cost = CRAFT_COST[def.rarity];
  if (c.shards < cost) return false;
  c.shards -= cost;
  c.cards[cardId] = owned(c, cardId) + 1;
  return true;
}

/** Copies above the deck limit. The player can break them with no loss. */
export function extraCopies(c: Collection): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(c.cards)) {
    const def = CARDS[id];
    if (def && n > maxCopies(def)) out[id] = n - maxCopies(def);
  }
  return out;
}

/** Breaks every extra copy. Returns the Shards gained. */
export function breakExtras(c: Collection): number {
  const before = c.shards;
  for (const [id, n] of Object.entries(extraCopies(c))) for (let i = 0; i < n; i++) breakCard(c, id);
  return c.shards - before;
}

export type OwnedDeckProblem = DeckProblem | { code: "notOwned"; card: string; copies: number; owned: number };

/** Checks a deck: the deck rules (plan, section 3.9) and the copies in the collection. */
export function deckProblems(c: Collection, list: DeckList): OwnedDeckProblem[] {
  const problems: OwnedDeckProblem[] = validateDeck(expandDeck(list), CARDS);
  for (const [id, n] of Object.entries(list)) {
    if (n > owned(c, id) && CARDS[id]) problems.push({ code: "notOwned", card: id, copies: n, owned: owned(c, id) });
  }
  return problems;
}
