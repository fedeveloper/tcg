import { expandDeck, STARTER_DECKS } from "@tcg/cards";
import { createInstance, setSlot } from "../src/core.ts";
import { apply, newGame } from "../src/game.ts";
import { legalActions } from "../src/legal.ts";
import type { Action, GameEvent, GameState, PlayerId, Row, Lane } from "../src/types.ts";

export const FORGE = expandDeck(STARTER_DECKS.forge!);
export const SPROUT = expandDeck(STARTER_DECKS.sprout!);

/** A game after both players keep their hand: round 1, Maneuver phase. */
export function started(seed = 1, decks: [string[], string[]] = [FORGE, SPROUT]): GameState {
  let s = newGame({ seed, decks }).state;
  s = apply(s, { type: "Mulligan", cards: [] }).state;
  s = apply(s, { type: "Mulligan", cards: [] }).state;
  return s;
}

/** An empty board in the Maneuver phase of round 2, with player 0 to act and empty hands. */
export function blank(seed = 1): GameState {
  const s = started(seed);
  for (const p of [0, 1] as const) {
    const ps = s.players[p];
    ps.deck.push(...ps.hand);
    ps.hand = [];
    ps.ember = 10;
  }
  s.round = 2;
  s.turn = 0;
  s.initiative = 0;
  s.passes = 0;
  return s;
}

/** Puts a keeper on the board. A fresh keeper entered this round. */
export function put(s: GameState, player: PlayerId, cardId: string, lane: Lane, row: Row = "front", fresh = false): string {
  const inst = createInstance(s, cardId, player, false);
  inst.enteredRound = fresh ? s.round : s.round - 1;
  setSlot(s, player, { lane, row }, inst.id);
  return inst.id;
}

export function give(s: GameState, player: PlayerId, cardId: string): string {
  const inst = createInstance(s, cardId, player, false);
  s.players[player].hand.push(inst.id);
  return inst.id;
}

export function run(s: GameState, ...actions: Action[]): { state: GameState; events: GameEvent[] } {
  let state = s;
  const events: GameEvent[] = [];
  for (const a of actions) {
    const r = apply(state, a);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

export const PASS: Action = { type: "Pass" };

/** Ends the Maneuver phase: both players pass (the Clash and Dusk follow). */
export function endManeuver(s: GameState): { state: GameState; events: GameEvent[] } {
  return run(s, PASS, PASS);
}

export function findPlay(s: GameState, card: string, pred: (a: Extract<Action, { type: "PlayCard" }>) => boolean = () => true): Action {
  const a = legalActions(s).find((x) => x.type === "PlayCard" && x.card === card && pred(x));
  if (!a) throw new Error(`no legal play for ${card}`);
  return a;
}
