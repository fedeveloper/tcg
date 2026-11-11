import {
  apply,
  attackOf,
  beaconsOut,
  defOf,
  holdOf,
  keeperAt,
  keepersOf,
  keywordsOf,
  legalActions,
  other,
  tideFor,
  type Action,
  type GameState,
  type PlayerId,
} from "@tcg/engine";
import { AiRandom } from "./random.ts";
import { HARD_TIME_MS, ismctsChoose, type HardOptions } from "./ismcts.ts";

export type AiLevel = "random" | "easy" | "medium" | "hard";

export { AiRandom } from "./random.ts";
export { determinize, HARD_TIME_MS, type HardOptions } from "./ismcts.ts";

const WIN_SCORE = 1_000_000;

/**
 * Static evaluation of a state for one player.
 * It counts Light, beacons, the board, the hand and the tide.
 */
export function evaluate(state: GameState, me: PlayerId): number {
  if (state.phase === "over" && state.outcome) {
    if (state.outcome.winner === null) return 0;
    return state.outcome.winner === me ? WIN_SCORE : -WIN_SCORE;
  }
  const side = (p: PlayerId): number => {
    const ps = state.players[p];
    let v = 0;
    for (const b of ps.beacons) v += beaconValue(b.light);
    // A player with one beacon out is in danger: the next beacon decides the game.
    if (beaconsOut(state, p) === 1) v -= 10;
    for (const id of keepersOf(state, p)) {
      const hold = holdOf(state, id) - (state.cards[id]?.damage ?? 0);
      v += attackOf(state, id) * 1.1 + Math.max(0, hold) * 0.8 + 0.5;
    }
    v += Math.min(ps.hand.length, 8) * 0.9;
    v += ps.relics.length * 0.5;
    return v;
  };
  return side(me) - side(other(me)) + tideFor(state, me) * 0.4 + THREAT_WEIGHT * (threat(state, me) - threat(state, other(me)));
}

/** Concave value: a point of Light on a weak beacon is worth more than on a full one. */
function beaconValue(light: number): number {
  return light > 0 ? 8 + 6.3 * Math.sqrt(light) : 0;
}

/** Weight of the projected damage of the next Clash. It gives the AI a view beyond the current round. */
export const THREAT_WEIGHT = 0.6;

/**
 * Projected beacon damage of a player in the next Clash, if every keeper can attack.
 * Keepers in the back row without Reach do not attack, and front keepers block.
 */
function threat(state: GameState, p: PlayerId): number {
  const q = other(p);
  let value = 0;
  for (const lane of [0, 1, 2] as const) {
    const front = keeperAt(state, p, { lane, row: "front" });
    const back = keeperAt(state, p, { lane, row: "back" });
    const blocker = keeperAt(state, q, { lane, row: "front" });
    let damage = 0;
    for (const k of [front, back]) {
      if (!k) continue;
      const kw = keywordsOf(state, k);
      if (k === back && !kw.includes("reach")) continue;
      const atk = attackOf(state, k);
      if (!blocker) damage += atk;
      else if (kw.includes("overrun")) damage += Math.max(0, atk - holdOf(state, blocker));
    }
    const light = state.players[q].beacons[lane].light;
    value += beaconValue(light) - beaconValue(Math.max(0, light - damage));
  }
  return value;
}

/** Plays the game forward with passes until the round ends, so every option is compared after the Clash. */
function settle(state: GameState, inPlace = false): GameState {
  const round = state.round;
  let s = state;
  for (let i = 0; i < 6 && s.phase !== "over"; i++) {
    if (s.phase === "maneuver" && s.round !== round && s.chain.length === 0) break;
    s = apply(s, { type: "Pass" }, { trusted: true, inPlace }).state;
  }
  return s;
}

function mulliganChoice(state: GameState, actions: Action[], me: PlayerId): Action {
  const expensive = state.players[me].hand.filter((id) => defOf(state, id).cost >= 5 && defOf(state, id).type !== "quickRite");
  const key = [...expensive].sort().join(",");
  const match = actions.find((a) => a.type === "Mulligan" && [...a.cards].sort().join(",") === key);
  return match ?? { type: "Mulligan", cards: [] };
}

function actionPenalty(a: Action): number {
  switch (a.type) {
    case "Pass":
      return 0;
    case "Move":
      return 0.6;
    default:
      return 0.05;
  }
}

/** Greedy score: the action, then passes until the round ends. */
function greedyScore(state: GameState, a: Action, me: PlayerId): number {
  return evaluate(settle(apply(state, a, { trusted: true }).state), me) - actionPenalty(a);
}

