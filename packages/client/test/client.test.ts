import { describe, expect, it } from "vitest";
import { legalActions, type Action } from "@tcg/engine";
import { GameSession, HUMAN, type Step } from "../src/game/session.ts";
import { InlineAiDriver } from "../src/game/aiDriver.ts";
import { narrow, optionsForCard, stageOf } from "../src/game/selection.ts";
import { beaconRect, integerScale, slotRect, tideX } from "../src/render/layout.ts";

function session(level: "easy" | "random" = "random") {
  const steps: Step[] = [];
  const s = new GameSession({
    seed: 9,
    deck: "forge",
    opponentDeck: "sprout",
    level,
    ai: new InlineAiDriver(1),
    onStep: (step) => {
      steps.push(step);
    },
  });
  return { s, steps };
}

describe("game session", () => {
  it("plays a full game: the human always passes or keeps", async () => {
    const { s, steps } = session();
    await s.start();
    for (let i = 0; i < 400 && !s.over; i++) {
      const actions = s.humanActions();
      expect(actions.length).toBeGreaterThan(0);
      const keep = actions.find((a) => a.type === "Mulligan" && a.cards.length === 0);
      await s.humanAct(keep ?? actions.find((a) => a.type === "Pass")!);
    }
    expect(s.over).toBe(true);
    expect(steps.length).toBeGreaterThan(10);
    for (const st of steps) expect(st.before).not.toBe(st.after);
  });

  it("does not ask the human when the only option is to let the chain resolve", async () => {
    const { s } = session("easy");
    await s.start();
    for (let i = 0; i < 60 && !s.over; i++) {
      if (s.state.chain.length > 0) expect(legalActions(s.state, HUMAN).length).toBeGreaterThan(1);
      const actions = s.humanActions();
      const play = actions.find((a) => a.type === "PlayCard") ?? actions.find((a) => a.type === "Mulligan") ?? actions[actions.length - 1]!;
      await s.humanAct(play);
    }
  });

  it("ignores actions when it is not the human's turn", async () => {
    const { s } = session();
    if (s.state.turn !== HUMAN) {
      const before = s.state;
      await s.humanAct({ type: "Pass" });
      expect(s.state).toBe(before);
    }
  });
});

describe("click selection", () => {
  it("narrows a keeper play to one slot with one click", async () => {
    const { s } = session();
    await s.start();
    await s.humanAct(s.humanActions().find((a) => a.type === "Mulligan" && a.cards.length === 0)!);
    const actions = s.humanActions();
    const keeper = actions.find((a): a is Extract<Action, { type: "PlayCard" }> => a.type === "PlayCard" && !!a.slot);
    if (!keeper) return;
    const options = optionsForCard(actions, keeper.card);
    expect(stageOf(options)).toBe("slot");
    const next = narrow(options, { kind: "slot", owner: HUMAN, lane: 1, row: "front" }, s.state, HUMAN);
    expect(next.every((a) => a.type === "PlayCard" && a.slot?.lane === 1 && a.slot.row === "front")).toBe(true);
    expect(narrow(options, { kind: "slot", owner: 1, lane: 1, row: "front" }, s.state, HUMAN)).toEqual([]);
  });
});

describe("layout", () => {
  it("puts the viewer on the left and the opponent on the right", () => {
    expect(slotRect(0, 0, 0, "front").x).toBeLessThan(slotRect(0, 1, 0, "front").x);
    expect(beaconRect(1, 1, 2).x).toBe(72);
    expect(slotRect(0, 0, 0, "back").x).toBeLessThan(slotRect(0, 0, 0, "front").x);
  });

  it("scales by whole numbers only", () => {
    expect(integerScale(1440, 900)).toBe(3);
    expect(integerScale(300, 200)).toBe(1);
  });

  it("moves the tide marker to the left when the tide is on the viewer's side", () => {
    expect(tideX(5)).toBeLessThan(tideX(0));
    expect(tideX(-5)).toBeGreaterThan(tideX(0));
  });
});
