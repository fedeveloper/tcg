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

describe("hard AI (ISMCTS)", () => {
  it("picks legal actions and finishes a game", () => {
    let s = newGame({ seed: 4, decks: [FORGE, FORGE] }).state;
    const rng = new AiRandom(4);
    while (s.phase !== "over") {
      const a = s.turn === 0 ? chooseAction(s, "hard", rng, { iterations: 60 }) : chooseAction(s, "easy", rng);
      expect(legalActions(s).map(actionKey)).toContain(actionKey(a));
      s = apply(s, a).state;
    }
    expect(s.outcome).not.toBeNull();
  });

  it("does not depend on the opponent's hidden cards", () => {
    let s = newGame({ seed: 9, decks: [FORGE, FORGE] }).state;
    const rng = new AiRandom(9);
    while (s.phase === "mulligan" || s.turn !== 0) s = apply(s, chooseAction(s, "easy", rng)).state;
    // Swap the opponent's hand with cards of their deck: the hard AI must give the same answer.
    const changed = structuredClone(s);
    const foe = changed.players[1];
    const ids = [...foe.hand, ...foe.deck];
    const cardIds = ids.map((id) => changed.cards[id]!.cardId).reverse();
    ids.forEach((id, i) => (changed.cards[id]!.cardId = cardIds[i]!));
    changed.players[1].deck.reverse();
    changed.players[0].deck.reverse();
    changed.rng = 12345;
    const a = chooseAction(s, "hard", new AiRandom(7), { iterations: 120 });
    const b = chooseAction(changed, "hard", new AiRandom(7), { iterations: 120 });
    expect(actionKey(b)).toBe(actionKey(a));
  });

  it("keeps the input state unchanged", () => {
    let s = newGame({ seed: 11, decks: [FORGE, FORGE] }).state;
    const rng = new AiRandom(11);
    for (let i = 0; i < 12 && s.phase !== "over"; i++) s = apply(s, chooseAction(s, "easy", rng)).state;
    const before = JSON.stringify(s);
    chooseAction(s, "hard", rng, { iterations: 80 });
    expect(JSON.stringify(s)).toBe(before);
  });
});