/** Search options for the medium AI. */
export const MEDIUM_BEAM = 5;
export const MEDIUM_DEPTH = 2;
/** Search options for the hard AI in the Maneuver phase: a wider and deeper search of my own actions. */
export const HARD_BEAM = 8;
export const HARD_DEPTH = 3;

/** Applies an action and lets the chain resolve, with no response from the opponent. */
function resolveQuietly(state: GameState, action: Action): GameState {
  let s = apply(state, action, { trusted: true }).state;
  for (let i = 0; i < 4 && s.phase !== "over" && s.chain.length > 0; i++) {
    s = apply(s, { type: "Pass" }, { trusted: true }).state;
  }
  return s;
}

/**
 * Medium AI (plan, section 8): a depth-limited search over sequences of the player's own actions.
 * It finds combinations, for example a keeper and then a relic on it.
 * The search assumes that the opponent passes, so it never looks at hidden cards.
 */
function searchValue(state: GameState, me: PlayerId, depth: number, beam: number): number {
  const round = state.round;
  let s = state;
  // The opponent passes: the turn returns to me in the same Maneuver phase.
  if (s.phase === "maneuver" && s.turn !== me && s.chain.length === 0 && s.passes === 0) {
    s = apply(s, { type: "Pass" }, { trusted: true }).state;
  }
  if (depth === 0 || s.phase !== "maneuver" || s.turn !== me || s.round !== round) return evaluate(settle(s), me);
  const scored = legalActions(s, me).map((a) => ({ a, v: greedyScore(s, a, me) }));
  scored.sort((x, y) => y.v - x.v);
  let best = -Infinity;
  for (const { a, v } of scored.slice(0, beam)) {
    const value = a.type === "Pass" ? v : searchValue(resolveQuietly(s, a), me, depth - 1, beam) - actionPenalty(a);
    if (value > best) best = value;
  }
  return best;
}

function searchChoice(state: GameState, ranked: { a: Action; v: number }[], me: PlayerId, rng: AiRandom, beam: number, depth: number): Action {
  let best = ranked[0]!.a;
  let bestValue = -Infinity;
  for (const c of ranked.slice(0, beam)) {
    const value = c.a.type === "Pass" ? c.v : searchValue(resolveQuietly(state, c.a), me, depth - 1, beam) - actionPenalty(c.a) + rng.next() * 0.01;
    if (value > bestValue) {
      bestValue = value;
      best = c.a;
    }
  }
  return best;
}

/** The search functions of the hard AI: the same evaluation as the other levels. */
const HARD_HOOKS = {
  evaluate,
  settle: (s: GameState) => settle(s, true),
  rank: (s: GameState, actions: Action[], me: PlayerId) =>
    actions
      .map((a) => ({ a, v: greedyScore(s, a, me) }))
      .sort((x, y) => y.v - x.v)
      .map((x) => x.a),
  quickRank: (s: GameState, actions: Action[], actor: PlayerId) =>
    actions
      .map((a) => ({ a, v: evaluate(apply(s, a, { trusted: true }).state, actor) - actionPenalty(a) }))
      .sort((x, y) => y.v - x.v)
      .map((x) => x.a),
};

/**
 * Chooses an action for the player who must act now.
 * The hard AI uses `hard` as its budget. The default is HARD_TIME_MS per action.
 */
export function chooseAction(state: GameState, level: AiLevel, rng: AiRandom, hard: HardOptions = { timeMs: HARD_TIME_MS }): Action {
  const me = state.turn;
  const actions = legalActions(state, me);
  if (actions.length === 0) throw new Error("No legal action");
  if (actions.length === 1) return actions[0] as Action;
  if (state.phase === "mulligan") return level === "random" ? (actions[rng.int(actions.length)] as Action) : mulliganChoice(state, actions, me);
  if (level === "random") return actions[rng.int(actions.length)] as Action;
  // On the chain, the answer depends on the opponent's hidden cards: the hard AI uses ISMCTS (plan, section 8).
  if (level === "hard" && state.chain.length > 0) return ismctsChoose(state, rng, HARD_HOOKS, hard);

  const scored = actions.map((a) => ({ a, v: greedyScore(state, a, me) + rng.next() * 0.01 }));
  scored.sort((x, y) => y.v - x.v);
  if (level === "easy") return scored[0]!.a;

  if (state.chain.length > 0) return scored[0]!.a;
  return level === "hard" ? searchChoice(state, scored, me, rng, hard.beam ?? HARD_BEAM, hard.searchDepth ?? HARD_DEPTH) : searchChoice(state, scored, me, rng, MEDIUM_BEAM, MEDIUM_DEPTH);
}
