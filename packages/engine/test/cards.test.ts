import { describe, expect, it } from "vitest";
import { attackOf, holdOf } from "../src/core.ts";
import { legalActions } from "../src/legal.ts";
import { blank, endManeuver, findPlay, give, PASS, put, run } from "./helpers.ts";

describe("card effects and keywords", () => {
  it("tidePush moves the tide toward the player, and High Tide enables the effect", () => {
    const s = blank();
    s.tide = 1;
    const smith = give(s, 0, "forge-012"); // tide +1, High Tide: 2 damage to the enemy beacon in this lane
    const { state } = run(s, findPlay(s, smith, (a) => a.slot?.lane === 2 && a.slot.row === "front"), PASS);
    expect(state.tide).toBe(2);
    expect(state.players[1].beacons[2].light).toBe(8);
  });

  it("the tide condition is checked from the side of the player", () => {
    const s = blank();
    s.tide = 2; // on the side of player 0
    s.turn = 1;
    const smith = give(s, 1, "forge-012");
    const { state } = run(s, findPlay(s, smith), PASS);
    expect(state.tide).toBe(1);
    expect(state.players[0].beacons.every((b) => b.light === 10)).toBe(true);
  });

  it("the tide stays between -5 and +5", () => {
    const s = blank();
    s.tide = 4;
    const gust = give(s, 0, "forge-018"); // tide +2
    expect(run(s, findPlay(s, gust), PASS).state.tide).toBe(5);
  });

  it("Anchor stops the tide", () => {
    const s = blank();
    const k = put(s, 1, "forge-004", 0);
    s.cards[k]!.extraKeywords.push("anchor");
    const gust = give(s, 0, "forge-018");
    const { state, events } = run(s, findPlay(s, gust), PASS);
    expect(state.tide).toBe(0);
    expect(events).toContainEqual({ type: "TideAnchored" });
  });

  it("Ebb works when the tide is on the opponent's side", () => {
    const s = blank();
    s.tide = -2;
    const tithe = give(s, 0, "forge-025"); // gain 2 Ember; Ebb: draw 1
    const handBefore = s.players[0].hand.length;
    const { state } = run(s, findPlay(s, tithe), PASS);
    expect(state.players[0].hand.length).toBe(handBefore - 1 + 1);
    expect(state.players[0].ember).toBe(10 - 1 + 2);
  });

  it("Resonance works on the second card of the same faction in a round", () => {
    const s = blank();
    const a = give(s, 0, "forge-001");
    const champion = give(s, 0, "forge-011"); // Resonance: +1/+1
    let st = run(s, findPlay(s, a), PASS).state; // player 1 lets it resolve
    st = run(st, PASS).state; // player 1 passes the turn
    const { state } = run(st, findPlay(st, champion), PASS);
    expect(attackOf(state, champion)).toBe(6);
    expect(holdOf(state, champion)).toBe(5);
  });

  it("Rooted keepers cannot move and get +1 Hold in the front row", () => {
    const s = blank();
    const wall = put(s, 0, "sprout-003", 0); // 1/3 Rooted
    expect(holdOf(s, wall)).toBe(4);
    expect(legalActions(s).some((a) => a.type === "Move" && a.keeper === wall)).toBe(false);
  });

  it("moving a keeper costs 1 Ember and goes to an adjacent empty slot", () => {
    const s = blank();
    const k = put(s, 0, "forge-001", 0);
    const moves = legalActions(s).filter((a) => a.type === "Move" && a.keeper === k);
    expect(moves).toHaveLength(2); // A back and B front
    const { state } = run(s, moves[0]!, PASS);
    expect(state.players[0].ember).toBe(9);
    expect(state.players[0].board[0][0]).toBeNull();
  });

  it("Echo returns a 1/1 copy to the hand when the keeper dies", () => {
    const s = blank();
    const crab = put(s, 0, "sprout-015", 0); // 3/3 Echo
    s.cards[crab]!.damage = 2;
    const fire = give(s, 0, "forge-015"); // 2 damage to a keeper
    const { state, events } = run(s, findPlay(s, fire, (a) => a.targets[0]?.kind === "keeper" && a.targets[0].id === crab), PASS);
    const echo = events.find((e) => e.type === "EchoReturned");
    expect(echo).toBeDefined();
    const copy = state.players[0].hand.find((id) => state.cards[id]?.echoCopy);
    expect(copy).toBeDefined();
  });

  it("an Echo copy is a 1/1 without Echo", () => {
    const s = blank();
    const crab = put(s, 0, "sprout-015", 0);
    s.cards[crab]!.echoCopy = true;
    expect(attackOf(s, crab)).toBe(1);
    expect(holdOf(s, crab)).toBe(1);
  });

  it("Sacrifice destroys the chosen keepers when the card is played", () => {
    const s = blank();
    const k = put(s, 0, "forge-001", 0);
    const overheat = give(s, 0, "forge-021"); // Sacrifice 1: draw 2, gain 1 Ember
    const play = findPlay(s, overheat);
    expect(play.type === "PlayCard" && play.sacrifice).toEqual([k]);
    const { state } = run(s, play, PASS);
    expect(state.players[0].board[0][0]).toBeNull();
    expect(state.players[0].graveyard).toContain(k);
  });

  it("a card with Sacrifice is not playable without enough keepers", () => {
    const s = blank();
    const overheat = give(s, 0, "forge-021");
    expect(legalActions(s).some((a) => a.type === "PlayCard" && a.card === overheat)).toBe(false);
  });

  it("summon creates a token in the back row of the lane", () => {
    const s = blank();
    const seed = give(s, 0, "sprout-007");
    const { state } = run(s, findPlay(s, seed, (a) => a.slot?.lane === 1 && a.slot.row === "front"), PASS);
    const token = state.players[0].board[1][1];
    expect(token).not.toBeNull();
    expect(state.cards[token!]?.token).toBe(true);
  });

  it("a token leaves the game when it dies", () => {
    const s = blank();
    const nursery = give(s, 0, "sprout-018"); // a 1/1 in the back row of each lane
    let st = run(s, findPlay(s, nursery), PASS).state;
    const tokens = st.players[0].board.map((l) => l[1]).filter((x): x is string => !!x);
    expect(tokens).toHaveLength(3);
    st.turn = 1;
    const rain = give(st, 1, "forge-019"); // 2 damage to each enemy keeper
    st = run(st, findPlay(st, rain), PASS).state;
    for (const t of tokens) expect(st.cards[t]).toBeUndefined();
  });

  it("a relic gives its aura to the host keeper and goes to the graveyard with it", () => {
    const s = blank();
    const k = put(s, 0, "forge-001", 0);
    const hammer = give(s, 0, "forge-022"); // +2 Attack
    let st = run(s, findPlay(s, hammer), PASS).state;
    expect(attackOf(st, k)).toBe(4);
    st.cards[k]!.doomed = true;
    st = endManeuver(st).state;
    expect(st.players[0].graveyard).toContain(hammer);
    expect(st.players[0].relics).toHaveLength(0);
  });

  it("a beacon relic triggers at Dusk", () => {
    const s = blank();
    s.players[0].beacons[1].light = 5;
    const lantern = give(s, 0, "sprout-023"); // Dusk: the beacon recovers 1 Light
    const play = findPlay(s, lantern, (a) => a.targets[0]?.kind === "beacon" && a.targets[0].lane === 1);
    let st = run(s, play, PASS).state;
    st = run(st, PASS, PASS).state;
    expect(st.players[0].beacons[1].light).toBe(6);
  });

  it("a site changes the keepers of its lane for both players", () => {
    const s = blank();
    const mine = put(s, 0, "forge-001", 2);
    const theirs = put(s, 1, "forge-001", 2, "back");
    const foundry = give(s, 0, "forge-024"); // +1 Attack in the lane
    const st = run(s, findPlay(s, foundry, (a) => a.lane === 2), PASS).state;
    expect(st.sites[2]).toBe(foundry);
    expect(attackOf(st, mine)).toBe(3);
    expect(attackOf(st, theirs)).toBe(3);
  });

  it("a new site replaces the old site", () => {
    const s = blank();
    const a = give(s, 0, "forge-024");
    const b = give(s, 0, "sprout-024");
    let st = run(s, findPlay(s, a, (x) => x.lane === 0), PASS).state;
    st = run(st, PASS).state;
    st = run(st, findPlay(st, b, (x) => x.lane === 0), PASS).state;
    expect(st.sites[0]).toBe(b);
    expect(st.players[0].graveyard).toContain(a);
  });

  it("a beacon heal does not go over 10 Light and does not light an out beacon", () => {
    const s = blank();
    s.players[0].beacons[0].light = 9;
    s.players[0].beacons[1].light = 0;
    const garden = give(s, 0, "sprout-020");
    const plays = legalActions(s).filter((a) => a.type === "PlayCard" && a.card === garden);
    expect(plays.every((a) => a.type === "PlayCard" && a.targets[0]?.kind === "beacon" && a.targets[0].lane !== 1)).toBe(true);
    const st = run(s, findPlay(s, garden, (a) => a.targets[0]?.kind === "beacon" && a.targets[0].lane === 0), PASS).state;
    expect(st.players[0].beacons[0].light).toBe(10);
  });

  it("a new keeper replaces one of your keepers: no Death effect and no Echo", () => {
    const s = blank();
    const crab = put(s, 0, "sprout-015", 1); // 3/3 Echo
    const relic = give(s, 0, "forge-022");
    let st = run(s, findPlay(s, relic), PASS).state;
    st = run(st, PASS).state;
    const fresh = give(st, 0, "forge-004");
    const { state, events } = run(st, findPlay(st, fresh, (a) => a.slot?.lane === 1 && a.slot.row === "front"), PASS);
    expect(state.players[0].board[1][0]).toBe(fresh);
    expect(state.players[0].graveyard).toContain(crab);
    expect(state.players[0].graveyard).toContain(relic);
    expect(events.some((e) => e.type === "EchoReturned" || e.type === "KeeperDied")).toBe(false);
  });
});
