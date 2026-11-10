import { CARDS, SPARK_CARD_ID } from "@tcg/cards";
import {
  attackOf,
  canAttack,
  checkWin,
  createInstance,
  defOf,
  drawCards,
  endGame,
  hasKeyword,
  holdOf,
  instanceOf,
  keeperAt,
  keepersOf,
  MAX_EMBER,
  MAX_RESERVE,
  other,
  ROUND_LIMIT,
  RulesError,
  setSlot,
  shiftTide,
  slotOf,
  toGraveyard,
  totalLight,
  BEACON_LIGHT,
  damageBeacon,
} from "./core.ts";
import { killKeeper, placeKeeper, processDeaths, runEffectList, runEffects, runRoundTrigger, targetStillValid } from "./effects.ts";
import { isLegal } from "./legal.ts";
import { randomInt, shuffle } from "./rng.ts";
import {
  LANES,
  PLAYERS,
  type Action,
  type ChainLink,
  type GameEvent,
  type GameState,
  type Lane,
  type PlayerId,
  type PlayerState,
  type Result,
} from "./types.ts";

export const OPENING_HAND = 4;

export interface NewGameOptions {
  seed: number;
  decks: [readonly string[], readonly string[]];
}

function emptyPlayer(): PlayerState {
  return {
    deck: [],
    hand: [],
    graveyard: [],
    board: [
      [null, null],
      [null, null],
      [null, null],
    ],
    beacons: [{ light: BEACON_LIGHT }, { light: BEACON_LIGHT }, { light: BEACON_LIGHT }],
    relics: [],
    ember: 0,
    emberMax: 0,
    reserve: 0,
    mulliganDone: false,
    playedFactions: {},
  };
}

/** Creates a new game. The game starts in the mulligan phase. */
export function newGame(options: NewGameOptions): Result {
  const seed = options.seed >>> 0;
  const state: GameState = {
    version: 1,
    seed,
    rng: seed,
    nextId: 1,
    cards: {},
    players: [emptyPlayer(), emptyPlayer()],
    sites: [null, null, null],
    tide: 0,
    round: 0,
    phase: "mulligan",
    initiative: 0,
    turn: 0,
    passes: 0,
    chain: [],
    outcome: null,
  };
  const events: GameEvent[] = [];
  for (const p of PLAYERS) {
    for (const cardId of options.decks[p]) {
      if (!CARDS[cardId]) throw new RulesError(`Unknown card ${cardId}`);
      state.players[p].deck.push(createInstance(state, cardId, p, false).id);
    }
    shuffle(state, state.players[p].deck);
  }
  state.initiative = randomInt(state, 2) as PlayerId;
  state.turn = state.initiative;
  events.push({ type: "GameStarted", initiative: state.initiative });
  for (const p of [state.initiative, other(state.initiative)]) drawCards(state, p, OPENING_HAND, events);
  // The second player receives the Spark card (plan, section 3.9).
  const second = other(state.initiative);
  state.players[second].hand.push(createInstance(state, SPARK_CARD_ID, second, false).id);
  return { state, events };
}

// ---------------------------------------------------------------- rounds

function startRound(state: GameState, events: GameEvent[]): void {
  state.round += 1;
  if (state.round > 1) state.initiative = other(state.initiative);
  events.push({ type: "RoundStarted", round: state.round, initiative: state.initiative });
  // Dawn
  for (const p of [state.initiative, other(state.initiative)]) {
    drawCards(state, p, 1, events);
    const ps = state.players[p];
    ps.emberMax = Math.min(MAX_EMBER, ps.emberMax + 1);
    ps.ember = ps.emberMax + ps.reserve;
    ps.reserve = 0;
    ps.playedFactions = {};
    events.push({ type: "EmberRefilled", player: p, ember: ps.ember });
  }
  runRoundTrigger(state, "dawn", events);
  processDeaths(state, events);
  if (checkWin(state, events)) return;
  state.phase = "maneuver";
  state.turn = state.initiative;
  state.passes = 0;
}

