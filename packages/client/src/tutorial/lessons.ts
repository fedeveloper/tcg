import { keepersOf, type Action, type GameState, type Scenario } from "@tcg/engine";
import { HUMAN } from "../game/session.ts";

/** What the tutorial opponent does. "script" returns an action, or null to pass. */
export type OpponentPlan = { kind: "pass" } | { kind: "script"; next: (state: GameState) => Action | null };

/**
 * A guided game (plan, section 5.1). Each lesson introduces one rule.
 * The texts are in the locale files under tutorial.lessons.<id>.
 */
export interface Lesson {
  id: string;
  scenario: Scenario;
  opponent: OpponentPlan;
  /** The lesson is complete when the goal is true. */
  goal: (state: GameState) => boolean;
  /** The lesson fails after this round. */
  maxRound: number;
}

const enemyBeaconOut = (s: GameState) => s.players[1].beacons.some((b) => b.light <= 0);
const won = (s: GameState) => s.outcome?.winner === HUMAN;
const filler = (card: string, n: number) => Array.from({ length: n }, () => card);

export const LESSONS: readonly Lesson[] = [
  {
    id: "keepers",
    scenario: {
      seed: 101,
      round: 2,
      initiative: 0,
      sides: [
        { hand: ["forge-004", "forge-003", "forge-001"], deck: filler("forge-001", 8) },
        { hand: [], deck: filler("sprout-001", 8), light: [10, 3, 10] },
      ],
    },
    opponent: { kind: "pass" },
    goal: enemyBeaconOut,
    maxRound: 5,
  },
  {
    id: "blocking",
    scenario: {
      seed: 102,
      round: 3,
      initiative: 0,
      sides: [
        { hand: ["sprout-003", "forge-005"], deck: filler("forge-001", 8), light: [4, 10, 10] },
        { hand: [], deck: filler("sprout-001", 8), board: [{ card: "forge-004", lane: 0, row: "front" }] },
      ],
    },
    opponent: { kind: "pass" },
    goal: (s) => keepersOf(s, 1).length === 0 && s.phase !== "over",
    maxRound: 6,
  },
  {
    id: "ember",
    scenario: {
      seed: 103,
      round: 3,
      initiative: 0,
      sides: [
        { hand: ["forge-016", "forge-016"], deck: filler("forge-001", 8) },
        { hand: [], deck: filler("sprout-001", 8), light: [4, 10, 4] },
      ],
    },
    opponent: { kind: "pass" },
    goal: won,
    maxRound: 5,
  },
  {
    id: "tide",
    scenario: {
      seed: 104,
      round: 5,
      initiative: 0,
      sides: [
        { hand: ["forge-018", "forge-012", "forge-012"], deck: filler("forge-001", 8) },
        { hand: [], deck: filler("sprout-001", 8), light: [2, 10, 2] },
      ],
    },
    opponent: { kind: "pass" },
    goal: won,
    maxRound: 7,
  },
  {
    id: "chain",
    scenario: {
      seed: 105,
      round: 3,
      initiative: 1,
      sides: [
        { hand: ["sprout-017"], deck: filler("forge-001", 8), board: [{ card: "forge-001", lane: 1, row: "front" }] },
        { hand: ["forge-015"], deck: filler("sprout-001", 8), light: [0, 2, 10] },
      ],
    },
    opponent: {
      kind: "script",
      // The opponent attacks your keeper with Firebrand once, then passes.
      next: (s) => {
        if (s.chain.length > 0) return null;
        const fire = s.players[1].hand.find((id) => s.cards[id]?.cardId === "forge-015");
        const target = s.players[0].board[1][0];
        if (!fire || !target) return null;
        return { type: "PlayCard", card: fire, targets: [{ kind: "keeper", id: target }] };
      },
    },
    goal: won,
    maxRound: 4,
  },
];
