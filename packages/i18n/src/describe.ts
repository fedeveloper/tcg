import { HIDDEN_CARD, type Action, type GameEvent, type GameState, type Lane, type PlayerId, type Slot, type Target } from "@tcg/engine";
import type { Translator } from "./index.ts";
import { cardName, keywordName, statsText } from "./text.ts";

/** Finds the card id of an instance. The instance can be missing from the latest state (a token that died). */
export type CardLookup = (instanceId: string) => string | undefined;

export function lookupIn(...states: GameState[]): CardLookup {
  return (id) => {
    for (const s of states) {
      const c = s.cards[id];
      if (c) return c.cardId;
    }
    return undefined;
  };
}

export function laneName(tr: Translator, lane: Lane): string {
  return tr.raw<string[]>("board.lanes")[lane] ?? String(lane);
}

export function slotName(tr: Translator, slot: Slot): string {
  return tr.t("board.slot", { lane: laneName(tr, slot.lane), row: tr.t(`board.rows.${slot.row}`) });
}

function nameOf(tr: Translator, lookup: CardLookup, id: string): string {
  const cardId = lookup(id);
  if (!cardId || cardId === HIDDEN_CARD) return "?";
  return cardName(tr, cardId);
}

export function targetName(tr: Translator, lookup: CardLookup, t: Target, viewer: PlayerId): string {
  if (t.kind === "keeper") return nameOf(tr, lookup, t.id);
  return tr.t(t.player === viewer ? "board.yourBeacon" : "board.enemyBeacon", { lane: laneName(tr, t.lane) });
}

/** A short text for an action, for menus. */
export function describeAction(tr: Translator, state: GameState, action: Action, viewer: PlayerId): string {
  const lookup = lookupIn(state);
  const target = (ts: Target[]) => (ts[0] ? tr.t("actions.targetSuffix", { target: targetName(tr, lookup, ts[0], viewer) }) : "");
  switch (action.type) {
    case "Mulligan":
      return action.cards.length === 0
        ? tr.t("actions.keep")
        : tr.t("actions.mulligan", { cards: action.cards.map((id) => nameOf(tr, lookup, id)).join(", ") });
    case "PlayCard": {
      const card = nameOf(tr, lookup, action.card);
      let text: string;
      if (action.slot) {
        text = tr.t("actions.playKeeper", { card, slot: slotName(tr, action.slot), target: target(action.targets) });
        const old = state.players[viewer].board[action.slot.lane][action.slot.row === "front" ? 0 : 1];
        if (old && !action.sacrifice?.includes(old)) text += tr.t("actions.replaces", { old: nameOf(tr, lookup, old) });
      }
      else if (action.lane !== undefined) text = tr.t("actions.playSite", { card, lane: laneName(tr, action.lane) });
      else text = tr.t("actions.play", { card, target: target(action.targets) });
      if (action.sacrifice?.length) {
        text += tr.t("actions.sacrifice", { cards: action.sacrifice.map((id) => nameOf(tr, lookup, id)).join(", ") });
      }
      return text;
    }
    case "Move":
      return tr.t("actions.move", { card: nameOf(tr, lookup, action.keeper), slot: slotName(tr, action.to) });
    case "Activate":
      return tr.t("actions.activate", { card: nameOf(tr, lookup, action.source), target: target(action.targets) });
    case "Pass":
      return tr.t(state.chain.length > 0 ? "actions.resolve" : "actions.pass");
    case "Concede":
      return "Concede";
  }
}