function clashLane(state: GameState, lane: Lane, events: GameEvent[]): void {
  events.push({ type: "LaneClash", lane });
  const keeperDamage = new Map<string, number>();
  const beaconDamage: [number, number] = [0, 0];
  const add = (id: string, n: number) => keeperDamage.set(id, (keeperDamage.get(id) ?? 0) + n);

  for (const p of [state.initiative, other(state.initiative)]) {
    const q = other(p);
    const front = keeperAt(state, p, { lane, row: "front" });
    const back = keeperAt(state, p, { lane, row: "back" });
    const enemyFront = keeperAt(state, q, { lane, row: "front" });
    const attackers: string[] = [];
    if (front && canAttack(state, front)) attackers.push(front);
    if (back && hasKeyword(state, back, "reach") && canAttack(state, back)) attackers.push(back);

    let remaining = enemyFront ? holdOf(state, enemyFront) - instanceOf(state, enemyFront).damage : 0;
    for (const a of attackers) {
      const atk = attackOf(state, a);
      if (!enemyFront) {
        beaconDamage[q] += atk;
        continue;
      }
      add(enemyFront, atk);
      if (hasKeyword(state, a, "overrun")) {
        const excess = atk - Math.max(0, remaining);
        if (excess > 0) beaconDamage[q] += excess;
      }
      remaining -= atk;
    }
    // A blocker that does not attack still hits back the attacking front keeper.
    if (front && enemyFront && !canAttack(state, front) && canAttack(state, enemyFront)) {
      const atk = attackOf(state, front);
      if (atk > 0) add(enemyFront, atk);
    }
  }

  for (const [id, amount] of keeperDamage) {
    instanceOf(state, id).damage += amount;
    events.push({ type: "KeeperDamaged", keeper: id, amount, source: null });
  }
  for (const p of PLAYERS) damageBeacon(state, p, lane, beaconDamage[p], events);
  processDeaths(state, events);
}

function clash(state: GameState, events: GameEvent[]): void {
  events.push({ type: "ClashStarted" });
  for (const lane of LANES) clashLane(state, lane, events);
}

function dusk(state: GameState, events: GameEvent[]): void {
  events.push({ type: "DuskStarted" });
  runRoundTrigger(state, "dusk", events);
  processDeaths(state, events);
  for (const p of [state.initiative, other(state.initiative)]) {
    for (const id of keepersOf(state, p)) {
      const k = instanceOf(state, id);
      if (hasKeyword(state, id, "wear")) {
        k.attackMod -= 1;
        events.push({ type: "Worn", keeper: id });
      }
      k.damage = 0;
      k.tempAttack = 0;
      k.tempHold = 0;
    }
    const ps = state.players[p];
    ps.reserve = Math.min(MAX_RESERVE, ps.ember);
    ps.ember = 0;
  }
  processDeaths(state, events);
}

function endRound(state: GameState, events: GameEvent[]): void {
  clash(state, events);
  if (checkWin(state, events)) return;
  dusk(state, events);
  if (checkWin(state, events)) return;
  if (state.round >= ROUND_LIMIT) {
    const l0 = totalLight(state, 0);
    const l1 = totalLight(state, 1);
    endGame(state, l0 === l1 ? null : l0 > l1 ? 0 : 1, "roundLimit", events);
    return;
  }
  startRound(state, events);
}

// ---------------------------------------------------------------- chain

function fizzle(state: GameState, card: string, events: GameEvent[]): void {
  events.push({ type: "Fizzled", card });
  toGraveyard(state, card);
}

function resolveLink(state: GameState, link: ChainLink, events: GameEvent[]): void {
  const a = link.action;
  const player = link.player;
  if (a.type === "Move") {
    const from = state.cards[a.keeper] ? slotOf(state, a.keeper) : null;
    if (!from || keeperAt(state, player, a.to) || hasKeyword(state, a.keeper, "rooted")) {
      events.push({ type: "Fizzled", card: a.keeper });
      return;
    }
    setSlot(state, player, from, null);
    setSlot(state, player, a.to, a.keeper);
    events.push({ type: "KeeperMoved", player, keeper: a.keeper, from, to: a.to });
    return;
  }
  if (a.type === "Activate") {
    const slot = state.cards[a.source] ? slotOf(state, a.source) : null;
    if (!slot) {
      events.push({ type: "Fizzled", card: a.source });
      return;
    }
    const ability = defOf(state, a.source).abilities[a.ability];
    if (!ability) return;
    const ctx = { controller: player, source: a.source, lane: slot.lane, chosen: a.targets[0] ?? null, resonance: false };
    for (const act of ability.actions) runEffectList(state, ctx, [{ when: "play", actions: [act] }], "play", events);
    return;
  }
  if (a.type !== "PlayCard") return;

  const def = defOf(state, a.card);
  const chosen = a.targets[0] ?? null;
  switch (def.type) {
    case "keeper": {
      if (!a.slot || keeperAt(state, player, a.slot)) return fizzle(state, a.card, events);
      placeKeeper(state, player, a.card, a.slot, events);
      shiftTide(state, player, def.tidePush ?? 0, events);
      runEffects(state, "enterPlay", { controller: player, source: a.card, lane: a.slot.lane, chosen, resonance: link.resonance }, events);
      return;
    }
    case "quickRite":
    case "slowRite": {
      if (def.target && (!chosen || !targetStillValid(state, chosen))) return fizzle(state, a.card, events);
      shiftTide(state, player, def.tidePush ?? 0, events);
      runEffects(state, "play", { controller: player, source: a.card, lane: null, chosen, resonance: link.resonance }, events);
      toGraveyard(state, a.card);
      return;
    }
    case "relic": {
      if (!chosen || !targetStillValid(state, chosen)) return fizzle(state, a.card, events);
      if (chosen.kind === "keeper" && instanceOf(state, chosen.id).owner !== player) return fizzle(state, a.card, events);
      if (chosen.kind === "beacon" && state.players[player].beacons[chosen.lane].light <= 0) return fizzle(state, a.card, events);
      instanceOf(state, a.card).attachedTo = chosen;
      state.players[player].relics.push(a.card);
      events.push({ type: "RelicAttached", player, relic: a.card, to: chosen });
      shiftTide(state, player, def.tidePush ?? 0, events);
      const lane = chosen.kind === "beacon" ? chosen.lane : (slotOf(state, chosen.id)?.lane ?? null);
      runEffects(state, "enterPlay", { controller: player, source: a.card, lane, chosen, resonance: link.resonance }, events);
      return;
    }
    case "site": {
      const lane = a.lane ?? 0;
      const replaced = state.sites[lane];
      if (replaced) toGraveyard(state, replaced);
      state.sites[lane] = a.card;
      events.push({ type: "SitePlaced", player, site: a.card, cardId: def.id, lane, replaced });
      shiftTide(state, player, def.tidePush ?? 0, events);
      runEffects(state, "enterPlay", { controller: player, source: a.card, lane, chosen: null, resonance: link.resonance }, events);
      return;
    }
  }
}

