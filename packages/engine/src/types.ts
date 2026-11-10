import type { Keyword } from "@tcg/cards";

export type PlayerId = 0 | 1;
export type Lane = 0 | 1 | 2;
export type Row = "front" | "back";

export const LANES: readonly Lane[] = [0, 1, 2];
export const ROWS: readonly Row[] = ["front", "back"];
export const PLAYERS: readonly PlayerId[] = [0, 1];

export interface Slot {
  lane: Lane;
  row: Row;
}

export type Target =
  | { kind: "keeper"; id: string }
  | { kind: "beacon"; player: PlayerId; lane: Lane };

/** A card in the game. The instance id stays the same in every zone. */
export interface CardInstance {
  id: string;
  cardId: string;
  owner: PlayerId;
  /** Damage on a keeper. It resets at Dusk. */
  damage: number;
  /** Permanent stat changes. */
  attackMod: number;
  holdMod: number;
  /** Stat changes until Dusk. */
  tempAttack: number;
  tempHold: number;
  extraKeywords: Keyword[];
  /** The round in which the keeper entered play. */
  enteredRound: number;
  /** The last round in which an ability was activated, per ability index. */
  abilityRounds: number[];
  /** Created during the game (summoned token or Echo copy). It leaves the game when it leaves play. */
  token: boolean;
  /** An Echo copy is a 1/1 version of the card. */
  echoCopy: boolean;
  /** Marked for destruction by an effect. */
  doomed: boolean;
  /** Relics only: what the relic is attached to. */
  attachedTo: Target | null;
}

export interface Beacon {
  /** Light points. A beacon with 0 Light is out. */
  light: number;
}

export interface PlayerState {
  deck: string[];
  hand: string[];
  graveyard: string[];
  /** board[lane][0] is the Front slot, board[lane][1] is the Back slot. */
  board: [[string | null, string | null], [string | null, string | null], [string | null, string | null]];
  beacons: [Beacon, Beacon, Beacon];
  /** Relics in play (attached to a keeper or to a beacon). */
  relics: string[];
  ember: number;
  emberMax: number;
  reserve: number;
  mulliganDone: boolean;
  /** Cards played this round, per faction. Used by Resonance. */
  playedFactions: Record<string, number>;
}

export interface ChainLink {
  player: PlayerId;
  action: Action;
  /** Resonance was active when the card was played. */
  resonance: boolean;
}

export type Phase = "mulligan" | "maneuver" | "over";

export type Outcome = { winner: PlayerId | null; reason: "beacons" | "roundLimit" | "concede" };

export interface GameState {
  version: 1;
  seed: number;
  /** Current state of the seeded random generator. */
  rng: number;
  nextId: number;
  cards: Record<string, CardInstance>;
  players: [PlayerState, PlayerState];
  /** Site instance id per lane. */
  sites: [string | null, string | null, string | null];
  /** Tide from -5 to +5. Positive values are on the side of player 0. */
  tide: number;
  round: number;
  phase: Phase;
  initiative: PlayerId;
  /** The player who must act now (or who has priority on the chain). */
  turn: PlayerId;
  /** Consecutive passes in the Maneuver phase. */
  passes: number;
  chain: ChainLink[];
  outcome: Outcome | null;
}

export type Action =
  | { type: "Mulligan"; cards: string[] }
  | {
      type: "PlayCard";
      card: string;
      /** Keepers: the slot. */
      slot?: Slot;
      /** Sites: the lane. */
      lane?: Lane;
      targets: Target[];
      sacrifice?: string[];
    }
  | { type: "Move"; keeper: string; to: Slot }
  | { type: "Activate"; source: string; ability: number; targets: Target[] }
  | { type: "Pass" }
  | { type: "Concede" };

export type GameEvent =
  | { type: "GameStarted"; initiative: PlayerId }
  | { type: "Mulliganed"; player: PlayerId; count: number }
  | { type: "RoundStarted"; round: number; initiative: PlayerId }
  | { type: "CardDrawn"; player: PlayerId; card: string; cardId: string }
  | { type: "CardBurned"; player: PlayerId; card: string; cardId: string }
  | { type: "DeckEmpty"; player: PlayerId }
  | { type: "EmberRefilled"; player: PlayerId; ember: number }
  | { type: "CardPlayed"; player: PlayerId; card: string; cardId: string; targets: Target[] }
  | { type: "AbilityActivated"; player: PlayerId; source: string; ability: number }
  | { type: "KeeperMoveDeclared"; player: PlayerId; keeper: string; to: Slot }
  | { type: "Passed"; player: PlayerId }
  | { type: "ChainResolving"; size: number }
  | { type: "Fizzled"; card: string }
  | { type: "KeeperSummoned"; player: PlayerId; card: string; cardId: string; slot: Slot }
  | { type: "KeeperMoved"; player: PlayerId; keeper: string; from: Slot; to: Slot }
  | { type: "KeeperDamaged"; keeper: string; amount: number; source: string | null }
  | { type: "KeeperHealed"; keeper: string; amount: number }
  | { type: "KeeperBuffed"; keeper: string; attack: number; hold: number; until: "dusk" | "permanent" }
  | { type: "KeywordGranted"; keeper: string; keyword: Keyword }
  | { type: "KeeperDied"; keeper: string; cardId: string; player: PlayerId }
  | { type: "EchoReturned"; player: PlayerId; card: string; cardId: string }
  | { type: "BeaconDamaged"; player: PlayerId; lane: Lane; amount: number; light: number }
  | { type: "BeaconHealed"; player: PlayerId; lane: Lane; amount: number; light: number }
  | { type: "BeaconOut"; player: PlayerId; lane: Lane }
  | { type: "TideShifted"; from: number; to: number }
  | { type: "TideAnchored" }
  | { type: "EmberGained"; player: PlayerId; amount: number }
  | { type: "RelicAttached"; player: PlayerId; relic: string; to: Target }
  | { type: "SitePlaced"; player: PlayerId; site: string; cardId: string; lane: Lane; replaced: string | null }
  | { type: "ClashStarted" }
  | { type: "LaneClash"; lane: Lane }
  | { type: "DuskStarted" }
  | { type: "Worn"; keeper: string }
  | { type: "GameOver"; winner: PlayerId | null; reason: Outcome["reason"] };

export interface Result {
  state: GameState;
  events: GameEvent[];
}
