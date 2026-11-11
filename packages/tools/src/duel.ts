/**
 * Duel: plays two AI levels against each other and prints the win rate.
 *
 * Usage: pnpm duel [--a medium] [--b easy] [--games 20] [--seed 1] [--deckA forge] [--deckB forge] [--iterations 300]
 * --iterations is the budget of the hard AI per action. A fixed count, not a time, keeps the result reproducible.
 */
import { parseArgs } from "node:util";
import { AiRandom, chooseAction, type AiLevel, type HardOptions } from "@tcg/ai";
import { expandDeck, STARTER_DECKS } from "@tcg/cards";
import { apply, newGame } from "@tcg/engine";

export interface DuelResult {
  winsA: number;
  winsB: number;
  draws: number;
  roundLimit: number;
  rounds: number;
}

export function duel(a: AiLevel, b: AiLevel, games: number, seed: number, decks: [string, string], hard: HardOptions = { iterations: 300 }): DuelResult {
  const r: DuelResult = { winsA: 0, winsB: 0, draws: 0, roundLimit: 0, rounds: 0 };
  for (let g = 0; g < games; g++) {
    // Swap the seats every game, so the levels share the decks and the first turn.
    const aSeat = (g % 2) as 0 | 1;
    const levels: [AiLevel, AiLevel] = aSeat === 0 ? [a, b] : [b, a];
    // Games 2k and 2k+1 share the seed with the seats swapped, so the luck of the draw cancels out.
    const pair = Math.floor(g / 2);
    // With two different levels, every second pair also swaps the decks: then a strong deck does not look like a strong AI.
    // With the same level (the balance tool), A always plays decks[0], so the result measures the decks.
    const swap = a !== b && pair % 2 === 1;
    const aDeck = swap ? decks[1] : decks[0];
    const bDeck = swap ? decks[0] : decks[1];
    const deckNames: [string, string] = aSeat === 0 ? [aDeck, bDeck] : [bDeck, aDeck];
    const rng = new AiRandom(seed * 7919 + pair);
    let s = newGame({ seed: seed * 104729 + pair, decks: [expandDeck(STARTER_DECKS[deckNames[0]]!), expandDeck(STARTER_DECKS[deckNames[1]]!)] }).state;
    while (s.phase !== "over") s = apply(s, chooseAction(s, levels[s.turn], rng, hard), { trusted: true }).state;
    r.rounds += s.round;
    if (s.outcome?.reason === "roundLimit") r.roundLimit++;
    const w = s.outcome?.winner;
    if (w === null || w === undefined) r.draws++;
    else if (w === aSeat) r.winsA++;
    else r.winsB++;
  }
  return r;
}

function main(): void {
  const { values } = parseArgs({
    options: {
      a: { type: "string", default: "medium" },
      b: { type: "string", default: "easy" },
      games: { type: "string", default: "20" },
      seed: { type: "string", default: "1" },
      deckA: { type: "string", default: "forge" },
      deckB: { type: "string", default: "forge" },
      iterations: { type: "string", default: "300" },
      depth: { type: "string" },
      width: { type: "string" },
      c: { type: "string" },
      beam: { type: "string" },
      sdepth: { type: "string" },
      scale: { type: "string" },
    },
  });
  const t0 = Date.now();
  const r = duel(values.a as AiLevel, values.b as AiLevel, Number(values.games), Number(values.seed), [values.deckA!, values.deckB!], {
    iterations: Number(values.iterations),
    depth: values.depth ? Number(values.depth) : undefined,
    innerWidth: values.width ? Number(values.width) : undefined,
    exploration: values.c ? Number(values.c) : undefined,
    beam: values.beam ? Number(values.beam) : undefined,
    searchDepth: values.sdepth ? Number(values.sdepth) : undefined,
    rewardScale: values.scale ? Number(values.scale) : undefined,
  });
  const n = Number(values.games);
  console.log(`${values.a} (${values.deckA}) vs ${values.b} (${values.deckB}): ${r.winsA}-${r.winsB}, ${r.draws} draws, ${r.roundLimit} at the round limit, ${(r.rounds / n).toFixed(1)} rounds per game, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
