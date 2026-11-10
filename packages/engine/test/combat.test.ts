import { describe, expect, it } from "vitest";
import { blank, endManeuver, put } from "./helpers.ts";

const light = (s: ReturnType<typeof blank>, p: 0 | 1) => s.players[p].beacons.map((b) => b.light);

describe("clash", () => {
  it("a front keeper with no blocker damages the enemy beacon of its lane", () => {
    const s = blank();
    put(s, 0, "forge-001", 1); // 2/2 in lane B
    const next = endManeuver(s).state;
    expect(light(next, 1)).toEqual([10, 8, 10]);
  });

  it("a keeper does not attack in the round it enters play", () => {
    const s = blank();
    put(s, 0, "forge-001", 0, "front", true);
    expect(light(endManeuver(s).state, 1)).toEqual([10, 10, 10]);
  });

  it("Surge lets a keeper attack in the round it enters play", () => {
    const s = blank();
    put(s, 0, "forge-002", 0, "front", true); // 2/1 Surge
    expect(light(endManeuver(s).state, 1)).toEqual([8, 10, 10]);
  });

  it("a fresh blocker blocks and hits back the attacker", () => {
    const s = blank();
    const attacker = put(s, 0, "forge-004", 0); // 2/3
    const blocker = put(s, 1, "forge-001", 0, "front", true); // 2/2, fresh
    const { state, events } = endManeuver(s);
    expect(light(state, 1)).toEqual([10, 10, 10]);
    expect(events).toContainEqual({ type: "KeeperDamaged", keeper: attacker, amount: 2, source: null });
    expect(events.some((e) => e.type === "KeeperDied" && e.keeper === blocker)).toBe(true);
  });

  it("two ready front keepers deal damage at the same time", () => {
    const s = blank();
    const a = put(s, 0, "forge-001", 2); // 2/2
    const b = put(s, 1, "forge-001", 2); // 2/2
    const { events } = endManeuver(s);
    const died = events.filter((e) => e.type === "KeeperDied").map((e) => (e.type === "KeeperDied" ? e.keeper : ""));
    expect(died.sort()).toEqual([a, b].sort());
  });

  it("excess damage does not reach the beacon without Overrun", () => {
    const s = blank();
    put(s, 0, "forge-013", 0); // 7/6 Overrun, Surge
    put(s, 0, "forge-004", 1); // 3/3, no Overrun
    put(s, 1, "forge-001", 0); // 2/2
    put(s, 1, "sprout-t01", 1); // 1/1
    const next = endManeuver(s).state;
    expect(light(next, 1)).toEqual([5, 10, 10]); // 7 - 2 remaining Hold = 5 to the beacon
  });

  it("Reach lets a back keeper attack the enemy front keeper or beacon", () => {
    const s = blank();
    put(s, 0, "forge-005", 0, "back"); // 2/2 Reach
    put(s, 0, "forge-001", 1, "back"); // 2/2, no Reach: does not attack from the back
    const next = endManeuver(s).state;
    expect(light(next, 1)).toEqual([8, 10, 10]);
  });

  it("damage on keepers resets at Dusk", () => {
    const s = blank();
    const tank = put(s, 0, "sprout-006", 0); // 1/6 Rooted (+1 Hold in front)
    put(s, 1, "forge-007", 0); // 5/3
    const next = endManeuver(s).state;
    expect(next.cards[tank]?.damage).toBe(0);
    expect(next.players[0].board[0][0]).toBe(tank);
  });

  it("damage against an out beacon is lost", () => {
    const s = blank();
    s.players[1].beacons[0].light = 0;
    put(s, 0, "forge-007", 0);
    const { events } = endManeuver(s);
    expect(events.some((e) => e.type === "BeaconDamaged" && e.lane === 0)).toBe(false);
  });

  it("a player wins by putting out 2 enemy beacons", () => {
    const s = blank();
    s.players[1].beacons[0].light = 0;
    s.players[1].beacons[1].light = 2;
    put(s, 0, "forge-001", 1);
    const next = endManeuver(s).state;
    expect(next.outcome).toEqual({ winner: 0, reason: "beacons" });
  });

  it("the game is a draw when both players put out the second beacon in the same Clash", () => {
    const s = blank();
    s.players[0].beacons[0].light = 0;
    s.players[1].beacons[0].light = 0;
    s.players[0].beacons[2].light = 1;
    s.players[1].beacons[1].light = 1;
    put(s, 0, "forge-001", 1);
    put(s, 1, "forge-001", 2);
    expect(endManeuver(s).state.outcome).toEqual({ winner: null, reason: "beacons" });
  });

  it("Wear removes 1 Attack at each Dusk", () => {
    const s = blank();
    const raider = put(s, 0, "forge-006", 0, "back"); // 3/2 Surge, Wear
    const next = endManeuver(s).state;
    expect(next.cards[raider]?.attackMod).toBe(-1);
  });
});
