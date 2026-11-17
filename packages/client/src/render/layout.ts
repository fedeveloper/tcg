import type { Lane, PlayerId, Row } from "@tcg/engine";

/**
 * Board geometry. There are two boards (graphics plan, phase 8):
 * - horizontal: lanes in rows, the viewer on the left, the opponent on the right.
 *   Each lane is a row of 7 cells of 48x48: Beacon, Back, Front, Site, Front, Back, Beacon.
 * - vertical: lanes in columns, the viewer at the bottom, the opponent at the top.
 *
 * The values below are live bindings: setBoardOrientation() changes them before a game builds its board.
 */
export type BoardOrientation = "horizontal" | "vertical";

export const CELL = 48;

interface Geometry {
  width: number;
  height: number;
  /** The visible part of the scene. The hand is in the DOM, below the canvas. */
  viewHeight: number;
  /** The top of the pier: below it the hand lies on wooden planks. */
  pierY: number;
  /** The position of a lane: y for the horizontal board, x for the vertical board. */
  lanes: readonly number[];
  /** The position of each row of cells along a lane: x for the horizontal board, y for the vertical board. */
  steps: { beacon0: number; back0: number; front0: number; site: number; front1: number; back1: number; beacon1: number };
  tide: { x: number; y: number; cell: number; cells: number };
}

const HORIZONTAL: Geometry = {
  width: 480,
  height: 270,
  viewHeight: 186,
  pierY: 178,
  lanes: [30, 78, 126],
  steps: { beacon0: 72, back0: 120, front0: 168, site: 216, front1: 264, back1: 312, beacon1: 360 },
  tide: { x: 174, y: 4, cell: 12, cells: 11 },
};

/** The vertical board: 3 columns of 48 with gaps of 24, 7 rows of 48 from the opponent's Beacons to the viewer's. */
const VERTICAL: Geometry = {
  width: 270,
  height: 392,
  viewHeight: 392,
  pierY: 380,
  lanes: [39, 111, 183],
  steps: { beacon1: 30, back1: 76, front1: 122, site: 170, front0: 218, back0: 264, beacon0: 318 },
  tide: { x: 8, y: 4, cell: 12, cells: 11 },
};

export let ORIENTATION: BoardOrientation = "horizontal";
export let WIDTH = HORIZONTAL.width;
export let HEIGHT = HORIZONTAL.height;
export let VIEW_HEIGHT = HORIZONTAL.viewHeight;
export let PIER_Y = HORIZONTAL.pierY;
/** The tide gauge: 11 cells of 12 pixels at the top. +5 (the viewer's side) is on the left. */
export let TIDE = HORIZONTAL.tide;
let G = HORIZONTAL;

/** Chooses the board. Call it before a game builds its BoardView and its canvas. */
export function setBoardOrientation(o: BoardOrientation): void {
  ORIENTATION = o;
  G = o === "vertical" ? VERTICAL : HORIZONTAL;
  WIDTH = G.width;
  HEIGHT = G.height;
  VIEW_HEIGHT = G.viewHeight;
  PIER_Y = G.pierY;
  TIDE = G.tide;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cell(step: number, lane: Lane): Rect {
  const l = G.lanes[lane]!;
  return ORIENTATION === "vertical" ? { x: l, y: step, w: CELL, h: CELL } : { x: step, y: l, w: CELL, h: CELL };
}

export function slotRect(viewer: PlayerId, owner: PlayerId, lane: Lane, row: Row): Rect {
  const s = G.steps;
  const mine = owner === viewer;
  return cell(mine ? (row === "front" ? s.front0 : s.back0) : row === "front" ? s.front1 : s.back1, lane);
}

export function beaconRect(viewer: PlayerId, owner: PlayerId, lane: Lane): Rect {
  return cell(owner === viewer ? G.steps.beacon0 : G.steps.beacon1, lane);
}

export function siteRect(lane: Lane): Rect {
  return cell(G.steps.site, lane);
}

/** True if the rect is on the viewer's half of the board (the left half, or the bottom half). */
export function onViewerSide(r: Rect): boolean {
  return ORIENTATION === "vertical" ? r.y > G.steps.site : r.x < G.steps.site;
}

/** The unit direction from a rect toward the enemy Beacons. */
export function forward(r: Rect): { x: number; y: number } {
  const k = onViewerSide(r) ? 1 : -1;
  return ORIENTATION === "vertical" ? { x: 0, y: -k } : { x: k, y: 0 };
}

/** True if two rects are in the same lane. */
export function sameLane(a: Rect, b: Rect): boolean {
  return ORIENTATION === "vertical" ? a.x === b.x : a.y === b.y;
}

export function tideX(tideForViewer: number): number {
  const t = Math.max(-5, Math.min(5, tideForViewer));
  return TIDE.x + (5 - t) * TIDE.cell + TIDE.cell / 2;
}

export function center(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** The largest integer scale that fits the board in the given space. */
export function integerScale(width: number, height: number): number {
  return Math.max(1, Math.floor(Math.min(width / WIDTH, height / HEIGHT)));
}
