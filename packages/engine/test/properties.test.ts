import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { CARDS, randomDeck } from "@tcg/cards";
import { apply, newGame } from "../src/game.ts";
import { legalActions } from "../src/legal.ts";
import { checkInvariants, countRealCards } from "../src/invariants.ts";
import { eventsFor, HIDDEN_CARD, viewFor } from "../src/view.ts";
import type { Action, GameState } from "../src/types.ts";
import { FORGE, SPROUT } from "./helpers.ts";

const FACTIONS = [["forge"], ["sprout"], ["abyss"], ["gear"], ["vesper"], ["forge", "sprout"], ["abyss", "vesper"], ["gear", "sprout"]] as const;

/** Plays a game with the given choices: each number picks one legal action. */
function playOut(seed: number, choices: number[], decks: [string[], string[]]): { states: GameState[]; actions: Action[] } {
  let state = newGame({ seed, decks }).state;
  const states = [state];
  const actions: Action[] = [];
  let i = 0;
  while (state.phase !== "over" && actions.length < 600) {
    const legal = legalActions(state);
    const pick = choices[i++ % choices.length] ?? 0;
    // Bias toward passing a third of the time, so games reach the Clash and end.
    const action = pick % 3 === 0 ? legal[legal.length - 1]! : legal[pick % legal.length]!;
    state = apply(state, action).state;
    states.push(state);
    actions.push(action);
  }
  return { states, actions };
}

function decksFrom(seed: number, a: number, b: number): [string[], string[]] {
  let x = seed >>> 0;
  const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  return [randomDeck(CARDS, FACTIONS[a]!, rnd), randomDeck(CARDS, FACTIONS[b]!, rnd)];
}

const gameArb = fc.record({
  seed: fc.integer({ min: 0, max: 2 ** 31 - 1 }),
  choices: fc.array(fc.nat(1000), { minLength: 1, maxLength: 200 }),
  a: fc.integer({ min: 0, max: 2 }),
  b: fc.integer({ min: 0, max: 2 }),
});

describe("properties", () => {
  it("every legal action gives a valid state (tide range, card count, zones)", () => {
    fc.assert(
      fc.property(gameArb, ({ seed, choices, a, b }) => {
        const { states } = playOut(seed, choices, decksFrom(seed, a, b));
        const cards = countRealCards(states[0]!);
        for (const s of states) {
          expect(checkInvariants(s)).toEqual([]);
          expect(countRealCards(s)).toBe(cards);
          expect(s.tide).toBeGreaterThanOrEqual(-5);
          expect(s.tide).toBeLessThanOrEqual(5);
        }
      }),
      { numRuns: 60 },
    );
  });

  it("a replay of the same seed and actions gives the same final state", () => {
    fc.assert(
      fc.property(gameArb, ({ seed, choices, a, b }) => {
        const decks = decksFrom(seed, a, b);
        const { states, actions } = playOut(seed, choices, decks);
        let replay = newGame({ seed, decks }).state;
        for (const action of actions) replay = apply(replay, action).state;
        expect(replay).toEqual(states[states.length - 1]);
      }),
      { numRuns: 30 },
    );
  });

  it("apply never changes the input state", () => {
    fc.assert(
      fc.property(gameArb, ({ seed, choices }) => {
        let state = newGame({ seed, decks: [FORGE, SPROUT] }).state;
        for (let i = 0; i < 60 && state.phase !== "over"; i++) {
          const legal = legalActions(state);
          const action = legal[(choices[i % choices.length] ?? 0) % legal.length]!;
          const copy = structuredClone(state);
          const next = apply(state, action).state;
          expect(state).toEqual(copy);
          state = next;
        }
      }),
      { numRuns: 30 },
    );
  });

  it("the state is plain JSON", () => {
    const { states } = playOut(11, [1, 2, 3, 4, 5], [FORGE, SPROUT]);
    const last = states[states.length - 1]!;
    expect(JSON.parse(JSON.stringify(last))).toEqual(last);
  });
});

describe("player views", () => {
  it("hides the opponent's hand and both decks", () => {
    const s = newGame({ seed: 4, decks: [FORGE, SPROUT] }).state;
    const view = viewFor(s, 0);
    for (const id of view.players[1].hand) expect(view.cards[id]?.cardId).toBe(HIDDEN_CARD);
    for (const id of view.players[0].hand) expect(view.cards[id]?.cardId).not.toBe(HIDDEN_CARD);
    for (const p of [0, 1] as const) for (const id of view.players[p].deck) expect(view.cards[id]?.cardId).toBe(HIDDEN_CARD);
    expect(view.rng).toBe(0);
    expect(s.rng).not.toBe(0);
  });

  it("hides the opponent's draws in the events", () => {
    const { events } = newGame({ seed: 4, decks: [FORGE, SPROUT] });
    const seen = eventsFor(events, 0);
    for (const e of seen) {
      if (e.type === "CardDrawn" && e.player === 1) expect(e.cardId).toBe(HIDDEN_CARD);
      if (e.type === "CardDrawn" && e.player === 0) expect(e.cardId).not.toBe(HIDDEN_CARD);
    }
  });
});
