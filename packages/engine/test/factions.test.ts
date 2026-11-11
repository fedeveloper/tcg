import { describe, expect, it } from "vitest";
import { attackOf } from "../src/core.ts";
import { blank, findPlay, give, PASS, put, run } from "./helpers.ts";

describe("rules of the new factions", () => {
  it("bounce returns an enemy keeper to the hand of its owner", () => {
    const s = blank();
    const foe = put(s, 1, "forge-004", 1);
    give(s, 0, "abyss-016");
    const r = run(s, findPlay(s, s.players[0].hand[0]!, (a) => a.targets[0]?.kind === "keeper" && a.targets[0].id === foe), PASS);
    expect(r.state.players[1].board[1][0]).toBeNull();
    expect(r.state.players[1].hand).toContain(foe);
    expect(r.events.some((e) => e.type === "KeeperBounced")).toBe(true);
  });

  it("discard removes random cards from the enemy hand", () => {
    const s = blank();
    give(s, 1, "forge-001");
    give(s, 1, "forge-002");
    give(s, 1, "forge-003");
    give(s, 0, "abyss-020");
    const r = run(s, findPlay(s, s.players[0].hand[0]!), PASS);
    expect(r.state.players[1].hand).toHaveLength(1);
    expect(r.state.players[1].graveyard).toHaveLength(2);
  });

  it("recall returns the last keepers of the graveyard to the hand", () => {
    const s = blank();
    const a = give(s, 0, "forge-001");
    const b = give(s, 0, "forge-015");
    const c = give(s, 0, "forge-004");
    s.players[0].hand = [];
    s.players[0].graveyard.push(a, b, c);
    give(s, 0, "vesper-016");
    const r = run(s, findPlay(s, s.players[0].hand[0]!), PASS);
    expect(r.state.players[0].hand).toEqual([c, a]);
    expect(r.state.players[0].graveyard).toContain(b);
  });

  it("a tide turn triggers the tideTurn effects once", () => {
    const s = blank();
    s.tide = -1;
    const dancer = put(s, 0, "vesper-004", 0);
    give(s, 0, "vesper-019");
    const r = run(s, findPlay(s, s.players[0].hand[0]!), PASS);
    expect(r.state.tide).toBe(1);
    expect(r.events.filter((e) => e.type === "TideTurned")).toHaveLength(1);
    expect(attackOf(r.state, dancer)).toBe(3);
  });

  it("a tide move that stays on one side does not turn the tide", () => {
    const s = blank();
    s.tide = 1;
    const dancer = put(s, 0, "vesper-004", 0);
    give(s, 0, "vesper-019");
    const r = run(s, findPlay(s, s.players[0].hand[0]!), PASS);
    expect(r.events.some((e) => e.type === "TideTurned")).toBe(false);
    expect(attackOf(r.state, dancer)).toBe(2);
  });

  it("armed works only with a relic in play", () => {
    for (const withRelic of [false, true]) {
      const s = blank();
      const host = put(s, 0, "gear-004", 2);
      if (withRelic) {
        const relic = give(s, 0, "gear-015");
        s.players[0].hand = [];
        s.cards[relic]!.attachedTo = { kind: "keeper", id: host };
        s.players[0].relics.push(relic);
      }
      give(s, 0, "gear-022");
      const before = s.players[0].deck.length;
      const r = run(s, findPlay(s, s.players[0].hand[0]!), PASS);
      expect(before - r.state.players[0].deck.length).toBe(withRelic ? 2 : 1);
    }
  });

  it("haunted works only with 5 or more cards in the graveyard", () => {
    for (const dead of [4, 5]) {
      const s = blank();
      for (let i = 0; i < dead; i++) {
        const id = give(s, 0, "forge-015");
        s.players[0].hand = [];
        s.players[0].graveyard.push(id);
      }
      give(s, 0, "vesper-008");
      const r = run(s, findPlay(s, s.players[0].hand[0]!), PASS);
      const id = r.state.players[0].board[0][0] ?? r.state.players[0].board.flat().find((x) => x)!;
      expect(attackOf(r.state, id!)).toBe(dead >= 5 ? 5 : 3);
    }
  });
});
