import {
  AnimatedSprite,
  Assets,
  Container,
  defaultFilterVert,
  Filter,
  GlProgram,
  Graphics,
  Rectangle,
  Sprite,
  Spritesheet,
  Texture,
  type SpritesheetData,
} from "pixi.js";
import { gsap } from "gsap";
import beaconData from "../../../../assets/sheets/beacon.json";
import beaconUrl from "../../../../assets/sheets/beacon.png?url";
import boardUrl from "../../../../assets/sheets/board.png?url";
import artData from "../../../../assets/sheets/card-art.json";
import artUrl from "../../../../assets/sheets/card-art.png?url";
import keepersData from "../../../../assets/sheets/keepers.json";
import keepersUrl from "../../../../assets/sheets/keepers.png?url";
import uiData from "../../../../assets/sheets/ui.json";
import uiUrl from "../../../../assets/sheets/ui.png?url";
import faroFnt from "../../../../assets/fonts/faro.fnt?raw";
import faroUrl from "../../../../assets/fonts/faro.png?url";
import miniFnt from "../../../../assets/fonts/faro-mini.fnt?raw";
import miniUrl from "../../../../assets/fonts/faro-mini.png?url";
import { TIDE, type Rect } from "./layout.ts";
import type { BeaconLook, BeaconView, Dissolve, FxKind, KeeperLook, KeeperView, SiteView, Theme } from "./theme.ts";

/** Colours of the "Fari 32" palette (assets/palette/fari-32.json). */
export const PAL = {
  ink: 0x1a1423,
  white: 0xf6f3e4,
  foam: 0xc9e4e3,
  glow: 0xfbd35a,
  flame: 0xf29a2e,
  coral: 0xe8766a,
  sprout: 0xb5d665,
  ash: 0x9b9aa6,
} as const;

/** One idle frame lasts 180 ms. PixiJS counts the speed in frames per tick at 60 Hz. */
const IDLE_SPEED = 1000 / 180 / 60;

interface Glyph {
  texture: Texture;
  advance: number;
}

/** A bitmap font read from a BMFont text file. The glyphs are white: `tint` gives the colour. */
export class PixelFont {
  readonly glyphs = new Map<string, Glyph>();
  readonly lineHeight: number;

  constructor(fnt: string, atlas: Texture) {
    let lineHeight = 8;
    for (const line of fnt.split("\n")) {
      const f: Record<string, number> = {};
      for (const m of line.matchAll(/(\w+)=(-?\d+)/g)) f[m[1]!] = Number(m[2]);
      if (line.startsWith("common")) lineHeight = f.lineHeight ?? lineHeight;
      if (!line.startsWith("char ") || f.id === undefined) continue;
      const frame = new Rectangle(f.x, f.y, Math.max(f.width ?? 1, 1), f.height);
      this.glyphs.set(String.fromCodePoint(f.id), {
        texture: new Texture({ source: atlas.source, frame }),
        advance: f.xadvance ?? 4,
      });
    }
    this.lineHeight = lineHeight;
  }

  measure(text: string): number {
    let w = 0;
    for (const ch of text) w += (this.glyphs.get(ch) ?? this.glyphs.get("?"))?.advance ?? 0;
    return Math.max(w - 1, 0);
  }

  /** Cuts the text so that it fits in `width` pixels. */
  fit(text: string, width: number): string {
    if (this.measure(text) <= width) return text;
    let out = text;
    while (out.length > 1 && this.measure(`${out}.`) > width) out = out.slice(0, -1);
    return `${out.trimEnd()}.`;
  }
}

const OUTLINE: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/** A line of pixel text with an optional 1 pixel outline. `align`: 0 left, 0.5 centre, 1 right. */
export class PixelText extends Container {
  private value = "";
  private color: number;

  constructor(
    private readonly font: PixelFont,
    text: string,
    color: number,
    private readonly align = 0,
    private readonly outline = true,
  ) {
    super();
    this.color = color;
    this.set(text);
  }

  set(text: string, color = this.color): void {
    if (text === this.value && color === this.color && this.children.length > 0) return;
    this.value = text;
    this.color = color;
    this.removeChildren().forEach((c) => c.destroy());
    const x0 = -Math.round(this.font.measure(text) * this.align);
    const passes = this.outline ? [...OUTLINE.map((o) => ({ o, tint: PAL.ink as number })), { o: [0, 0] as const, tint: color }] : [{ o: [0, 0] as const, tint: color }];
    for (const { o, tint } of passes) {
      let x = x0;
      for (const ch of text) {
        const g = this.font.glyphs.get(ch) ?? this.font.glyphs.get("?");
        if (!g) continue;
        const s = new Sprite(g.texture);
        s.tint = tint;
        s.position.set(x + o[0], o[1]);
        this.addChild(s);
        x += g.advance;
      }
    }
  }
}

