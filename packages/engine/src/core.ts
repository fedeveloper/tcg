import { CARDS, type CardDef, type Keyword } from "@tcg/cards";
import {
  LANES,
  ROWS,
  type CardInstance,
  type GameEvent,
  type GameState,
  type Lane,
  type PlayerId,
  type Row,
  type Slot,
} from "./types.ts";

export const BEACON_LIGHT = 10;
export const HAND_LIMIT = 8;
export const TIDE_LIMIT = 5;
export const MAX_EMBER = 10;
export const MAX_RESERVE = 2;
export const ROUND_LIMIT = 20;
export const BEACONS_TO_WIN = 2;
export const CHAIN_LIMIT = 4;
export const DECK_OUT_DAMAGE = 2;
export const HIGH_TIDE = 2;

export class RulesError extends Error {}

export function other(p: PlayerId): PlayerId {
  return p === 0 ? 1 : 0;
}

export function rowIndex(row: Row): 0 | 1 {
  return row === "front" ? 0 : 1;
}

export function defOf(state: GameState, instanceId: string): CardDef {
  const inst = inst_(state, instanceId);
  const def = CARDS[inst.cardId];
  if (!def) throw new RulesError(`Unknown card ${inst.cardId}`);
  return def;
}

function inst_(state: GameState, id: string): CardInstance {
  const c = state.cards[id];
  if (!c) throw new RulesError(`Unknown instance ${id}`);
  return c;
}
export { inst_ as instanceOf };

export function createInstance(state: GameState, cardId: string, owner: PlayerId, token: boolean): CardInstance {
  const id = `c${state.nextId++}`;
  const inst: CardInstance = {
    id,
    cardId,
    owner,
    damage: 0,
    attackMod: 0,
    holdMod: 0,
    tempAttack: 0,
    tempHold: 0,
    extraKeywords: [],
    enteredRound: 0,
    abilityRounds: [],
    token,
    echoCopy: false,
    doomed: false,
    attachedTo: null,
  };
  state.cards[id] = inst;
  return inst;
}

// ---------------------------------------------------------------- board

export function slotOf(state: GameState, keeperId: string): Slot | null {
  const owner = inst_(state, keeperId).owner;
  const board = state.players[owner].board;
  for (const lane of LANES) {
    for (const row of ROWS) {
      if (board[lane][rowIndex(row)] === keeperId) return { lane, row };
    }
  }
  return null;
}

export function keeperAt(state: GameState, player: PlayerId, slot: Slot): string | null {
  return state.players[player].board[slot.lane][rowIndex(slot.row)];
}

export function setSlot(state: GameState, player: PlayerId, slot: Slot, value: string | null): void {
  state.players[player].board[slot.lane][rowIndex(slot.row)] = value;
}

/** Keepers of a player in board order: lane A front, lane A back, lane B front... */
export function keepersOf(state: GameState, player: PlayerId): string[] {
  const out: string[] = [];
  for (const lane of LANES) {
    for (const row of ROWS) {
      const id = state.players[player].board[lane][rowIndex(row)];
      if (id) out.push(id);
    }
  }
  return out;
}

export function allKeepers(state: GameState, first: PlayerId): string[] {
  return [...keepersOf(state, first), ...keepersOf(state, other(first))];
}

export function isOnBoard(state: GameState, id: string): boolean {
  const c = state.cards[id];
  return !!c && slotOf(state, id) !== null;
}

// ---------------------------------------------------------------- stats

function relicAuras(state: GameState, keeperId: string): CardDef[] {
  const owner = inst_(state, keeperId).owner;
  const out: CardDef[] = [];
  for (const rid of state.players[owner].relics) {
    const r = inst_(state, rid);
    if (r.attachedTo?.kind === "keeper" && r.attachedTo.id === keeperId) out.push(defOf(state, rid));
  }
  return out;
}

function siteDef(state: GameState, lane: Lane): CardDef | null {
  const sid = state.sites[lane];
  return sid ? defOf(state, sid) : null;
}

export function keywordsOf(state: GameState, keeperId: string): Keyword[] {
  const inst = inst_(state, keeperId);
  const set = new Set<Keyword>(inst.echoCopy ? [] : defOf(state, keeperId).keywords);
  for (const k of inst.extraKeywords) set.add(k);
  for (const r of relicAuras(state, keeperId)) for (const k of r.aura?.keywords ?? []) set.add(k);
  const slot = slotOf(state, keeperId);
  if (slot) for (const k of siteDef(state, slot.lane)?.aura?.keywords ?? []) set.add(k);
  return [...set];
}

export function hasKeyword(state: GameState, keeperId: string, k: Keyword): boolean {
  return keywordsOf(state, keeperId).includes(k);
}

export function attackOf(state: GameState, keeperId: string): number {
  const inst = inst_(state, keeperId);
  const def = defOf(state, keeperId);
  let a = (inst.echoCopy ? 1 : (def.attack ?? 0)) + inst.attackMod + inst.tempAttack;
  for (const r of relicAuras(state, keeperId)) a += r.aura?.attack ?? 0;
  const slot = slotOf(state, keeperId);
  if (slot) a += siteDef(state, slot.lane)?.aura?.attack ?? 0;
  return Math.max(0, a);
}

export function holdOf(state: GameState, keeperId: string): number {
  const inst = inst_(state, keeperId);
  const def = defOf(state, keeperId);
  let h = (inst.echoCopy ? 1 : (def.hold ?? 1)) + inst.holdMod + inst.tempHold;
  for (const r of relicAuras(state, keeperId)) h += r.aura?.hold ?? 0;
  const slot = slotOf(state, keeperId);
  if (slot) {
    h += siteDef(state, slot.lane)?.aura?.hold ?? 0;
    if (slot.row === "front" && hasKeyword(state, keeperId, "rooted")) h += 1;
  }
  return h;
}

