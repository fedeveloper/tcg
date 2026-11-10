import { describe, expect, it } from "vitest";
import { attackOf } from "../src/core.ts";
import { legalActions } from "../src/legal.ts";
import { blank, findPlay, give, PASS, put, run } from "./helpers.ts";

describe("responses and chain", () => {
  it("the opponent can respond with a Quick Rite, and the chain resolves from the last card", () => {
    const s = blank();
    const target = put(s, 1, "forge-001", 0); // 2/1
    const fire = give(s, 0, "forge-015"); // 2 damage
    const regrow = give(s, 1, "sprout-017"); // +0/+3 until Dusk
    let st = run(s, findPlay(s, fire, (a) => a.targets[0]?.kind === "keeper" && a.targets[0].id === target)).state;
    expect(st.turn).toBe(1);
    st = run(st, findPlay(st, regrow, (a) => a.targets[0]?.kind === "keeper" && a.targets[0].id === target)).state;
    expect(st.chain).toHaveLength(2);
    const { state } = run(st, PASS);
    expect(state.chain).toHaveLength(0);
    expect(state.players[1].board[0][0]).toBe(target); // the response resolved first and saved it
    expect(state.turn).toBe(1); // after the chain, the opponent of the first player acts
  });

  it("only Quick Rites can respond", () => {
    const s = blank();
    const keeper = give(s, 0, "forge-001");
    give(s, 1, "forge-016"); // slow rite
    give(s, 1, "forge-001"); // keeper
    const st = run(s, findPlay(s, keeper)).state;
    const options = legalActions(st);
    expect(options).toEqual([{ type: "Pass" }]);
  });

  it("the chain has a limit of 4 cards", () => {
    const s = blank();
    const k = put(s, 0, "forge-004", 0);
    for (let i = 0; i < 3; i++) give(s, 0, "forge-017");
    for (let i = 0; i < 3; i++) give(s, 1, "forge-017");
    put(s, 1, "forge-004", 1);
    const respond = (st: typeof s) => legalActions(st).find((a) => a.type === "PlayCard")!;
    let st = run(s, findPlay(s, s.players[0].hand[0]!, (a) => a.targets[0]?.kind === "keeper" && a.targets[0].id === k)).state;
    st = run(st, respond(st)).state;
    st = run(st, respond(st)).state;
    st = run(st, respond(st)).state;
    expect(st.chain).toHaveLength(4);
    expect(legalActions(st)).toEqual([{ type: "Pass" }]);
    const end = run(st, PASS).state;
    expect(attackOf(end, k)).toBe(2 + 4);
  });

  it("a rite with a target that is gone has no effect", () => {
    const s = blank();
    const victim = put(s, 1, "forge-001", 0);
    const hymn = give(s, 0, "forge-015");
    const fire = give(s, 1, "forge-015");
    let st = run(s, findPlay(s, hymn, (a) => a.targets[0]?.kind === "keeper" && a.targets[0].id === victim)).state;
    // Player 1 kills its own keeper in response: the first rite fizzles.
    st = run(st, findPlay(st, fire, (a) => a.targets[0]?.kind === "keeper" && a.targets[0].id === victim)).state;
    const { events } = run(st, PASS);
    expect(events).toContainEqual({ type: "Fizzled", card: hymn });
  });

  it("a keeper whose slot is taken when it resolves goes to the graveyard", () => {
    const s = blank();
    const a = give(s, 0, "forge-001");
    const st = run(s, findPlay(s, a, (x) => x.slot?.lane === 0 && x.slot.row === "front")).state;
    put(st, 0, "forge-004", 0); // the slot is taken while the card is on the chain
    const { state, events } = run(st, PASS);
    expect(events).toContainEqual({ type: "Fizzled", card: a });
    expect(state.players[0].graveyard).toContain(a);
  });
});
