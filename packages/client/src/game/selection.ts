import type { Action, GameState, PlayerId, Slot, Target } from "@tcg/engine";
import type { BoardClick } from "../render/board.ts";

/**
 * Click selection: the player picks a card (or a keeper to move), then clicks on the board.
 * Each click narrows the list of legal actions until one action is left.
 */
export type Stage = "slot" | "lane" | "target" | "done";

function slotOf(a: Action): Slot | undefined {
  if (a.type === "PlayCard") return a.slot;
  if (a.type === "Move") return a.to;
  return undefined;
}

function targetOf(a: Action): Target | undefined {
  return a.type === "PlayCard" || a.type === "Activate" ? a.targets[0] : undefined;
}

const slotKey = (s: Slot | undefined) => (s ? `${s.lane}${s.row}` : "");
const targetKey = (t: Target | undefined) => (!t ? "" : t.kind === "keeper" ? `k${t.id}` : `b${t.player}${t.lane}`);

function distinct<T>(items: T[]): number {
  return new Set(items).size;
}

/** What the next click chooses. */
export function stageOf(options: Action[]): Stage {
  if (options.length <= 1) return "done";
  if (distinct(options.map((a) => slotKey(slotOf(a)))) > 1) return "slot";
  if (distinct(options.map((a) => (a.type === "PlayCard" ? (a.lane ?? -1) : -1))) > 1) return "lane";
  if (distinct(options.map((a) => targetKey(targetOf(a)))) > 1) return "target";
  return "done";
}

export function optionsForCard(actions: Action[], card: string): Action[] {
  return actions.filter((a) => a.type === "PlayCard" && a.card === card);
}

export function optionsForKeeper(actions: Action[], keeper: string): Action[] {
  return actions.filter((a) => (a.type === "Move" && a.keeper === keeper) || (a.type === "Activate" && a.source === keeper));
}

function keeperSlot(state: GameState, id: string): { owner: PlayerId; slot: Slot } | null {
  const owner = state.cards[id]?.owner;
  if (owner === undefined) return null;
  const board = state.players[owner].board;
  for (const lane of [0, 1, 2] as const) {
    if (board[lane][0] === id) return { owner, slot: { lane, row: "front" } };
    if (board[lane][1] === id) return { owner, slot: { lane, row: "back" } };
  }
  return null;
}

/** Keeps the options that match the click. A click on a keeper also counts as a click on its slot. */
export function narrow(options: Action[], click: BoardClick, state: GameState, viewer: PlayerId): Action[] {
  const stage = stageOf(options);
  return options.filter((a) => {
    if (stage === "slot") {
      const s = slotOf(a);
      if (!s) return false;
      if (click.kind === "slot") return click.owner === viewer && click.lane === s.lane && click.row === s.row;
      if (click.kind === "keeper") {
        const at = keeperSlot(state, click.id);
        return !!at && at.owner === viewer && slotKey(at.slot) === slotKey(s);
      }
      return false;
    }
    if (stage === "lane") {
      const lane = a.type === "PlayCard" ? a.lane : undefined;
      return (click.kind === "site" || click.kind === "slot") && click.lane === lane;
    }
    if (stage === "target") {
      const t = targetOf(a);
      if (!t) return false;
      if (click.kind === "keeper") return t.kind === "keeper" && t.id === click.id;
      if (click.kind === "beacon") return t.kind === "beacon" && t.player === click.owner && t.lane === click.lane;
      return false;
    }
    return true;
  });
}

/** The board places to highlight for the current stage. */
export function highlightPlaces(options: Action[]): { slots: Slot[]; lanes: number[]; targets: Target[] } {
  const stage = stageOf(options);
  const out = { slots: [] as Slot[], lanes: [] as number[], targets: [] as Target[] };
  for (const a of options) {
    if (stage === "slot") {
      const s = slotOf(a);
      if (s) out.slots.push(s);
    } else if (stage === "lane" && a.type === "PlayCard" && a.lane !== undefined) out.lanes.push(a.lane);
    else if (stage === "target") {
      const t = targetOf(a);
      if (t) out.targets.push(t);
    }
  }
  return out;
}
