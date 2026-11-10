import { CARDS } from "@tcg/cards";
import { BEACON_LIGHT, createInstance, RulesError } from "./core.ts";
import { LANES, PLAYERS, type GameEvent, type GameState, type Lane, type PlayerId, type PlayerState, type Row } from "./types.ts";

/** A keeper already on the board when the scenario starts. */
export interface ScenarioKeeper {
  card: string;
  lane: Lane;
  row: Row;
  /** True if the keeper entered this round (it cannot attack yet). */
  fresh?: boolean;
}

export interface ScenarioSide {
  /** Cards in hand at the start. */
  hand: string[];
  /** Deck from top to bottom. The scenario does not shuffle it. */
  deck: string[];
  board?: ScenarioKeeper[];
  /** Light of the beacons A, B, C. Default: 10 each. */
  light?: [number, number, number];
  emberMax?: number;
}

/**
 * A fixed starting position, for the tutorial and for tests.
 * The game starts in the Maneuver phase of the given round, with no mulligan and no shuffle.
 */
export interface Scenario {
  seed: number;
  round: number;
  initiative: PlayerId;
  tide?: number;
  sides: [ScenarioSide, ScenarioSide];
}

function emptyPlayer(side: ScenarioSide): PlayerState {
  const light = side.light ?? [BEACON_LIGHT, BEACON_LIGHT, BEACON_LIGHT];
  return {
    deck: [],
    hand: [],
    graveyard: [],
    board: [
      [null, null],
      [null, null],
      [null, null],
    ],
    beacons: [{ light: light[0] }, { light: light[1] }, { light: light[2] }],
    relics: [],
    ember: 0,
    emberMax: 0,
    reserve: 0,
    mulliganDone: true,
    playedFactions: {},
  };
}

export function newScenario(sc: Scenario): { state: GameState; events: GameEvent[] } {
  const state: GameState = {
    version: 1,
    seed: sc.seed >>> 0,
    rng: sc.seed >>> 0,
    nextId: 1,
    cards: {},
    players: [emptyPlayer(sc.sides[0]), emptyPlayer(sc.sides[1])],
    sites: [null, null, null],
    tide: sc.tide ?? 0,
    round: sc.round,
    phase: "maneuver",
    initiative: sc.initiative,
    turn: sc.initiative,
    passes: 0,
    chain: [],
    outcome: null,
  };
  const events: GameEvent[] = [];
  for (const p of PLAYERS) {
    const side = sc.sides[p];
    const ps = state.players[p];
    const make = (cardId: string) => {
      if (!CARDS[cardId]) throw new RulesError(`Unknown card ${cardId}`);
      return createInstance(state, cardId, p, false);
    };
    for (const c of side.deck) ps.deck.push(make(c).id);
    for (const c of side.hand) ps.hand.push(make(c).id);
    for (const k of side.board ?? []) {
      if (!LANES.includes(k.lane)) throw new RulesError(`Bad lane ${k.lane}`);
      const inst = make(k.card);
      inst.enteredRound = k.fresh ? sc.round : sc.round - 1;
      ps.board[k.lane][k.row === "front" ? 0 : 1] = inst.id;
    }
    ps.emberMax = Math.min(10, side.emberMax ?? sc.round);
    ps.ember = ps.emberMax;
  }
  // No draw at the start: the scenario hand is the hand of this round.
  events.push({ type: "RoundStarted", round: sc.round, initiative: sc.initiative });
  return { state, events };
}
