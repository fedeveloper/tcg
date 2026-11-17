import { Assets, Container, defaultFilterVert, Filter, GlProgram, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from "pixi.js";
import { gsap } from "gsap";
import seaUrl from "../../../../assets/board/web/sea.webp?url";
import litUrl from "../../../../assets/board/web/beacon-lit.webp?url";
import damagedUrl from "../../../../assets/board/web/beacon-damaged.webp?url";
import outUrl from "../../../../assets/board/web/beacon-out.webp?url";
import woodUrl from "../../../../assets/ui/web/legno.webp?url";
import { HEIGHT, TIDE, VIEW_HEIGHT, WIDTH, type Rect } from "./layout.ts";
import { type Art, SpriteTheme } from "./spriteTheme.ts";
import type { BeaconLook, BeaconView, SiteView } from "./theme.ts";

/** The painted textures of the board (graphics plan, phase 3). */
export interface PaintedArt {
  sea: Texture;
  wood: Texture;
  beacon: Record<BeaconState, Texture>;
  glow: Texture;
}

type BeaconState = "lit" | "damaged" | "out";

function beaconState(light: number): BeaconState {
  return light <= 0 ? "out" : light <= 5 ? "damaged" : "lit";
}

/** A soft round light, drawn once on a canvas. */
function glowTexture(): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,240,190,1)");
  g.addColorStop(0.25, "rgba(255,210,110,0.55)");
  g.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from({ resource: canvas, scaleMode: "linear" });
}

async function linear(url: string): Promise<Texture> {
  const t = await Assets.load<Texture>({ src: url, data: { scaleMode: "linear" } });
  t.source.scaleMode = "linear";
  return t;
}

let cache: Promise<PaintedArt> | null = null;

/** Loads the painted board textures and the Alegreya font. The result is shared between games. */
export function loadPainted(): Promise<PaintedArt> {
  cache ??= (async () => {
    const [sea, wood, lit, damaged, out] = await Promise.all([linear(seaUrl), linear(woodUrl), linear(litUrl), linear(damagedUrl), linear(outUrl)]);
    wood.source.addressMode = "repeat";
    await document.fonts.load('700 12px "Alegreya"').catch(() => undefined);
    return { sea, wood, beacon: { lit, damaged, out }, glow: glowTexture() };
  })();
  return cache;
}

