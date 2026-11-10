/**
 * Duel: plays two AI levels against each other and prints the win rate.
 *
 * Usage: pnpm duel [--a medium] [--b easy] [--games 20] [--seed 1] [--deckA forge] [--deckB forge]
 */
import { parseArgs } from "node:util";
import { AiRandom, chooseAction, type AiLevel } from "@tcg/ai";
import { expandDeck, STARTER_DECKS } from "@tcg/cards";
import { apply, newGame } from "@tcg/engine";

export interface DuelResult {
  winsA: number;
  winsB: number;
  draws: number;
  roundLimit: number;
  rounds: number;
}

export function duel(a: AiLevel, b: AiLevel, games: number, seed: number, decks: [string, string]): DuelResult {
  const r: DuelResult = { winsA: 0, winsB: 0, draws: 0, roundLimit: 0, rounds: 0 };
  for (let g = 0; g < games; g++) {
    // Swap the seats every game, so the levels share the decks and the first turn.
    const aSeat = (g % 2) as 0 | 1;
    const levels: [AiLevel, AiLevel] = aSeat === 0 ? [a, b] : [b, a];
    const deckNames = aSeat === 0 ? decks : ([decks[1], decks[0]] as [string, string]);
    const rng = new AiRandom(seed * 7919 + g);
    let s = newGame({ seed: seed * 104729 + g, decks: [expandDeck(STARTER_DECKS[deckNames[0]]!), expandDeck(STARTER_DECKS[deckNames[1]]!)] }).state;
    while (s.phase !== "over") s = apply(s, chooseAction(s, levels[s.turn], rng), { trusted: true }).state;
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
    },
  });
  const t0 = Date.now();
  const r = duel(values.a as AiLevel, values.b as AiLevel, Number(values.games), Number(values.seed), [values.deckA!, values.deckB!]);
  const n = Number(values.games);
  console.log(`${values.a} (${values.deckA}) vs ${values.b} (${values.deckB}): ${r.winsA}-${r.winsB}, ${r.draws} draws, ${r.roundLimit} at the round limit, ${(r.rounds / n).toFixed(1)} rounds per game, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