function resolveChain(state: GameState, events: GameEvent[]): void {
  const starter = state.chain[0]?.player ?? state.turn;
  events.push({ type: "ChainResolving", size: state.chain.length });
  while (state.chain.length > 0) {
    const link = state.chain.pop() as ChainLink;
    resolveLink(state, link, events);
    processDeaths(state, events);
    if (checkWin(state, events)) return;
  }
  state.passes = 0;
  state.turn = other(starter);
}

function declare(state: GameState, player: PlayerId, action: Action, events: GameEvent[]): void {
  const ps = state.players[player];
  let resonance = false;
  switch (action.type) {
    case "PlayCard": {
      const def = defOf(state, action.card);
      ps.ember -= def.cost;
      ps.hand = ps.hand.filter((id) => id !== action.card);
      for (const id of action.sacrifice ?? []) {
        if (state.cards[id] && slotOf(state, id)) killKeeper(state, id, events);
      }
      processDeaths(state, events);
      if (def.faction !== "neutral") {
        resonance = (ps.playedFactions[def.faction] ?? 0) >= 1;
        ps.playedFactions[def.faction] = (ps.playedFactions[def.faction] ?? 0) + 1;
      }
      events.push({ type: "CardPlayed", player, card: action.card, cardId: def.id, targets: action.targets });
      break;
    }
    case "Move":
      ps.ember -= 1;
      events.push({ type: "KeeperMoveDeclared", player, keeper: action.keeper, to: action.to });
      break;
    case "Activate": {
      const ability = defOf(state, action.source).abilities[action.ability];
      ps.ember -= ability?.cost ?? 0;
      instanceOf(state, action.source).abilityRounds[action.ability] = state.round;
      events.push({ type: "AbilityActivated", player, source: action.source, ability: action.ability });
      break;
    }
    default:
      throw new RulesError(`Cannot declare ${action.type}`);
  }
  state.chain.push({ player, action, resonance });
  if (checkWin(state, events)) return;
  // The opponent receives priority and can respond with a Quick Rite.
  state.turn = other(player);
}

// ---------------------------------------------------------------- apply

export interface ApplyOptions {
  /** Skip the legality check. Use it only with actions from legalActions(). */
  trusted?: boolean;
}

/**
 * The transition function: apply(state, action) -> { state, events }.
 * The function does not change the input state.
 */
export function apply(state: GameState, action: Action, options: ApplyOptions = {}): Result {
  if (state.phase === "over") throw new RulesError("The game is over");
  if (!options.trusted && !isLegal(state, action)) {
    throw new RulesError(`Illegal action for player ${state.turn}: ${JSON.stringify(action)}`);
  }
  const s: GameState = structuredClone(state);
  const events: GameEvent[] = [];
  const player = s.turn;

  switch (action.type) {
    case "Concede":
      endGame(s, other(player), "concede", events);
      break;
    case "Mulligan": {
      const ps = s.players[player];
      ps.hand = ps.hand.filter((id) => !action.cards.includes(id));
      drawCards(s, player, action.cards.length, events);
      ps.deck.push(...action.cards);
      shuffle(s, ps.deck);
      ps.mulliganDone = true;
      events.push({ type: "Mulliganed", player, count: action.cards.length });
      if (s.players[other(player)].mulliganDone) startRound(s, events);
      else s.turn = other(player);
      break;
    }
    case "Pass":
      events.push({ type: "Passed", player });
      if (s.chain.length > 0) {
        resolveChain(s, events);
        break;
      }
      s.passes += 1;
      if (s.passes >= 2) endRound(s, events);
      else s.turn = other(player);
      break;
    default:
      declare(s, player, action, events);
      break;
  }
  return { state: s, events };
}

export function isOver(state: GameState): boolean {
  return state.phase === "over";
}
