import { describe, expect, it } from "vitest";
import { expandDeck, STARTER_DECKS } from "@tcg/cards";
import { apply, legalActions, newGame, actionKey } from "@tcg/engine";
import { AiRandom, chooseAction } from "../src/index.ts";

const FORGE = expandDeck(STARTER_DECKS.forge!);

describe("easy AI", () => {
  it("always picks a legal action", () => {
    let s = newGame({ seed: 1, decks: [FORGE, FORGE] }).state;
    const rng = new AiRandom(1);
    for (let i = 0; i < 80 && s.phase !== "over"; i++) {
      const a = chooseAction(s, "easy", rng);
      expect(legalActions(s).map(actionKey)).toContain(actionKey(a));
      s = apply(s, a).state;
    }
  });

  it("beats a random player in most games", () => {
    let wins = 0;
    const games = 8;
    for (let g = 0; g < games; g++) {
      const rng = new AiRandom(g);
      let s = newGame({ seed: g, decks: [FORGE, FORGE] }).state;
      while (s.phase !== "over") s = apply(s, chooseAction(s, s.turn === 0 ? "easy" : "random", rng)).state;
      if (s.outcome?.winner === 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(6);
  });

  it("medium AI picks legal actions and finishes a game", () => {
    let s = newGame({ seed: 2, decks: [FORGE, FORGE] }).state;
    const rng = new AiRandom(2);
    while (s.phase !== "over") {
      const level = s.turn === 0 ? "medium" : "easy";
      const a = chooseAction(s, level, rng);
      expect(legalActions(s).map(actionKey)).toContain(actionKey(a));
      s = apply(s, a).state;
    }
    expect(s.outcome).not.toBeNull();
  });
});