/** A log line for an event, from the point of view of a player. Returns null for events with no text. */
export function describeEvent(tr: Translator, e: GameEvent, viewer: PlayerId, lookup: CardLookup): string | null {
  const who = (p: PlayerId) => (p === viewer ? "self" : "other");
  const card = (id: string) => nameOf(tr, lookup, id);
  switch (e.type) {
    case "GameStarted":
      return tr.t(`events.GameStarted.${who(e.initiative)}`);
    case "Mulliganed":
      if (e.count === 0) return tr.t(`events.Mulliganed.${who(e.player)}Keep`);
      return tr.t(`events.Mulliganed.${who(e.player)}`, { count: e.count });
    case "RoundStarted":
      return tr.t(`events.RoundStarted.${who(e.initiative)}`, { round: e.round });
    case "CardDrawn":
      return tr.t(`events.CardDrawn.${who(e.player)}`, { card: e.cardId === HIDDEN_CARD ? "?" : cardName(tr, e.cardId) });
    case "CardBurned":
      return tr.t(`events.CardBurned.${who(e.player)}`, { card: cardName(tr, e.cardId) });
    case "DeckEmpty":
      return tr.t(`events.DeckEmpty.${who(e.player)}`);
    case "EmberRefilled":
      return e.player === viewer ? tr.t("events.EmberRefilled.self", { ember: e.ember }) : null;
    case "CardPlayed": {
      const target = e.targets[0] ? tr.t("events.targetSuffix", { target: targetName(tr, lookup, e.targets[0], viewer) }) : "";
      return tr.t(`events.CardPlayed.${who(e.player)}`, { card: cardName(tr, e.cardId), target });
    }
    case "AbilityActivated":
      return tr.t(`events.AbilityActivated.${who(e.player)}`, { card: card(e.source) });
    case "KeeperMoveDeclared":
      return tr.t(`events.KeeperMoveDeclared.${who(e.player)}`, { card: card(e.keeper), slot: slotName(tr, e.to) });
    case "Passed":
      return tr.t(`events.Passed.${who(e.player)}`);
    case "ChainResolving":
      return e.size > 1 ? tr.t("events.ChainResolving") : null;
    case "Fizzled":
      return tr.t("events.Fizzled", { card: card(e.card) });
    case "KeeperSummoned":
      return tr.t(`events.KeeperSummoned.${who(e.player)}`, { card: cardName(tr, e.cardId), slot: slotName(tr, e.slot) });
    case "KeeperMoved":
      return tr.t("events.KeeperMoved", { card: card(e.keeper), slot: slotName(tr, e.to) });
    case "KeeperDamaged":
      return tr.t("events.KeeperDamaged", { card: card(e.keeper), count: e.amount });
    case "KeeperHealed":
      return tr.t("events.KeeperHealed", { card: card(e.keeper), count: e.amount });
    case "KeeperBuffed":
      return tr.t(e.until === "dusk" ? "events.KeeperBuffedUntilDusk" : "events.KeeperBuffed", {
        card: card(e.keeper),
        stats: statsText(tr, e.attack, e.hold),
      });
    case "KeywordGranted":
      return tr.t("events.KeywordGranted", { card: card(e.keeper), keyword: keywordName(tr, e.keyword) });
    case "KeeperDied":
      return tr.t("events.KeeperDied", { card: cardName(tr, e.cardId) });
    case "KeeperReplaced":
      return tr.t("events.KeeperReplaced", { card: cardName(tr, e.cardId) });
    case "KeeperBounced":
      return tr.t("events.KeeperBounced", { card: cardName(tr, e.cardId) });
    case "CardDiscarded":
      return tr.t(`events.CardDiscarded.${who(e.player)}`, { card: cardName(tr, e.cardId) });
    case "CardRecalled":
      return tr.t(`events.CardRecalled.${who(e.player)}`, { card: cardName(tr, e.cardId) });
    case "TideTurned":
      return tr.t("events.TideTurned");
    case "EchoReturned":
      return tr.t(`events.EchoReturned.${who(e.player)}`, { card: cardName(tr, e.cardId) });
    case "BeaconDamaged":
      return tr.t(`events.BeaconDamaged.${who(e.player)}`, { lane: laneName(tr, e.lane), count: e.amount, light: e.light });
    case "BeaconHealed":
      return tr.t(`events.BeaconHealed.${who(e.player)}`, { lane: laneName(tr, e.lane), count: e.amount, light: e.light });
    case "BeaconOut":
      return tr.t(`events.BeaconOut.${who(e.player)}`, { lane: laneName(tr, e.lane) });
    case "TideShifted": {
      const sign = viewer === 0 ? 1 : -1;
      const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
      return tr.t("events.TideShifted", { from: fmt(e.from * sign), to: fmt(e.to * sign) });
    }
    case "TideAnchored":
      return tr.t("events.TideAnchored");
    case "EmberGained":
      return tr.t(`events.EmberGained.${who(e.player)}`, { count: e.amount });
    case "RelicAttached":
      return tr.t("events.RelicAttached", { card: card(e.relic), target: targetName(tr, lookup, e.to, viewer) });
    case "SitePlaced":
      return tr.t("events.SitePlaced", { card: cardName(tr, e.cardId), lane: laneName(tr, e.lane) });
    case "ClashStarted":
      return tr.t("events.ClashStarted");
    case "LaneClash":
      return null;
    case "DuskStarted":
      return tr.t("events.DuskStarted");
    case "RisingTide":
      return tr.t("events.RisingTide", { count: e.amount });
    case "Worn":
      return tr.t("events.Worn", { card: card(e.keeper) });
    case "GameOver": {
      const result = e.winner === null ? "draw" : e.winner === viewer ? "win" : "lose";
      return `${tr.t(`events.GameOver.${result}`)} ${tr.t(`events.reasons.${e.reason}`)}`;
    }
  }
}