/** A keeper attacks in the Clash if it has attack and did not enter this round (unless Surge). */
export function canAttack(state: GameState, keeperId: string): boolean {
  if (attackOf(state, keeperId) <= 0) return false;
  const inst = inst_(state, keeperId);
  return inst.enteredRound < state.round || hasKeyword(state, keeperId, "surge");
}

// ---------------------------------------------------------------- tide

/** Tide value seen from the side of a player: positive is good for the player. */
export function tideFor(state: GameState, player: PlayerId): number {
  return player === 0 ? state.tide : -state.tide;
}

export function isHighTide(state: GameState, player: PlayerId): boolean {
  return tideFor(state, player) >= HIGH_TIDE;
}

export function isLowTide(state: GameState, player: PlayerId): boolean {
  return tideFor(state, player) <= -HIGH_TIDE;
}

/** Anchor: while a keeper with Anchor is in play, the tide does not move. */
export function tideAnchored(state: GameState): boolean {
  return allKeepers(state, 0).some((k) => hasKeyword(state, k, "anchor"));
}

export function shiftTide(state: GameState, player: PlayerId, amount: number, events: GameEvent[]): void {
  if (amount === 0) return;
  if (tideAnchored(state)) {
    events.push({ type: "TideAnchored" });
    return;
  }
  const from = state.tide;
  const delta = player === 0 ? amount : -amount;
  const to = Math.max(-TIDE_LIMIT, Math.min(TIDE_LIMIT, from + delta));
  if (to === from) return;
  state.tide = to;
  events.push({ type: "TideShifted", from, to });
}

// ---------------------------------------------------------------- cards and beacons

export function drawCards(state: GameState, player: PlayerId, n: number, events: GameEvent[]): void {
  const ps = state.players[player];
  for (let i = 0; i < n; i++) {
    const id = ps.deck.shift();
    if (!id) {
      events.push({ type: "DeckEmpty", player });
      for (const lane of LANES) damageBeacon(state, player, lane, DECK_OUT_DAMAGE, events);
      continue;
    }
    const cardId = inst_(state, id).cardId;
    if (ps.hand.length >= HAND_LIMIT) {
      ps.graveyard.push(id);
      events.push({ type: "CardBurned", player, card: id, cardId });
    } else {
      ps.hand.push(id);
      events.push({ type: "CardDrawn", player, card: id, cardId });
    }
  }
}

export function damageBeacon(state: GameState, player: PlayerId, lane: Lane, amount: number, events: GameEvent[]): void {
  const beacon = state.players[player].beacons[lane];
  if (beacon.light <= 0 || amount <= 0) return; // damage against an out beacon is lost
  beacon.light = Math.max(0, beacon.light - amount);
  events.push({ type: "BeaconDamaged", player, lane, amount, light: beacon.light });
  if (beacon.light === 0) events.push({ type: "BeaconOut", player, lane });
}

export function healBeacon(state: GameState, player: PlayerId, lane: Lane, amount: number, events: GameEvent[]): void {
  const beacon = state.players[player].beacons[lane];
  if (beacon.light <= 0) return; // an out beacon does not light again
  const light = Math.min(BEACON_LIGHT, beacon.light + amount);
  const gained = light - beacon.light;
  if (gained <= 0) return;
  beacon.light = light;
  events.push({ type: "BeaconHealed", player, lane, amount: gained, light });
}

export function beaconsOut(state: GameState, player: PlayerId): number {
  return state.players[player].beacons.filter((b) => b.light <= 0).length;
}

export function totalLight(state: GameState, player: PlayerId): number {
  return state.players[player].beacons.reduce((s, b) => s + b.light, 0);
}

/** Moves a card that leaves play to the graveyard, or removes it if it is a token. */
export function toGraveyard(state: GameState, id: string): void {
  const inst = inst_(state, id);
  inst.attachedTo = null;
  if (inst.token) {
    delete state.cards[id];
    return;
  }
  resetInstance(state, id);
  state.players[inst.owner].graveyard.push(id);
}

/** Clears every change on a card that leaves play. */
export function resetInstance(state: GameState, id: string): void {
  const inst = inst_(state, id);
  inst.attachedTo = null;
  inst.damage = 0;
  inst.attackMod = 0;
  inst.holdMod = 0;
  inst.tempAttack = 0;
  inst.tempHold = 0;
  inst.extraKeywords = [];
  inst.doomed = false;
  inst.abilityRounds = [];
}

/** Ends the game if a player has 2 or more beacons out. Returns true if the game is over. */
export function checkWin(state: GameState, events: GameEvent[]): boolean {
  if (state.outcome) return true;
  const p0Lost = beaconsOut(state, 0) >= BEACONS_TO_WIN;
  const p1Lost = beaconsOut(state, 1) >= BEACONS_TO_WIN;
  if (!p0Lost && !p1Lost) return false;
  const winner: PlayerId | null = p0Lost && p1Lost ? null : p0Lost ? 1 : 0;
  endGame(state, winner, "beacons", events);
  return true;
}

export function endGame(state: GameState, winner: PlayerId | null, reason: "beacons" | "roundLimit" | "concede", events: GameEvent[]): void {
  state.outcome = { winner, reason };
  state.phase = "over";
  state.chain = [];
  events.push({ type: "GameOver", winner, reason });
}
