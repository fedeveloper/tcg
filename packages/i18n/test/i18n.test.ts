import { describe, expect, it } from "vitest";
import { CARDS } from "@tcg/cards";
import { cardName, cardRulesText, checkLocales, createTranslator, describeAction, detectLang, describeEvent, lookupIn } from "../src/index.ts";
import { newGame, legalActions, type GameEvent } from "@tcg/engine";
import { expandDeck, STARTER_DECKS } from "@tcg/cards";

describe("locales", () => {
  it("has every key in Italian and English", () => {
    expect(checkLocales()).toEqual([]);
  });

  it("detects the language and falls back to English", () => {
    expect(detectLang("it_IT.UTF-8")).toBe("it");
    expect(detectLang("en-US")).toBe("en");
    expect(detectLang("de_DE")).toBe("en");
    expect(detectLang(undefined)).toBe("en");
  });

  it("translates card names", () => {
    expect(cardName(createTranslator("it"), "forge-012")).toBe("Fabbro delle Scintille");
    expect(cardName(createTranslator("en"), "forge-012")).toBe("Sparksmith");
  });
});

describe("rules text", () => {
  const it_ = createTranslator("it");
  const en = createTranslator("en");

  it("builds the text from the effects", () => {
    expect(cardRulesText(it_, CARDS["forge-012"]!)).toEqual([
      "Sposta la Marea di 1 verso di te.",
      "Entra in gioco (Alta Marea): infliggi 2 danni al Faro nemico di questa corsia.",
    ]);
    expect(cardRulesText(en, CARDS["forge-012"]!)).toEqual([
      "Move the Tide 1 toward you.",
      "Enters play (High Tide): deal 2 damage to the enemy Beacon in this lane.",
    ]);
  });

  it("uses plurals and refers again to the chosen target", () => {
    expect(cardRulesText(it_, CARDS["forge-020"]!)).toEqual(["Infliggi 1 danno a un Custode nemico.", "Alta Marea: infliggi 2 danni a quel Custode."]);
    expect(cardRulesText(en, CARDS["sprout-019"]!)).toEqual(["One of your Keepers gains Rooted, then that Keeper gets +2 Hold."]);
  });

  it("writes a text for every card in both languages", () => {
    for (const tr of [it_, en]) {
      for (const def of Object.values(CARDS)) {
        for (const line of cardRulesText(tr, def)) {
          expect(line).not.toMatch(/\{\{|\?|undefined|rules\.|targets\./);
        }
      }
    }
  });

  it("describes actions and events", () => {
    const { state, events } = newGame({ seed: 2, decks: [expandDeck(STARTER_DECKS.forge!), expandDeck(STARTER_DECKS.sprout!)] });
    const lookup = lookupIn(state);
    for (const tr of [it_, en]) {
      for (const a of legalActions(state)) expect(describeAction(tr, state, a, state.turn)).not.toMatch(/\{\{|undefined/);
      for (const e of events) expect(describeEvent(tr, e, 0, lookup) ?? "").not.toMatch(/\{\{|undefined|events\./);
    }
    const over: GameEvent = { type: "GameOver", winner: 0, reason: "beacons" };
    expect(describeEvent(it_, over, 0, lookup)).toBe("Hai vinto! Due Fari sono spenti.");
  });
});
