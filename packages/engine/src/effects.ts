import type { Condition, Effect, EffectAction, TargetRef, Trigger } from "@tcg/cards";
import {
  allKeepers,
  createInstance,
  damageBeacon,
  defOf,
  drawCards,
  healBeacon,
  holdOf,
  instanceOf,
  isHighTide,
  isLowTide,
  keeperAt,
  keepersOf,
  HAND_LIMIT,
  other,
  setSlot,
  shiftTide,
  slotOf,
  toGraveyard,
} from "./core.ts";
import { LANES, PLAYERS, type GameEvent, type GameState, type Lane, type PlayerId, type Slot, type Target } from "./types.ts";

export interface EffectContext {
  controller: PlayerId;
  /** The card that owns the effect. */
  source: string;
  /** The lane of the source, if the source has one. */
  lane: Lane | null;
  chosen: Target | null;
  resonance: boolean;
}

export function conditionHolds(state: GameState, ctx: EffectContext, cond: Condition | undefined): boolean {
  if (!cond) return true;
  if (cond.highTide && !isHighTide(state, ctx.controller)) return false;
  if (cond.lowTide && !isLowTide(state, ctx.controller)) return false;
  if (cond.resonance && !ctx.resonance) return false;
  return true;
}

function beaconTarget(player: PlayerId, lane: Lane): Target {
  return { kind: "beacon", player, lane };
}

function keeperTargets(ids: string[]): Target[] {
  return ids.map((id) => ({ kind: "keeper", id }));
}

function laneKeepers(state: GameState, player: PlayerId, lane: Lane): string[] {
  const out: string[] = [];
  for (const row of ["front", "back"] as const) {
    const id = keeperAt(state, player, { lane, row });
    if (id) out.push(id);
  }
  return out;
}

/** Checks that a chosen target still exists when the effect resolves. */
export function targetStillValid(state: GameState, t: Target): boolean {
  if (t.kind === "beacon") return true;
  return !!state.cards[t.id] && slotOf(state, t.id) !== null;
}

export function resolveTargetRef(state: GameState, ctx: EffectContext, ref: TargetRef): Target[] {
  const me = ctx.controller;
  const foe = other(me);
  switch (ref) {
    case "chosen":
      return ctx.chosen && targetStillValid(state, ctx.chosen) ? [ctx.chosen] : [];
    case "self":
      return state.cards[ctx.source] && slotOf(state, ctx.source) ? [{ kind: "keeper", id: ctx.source }] : [];
    case "attached": {
      const at = state.cards[ctx.source]?.attachedTo;
      return at && targetStillValid(state, at) ? [at] : [];
    }
    case "enemyBeaconSameLane":
      return ctx.lane === null ? [] : [beaconTarget(foe, ctx.lane)];
    case "allyBeaconSameLane":
      return ctx.lane === null ? [] : [beaconTarget(me, ctx.lane)];
    case "enemyFrontSameLane": {
      if (ctx.lane === null) return [];
      const id = keeperAt(state, foe, { lane: ctx.lane, row: "front" });
      return id ? [{ kind: "keeper", id }] : [];
    }
    case "enemyKeepersSameLane":
      return ctx.lane === null ? [] : keeperTargets(laneKeepers(state, foe, ctx.lane));
    case "allyKeepersSameLane":
      return ctx.lane === null ? [] : keeperTargets(laneKeepers(state, me, ctx.lane));
    case "allEnemyKeepers":
      return keeperTargets(keepersOf(state, foe));
    case "allAllyKeepers":
      return keeperTargets(keepersOf(state, me));
    case "allEnemyBeacons":
      return LANES.map((l) => beaconTarget(foe, l));
    case "allAllyBeacons":
      return LANES.map((l) => beaconTarget(me, l));
  }
}

