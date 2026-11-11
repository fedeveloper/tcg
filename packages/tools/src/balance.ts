/**
 * Balance: plays every pair of starter decks with the same AI level and prints the win rates.
 * The plan (section 9.2) asks for 45–55% wins for every deck against the field.
 *
 * Usage: pnpm balance [--ai easy] [--games 20] [--seed 1] [--decks forge,sprout,...]
 */
import { parseArgs } from "node:util";
import type { AiLevel } from "@tcg/ai";
import { STARTER_DECKS } from "@tcg/cards";
import { duel } from "./duel.ts";

export interface BalanceReport {
  decks: string[];
  /** wins[a][b]: games that deck a won against deck b. */
  wins: Record<string, Record<string, number>>;
  games: Record<string, number>;
  total: Record<string, number>;
  roundLimit: number;
}

export function balance(decks: string[], level: AiLevel, games: number, seed: number): BalanceReport {
  const r: BalanceReport = { decks, wins: {}, games: {}, total: {}, roundLimit: 0 };
  for (const d of decks) {
    r.wins[d] = {};
    r.games[d] = 0;
    r.total[d] = 0;
  }
  for (let i = 0; i < decks.length; i++) {
    for (let j = i + 1; j < decks.length; j++) {
      const a = decks[i]!;
      const b = decks[j]!;
      const res = duel(level, level, games, seed + i * 31 + j, [a, b]);
      r.wins[a]![b] = res.winsA;
      r.wins[b]![a] = res.winsB;
      // A draw counts as half a win for each deck.
      r.total[a]! += res.winsA + res.draws / 2;
      r.total[b]! += res.winsB + res.draws / 2;
      r.games[a]! += games;
      r.games[b]! += games;
      r.roundLimit += res.roundLimit;
    }
  }
  return r;
}

function main(): void {
  const { values } = parseArgs({
    options: {
      ai: { type: "string", default: "easy" },
      games: { type: "string", default: "20" },
      seed: { type: "string", default: "1" },
      decks: { type: "string" },
    },
  });
  const decks = values.decks ? values.decks.split(",") : Object.keys(STARTER_DECKS);
  const games = Number(values.games);
  const t0 = Date.now();
  const r = balance(decks, values.ai as AiLevel, games, Number(values.seed));
  const w = Math.max(...decks.map((d) => d.length), 6);
  console.log(`${"".padEnd(w)} ${decks.map((d) => d.slice(0, 6).padStart(6)).join(" ")}   total`);
  for (const a of decks) {
    const cells = decks.map((b) => (a === b ? "-" : String(r.wins[a]![b] ?? 0)).padStart(6));
    const pct = (100 * r.total[a]!) / r.games[a]!;
    const flag = pct > 55 || pct < 45 ? " !" : "";
    console.log(`${a.padEnd(w)} ${cells.join(" ")}   ${pct.toFixed(1)}%${flag}`);
  }
  console.log(`${games} games per pair, ai ${values.ai}, ${r.roundLimit} games at the round limit, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
