import { describe, expect, it } from "vitest";
import { CARDS, expandDeck, STARTER_DECKS } from "@tcg/cards";
import {
  breakCard,
  breakExtras,
  chooseDraftFactions,
  choosePick,
  claimRunReward,
  craftCard,
  CRAFT_COST,
  deckProblems,
  DRAFT_DECK,
  DRAFT_MAX_LOSSES,
  EXPEDITION_LIVES,
  EXPEDITION_START_DECK,
  EXPEDITION_STAGES,
  newProfile,
  nextOpponent,
  parseProfile,
  Random,
  readyToPlay,
  recordMatch,
  recordRunMatch,
  rewardCards,
  serializeProfile,
  SHARD_VALUE,
  startDraft,
  startExpedition,
  WIN_REWARD_CARDS,
} from "../src/index.ts";

describe("collection", () => {
  it("starts with every starter deck playable", () => {
    const p = newProfile(1);
    for (const list of Object.values(STARTER_DECKS)) expect(deckProblems(p.collection, list)).toEqual([]);
  });

  it("finds cards that the player does not own", () => {
    const p = newProfile(1);
    const list = { ...STARTER_DECKS.forge! };
    delete list["forge-001"];
    list["forge-010"] = 2;
    p.collection.cards["forge-010"] = 1;
    expect(deckProblems(p.collection, list)).toContainEqual({ code: "notOwned", card: "forge-010", copies: 2, owned: 1 });
  });

  it("breaks and crafts cards with Shards", () => {
    const p = newProfile(1);
    const c = p.collection;
    c.shards = 0;
    expect(craftCard(c, "forge-010")).toBe(false);
    c.cards["forge-001"] = 3;
    expect(breakExtras(c)).toBe(SHARD_VALUE.common);
    expect(c.cards["forge-001"]).toBe(2);
    c.shards = CRAFT_COST.uncommon;
    expect(craftCard(c, "forge-010")).toBe(true);
    expect(c.shards).toBe(0);
    expect(breakCard(c, "forge-010")).toBe(true);
    expect(c.shards).toBe(SHARD_VALUE.uncommon);
  });

  it("gives reproducible rewards of collectible cards", () => {
    const a = rewardCards(new Random(7), 20);
    expect(rewardCards(new Random(7), 20)).toEqual(a);
    for (const id of a) expect(CARDS[id]?.token).toBe(false);
    for (const id of rewardCards(new Random(3), 30, ["gear"])) expect(["gear", "neutral"]).toContain(CARDS[id]!.faction);
  });

  it("records wins and losses", () => {
    const p = newProfile(5);
    const before = { ...p.collection.cards };
    const r = recordMatch(p, true);
    expect(r.kind).toBe("cards");
    const added = Object.values(p.collection.cards).reduce((a, b) => a + b, 0) - Object.values(before).reduce((a, b) => a + b, 0);
    expect(added).toBe(WIN_REWARD_CARDS);
    const shards = p.collection.shards;
    recordMatch(p, false);
    expect(p.collection.shards).toBeGreaterThan(shards);
    expect([p.wins, p.losses]).toEqual([1, 1]);
  });

  it("stores and reads a profile", () => {
    const p = newProfile(9);
    p.run = startExpedition(3, "gear");
    const back = parseProfile(serializeProfile(p));
    expect(back).toEqual(p);
    expect(parseProfile("not json")).toBeNull();
    expect(parseProfile(JSON.stringify({ version: 2 }))).toBeNull();
  });
});

describe("expedition", () => {
  it("starts with a small deck of one faction and a list of opponents", () => {
    const run = startExpedition(11, "abyss");
    expect(run.deck).toHaveLength(EXPEDITION_START_DECK);
    for (const id of run.deck) expect(expandDeck(STARTER_DECKS.abyss!)).toContain(id);
    expect(run.opponents).toHaveLength(EXPEDITION_STAGES);
    expect(run.opponents.at(-1)!.boss).toBe(true);
    expect(run.opponents.every((o) => o.deck !== "abyss")).toBe(true);
  });

  it("offers a card after a win and ends after the boss", () => {
    const run = startExpedition(12, "forge");
    for (let i = 0; i < EXPEDITION_STAGES; i++) {
      expect(readyToPlay(run)).toBe(true);
      expect(nextOpponent(run)).toEqual(run.opponents[i]);
      recordRunMatch(run, true);
      if (i < EXPEDITION_STAGES - 1) {
        expect(run.pick!.options).toHaveLength(3);
        expect(readyToPlay(run)).toBe(false);
        expect(choosePick(run, "not-an-option")).toBe(false);
        expect(choosePick(run, run.pick!.options[0]!)).toBe(true);
      }
    }
    expect(run.status).toBe("won");
    expect(run.deck).toHaveLength(EXPEDITION_START_DECK + EXPEDITION_STAGES - 1);
    const c = newProfile(1).collection;
    const shards = c.shards;
    const r = claimRunReward(run, c, new Random(1));
    expect(r.cards).toHaveLength(EXPEDITION_STAGES);
    expect(c.shards).toBe(shards + 100);
  });

  it("ends when the lives are over", () => {
    const run = startExpedition(13, "vesper");
    for (let i = 0; i < EXPEDITION_LIVES; i++) recordRunMatch(run, false);
    expect(run.status).toBe("lost");
    expect(nextOpponent(run)).toBeNull();
  });
});

describe("draft", () => {
  it("builds a deck of 30 cards from picks of the chosen factions", () => {
    const run = startDraft(21);
    expect(run.factionChoices).toHaveLength(3);
    expect(readyToPlay(run)).toBe(false);
    expect(chooseDraftFactions(run, 1)).toBe(true);
    const factions = run.factions;
    while (run.pick) choosePick(run, run.pick.options[0]!);
    expect(run.deck).toHaveLength(DRAFT_DECK);
    for (const id of run.deck) expect([...factions, "neutral"]).toContain(CARDS[id]!.faction);
    expect(readyToPlay(run)).toBe(true);
    for (let i = 0; i < DRAFT_MAX_LOSSES; i++) recordRunMatch(run, false);
    expect(run.status).toBe("lost");
  });
});
