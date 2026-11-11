/**
 * Simulator: plays many games AI against AI and checks the rules invariants after every action.
 *
 * Usage: pnpm sim [--games 500] [--ai random|easy|medium] [--seed 1] [--decks random|starter]
 */
import { parseArgs } from "node:util";
import { AiRandom, chooseAction, type AiLevel } from "@tcg/ai";
import { CARDS, expandDeck, randomDeck, STARTER_DECKS } from "@tcg/cards";
import { apply, checkInvariants, countRealCards, newGame, type GameState } from "@tcg/engine";

export interface SimOptions {
  games: number;
  ai: AiLevel;
  seed: number;
  decks: "random" | "starter";
}

export interface SimReport {
  games: number;
  wins: [number, number];
  draws: number;
  firstPlayerWins: number;
  reasons: Record<string, number>;
  averageRounds: number;
  averageActions: number;
  deckWins: Record<string, { games: number; wins: number }>;
  errors: string[];
}

const DECK_CHOICES: readonly (readonly string[])[] = [
  ["forge"], ["sprout"], ["abyss"], ["gear"], ["vesper"],
  ["forge", "sprout"], ["abyss", "vesper"], ["gear", "forge"], ["sprout", "gear"], ["vesper", "forge"],
];
const MAX_ACTIONS = 5_000;

function pickDecks(opts: SimOptions, game: number, rng: AiRandom): { names: [string, string]; decks: [string[], string[]] } {
  if (opts.decks === "starter") {
    const names = Object.keys(STARTER_DECKS);
    const a = names[game % names.length] as string;
    const b = names[Math.floor(game / names.length) % names.length] as string;
    return { names: [a, b], decks: [expandDeck(STARTER_DECKS[a]!), expandDeck(STARTER_DECKS[b]!)] };
  }
  const fa = DECK_CHOICES[rng.int(DECK_CHOICES.length)]!;
  const fb = DECK_CHOICES[rng.int(DECK_CHOICES.length)]!;
  return {
    names: [fa.join("+"), fb.join("+")],
    decks: [randomDeck(CARDS, fa, () => rng.next()), randomDeck(CARDS, fb, () => rng.next())],
  };
}

export function simulate(opts: SimOptions): SimReport {
  const report: SimReport = {
    games: 0,
    wins: [0, 0],
    draws: 0,
    firstPlayerWins: 0,
    reasons: {},
    averageRounds: 0,
    averageActions: 0,
    deckWins: {},
    errors: [],
  };
  let rounds = 0;
  let actions = 0;
  for (let g = 0; g < opts.games; g++) {
    const seed = (opts.seed * 100_003 + g) >>> 0;
    const rng = new AiRandom(seed ^ 0x9e3779b9);
    const { names, decks } = pickDecks(opts, g, rng);
    let state: GameState = newGame({ seed, decks }).state;
    const firstPlayer = state.initiative;
    const realCards = countRealCards(state);
    let steps = 0;
    try {
      while (state.phase !== "over") {
        if (++steps > MAX_ACTIONS) throw new Error("the game does not end");
        const action = chooseAction(state, opts.ai, rng);
        state = apply(state, action).state;
        const problems = checkInvariants(state);
        if (countRealCards(state) !== realCards) problems.push("the number of cards changed");
        if (problems.length > 0) throw new Error(`after ${JSON.stringify(action)}: ${problems.join("; ")}`);
      }
    } catch (err) {
      report.errors.push(`game ${g} (seed ${seed}): ${(err as Error).message}`);
      continue;
    }
    report.games++;
    rounds += state.round;
    actions += steps;
    const outcome = state.outcome!;
    report.reasons[outcome.reason] = (report.reasons[outcome.reason] ?? 0) + 1;
    for (const p of [0, 1] as const) {
      const entry = (report.deckWins[names[p]] ??= { games: 0, wins: 0 });
      entry.games++;
      if (outcome.winner === p) entry.wins++;
    }
    if (outcome.winner === null) report.draws++;
    else {
      report.wins[outcome.winner]++;
      if (outcome.winner === firstPlayer) report.firstPlayerWins++;
    }
  }
  report.averageRounds = report.games ? rounds / report.games : 0;
  report.averageActions = report.games ? actions / report.games : 0;
  return report;
}

function pct(n: number, d: number): string {
  return d ? `${((100 * n) / d).toFixed(1)}%` : "-";
}

function main(): void {
  const { values } = parseArgs({
    options: {
      games: { type: "string", default: "500" },
      ai: { type: "string", default: "random" },
      seed: { type: "string", default: "1" },
      decks: { type: "string", default: "random" },
    },
  });
  const opts: SimOptions = {
    games: Number(values.games),
    ai: values.ai === "easy" || values.ai === "medium" ? values.ai : "random",
    seed: Number(values.seed),
    decks: values.decks === "starter" ? "starter" : "random",
  };
  const t0 = Date.now();
  const r = simulate(opts);
  const decided = r.wins[0] + r.wins[1];
  console.log(`Games: ${r.games}/${opts.games} (ai ${opts.ai}, decks ${opts.decks}) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`Draws: ${r.draws}. First player wins: ${pct(r.firstPlayerWins, decided)} of decided games.`);
  console.log(`Average rounds: ${r.averageRounds.toFixed(1)}. Average actions: ${r.averageActions.toFixed(0)}.`);
  console.log(`End reasons: ${JSON.stringify(r.reasons)}`);
  for (const [deck, s] of Object.entries(r.deckWins)) console.log(`  ${deck.padEnd(14)} ${pct(s.wins, s.games).padStart(6)} of ${s.games}`);
  if (r.errors.length > 0) {
    console.error(`\n${r.errors.length} games failed:`);
    for (const e of r.errors.slice(0, 20)) console.error(`  ${e}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
