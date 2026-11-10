import { describe, expect, it } from "vitest";
import { apply, legalActions, newScenario, type Action, type GameState } from "@tcg/engine";
import { LESSONS, type Lesson } from "../src/tutorial/lessons.ts";

type Want = (a: Action, s: GameState) => boolean;

const card = (s: GameState, id: string) => s.cards[id]?.cardId;
const playAt = (cardId: string, lane: number, row: "front" | "back"): Want => (a, s) =>
  a.type === "PlayCard" && card(s, a.card) === cardId && a.slot?.lane === lane && a.slot.row === row;
const playOn = (cardId: string, test: (a: Extract<Action, { type: "PlayCard" }>, s: GameState) => boolean): Want => (a, s) =>
  a.type === "PlayCard" && card(s, a.card) === cardId && test(a, s);

/** Plays a lesson with a list of wanted human actions. The human passes when no wanted action is legal. */
function solve(lesson: Lesson, wants: Want[]): GameState {
  let s = newScenario(lesson.scenario).state;
  const queue = [...wants];
  for (let i = 0; i < 300 && s.phase !== "over" && !lesson.goal(s) && s.round <= lesson.maxRound; i++) {
    const legal = legalActions(s);
    let action: Action | undefined;
    if (s.turn === 1) {
      const wanted = lesson.opponent.kind === "script" ? lesson.opponent.next(s) : null;
      action = wanted ? legal.find((a) => JSON.stringify(a) === JSON.stringify(wanted)) : undefined;
    } else if (queue[0]) {
      action = legal.find((a) => queue[0]!(a, s));
      if (action) queue.shift();
    }
    s = apply(s, action ?? { type: "Pass" }).state;
  }
  return s;
}

const byId = (id: string) => LESSONS.find((l) => l.id === id)!;

describe("tutorial lessons", () => {
  it("has 5 lessons with valid scenarios", () => {
    expect(LESSONS).toHaveLength(5);
    for (const l of LESSONS) expect(() => newScenario(l.scenario)).not.toThrow();
  });

  it("lesson 1: a keeper attacks the beacon of its lane one round later", () => {
    const l = byId("keepers");
    expect(l.goal(solve(l, [playAt("forge-004", 1, "front")]))).toBe(true);
  });

  it("lesson 2: a rooted blocker and a Reach keeper destroy the attacker", () => {
    const l = byId("blocking");
    const s = solve(l, [playAt("sprout-003", 0, "front"), playAt("forge-005", 0, "back")]);
    expect(l.goal(s)).toBe(true);
  });

  it("lesson 3: Ember in the Reserve pays for the second rite", () => {
    const l = byId("ember");
    const beacon = (lane: number): Want => playOn("forge-016", (a) => a.targets[0]?.kind === "beacon" && a.targets[0].lane === lane);
    expect(l.goal(solve(l, [beacon(0), beacon(2)]))).toBe(true);
  });

  it("lesson 4: High Tide enables the Sparksmith", () => {
    const l = byId("tide");
    const s = solve(l, [playOn("forge-018", () => true), playAt("forge-012", 0, "front"), playAt("forge-012", 2, "front")]);
    expect(l.goal(s)).toBe(true);
  });

  it("lesson 5: a Quick Rite answers the opponent's rite", () => {
    const l = byId("chain");
    const s = solve(l, [playOn("sprout-017", () => true)]);
    expect(l.goal(s)).toBe(true);
    // Without the answer, the keeper dies and the lesson fails.
    expect(l.goal(solve(l, []))).toBe(false);
  });
});