/** Every texture that the sprite theme needs. */
export interface Art {
  keepers: Spritesheet;
  beacon: Spritesheet;
  ui: Spritesheet;
  cards: Spritesheet;
  board: Texture;
  faro: PixelFont;
  mini: PixelFont;
}

async function sheet(url: string, data: unknown): Promise<Spritesheet> {
  const texture = await Assets.load<Texture>(url);
  const s = new Spritesheet(texture, data as SpritesheetData);
  await s.parse();
  return s;
}

let cache: Promise<Art> | null = null;

/** Loads the spritesheets and the fonts of assets/. The result is shared between games. */
export function loadArt(): Promise<Art> {
  cache ??= (async () => {
    const [keepers, beacon, ui, cards, board, faroTex, miniTex] = await Promise.all([
      sheet(keepersUrl, keepersData),
      sheet(beaconUrl, beaconData),
      sheet(uiUrl, uiData),
      sheet(artUrl, artData),
      Assets.load<Texture>(boardUrl),
      Assets.load<Texture>(faroUrl),
      Assets.load<Texture>(miniUrl),
    ]);
    return { keepers, beacon, ui, cards, board, faro: new PixelFont(faroFnt, faroTex), mini: new PixelFont(miniFnt, miniTex) };
  })();
  return cache;
}

