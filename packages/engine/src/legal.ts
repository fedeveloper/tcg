import { SPARK_CARD_ID, type TargetSpec } from "@tcg/cards";
import {
  CHAIN_LIMIT,
  defOf,
  hasKeyword,
  instanceOf,
  keeperAt,
  keepersOf,
  other,
  slotOf,
} from "./core.ts";
import { LANES, ROWS, type Action, type GameState, type Lane, type PlayerId, type Slot, type Target } from "./types.ts";

/** All targets that match a target spec. "lane" is the lane of the source, if any. */
export function targetsFor(state: GameState, player: PlayerId, spec: TargetSpec, lane: Lane | null): Target[] {
  if (spec.kind === "beacon") {
    const owner = spec.side === "ally" ? player : other(player);
    return LANES.filter((l) => state.players[owner].beacons[l].light > 0).map((l) => ({ kind: "beacon", player: owner, lane: l }));
  }
  const sides: PlayerId[] = spec.side === "any" ? [player, other(player)] : spec.side === "ally" ? [player] : [other(player)];
  const out: Target[] = [];
  for (const p of sides) {
    for (const id of keepersOf(state, p)) {
      const slot = slotOf(state, id);
      if (!slot) continue;
      if (spec.row && slot.row !== spec.row) continue;
      if (spec.sameLane && slot.lane !== lane) continue;
      out.push({ kind: "keeper", id });
    }
  }
  return out;
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), k - 1)) out.push([item, ...rest]);
  });
  return out;
}

function adjacentSlots(slot: Slot): Slot[] {
  const out: Slot[] = [{ lane: slot.lane, row: slot.row === "front" ? "back" : "front" }];
  for (const d of [-1, 1]) {
    const lane = slot.lane + d;
    if (lane >= 0 && lane <= 2) out.push({ lane: lane as Lane, row: slot.row });
  }
  return out;
}

function notSacrificed(targets: Target[], sacrifice: string[]): Target[] {
  return targets.filter((t) => t.kind !== "keeper" || !sacrifice.includes(t.id));
}

function playCardActions(state: GameState, player: PlayerId, cardId: string, responding: boolean): Action[] {
  const ps = state.players[player];
  const def = defOf(state, cardId);
  if (def.cost > ps.ember) return [];
  if (responding && def.type !== "quickRite") return [];
  const out: Action[] = [];
  const sacrificeSets = def.sacrifice ? combinations(keepersOf(state, player), def.sacrifice) : [[]];
  for (const sacrifice of sacrificeSets) {
    const base = def.sacrifice ? { sacrifice } : {};
    switch (def.type) {
      case "keeper": {
        // Every own slot: an empty slot, or a slot with a keeper that the new keeper replaces.
        for (const lane of LANES) for (const row of ROWS) {
          const slot: Slot = { lane, row };
          const options = def.target ? notSacrificed(targetsFor(state, player, def.target, slot.lane), sacrifice) : [];
          // A keeper's chosen target is optional: with no valid target, the effect does nothing.
          if (options.length === 0) out.push({ type: "PlayCard", card: cardId, slot, targets: [], ...base });
          for (const t of options) out.push({ type: "PlayCard", card: cardId, slot, targets: [t], ...base });
        }
        break;
      }
      case "quickRite":
      case "slowRite": {
        if (!def.target) {
          out.push({ type: "PlayCard", card: cardId, targets: [], ...base });
          break;
        }
        for (const t of notSacrificed(targetsFor(state, player, def.target, null), sacrifice)) {
          out.push({ type: "PlayCard", card: cardId, targets: [t], ...base });
        }
        break;
      }
      case "relic": {
        const spec: TargetSpec = def.attachTo === "beacon" ? { kind: "beacon", side: "ally" } : { kind: "keeper", side: "ally" };
        for (const t of notSacrificed(targetsFor(state, player, spec, null), sacrifice)) {
          out.push({ type: "PlayCard", card: cardId, targets: [t], ...base });
        }
        break;
      }
      case "site":
        for (const lane of LANES) out.push({ type: "PlayCard", card: cardId, lane, targets: [], ...base });
        break;
    }
  }
  return out;
}

function mulliganActions(state: GameState, player: PlayerId): Action[] {
  const hand = state.players[player].hand.filter((id) => instanceOf(state, id).cardId !== SPARK_CARD_ID);
  const out: Action[] = [];
  for (let k = 0; k <= hand.length; k++) {
    for (const cards of combinations(hand, k)) out.push({ type: "Mulligan", cards });
  }
  return out;
}

/** Every legal action for a player. The list is empty when the player cannot act now. */
export function legalActions(state: GameState, player: PlayerId = state.turn): Action[] {
  if (state.phase === "over" || player !== state.turn) return [];
  if (state.phase === "mulligan") return mulliganActions(state, player);

  const ps = state.players[player];
  const out: Action[] = [];
  const responding = state.chain.length > 0;

  if (!responding || state.chain.length < CHAIN_LIMIT) {
    for (const cardId of ps.hand) out.push(...playCardActions(state, player, cardId, responding));
  }

  if (!responding) {
    if (ps.ember >= 1) {
      for (const id of keepersOf(state, player)) {
        if (hasKeyword(state, id, "rooted")) continue;
        const from = slotOf(state, id);
        if (!from) continue;
        for (const to of adjacentSlots(from)) {
          if (!keeperAt(state, player, to)) out.push({ type: "Move", keeper: id, to });
        }
      }
    }
    for (const id of keepersOf(state, player)) {
      const inst = instanceOf(state, id);
      if (inst.echoCopy) continue;
      defOf(state, id).abilities.forEach((ab, i) => {
        if (ab.cost > ps.ember || inst.abilityRounds[i] === state.round) return;
        const lane = slotOf(state, id)?.lane ?? null;
        if (!ab.target) {
          out.push({ type: "Activate", source: id, ability: i, targets: [] });
          return;
        }
        for (const t of targetsFor(state, player, ab.target, lane)) {
          out.push({ type: "Activate", source: id, ability: i, targets: [t] });
        }
      });
    }
  }

  out.push({ type: "Pass" });
  return out;
}

/** A stable string key for an action. Two equal actions have the same key. */
export function actionKey(a: Action): string {
  switch (a.type) {
    case "Mulligan":
      return `Mulligan:${[...a.cards].sort().join(",")}`;
    case "PlayCard": {
      const slot = a.slot ? `${a.slot.lane}${a.slot.row}` : "";
      const lane = a.lane ?? "";
      const sac = a.sacrifice ? [...a.sacrifice].sort().join(",") : "";
      return `PlayCard:${a.card}:${slot}:${lane}:${targetsKey(a.targets)}:${sac}`;
    }
    case "Move":
      return `Move:${a.keeper}:${a.to.lane}${a.to.row}`;
    case "Activate":
      return `Activate:${a.source}:${a.ability}:${targetsKey(a.targets)}`;
    case "Pass":
    case "Concede":
      return a.type;
  }
}

function targetsKey(ts: Target[]): string {
  return ts.map((t) => (t.kind === "keeper" ? `k${t.id}` : `b${t.player}${t.lane}`)).join(",");
}

export function isLegal(state: GameState, action: Action): boolean {
  if (action.type === "Concede") return state.phase !== "over";
  const key = actionKey(action);
  return legalActions(state).some((a) => actionKey(a) === key);
}

