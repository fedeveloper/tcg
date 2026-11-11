/**
 * PvP soak test (exit criterion of phase 4): many matches through the server, with checks of every view.
 *
 * Usage: pnpm soak:pvp [--games 100] [--seed 1]
 */
import { parseArgs } from "node:util";
import { runSoak } from "@tcg/server/soak";

const { values } = parseArgs({ options: { games: { type: "string", default: "100" }, seed: { type: "string", default: "1" } } });
const start = Date.now();
const r = runSoak({ games: Number(values.games), seed: Number(values.seed), reconnectEvery: 5 });
const secs = ((Date.now() - start) / 1000).toFixed(1);
console.log(`PvP matches: ${r.games}, actions: ${r.actions}, reconnections: ${r.reconnections}, time: ${secs} s`);
console.log(`wins of player A: ${r.wins[0]}, of player B: ${r.wins[1]}, draws: ${r.draws}`);
if (r.errors.length > 0) {
  console.error(`synchronization errors: ${r.errors.length}`);
  for (const e of r.errors.slice(0, 20)) console.error(`- ${e}`);
  process.exit(1);
}
console.log("no synchronization errors");
