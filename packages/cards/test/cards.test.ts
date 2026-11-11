import { describe, expect, it } from "vitest";
import {
  CARDS,
  collectibleCards,
  expandDeck,
  RAW_CARD_FILES,
  randomDeck,
  STARTER_DECKS,
  validateCard,
  validateCardFiles,
  validateDeck,
  type CardDef,
} from "../src/index.ts";

describe("card data", () => {
  it("passes the schema and the card rules", () => {
    expect(validateCardFiles(RAW_CARD_FILES).problems).toEqual([]);
  });

  it("has the first set of the plan: 26 cards per faction and 20 neutral cards", () => {
    const by = (f: string) => collectibleCards().filter((c) => c.faction === f).length;
    for (const f of ["forge", "sprout", "abyss", "gear", "vesper"]) expect(by(f)).toBe(26);
    expect(by("neutral")).toBe(20);
    expect(collectibleCards()).toHaveLength(150);
  });

  it("gives every card at most 2 keywords", () => {
    for (const c of Object.values(CARDS)) expect(c.keywords.length).toBeLessThanOrEqual(2);
  });

  it("has valid starter decks", () => {
    for (const list of Object.values(STARTER_DECKS)) expect(validateDeck(expandDeck(list), CARDS)).toEqual([]);
  });

  it("finds broken cards", () => {
    const broken: CardDef = { ...CARDS["forge-015"]!, target: undefined };
    expect(validateCard(broken, CARDS).join()).toContain('"chosen" needs a target spec');
    const wrongTrigger: CardDef = { ...CARDS["forge-016"]!, effects: [{ when: "dusk", actions: [{ op: "draw", amount: 1 }] }], target: undefined };
    expect(validateCard(wrongTrigger, CARDS).join()).toContain("not valid for a slowRite");
  });

  it("finds broken decks", () => {
    const deck = expandDeck(STARTER_DECKS.forge!);
    deck[0] = "forge-014"; // a second legendary copy
    deck.push("sprout-t01");
    const codes = validateDeck(deck, CARDS).map((p) => p.code);
    expect(codes).toContain("size");
    expect(codes).toContain("tooManyCopies");
    expect(codes).toContain("notCollectible");
  });

  it("builds random legal decks", () => {
    let x = 1;
    const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    for (const factions of [["forge"], ["sprout"], ["forge", "sprout"]]) {
      expect(validateDeck(randomDeck(CARDS, factions, rnd), CARDS)).toEqual([]);
    }
  });
});