const DITHER_FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uPixel;
// Ordered dither 4x4 (Bayer) without arrays: it also compiles on WebGL 1.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}
void main() {
  vec4 color = texture(uTexture, vTextureCoord);
  vec2 p = floor(gl_FragCoord.xy / uPixel);
  float limit = bayer4(p) + 0.03;
  finalColor = limit < uThreshold ? vec4(0.0) : color;
}`;

function beaconState(light: number): "lit" | "damaged" | "out" {
  return light <= 0 ? "out" : light <= 5 ? "damaged" : "lit";
}

/** The pixel art theme: sprites from assets/sheets and the Faro fonts. */
export class SpriteTheme implements Theme {
  constructor(
    private readonly art: Art,
    public resolution: number,
  ) {}

  private anim(source: Spritesheet, name: string, loop = true): AnimatedSprite {
    const s = new AnimatedSprite(source.animations[name] ?? [Texture.EMPTY]);
    s.animationSpeed = IDLE_SPEED;
    s.loop = loop;
    if (loop) s.play();
    return s;
  }

  background(): Container {
    return new Sprite(this.art.board);
  }

  /** The board picture already shows the slots. The empty container only takes the clicks. */
  slot(): Container {
    return new Container();
  }

  keeper(r: Rect, look: KeeperLook): KeeperView {
    const c = new Container() as KeeperView;
    c.position.set(r.x + r.w / 2, r.y + r.h / 2);
    c.hitArea = new Rectangle(-r.w / 2, -r.h / 2, r.w, r.h);
    // The body turns around the feet: squash and stretch push the sprite on the ground.
    const body = new Container();
    body.position.set(0, 19);
    const sprite = this.anim(this.art.keepers, `keeper/${look.cardId}/idle`);
    sprite.anchor.set(0.5, 30 / 32);
    body.addChild(sprite);
    const attackIcon = new Sprite(this.art.ui.textures["stat/attack"]);
    attackIcon.tint = PAL.coral;
    attackIcon.position.set(-23, 16);
    const holdIcon = new Sprite(this.art.ui.textures["stat/hold"]);
    holdIcon.position.set(16, 16);
    const attack = new PixelText(this.art.mini, "", PAL.white, 0);
    attack.position.set(-14, 14);
    const hold = new PixelText(this.art.mini, "", PAL.white, 1);
    hold.position.set(15, 14);
    c.addChild(body, attackIcon, holdIcon, attack, hold);
    c.body = body;
    let shown = look.cardId;
    c.update = (l: KeeperLook) => {
      if (l.cardId !== shown) {
        shown = l.cardId;
        sprite.textures = this.art.keepers.animations[`keeper/${l.cardId}/idle`] ?? [Texture.EMPTY];
      }
      sprite.scale.x = l.mine ? 1 : -1;
      // A keeper that entered in this round waits: it is darker and it does not move.
      sprite.tint = l.fresh ? 0x9a9ab8 : 0xffffff;
      if (l.fresh) sprite.gotoAndStop(0);
      else if (!sprite.playing) sprite.play();
      attack.set(String(l.attack));
      hold.set(String(l.hold), l.hold < l.maxHold ? PAL.coral : PAL.white);
    };
    c.update(look);
    return c;
  }

  beacon(r: Rect, look: BeaconLook): BeaconView {
    const c = new Container() as BeaconView;
    c.position.set(r.x, r.y);
    let state = beaconState(look.light);
    const sprite = this.anim(this.art.beacon, `beacon/${state}`);
    sprite.position.set(look.mine ? 8 : 40, -2);
    sprite.scale.x = look.mine ? 1 : -1;
    const light = new PixelText(this.art.faro, "", PAL.glow, 0.5);
    light.position.set(r.w / 2, 33);
    c.addChild(sprite, light);
    c.update = (l: BeaconLook) => {
      const next = beaconState(l.light);
      if (next !== state) {
        state = next;
        sprite.textures = this.art.beacon.animations[`beacon/${state}`] ?? [Texture.EMPTY];
        sprite.play();
      }
      light.set(l.light > 0 ? String(l.light) : "", l.light <= 5 ? PAL.flame : PAL.glow);
    };
    c.update(look);
    return c;
  }

  site(r: Rect, name: string | null): SiteView {
    const c = new Container() as SiteView;
    c.position.set(r.x, r.y);
    const frame = new Graphics().rect(5, 3, 38, 26).fill(PAL.ink);
    const picture = new Sprite(Texture.EMPTY);
    picture.position.set(6, 4);
    const text = new PixelText(this.art.mini, "", PAL.foam, 0.5);
    text.position.set(r.w / 2, 33);
    c.addChild(frame, picture, text);
    c.setName = (n, cardId) => {
      const full = cardId ? this.art.cards.textures[`art/${cardId}`] : undefined;
      frame.visible = picture.visible = !!n && !!full;
      if (full) {
        // The middle of the 56x40 illustration, without scaling.
        picture.texture = new Texture({ source: full.source, frame: new Rectangle(full.frame.x + 10, full.frame.y + 8, 36, 24) });
      }
      text.set(n ? this.art.mini.fit(n, r.w - 2) : "");
    };
    c.setName(name);
    return c;
  }

  tideGauge(): Container {
    const s = new Sprite(this.art.ui.textures["tide/gauge"]);
    s.position.set(TIDE.x - 4, TIDE.y);
    return s;
  }

  tideMarker(): Container {
    const s = this.anim(this.art.ui, "tide/marker");
    s.anchor.set(0.5, 0);
    s.y = TIDE.y - 3;
    return s;
  }

  highlight(r: Rect): Container {
    const g = new Graphics();
    const len = 6;
    // Four corner brackets, 1 pixel wide.
    for (const [x, y, dx, dy] of [
      [r.x, r.y, 1, 1],
      [r.x + r.w - 1, r.y, -1, 1],
      [r.x, r.y + r.h - 1, 1, -1],
      [r.x + r.w - 1, r.y + r.h - 1, -1, -1],
    ] as const) {
      g.rect(dx > 0 ? x : x - len + 1, y, len, 1).fill(PAL.glow);
      g.rect(x, dy > 0 ? y : y - len + 1, 1, len).fill(PAL.glow);
    }
    const tween = gsap.to(g, { alpha: 0.45, duration: 0.5, repeat: -1, yoyo: true, ease: "sine.inOut" });
    g.on("destroyed", () => tween.kill());
    return g;
  }

  floatingText(text: string, color: number): Container {
    const t = new PixelText(this.art.faro, text, color, 0.5);
    t.pivot.y = Math.floor(this.art.faro.lineHeight / 2);
    return t;
  }

  fx(kind: FxKind, tint = 0xffffff): Container {
    const s = this.anim(this.art.ui, `fx/${kind}`, false);
    s.anchor.set(0.5);
    s.tint = tint;
    s.animationSpeed = 0.2;
    s.onComplete = () => s.destroy();
    s.play();
    return s;
  }

  cardGhost(cardId: string): Container | null {
    const tex = this.art.cards.textures[`art/${cardId}`];
    if (!tex) return null;
    const c = new Container();
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    c.addChild(new Graphics().rect(-29, -21, 58, 42).fill(PAL.ink), s);
    return c;
  }

  dissolve(target: Container): Dissolve {
    const filter = new Filter({
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: DITHER_FRAGMENT, name: "dither-dissolve" }),
      resources: { dither: { uThreshold: { value: 0, type: "f32" }, uPixel: { value: this.resolution, type: "f32" } } },
    });
    target.filters = [filter];
    const uniforms = filter.resources.dither.uniforms as { uThreshold: number };
    return {
      get threshold() {
        return uniforms.uThreshold;
      },
      set threshold(v: number) {
        uniforms.uThreshold = v;
      },
    };
  }
}