export function placeKeeper(state: GameState, player: PlayerId, id: string, slot: Slot, events: GameEvent[]): void {
  setSlot(state, player, slot, id);
  const inst = instanceOf(state, id);
  inst.enteredRound = state.round;
  events.push({ type: "KeeperSummoned", player, card: id, cardId: inst.cardId, slot });
}

function summon(state: GameState, ctx: EffectContext, cardId: string, slots: Slot[], events: GameEvent[]): void {
  for (const slot of slots) {
    if (keeperAt(state, ctx.controller, slot)) continue;
    const inst = createInstance(state, cardId, ctx.controller, true);
    placeKeeper(state, ctx.controller, inst.id, slot, events);
    runEffects(state, "enterPlay", { controller: ctx.controller, source: inst.id, lane: slot.lane, chosen: null, resonance: false }, events);
  }
}

export function runAction(state: GameState, ctx: EffectContext, action: EffectAction, events: GameEvent[]): void {
  switch (action.op) {
    case "draw":
      drawCards(state, ctx.controller, action.amount, events);
      return;
    case "tide":
      shiftTide(state, ctx.controller, action.amount, events);
      return;
    case "ember":
      state.players[ctx.controller].ember += action.amount;
      events.push({ type: "EmberGained", player: ctx.controller, amount: action.amount });
      return;
    case "summon": {
      const slots: Slot[] =
        action.where === "eachLaneBack"
          ? LANES.map((lane) => ({ lane, row: "back" }))
          : ctx.lane === null
            ? []
            : [{ lane: ctx.lane, row: action.where === "sameLaneFront" ? "front" : "back" }];
      summon(state, ctx, action.card, slots, events);
      return;
    }
    default:
      break;
  }
  for (const t of resolveTargetRef(state, ctx, action.target)) {
    if (t.kind === "beacon") {
      if (action.op === "damage") damageBeacon(state, t.player, t.lane, action.amount, events);
      else if (action.op === "heal") healBeacon(state, t.player, t.lane, action.amount, events);
      continue;
    }
    const k = instanceOf(state, t.id);
    switch (action.op) {
      case "damage":
        k.damage += action.amount;
        events.push({ type: "KeeperDamaged", keeper: t.id, amount: action.amount, source: ctx.source });
        break;
      case "heal": {
        const healed = Math.min(k.damage, action.amount);
        if (healed > 0) {
          k.damage -= healed;
          events.push({ type: "KeeperHealed", keeper: t.id, amount: healed });
        }
        break;
      }
      case "buff": {
        const attack = action.attack ?? 0;
        const hold = action.hold ?? 0;
        if (action.until === "permanent") {
          k.attackMod += attack;
          k.holdMod += hold;
        } else {
          k.tempAttack += attack;
          k.tempHold += hold;
        }
        events.push({ type: "KeeperBuffed", keeper: t.id, attack, hold, until: action.until });
        break;
      }
      case "destroy":
        k.doomed = true;
        break;
      case "grant":
        if (!k.extraKeywords.includes(action.keyword)) k.extraKeywords.push(action.keyword);
        events.push({ type: "KeywordGranted", keeper: t.id, keyword: action.keyword });
        break;
    }
  }
}

export function runEffectList(state: GameState, ctx: EffectContext, effects: readonly Effect[], when: Trigger, events: GameEvent[]): void {
  for (const effect of effects) {
    if (effect.when !== when) continue;
    if (!conditionHolds(state, ctx, effect.condition)) continue;
    for (const action of effect.actions) runAction(state, ctx, action, events);
  }
}

/** Runs the effects of one card for one trigger. */
export function runEffects(state: GameState, when: Trigger, ctx: EffectContext, events: GameEvent[]): void {
  runEffectList(state, ctx, defOf(state, ctx.source).effects, when, events);
}

function relicLane(state: GameState, relicId: string): Lane | null {
  const at = state.cards[relicId]?.attachedTo;
  if (!at) return null;
  if (at.kind === "beacon") return at.lane;
  return slotOf(state, at.id)?.lane ?? null;
}

