import type { Lane, PlayerId, Row } from "@tcg/engine";

/**
 * Board geometry. It follows assets/sheets/board.json from the art thread:
 * horizontal lanes, the viewer on the left, the opponent on the right.
 * Each lane is a row of 7 cells of 48x48: Beacon, Back, Front, Site, Front, Back, Beacon.
 */
export const WIDTH = 480;
export const HEIGHT = 270;
export const CELL = 48;

const COLUMNS = { beacon0: 72, back0: 120, front0: 168, site: 216, front1: 264, back1: 312, beacon1: 360 } as const;
const LANE_Y: readonly number[] = [30, 78, 126];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cell(x: number, lane: Lane): Rect {
  return { x, y: LANE_Y[lane]!, w: CELL, h: CELL };
}

export function slotRect(viewer: PlayerId, owner: PlayerId, lane: Lane, row: Row): Rect {
  const mine = owner === viewer;
  const x = mine ? (row === "front" ? COLUMNS.front0 : COLUMNS.back0) : row === "front" ? COLUMNS.front1 : COLUMNS.back1;
  return cell(x, lane);
}

export function beaconRect(viewer: PlayerId, owner: PlayerId, lane: Lane): Rect {
  return cell(owner === viewer ? COLUMNS.beacon0 : COLUMNS.beacon1, lane);
}

export function siteRect(lane: Lane): Rect {
  return cell(COLUMNS.site, lane);
}

/** True if the rect is on the viewer's half of the board (the left half). */
export function onViewerSide(r: Rect): boolean {
  return r.x < COLUMNS.site;
}

/** The tide gauge: 11 cells of 12 pixels at the top. +5 (the viewer's side) is on the left. */
export const TIDE = { x: 174, y: 4, cell: 12, cells: 11 } as const;

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
