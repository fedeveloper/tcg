import {
  apply,
  attackOf,
  beaconsOut,
  defOf,
  holdOf,
  keepersOf,
  legalActions,
  other,
  tideFor,
  type Action,
  type GameState,
  type PlayerId,
} from "@tcg/engine";

export type AiLevel = "random" | "easy";

/** A small seeded generator for the AI. It does not touch the game generator. */
export class AiRandom {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

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
    for (const b of ps.beacons) v += b.light > 0 ? b.light + 6 : 0;
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
  return side(me) - side(other(me)) + tideFor(state, me) * 0.4;
}

/** Plays the game forward with passes until the round ends, so every option is compared after the Clash. */
function settle(state: GameState): GameState {
  const round = state.round;
  let s = state;
  for (let i = 0; i < 6 && s.phase !== "over"; i++) {
    if (s.phase === "maneuver" && s.round !== round && s.chain.length === 0) break;
    s = apply(s, { type: "Pass" }, { trusted: true }).state;
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

/** Chooses an action for the player who must act now. */
export function chooseAction(state: GameState, level: AiLevel, rng: AiRandom): Action {
  const me = state.turn;
  const actions = legalActions(state, me);
  if (actions.length === 0) throw new Error("No legal action");
  if (actions.length === 1) return actions[0] as Action;
  if (state.phase === "mulligan") return level === "random" ? (actions[rng.int(actions.length)] as Action) : mulliganChoice(state, actions, me);
  if (level === "random") return actions[rng.int(actions.length)] as Action;

  let best: Action = actions[actions.length - 1] as Action;
  let bestScore = -Infinity;
  for (const a of actions) {
    const after = settle(apply(state, a, { trusted: true }).state);
    const score = evaluate(after, me) - actionPenalty(a) + rng.next() * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}