/**
 * Runs a round trigger (Dawn or Dusk) on every card in play.
 * Order: the player with the Initiative first, then the opponent (plan, section 6.4).
 */
export function runRoundTrigger(state: GameState, when: "dawn" | "dusk", events: GameEvent[]): void {
  const order: PlayerId[] = [state.initiative, other(state.initiative)];
  for (const p of order) {
    for (const id of keepersOf(state, p)) {
      if (!state.cards[id] || !slotOf(state, id)) continue;
      const lane = slotOf(state, id)?.lane ?? null;
      runEffects(state, when, { controller: p, source: id, lane, chosen: null, resonance: false }, events);
    }
    for (const id of [...state.players[p].relics]) {
      if (!state.cards[id]) continue;
      runEffects(state, when, { controller: p, source: id, lane: relicLane(state, id), chosen: null, resonance: false }, events);
    }
    for (const lane of LANES) {
      const sid = state.sites[lane];
      if (sid && instanceOf(state, sid).owner === p) {
        runEffects(state, when, { controller: p, source: sid, lane, chosen: null, resonance: false }, events);
      }
    }
  }
}

/** Removes a keeper from the board and detaches its relics. Returns the old slot. */
function removeFromBoard(state: GameState, id: string): Slot | null {
  const inst = instanceOf(state, id);
  const slot = slotOf(state, id);
  if (slot) setSlot(state, inst.owner, slot, null);
  for (const p of PLAYERS) {
    const ps = state.players[p];
    for (const rid of [...ps.relics]) {
      const at = instanceOf(state, rid).attachedTo;
      if (at?.kind === "keeper" && at.id === id) {
        ps.relics = ps.relics.filter((r) => r !== rid);
        toGraveyard(state, rid);
      }
    }
  }
  return slot;
}

/** Removes a keeper that a new keeper replaces. It is not a death: no Death effect and no Echo. */
export function replaceKeeper(state: GameState, id: string, events: GameEvent[]): void {
  const inst = instanceOf(state, id);
  removeFromBoard(state, id);
  events.push({ type: "KeeperReplaced", keeper: id, cardId: inst.cardId, player: inst.owner });
  toGraveyard(state, id);
}

/** Destroys a keeper now: death triggers, Echo, then the graveyard. */
export function killKeeper(state: GameState, id: string, events: GameEvent[]): void {
  const inst = instanceOf(state, id);
  const def = defOf(state, id);
  const isEcho = !inst.echoCopy && (def.keywords.includes("echo") || inst.extraKeywords.includes("echo"));
  const slot = removeFromBoard(state, id);
  events.push({ type: "KeeperDied", keeper: id, cardId: inst.cardId, player: inst.owner });
  if (!inst.echoCopy) {
    runEffects(state, "death", { controller: inst.owner, source: id, lane: slot?.lane ?? null, chosen: null, resonance: false }, events);
  }
  if (isEcho) {
    const hand = state.players[inst.owner].hand;
    if (hand.length < HAND_LIMIT) {
      const copy = createInstance(state, inst.cardId, inst.owner, true);
      copy.echoCopy = true;
      hand.push(copy.id);
      events.push({ type: "EchoReturned", player: inst.owner, card: copy.id, cardId: copy.cardId });
    }
  }
  toGraveyard(state, id);
}

/** Destroys every keeper with lethal damage, zero Hold or a destroy mark, until none is left. */
export function processDeaths(state: GameState, events: GameEvent[]): void {
  for (let guard = 0; guard < 100; guard++) {
    const dying = allKeepers(state, state.initiative).filter((id) => {
      const k = instanceOf(state, id);
      return k.doomed || k.damage >= holdOf(state, id);
    });
    if (dying.length === 0) return;
    for (const id of dying) {
      if (state.cards[id] && slotOf(state, id)) killKeeper(state, id, events);
    }
  }
  throw new Error("processDeaths did not settle");
}
