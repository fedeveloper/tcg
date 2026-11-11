import { CARDS, collectibleCards, expandDeck, STARTER_DECKS } from "@tcg/cards";
import { addCards, randomCard, type Collection } from "./collection.ts";
import { Random } from "./random.ts";

/** The AI levels that a run uses. It is the same list as in @tcg/ai, without "random". */
export type RunLevel = "easy" | "medium";

/** One opponent of a run. */
export interface RunOpponent {
  deck: string;
  level: RunLevel;
  boss: boolean;
}

/** A choice of one card from a few options. */
export interface Pick {
  options: string[];
}

interface RunBase {
  seed: number;
  /** The cards of the run deck. */
  deck: string[];
  wins: number;
  losses: number;
  status: "active" | "won" | "lost";
  /** A card choice that the player must make before the next match. */
  pick: Pick | null;
}

/**
 * Expedition: a single-player roguelite campaign (plan, section 5.1).
 * The player starts with a small deck of one faction and adds a card after every win.
 * The run ends after the last opponent (the boss) or after the last life.
 */
export interface Expedition extends RunBase {
  kind: "expedition";
  faction: string;
  lives: number;
  opponents: RunOpponent[];
}

/**
 * Draft: the player builds a deck from picks of 3 cards, then plays until 7 wins or 3 losses (plan, section 5.1).
 */
export interface Draft extends RunBase {
  kind: "draft";
  factions: [string, string];
  /** Faction pairs offered at the start. Empty after the choice. */
  factionChoices: [string, string][];
}

export const EXPEDITION_START_DECK = 20;
export const EXPEDITION_LIVES = 2;
export const EXPEDITION_STAGES = 6;
export const PICK_OPTIONS = 3;
export const DRAFT_DECK = 30;
export const DRAFT_MAX_WINS = 7;
export const DRAFT_MAX_LOSSES = 3;

const SINGLE_FACTIONS = ["forge", "sprout", "abyss", "gear", "vesper"] as const;
export const EXPEDITION_FACTIONS: readonly string[] = SINGLE_FACTIONS;

function shuffled<T>(rng: Random, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Distinct random cards of the given factions (and neutral cards). */
function pickOptions(rng: Random, factions: readonly string[], n: number): string[] {
  const out: string[] = [];
  for (let guard = 0; out.length < n && guard < 200; guard++) {
    const id = randomCard(rng, factions);
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function startExpedition(seed: number, faction: string): Expedition {
  const rng = new Random(seed >>> 0);
  const starter = STARTER_DECKS[faction];
  if (!starter) throw new Error(`No starter deck for ${faction}`);
  // The start deck: 20 cards of the starter deck, the cheapest first so the curve stays low.
  const pool = shuffled(rng, expandDeck(starter)).sort((a, b) => CARDS[a]!.cost - CARDS[b]!.cost);
  const deck = pool.slice(0, EXPEDITION_START_DECK);
  const foes = shuffled(rng, Object.keys(STARTER_DECKS).filter((d) => d !== faction));
  const opponents: RunOpponent[] = [];
  for (let i = 0; i < EXPEDITION_STAGES; i++) {
    const boss = i === EXPEDITION_STAGES - 1;
    opponents.push({ deck: foes[i % foes.length]!, level: i < 3 ? "easy" : "medium", boss });
  }
  return { kind: "expedition", seed: rng.seed, faction, deck, wins: 0, losses: 0, lives: EXPEDITION_LIVES, status: "active", pick: null, opponents };
}

/** The next opponent of the expedition, or null if the run is over. */
export function nextOpponent(run: Expedition | Draft): RunOpponent | null {
  if (run.status !== "active") return null;
  if (run.kind === "expedition") return run.opponents[run.wins] ?? null;
  const rng = new Random(run.seed);
  const decks = Object.keys(STARTER_DECKS);
  return { deck: decks[rng.int(decks.length)]!, level: run.wins < 3 ? "easy" : "medium", boss: false };
}

/** Records a match of the run. A win in an active run offers a new card. */
export function recordRunMatch(run: Expedition | Draft, won: boolean): void {
  if (run.status !== "active") return;
  const rng = new Random(run.seed);
  if (run.kind === "expedition") {
    if (won) {
      run.wins++;
      if (run.wins >= run.opponents.length) run.status = "won";
      else run.pick = { options: pickOptions(rng, [run.faction], PICK_OPTIONS) };
    } else {
      run.losses++;
      run.lives--;
      if (run.lives <= 0) run.status = "lost";
    }
  } else {
    if (won) run.wins++;
    else run.losses++;
    if (run.wins >= DRAFT_MAX_WINS) run.status = "won";
    else if (run.losses >= DRAFT_MAX_LOSSES) run.status = "lost";
  }
  run.seed = rng.seed;
}

/** Takes one card of the current pick, or skips it with null. */
export function choosePick(run: Expedition | Draft, cardId: string | null): boolean {
  if (!run.pick) return false;
  if (cardId !== null && !run.pick.options.includes(cardId)) return false;
  if (cardId) run.deck.push(cardId);
  run.pick = null;
  if (run.kind === "draft" && run.deck.length < DRAFT_DECK) {
    const rng = new Random(run.seed);
    run.pick = { options: pickOptions(rng, run.factions, PICK_OPTIONS) };
    run.seed = rng.seed;
  }
  return true;
}

export function startDraft(seed: number): Draft {
  const rng = new Random(seed >>> 0);
  const pairs: [string, string][] = [];
  for (const a of SINGLE_FACTIONS) for (const b of SINGLE_FACTIONS) if (a < b) pairs.push([a, b]);
  const factionChoices = shuffled(rng, pairs).slice(0, 3);
  return { kind: "draft", seed: rng.seed, factions: factionChoices[0]!, factionChoices, deck: [], wins: 0, losses: 0, status: "active", pick: null };
}

/** Chooses the faction pair of the draft and opens the first pick. */
export function chooseDraftFactions(run: Draft, index: number): boolean {
  const pair = run.factionChoices[index];
  if (!pair) return false;
  run.factions = pair;
  run.factionChoices = [];
  const rng = new Random(run.seed);
  run.pick = { options: pickOptions(rng, pair, PICK_OPTIONS) };
  run.seed = rng.seed;
  return true;
}

/** True when the player can play the next match of the run. */
export function readyToPlay(run: Expedition | Draft): boolean {
  if (run.status !== "active" || run.pick) return false;
  if (run.kind === "draft") return run.factionChoices.length === 0 && run.deck.length >= DRAFT_DECK;
  return true;
}

/**
 * The reward of a finished run for the collection.
 * Expedition: one card per win, plus 100 Shards for the boss. Draft: one card per win, plus 20 Shards per win.
 */
export function runReward(run: Expedition | Draft): { cards: number; shards: number } {
  if (run.kind === "expedition") return { cards: run.wins, shards: run.status === "won" ? 100 : 0 };
  return { cards: run.wins, shards: 20 * run.wins };
}

/** Gives the reward of a finished run. Returns the new cards. */
export function claimRunReward(run: Expedition | Draft, collection: Collection, rng: Random): { cards: string[]; shards: number } {
  const r = runReward(run);
  const factions = run.kind === "expedition" ? [run.faction] : run.factions;
  const cards = Array.from({ length: r.cards }, () => randomCard(rng, factions));
  addCards(collection, cards);
  collection.shards += r.shards;
  return { cards, shards: r.shards };
}

/** Every collectible card id, for checks. */
export function isCollectible(id: string): boolean {
  return collectibleCards().some((c) => c.id === id);
}
