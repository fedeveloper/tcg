import { describe, expect, it } from "vitest";
import { expandDeck, STARTER_DECKS } from "@tcg/cards";
import { newGame, viewFor } from "@tcg/engine";
import { createTranslator } from "@tcg/i18n";
import { renderBoard, renderHand } from "../src/render.ts";
import { simulate } from "../src/sim.ts";

describe("simulator", () => {
  it("plays random games with no rules error", () => {
    const r = simulate({ games: 40, ai: "random", seed: 3, decks: "random" });
    expect(r.errors).toEqual([]);
    expect(r.games).toBe(40);
  });

  it("plays easy AI games with the starter decks", () => {
    const r = simulate({ games: 3, ai: "easy", seed: 1, decks: "starter" });
    expect(r.errors).toEqual([]);
  });
});

describe("text interface", () => {
  it("draws the board and the hand in both languages", () => {
    const s = newGame({ seed: 1, decks: [expandDeck(STARTER_DECKS.forge!), expandDeck(STARTER_DECKS.sprout!)] }).state;
    const view = viewFor(s, 0);
    const it_ = renderBoard(createTranslator("it"), view, 0);
    const en = renderBoard(createTranslator("en"), view, 0);
    expect(it_).toContain("Faro A: 10");
    expect(en).toContain("Beacon A: 10");
    expect(renderHand(createTranslator("it"), view, 0).split("\n").length).toBe(1 + view.players[0].hand.length);
  });
});
