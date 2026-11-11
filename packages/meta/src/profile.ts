import { z } from "zod";
import { STARTER_DECKS, type DeckList } from "@tcg/cards";
import { addCards, rewardCards, starterCollection, type Collection } from "./collection.ts";
import { Random } from "./random.ts";
import type { Draft, Expedition } from "./runs.ts";

/** A deck that the player saved. */
export interface SavedDeck {
  id: string;
  name: string;
  cards: Record<string, number>;
}

/** Everything that the game remembers about one player. The client keeps it in the browser storage. */
export interface Profile {
  version: 1;
  collection: Collection;
  decks: SavedDeck[];
  /** The state of the reward generator. */
  seed: number;
  wins: number;
  losses: number;
  /** The Expedition or Draft in progress. */
  run: Expedition | Draft | null;
}

/** Cards for a win and Shards for a loss in a free match. */
export const WIN_REWARD_CARDS = 3;
export const LOSS_REWARD_SHARDS = 10;

const SavedDeckSchema = z.object({ id: z.string(), name: z.string().max(40), cards: z.record(z.string(), z.number().int().min(0).max(30)) });
const ProfileSchema = z.object({
  version: z.literal(1),
  collection: z.object({ cards: z.record(z.string(), z.number().int().min(0)), shards: z.number().int().min(0) }),
  decks: z.array(SavedDeckSchema),
  seed: z.number().int(),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  run: z
    .object({ kind: z.enum(["expedition", "draft"]), deck: z.array(z.string()), status: z.enum(["active", "won", "lost"]) })
    .passthrough()
    .nullable()
    .default(null),
});

export function newProfile(seed: number): Profile {
  return {
    version: 1,
    collection: starterCollection(),
    decks: Object.entries(STARTER_DECKS).map(([id, cards]) => ({ id: `starter-${id}`, name: id, cards: { ...cards } })),
    seed: seed >>> 0,
    wins: 0,
    losses: 0,
    run: null,
  };
}

/** Reads a stored profile. Returns null if the text is not a valid profile. */
export function parseProfile(text: string | null): Profile | null {
  if (!text) return null;
  try {
    const r = ProfileSchema.safeParse(JSON.parse(text));
    return r.success ? (r.data as Profile) : null;
  } catch {
    return null;
  }
}

export function serializeProfile(p: Profile): string {
  return JSON.stringify(p);
}

/** Runs a function with the reward generator of the profile, and saves the new generator state. */
export function withRandom<T>(p: Profile, f: (rng: Random) => T): T {
  const rng = new Random(p.seed);
  const out = f(rng);
  p.seed = rng.seed;
  return out;
}

export type MatchReward = { kind: "cards"; cards: string[] } | { kind: "shards"; shards: number };

/** Records the result of a free match and gives the reward. */
export function recordMatch(p: Profile, won: boolean): MatchReward {
  if (won) {
    p.wins++;
    const cards = withRandom(p, (rng) => rewardCards(rng, WIN_REWARD_CARDS));
    addCards(p.collection, cards);
    return { kind: "cards", cards };
  }
  p.losses++;
  p.collection.shards += LOSS_REWARD_SHARDS;
  return { kind: "shards", shards: LOSS_REWARD_SHARDS };
}

export function saveDeck(p: Profile, deck: SavedDeck): void {
  const i = p.decks.findIndex((d) => d.id === deck.id);
  const copy = { ...deck, cards: Object.fromEntries(Object.entries(deck.cards).filter(([, n]) => n > 0)) };
  if (i >= 0) p.decks[i] = copy;
  else p.decks.push(copy);
}

export function deleteDeck(p: Profile, id: string): void {
  p.decks = p.decks.filter((d) => d.id !== id);
}

export function deckSize(cards: DeckList): number {
  return Object.values(cards).reduce((a, b) => a + b, 0);
}
