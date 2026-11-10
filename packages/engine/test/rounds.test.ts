import { describe, expect, it } from "vitest";
import { SPARK_CARD_ID } from "@tcg/cards";
import { apply, newGame } from "../src/game.ts";
import { legalActions } from "../src/legal.ts";
import { HAND_LIMIT } from "../src/core.ts";
import { blank, endManeuver, FORGE, give, PASS, run, SPROUT, started } from "./helpers.ts";

describe("game setup", () => {
  it("deals 4 cards and gives the Spark to the second player", () => {
    const s = newGame({ seed: 7, decks: [FORGE, SPROUT] }).state;
    const first = s.initiative;
    const second = first === 0 ? 1 : 0;
    expect(s.phase).toBe("mulligan");
    expect(s.players[first].hand).toHaveLength(4);
    expect(s.players[second].hand).toHaveLength(5);
    const spark = s.players[second].hand.find((id) => s.cards[id]?.cardId === SPARK_CARD_ID);
    expect(spark).toBeDefined();
  });

  it("is deterministic for the same seed", () => {
    const a = newGame({ seed: 42, decks: [FORGE, SPROUT] }).state;
    const b = newGame({ seed: 42, decks: [FORGE, SPROUT] }).state;
    expect(a).toEqual(b);
  });

  it("replaces the chosen cards in the mulligan and keeps the hand size", () => {
    const s = newGame({ seed: 3, decks: [FORGE, SPROUT] }).state;
    const p = s.turn;
    const hand = s.players[p].hand;
    const replaced = hand.slice(0, 2);
    const next = apply(s, { type: "Mulligan", cards: replaced }).state;
    expect(next.players[p].hand).toHaveLength(hand.length);
    expect(next.players[p].deck).toHaveLength(26);
    expect(next.turn).not.toBe(p);
  });

  it("starts round 1 after both mulligans: each player draws 1 and has 1 Ember", () => {
    const s = started(5);
    expect(s.round).toBe(1);
    expect(s.phase).toBe("maneuver");
    expect(s.turn).toBe(s.initiative);
    for (const p of [0, 1] as const) expect(s.players[p].ember).toBe(1);
    expect(s.players[s.initiative].hand).toHaveLength(5);
  });
});

describe("round structure", () => {
  it("passes the Initiative at each Dawn and grows the maximum Ember", () => {
    const s = started(9);
    const first = s.initiative;
    const r2 = endManeuver(s).state;
    expect(r2.round).toBe(2);
    expect(r2.initiative).not.toBe(first);
    expect(r2.turn).toBe(r2.initiative);
    expect(r2.players[0].emberMax).toBe(2);
  });

  it("keeps at most 2 unspent Ember in the Reserve", () => {
    const s = blank();
    s.players[0].ember = 5;
    s.players[0].emberMax = 2;
    const next = endManeuver(s).state;
    expect(next.players[0].ember).toBe(3 + 2);
  });

  it("caps the maximum Ember at 10", () => {
    const s = blank();
    s.players[0].emberMax = 10;
    s.players[0].ember = 0;
    const next = endManeuver(s).state;
    expect(next.players[0].emberMax).toBe(10);
  });

  it("ends the Maneuver phase only after two passes in sequence", () => {
    const s = blank();
    give(s, 1, "forge-001");
    s.players[1].ember = 1;
    const afterPass = run(s, PASS).state;
    expect(afterPass.round).toBe(2);
    expect(afterPass.turn).toBe(1);
    // Player 1 acts instead of passing: the pass counter resets.
    const play = legalActions(afterPass).find((a) => a.type === "PlayCard")!;
    const afterPlay = run(afterPass, play, PASS).state; // player 0 lets the card resolve
    expect(afterPlay.passes).toBe(0);
    expect(afterPlay.turn).toBe(0);
    expect(run(afterPlay, PASS).state.round).toBe(2);
  });

  it("burns a drawn card when the hand is full", () => {
    const s = blank();
    for (let i = 0; i < HAND_LIMIT; i++) give(s, 0, "forge-001");
    const { state, events } = endManeuver(s);
    expect(state.players[0].hand).toHaveLength(HAND_LIMIT);
    expect(events.some((e) => e.type === "CardBurned" && e.player === 0)).toBe(true);
  });

  it("removes 2 Light from each beacon for a draw from an empty deck", () => {
    const s = blank();
    s.players[0].graveyard.push(...s.players[0].deck);
    s.players[0].deck = [];
    const next = endManeuver(s).state;
    expect(next.players[0].beacons.map((b) => b.light)).toEqual([8, 8, 8]);
  });

  it("ends the game at round 20 with the higher total Light", () => {
    const s = blank();
    s.round = 20;
    s.players[1].beacons[0].light = 9;
    const next = endManeuver(s).state;
    expect(next.phase).toBe("over");
    expect(next.outcome).toEqual({ winner: 0, reason: "roundLimit" });
  });

  it("declares a draw at round 20 with equal Light", () => {
    const s = blank();
    s.round = 20;
    expect(endManeuver(s).state.outcome).toEqual({ winner: null, reason: "roundLimit" });
  });

  it("lets a player concede", () => {
    const s = blank();
    const next = apply(s, { type: "Concede" }).state;
    expect(next.outcome).toEqual({ winner: 1, reason: "concede" });
  });

  it("rejects illegal actions and does not change the input state", () => {
    const s = blank();
    const copy = structuredClone(s);
    expect(() => apply(s, { type: "Move", keeper: "nope", to: { lane: 0, row: "front" } })).toThrow();
    expect(() => apply(s, { type: "PlayCard", card: "c1", targets: [] })).toThrow();
    endManeuver(s);
    expect(s).toEqual(copy);
  });
});
