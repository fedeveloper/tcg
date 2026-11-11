import type { CardDef } from "./schema.ts";

/** Deck rules from the plan, section 3.9. */
export const DECK_SIZE = 30;
export const MAX_COPIES = 2;
export const MAX_LEGENDARY_COPIES = 1;
export const MAX_FACTIONS = 2;

export type DeckList = Readonly<Record<string, number>>;

export function expandDeck(list: DeckList): string[] {
  const out: string[] = [];
  for (const [id, n] of Object.entries(list)) {
    for (let i = 0; i < n; i++) out.push(id);
  }
  return out;
}

export type DeckProblem =
  | { code: "size"; size: number }
  | { code: "unknownCard"; card: string }
  | { code: "notCollectible"; card: string }
  | { code: "tooManyCopies"; card: string; copies: number }
  | { code: "tooManyFactions"; factions: string[] };

export function validateDeck(
  cards: readonly string[],
  db: Readonly<Record<string, CardDef>>,
): DeckProblem[] {
  const problems: DeckProblem[] = [];
  if (cards.length !== DECK_SIZE) problems.push({ code: "size", size: cards.length });
  const counts = new Map<string, number>();
  const factions = new Set<string>();
  for (const id of cards) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, copies] of counts) {
    const def = db[id];
    if (!def) {
      problems.push({ code: "unknownCard", card: id });
      continue;
    }
    if (def.token) problems.push({ code: "notCollectible", card: id });
    const max = def.rarity === "legendary" ? MAX_LEGENDARY_COPIES : MAX_COPIES;
    if (copies > max) problems.push({ code: "tooManyCopies", card: id, copies });
    if (def.faction !== "neutral") factions.add(def.faction);
  }
  if (factions.size > MAX_FACTIONS) problems.push({ code: "tooManyFactions", factions: [...factions] });
  return problems;
}

/** Starter decks for the text interface, the AI and the simulator. */
export const STARTER_DECKS: Readonly<Record<string, DeckList>> = {
  forge: {
    "forge-001": 2, "forge-003": 2, "forge-004": 2, "forge-005": 1, "forge-006": 2,
    "forge-007": 2, "forge-008": 2, "forge-009": 2, "forge-011": 1, "forge-012": 2,
    "forge-013": 1, "forge-014": 1, "forge-015": 2, "forge-016": 2, "forge-017": 1,
    "forge-019": 1, "forge-020": 2, "forge-026": 2,
  },
  sprout: {
    "sprout-001": 2, "sprout-002": 2, "sprout-003": 2, "sprout-004": 2, "sprout-005": 2,
    "sprout-006": 1, "sprout-007": 2, "sprout-008": 2, "sprout-010": 1, "sprout-011": 1,
    "sprout-012": 2, "sprout-013": 2, "sprout-014": 2, "sprout-016": 2, "sprout-017": 2,
    "sprout-019": 1, "sprout-022": 1, "sprout-024": 1,
  },
  forgeSprout: {
    "forge-001": 2, "forge-003": 2, "forge-007": 2, "forge-008": 2, "forge-012": 2,
    "forge-013": 1, "forge-015": 1, "forge-016": 2,
    "sprout-004": 2, "sprout-008": 2, "sprout-009": 2, "sprout-011": 1, "sprout-012": 2,
    "sprout-013": 2, "sprout-016": 2, "sprout-017": 2, "sprout-025": 1,
  },
  abyss: {
    "abyss-001": 2, "abyss-002": 2, "abyss-003": 2, "abyss-004": 2, "abyss-005": 2, "abyss-006": 2, "abyss-007": 2, "abyss-008": 2, "abyss-009": 2, "abyss-010": 1,
    "abyss-011": 1, "abyss-012": 1, "abyss-013": 1, "abyss-014": 1, "abyss-015": 2, "abyss-016": 1, "abyss-017": 2, "abyss-018": 1, "abyss-021": 1,
  },
  gear: {
    "gear-001": 2, "gear-002": 2, "gear-003": 2, "gear-004": 2, "gear-005": 1, "gear-006": 2, "gear-007": 1, "gear-008": 2, "gear-009": 2, "gear-010": 1,
    "gear-011": 1, "gear-012": 1, "gear-013": 1, "gear-015": 2, "gear-016": 2, "gear-021": 2, "gear-023": 2, "gear-026": 2,
  },
  vesper: {
    "vesper-001": 2, "vesper-002": 2, "vesper-003": 2, "vesper-004": 2, "vesper-005": 2, "vesper-006": 2, "vesper-007": 2, "vesper-008": 2, "vesper-009": 2, "vesper-010": 1,
    "vesper-011": 1, "vesper-012": 1, "vesper-013": 1, "vesper-014": 1, "vesper-015": 1, "vesper-016": 1, "vesper-017": 2, "vesper-018": 1, "vesper-019": 1, "vesper-024": 1,
  },
};

/**
 * Builds a random legal deck from the collectible cards of the given factions.
 * "random" returns a number in [0, 1).
 */
export function randomDeck(
  db: Readonly<Record<string, CardDef>>,
  factions: readonly string[],
  random: () => number,
): string[] {
  const pool = Object.values(db).filter((c) => !c.token && factions.includes(c.faction));
  const counts = new Map<string, number>();
  const deck: string[] = [];
  let guard = 0;
  while (deck.length < DECK_SIZE) {
    if (guard++ > 10_000) throw new Error(`Not enough cards for a deck of ${factions.join("+")}`);
    const card = pool[Math.floor(random() * pool.length)];
    if (!card) continue;
    const max = card.rarity === "legendary" ? MAX_LEGENDARY_COPIES : MAX_COPIES;
    const n = counts.get(card.id) ?? 0;
    if (n >= max) continue;
    counts.set(card.id, n + 1);
    deck.push(card.id);
  }
  return deck;
}
