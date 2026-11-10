import artData from "../../../../assets/sheets/card-art.json";
import artUrl from "../../../../assets/sheets/card-art.png?url";
import framesData from "../../../../assets/sheets/card-frames.json";
import framesUrl from "../../../../assets/sheets/card-frames.png?url";
import miniFnt from "../../../../assets/fonts/faro-mini.fnt?raw";
import miniUrl from "../../../../assets/fonts/faro-mini.png?url";

/** Size of a card in pixels (docs/guida-di-stile.md, section 4). */
export const CARD_W = 64;
export const CARD_H = 88;

/** Colours of the "Fari 32" palette used on a card. */
const INK = "#1a1423";
const GLOW = "#fbd35a";
const WHITE = "#f6f3e4";
const SLATE = "#3d3a4f";

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Frames = Record<string, { frame: Frame }>;

interface Glyph {
  x: number;
  y: number;
  w: number;
  h: number;
  advance: number;
}

interface CardArt {
  art: HTMLImageElement;
  frames: HTMLImageElement;
  font: HTMLImageElement;
  glyphs: Map<string, Glyph>;
}

function image(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image not loaded: ${url}`));
    img.src = url;
  });
}

function parseFnt(fnt: string): Map<string, Glyph> {
  const glyphs = new Map<string, Glyph>();
  for (const line of fnt.split("\n")) {
    if (!line.startsWith("char ")) continue;
    const f: Record<string, number> = {};
    for (const m of line.matchAll(/(\w+)=(-?\d+)/g)) f[m[1]!] = Number(m[2]);
    if (f.id === undefined) continue;
    glyphs.set(String.fromCodePoint(f.id), { x: f.x ?? 0, y: f.y ?? 0, w: f.width ?? 0, h: f.height ?? 0, advance: f.xadvance ?? 4 });
  }
  return glyphs;
}

let cache: Promise<CardArt> | null = null;

function load(): Promise<CardArt> {
  cache ??= Promise.all([image(artUrl), image(framesUrl), image(miniUrl)]).then(([art, frames, font]) => ({
    art,
    frames,
    font,
    glyphs: parseFnt(miniFnt),
  }));
  return cache;
}

function measure(a: CardArt, text: string): number {
  let w = 0;
  for (const ch of text) w += (a.glyphs.get(ch) ?? a.glyphs.get("?"))?.advance ?? 0;
  return Math.max(w - 1, 0);
}

/** Breaks the text in lines of at most `width` pixels. */
function wrap(a: CardArt, text: string, width: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const trial = cur ? `${cur} ${word}` : word;
    if (!cur || measure(a, trial) <= width) cur = trial;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Draws one line of Faro Mini. The glyphs are white: a scratch canvas gives them the colour. */
function text(ctx: CanvasRenderingContext2D, a: CardArt, value: string, x: number, y: number, color: string, align: 0 | 0.5 | 1 = 0): void {
  const w = measure(a, value);
  if (w <= 0) return;
  const scratch = document.createElement("canvas");
  scratch.width = w + 1;
  scratch.height = 10;
  const s = scratch.getContext("2d")!;
  let cx = 0;
  for (const ch of value) {
    const g = a.glyphs.get(ch) ?? a.glyphs.get("?");
    if (!g) continue;
    if (g.w > 0) s.drawImage(a.font, g.x, g.y, g.w, g.h, cx, 0, g.w, g.h);
    cx += g.advance;
  }
  s.globalCompositeOperation = "source-in";
  s.fillStyle = color;
  s.fillRect(0, 0, scratch.width, scratch.height);
  ctx.drawImage(scratch, Math.round(x - w * align), y);
}

export interface CardFace {
  cardId: string;
  name: string;
  faction: string;
  cost: number;
  /** Attack and Hold. Only a Keeper has them. */
  stats?: { attack: number; hold: number };
  /** The line of the text box: the keywords of a Keeper, or the type of the card. */
  lines: string[];
}

/** Draws a full card (64x88) on the canvas: illustration, frame, name, cost and stats. */
export async function drawCard(canvas: HTMLCanvasElement, face: CardFace): Promise<void> {
  const a = await load();
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  const kind = face.stats ? "keeper" : "spell";
  const frames = framesData.frames as Frames;
  const frame = (frames[`frame/${face.faction}/${kind}`] ?? frames[`frame/neutral/${kind}`])!.frame;
  const window = framesData.meta.artWindow;
  const art = (artData.frames as Frames)[`art/${face.cardId}`]?.frame;
  if (art) ctx.drawImage(a.art, art.x, art.y, art.w, art.h, window.x, window.y, art.w, art.h);
  else {
    ctx.fillStyle = SLATE;
    ctx.fillRect(window.x, window.y, window.w, window.h);
  }
  ctx.drawImage(a.frames, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
  // The name plate holds 2 lines of 58 pixels.
  const name = wrap(a, face.name, 54).slice(0, 2);
  name.forEach((line, i) => text(ctx, a, line, 32, (name.length === 1 ? 50 : 46) + i * 7, INK, 0.5));
  text(ctx, a, String(face.cost), 8, 3, GLOW, 0.5);
  text(ctx, a, (wrap(a, face.lines[0] ?? "", 56)[0] ?? "").replace(/,$/, ""), 32, 64, INK, 0.5);
  if (face.stats) {
    text(ctx, a, String(face.stats.attack), 9, 76, WHITE, 0.5);
    text(ctx, a, String(face.stats.hold), 56, 76, WHITE, 0.5);
  }
}
