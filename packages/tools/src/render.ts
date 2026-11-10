import { CARDS } from "@tcg/cards";
import {
  attackOf,
  HIDDEN_CARD,
  holdOf,
  keeperAt,
  other,
  tideFor,
  type GameState,
  type Lane,
  type PlayerId,
  type Row,
} from "@tcg/engine";
import { cardName, cardRulesText, cardSummary, laneName, targetName, lookupIn, describeAction, type Translator } from "@tcg/i18n";

const CELL = 26;

function fit(text: string, width: number): string {
  const chars = [...text];
  if (chars.length > width) return chars.slice(0, width - 1).join("") + "…";
  return text + " ".repeat(width - chars.length);
}

function keeperCell(tr: Translator, state: GameState, player: PlayerId, lane: Lane, row: Row): string {
  const id = keeperAt(state, player, { lane, row });
  if (!id) return tr.t("ui.emptySlot");
  const inst = state.cards[id];
  if (!inst || inst.cardId === HIDDEN_CARD) return "?";
  const hold = holdOf(state, id) - inst.damage;
  const fresh = inst.enteredRound === state.round ? "*" : "";
  const stats = ` ${attackOf(state, id)}/${hold}${fresh}`;
  return fit(cardName(tr, inst.cardId), CELL - 1 - [...stats].length).trimEnd() + stats;
}

function row(label: string, cells: string[]): string {
  return `  ${fit(label, 8)}${cells.map((c) => fit(c, CELL)).join("")}`;
}

function beaconCells(tr: Translator, state: GameState, player: PlayerId): string[] {
  return state.players[player].beacons.map((b, lane) => {
    const name = tr.t("board.beacon", { lane: laneName(tr, lane as Lane) });
    return b.light > 0 ? `${name}: ${b.light}` : `${name}: ${tr.t("ui.out")}`;
  });
}

function playerLine(tr: Translator, state: GameState, p: PlayerId, label: string): string {
  const ps = state.players[p];
  return [
    label,
    tr.t("ui.ember", { ember: ps.ember }),
    tr.t("ui.reserve", { reserve: ps.reserve }),
    tr.t("ui.hand", { count: ps.hand.length }),
    tr.t("ui.deck", { count: ps.deck.length }),
    tr.t("ui.graveyard", { count: ps.graveyard.length }),
  ].join("  ");
}

function relicLine(tr: Translator, state: GameState, p: PlayerId, viewer: PlayerId): string | null {
  const lookup = lookupIn(state);
  const relics = state.players[p].relics.map((id) => {
    const inst = state.cards[id];
    const at = inst?.attachedTo;
    const name = inst ? cardName(tr, inst.cardId) : "?";
    return at ? `${name} → ${targetName(tr, lookup, at, viewer)}` : name;
  });
  return relics.length ? `  ${tr.t("ui.relics", { list: relics.join("; ") })}` : null;
}

/** Draws the board from the point of view of one player. The opponent is at the top. */
export function renderBoard(tr: Translator, state: GameState, viewer: PlayerId): string {
  const foe = other(viewer);
  const tide = tideFor(state, viewer);
  const lines: string[] = [];
  const header = [
    tr.t("ui.title"),
    state.phase === "mulligan" ? tr.t("ui.mulligan") : tr.t("ui.round", { round: state.round }),
    `${tr.t("ui.tide", { value: tide > 0 ? `+${tide}` : String(tide) })} ${tr.t("ui.tideHint")}`,
    tr.t("ui.initiative", { who: tr.t(state.initiative === viewer ? "ui.you" : "ui.opponent") }),
  ].join(" · ");
  lines.push(`=== ${header} ===`);
  lines.push(playerLine(tr, state, foe, tr.t("ui.opponent")));
  const foeRelics = relicLine(tr, state, foe, viewer);
  if (foeRelics) lines.push(foeRelics);
  const lanes: Lane[] = [0, 1, 2];
  const rows = (tr.raw<Record<Row, string>>("board.rows"));
  lines.push(row(tr.t("ui.beacons"), beaconCells(tr, state, foe)));
  lines.push(row(rows.back, lanes.map((l) => keeperCell(tr, state, foe, l, "back"))));
  lines.push(row(rows.front, lanes.map((l) => keeperCell(tr, state, foe, l, "front"))));
  lines.push(
    row(
      tr.t("ui.sites"),
      lanes.map((l) => {
        const sid = state.sites[l];
        const inst = sid ? state.cards[sid] : undefined;
        return inst ? `~ ${cardName(tr, inst.cardId)} ~` : tr.t("ui.noSite");
      }),
    ),
  );
  lines.push(row(rows.front, lanes.map((l) => keeperCell(tr, state, viewer, l, "front"))));
  lines.push(row(rows.back, lanes.map((l) => keeperCell(tr, state, viewer, l, "back"))));
  lines.push(row(tr.t("ui.beacons"), beaconCells(tr, state, viewer)));
  lines.push(playerLine(tr, state, viewer, tr.t("ui.you")));
  const myRelics = relicLine(tr, state, viewer, viewer);
  if (myRelics) lines.push(myRelics);

  if (state.chain.length > 0) {
    lines.push(tr.t("ui.chain"));
    for (const link of [...state.chain].reverse()) {
      lines.push(`  - ${describeAction(tr, state, link.action, link.player)}${link.player === viewer ? "" : ` (${tr.t("ui.opponent")})`}`);
    }
  }
  return lines.join("\n");
}

/** Lists the hand of a player with the rules text of each card. */
export function renderHand(tr: Translator, state: GameState, viewer: PlayerId): string {
  const lines = [tr.t("ui.yourHand")];
  state.players[viewer].hand.forEach((id, i) => {
    const cardId = state.cards[id]?.cardId;
    const def = cardId ? CARDS[cardId] : undefined;
    if (!def) return;
    const echo = state.cards[id]?.echoCopy ? " [1/1]" : "";
    const rules = cardRulesText(tr, def).join(" ");
    lines.push(`  c${i + 1}. ${cardSummary(tr, def)}${echo}${rules ? ` — ${rules}` : ""}`);
  });
  return lines.join("\n");
}