/** Slow waves on the sea: the texture coordinates move with two sine waves. */
const WAVES_FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uAmount;
void main() {
  vec2 uv = vTextureCoord;
  float a = uAmount;
  uv.x += sin(uv.y * 40.0 + uTime * 0.9) * a;
  uv.y += sin(uv.x * 28.0 + uTime * 0.7) * a * 0.6;
  finalColor = texture(uTexture, uv);
}`;

/** The top of the pier, in scene pixels. Below it the hand lies on wooden planks. */
const PIER_Y = 178;
/** The height of a painted Beacon on the board, in scene pixels. */
const BEACON_H = 58;
const GOLD = 0xd9b56a;
const FOAM = 0xc9e4e3;

/**
 * The painted theme: a painted sea and painted Beacons (graphics plan, phase 3).
 * Keepers, Sites, the tide and the effects still come from the pixel art theme until phases 5 and 6.
 */
export class PaintedTheme extends SpriteTheme {
  constructor(
    art: Art,
    private readonly painted: PaintedArt,
    resolution: number,
    reduced: () => boolean = () => false,
  ) {
    super(art, resolution, reduced);
  }

  override background(): Container {
    const c = new Container();
    const sea = new Sprite(this.painted.sea);
    sea.width = WIDTH;
    sea.height = PIER_Y + 4;
    const filter = new Filter({
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: WAVES_FRAGMENT, name: "sea-waves" }),
      resources: { waves: { uTime: { value: 0, type: "f32" }, uAmount: { value: 0.0022, type: "f32" } } },
    });
    sea.filters = [filter];
    const uniforms = filter.resources.waves.uniforms as { uTime: number; uAmount: number };
    const tick = { t: 0 };
    const tween = gsap.to(tick, {
      t: 1000,
      duration: 1000,
      ease: "none",
      repeat: -1,
      onUpdate: () => {
        uniforms.uTime = tick.t * (this.reduced() ? 0.25 : 1);
      },
    });
    // The pier: wooden planks with a shadow line on the edge near the water.
    const pier = new TilingSprite({ texture: this.painted.wood, width: WIDTH, height: HEIGHT - PIER_Y });
    pier.y = PIER_Y;
    pier.tileScale.set(0.22);
    const edge = new Graphics()
      .rect(0, PIER_Y - 1, WIDTH, 3).fill({ color: 0x1a1008 })
      .rect(0, PIER_Y + 2, WIDTH, 1).fill({ color: GOLD, alpha: 0.5 })
      .rect(0, PIER_Y + 3, WIDTH, 10).fill({ color: 0x000000, alpha: 0.25 });
    // A soft vignette on the borders of the visible board keeps the eye on the lanes.
    const shade = new Graphics()
      .rect(0, 0, WIDTH, 10).fill({ color: 0x0a0f1d, alpha: 0.35 })
      .rect(0, VIEW_HEIGHT - 6, WIDTH, 6).fill({ color: 0x0a0f1d, alpha: 0.2 });
    c.addChild(sea, pier, edge, shade);
    c.on("destroyed", () => tween.kill());
    return c;
  }

  /** A cell is a soft ring of light on the water. */
  override slot(r: Rect, mine: boolean): Container {
    const g = new Graphics();
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2 + 12;
    g.ellipse(cx, cy, 19, 7).fill({ color: FOAM, alpha: 0.1 }).stroke({ color: mine ? FOAM : 0xe8b0a0, alpha: 0.45, width: 0.8 });
    g.ellipse(cx, cy, 14, 4.5).stroke({ color: FOAM, alpha: 0.18, width: 0.6 });
    return g;
  }

  override beacon(r: Rect, look: BeaconLook): BeaconView {
    const c = new Container() as BeaconView;
    c.position.set(r.x, r.y);
    let state = beaconState(look.light);
    const sprite = new Sprite(this.painted.beacon[state]);
    sprite.anchor.set(0.5, 1);
    const k = BEACON_H / sprite.texture.height;
    sprite.scale.set(look.mine ? k : -k, k);
    sprite.position.set(r.w / 2, r.h + 4);
    // The lamp light: a soft glow on the top of the tower that breathes.
    const glow = new Sprite(this.painted.glow);
    glow.anchor.set(0.5);
    glow.blendMode = "add";
    glow.position.set(r.w / 2 + (look.mine ? -1 : 1), r.h + 4 - BEACON_H * 0.86);
    glow.width = glow.height = 30;
    const breathe = gsap.to(glow, { alpha: 0.55, duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
    // The light points on a brass badge at the foot of the tower.
    const badge = new Graphics().circle(0, 0, 7).fill({ color: 0x14202e }).stroke({ color: GOLD, width: 1.2 });
    badge.position.set(r.w / 2 + (look.mine ? -13 : 13), r.h - 6);
    const light = new Text({ text: "", style: { fontFamily: "Alegreya, Georgia, serif", fontWeight: "700", fontSize: 10, fill: 0xfbd35a }, resolution: this.resolution * 2 });
    light.anchor.set(0.5, 0.55);
    light.position.copyFrom(badge.position);
    c.addChild(glow, sprite, badge, light);
    c.on("destroyed", () => breathe.kill());
    c.update = (l: BeaconLook) => {
      const next = beaconState(l.light);
      if (next !== state) {
        state = next;
        sprite.texture = this.painted.beacon[state];
      }
      glow.visible = state !== "out";
      glow.tint = state === "lit" ? 0xffffff : 0xff8a3a;
      glow.scale.set((state === "lit" ? 30 : 18) / this.painted.glow.width);
      badge.visible = light.visible = l.light > 0;
      light.text = String(l.light);
      light.style.fill = l.light <= 5 ? 0xf29a2e : 0xfbd35a;
    };
    c.update(look);
    c.hitArea = new Rectangle(0, 0, r.w, r.h);
    return c;
  }

  /** The Site cell: a golden diamond on the water, under the Site picture. */
  override site(r: Rect, name: string | null): SiteView {
    const v = super.site(r, name);
    const cx = r.w / 2;
    const cy = r.h / 2 + 12;
    const base = new Graphics()
      .poly([cx, cy - 8, cx + 22, cy, cx, cy + 8, cx - 22, cy]).fill({ color: GOLD, alpha: 0.12 }).stroke({ color: GOLD, alpha: 0.6, width: 0.8 })
      .poly([cx, cy - 4.5, cx + 13, cy, cx, cy + 4.5, cx - 13, cy]).stroke({ color: GOLD, alpha: 0.3, width: 0.6 });
    v.addChildAt(base, 0);
    return v;
  }

  /** The tide gauge: a brass rule with 11 marks. The middle mark is larger. */
  override tideGauge(): Container {
    const w = TIDE.cell * TIDE.cells;
    const g = new Graphics()
      .roundRect(TIDE.x - 3, TIDE.y + 2, w + 6, 12, 6).fill({ color: 0x0f1a2a, alpha: 0.85 }).stroke({ color: GOLD, width: 1 })
      .roundRect(TIDE.x - 1, TIDE.y + 4, w / 2 - 6, 8, 4).fill({ color: 0x6fc6e8, alpha: 0.18 })
      .roundRect(TIDE.x + w / 2 + 7, TIDE.y + 4, w / 2 - 6, 8, 4).fill({ color: 0xe8766a, alpha: 0.18 });
    for (let i = 0; i < TIDE.cells; i++) {
      const x = TIDE.x + i * TIDE.cell + TIDE.cell / 2;
      const mid = i === (TIDE.cells - 1) / 2;
      g.rect(x - 0.5, TIDE.y + (mid ? 3 : 6), 1, mid ? 10 : 4).fill({ color: GOLD, alpha: mid ? 1 : 0.6 });
    }
    return g;
  }

  /** A valid cell: a glowing ring that pulses, not only a color. */
  override highlight(r: Rect): Container {
    const g = new Graphics();
    const x = r.x + 2;
    const y = r.y + 2;
    g.roundRect(x, y, r.w - 4, r.h - 4, 6).stroke({ color: 0xfbd35a, alpha: 0.35, width: 3 });
    g.roundRect(x, y, r.w - 4, r.h - 4, 6).stroke({ color: 0xfff1c0, alpha: 0.95, width: 1 });
    const tween = gsap.to(g, { alpha: 0.4, duration: 0.6, repeat: -1, yoyo: true, ease: "sine.inOut" });
    g.on("destroyed", () => tween.kill());
    return g;
  }
}
