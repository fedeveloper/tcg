import { Assets, BitmapFont, BitmapText, Container, defaultFilterVert, Filter, GlProgram, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from "pixi.js";
import { gsap } from "gsap";
import seaUrl from "../../../../assets/board/web/sea.webp?url";
import litUrl from "../../../../assets/board/web/beacon-lit.webp?url";
import damagedUrl from "../../../../assets/board/web/beacon-damaged.webp?url";
import outUrl from "../../../../assets/board/web/beacon-out.webp?url";
import woodUrl from "../../../../assets/ui/web/legno.webp?url";
import { HEIGHT, TIDE, VIEW_HEIGHT, WIDTH, type Rect } from "./layout.ts";
import { type Art, SpriteTheme } from "./spriteTheme.ts";
import { FACTION_COLORS, type FxKind, type BeaconLook, type BeaconView, type KeeperLook, type KeeperView, type SiteView } from "./theme.ts";

/** The round keeper medallions (graphics plan, phase 5), cut by assets/art/build.py. */
const MEDALS: Record<string, string> = {};
for (const [path, url] of Object.entries(
  import.meta.glob("../../../../assets/art/web/medal/*.webp", { query: "?url", import: "default", eager: true }) as Record<string, string>,
)) {
  const id = /([^/]+)\.webp$/.exec(path)?.[1];
  if (id) MEDALS[id] = url;
}

let damageFontReady = false;

const medalTextures = new Map<string, Promise<Texture>>();

/** Loads the medallion of a keeper once. Many keepers of the same card share the texture. */
function medalTexture(cardId: string): Promise<Texture> | null {
  const url = MEDALS[cardId];
  if (!url) return null;
  let t = medalTextures.get(cardId);
  if (!t) {
    t = linear(url);
    medalTextures.set(cardId, t);
  }
  return t;
}

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
/** The radius of a keeper medallion and the height of its centre, in scene pixels from the cell centre. */
const MEDAL_R = 15;
const MEDAL_Y = -3;
/** The stat badges: Attack on the left, Hold on the right. */
const STAT_FONT = { fontFamily: "Alegreya, Georgia, serif", fontWeight: "700", fontSize: 9 } as const;

/** The light around a medallion: a color and a rhythm for each faction (graphics plan, phase 6). */
/** Only the factions of light have an aura: fewer large sprites keep the frame rate on slow phones. */
const AURA: Record<string, { color: number; size: number; alpha: number; rhythm: "flicker" | "pulse" }> = {
  forge: { color: 0xff8a3a, size: 46, alpha: 0.55, rhythm: "flicker" },
  vesper: { color: 0xc9a4ff, size: 44, alpha: 0.5, rhythm: "pulse" },
  abyss: { color: 0x5fc8ff, size: 40, alpha: 0.35, rhythm: "pulse" },
};

/**
 * The painted theme: a painted sea and painted Beacons (graphics plan, phase 3).
 * Keepers are painted medallions (phase 5). Sites and the effects still come from the pixel art theme until phase 6.
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
    sea.height = PIER_Y + 6;
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
    // Light parallax: the sea follows the mouse by a few pixels (graphics plan, phase 6).
    sea.width = WIDTH + 8;
    sea.x = -4;
    const drift = { x: -4, y: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || this.reduced()) return;
      const kx = e.clientX / window.innerWidth - 0.5;
      const ky = e.clientY / window.innerHeight - 0.5;
      gsap.to(drift, { x: -4 - kx * 6, y: -ky * 3, duration: 0.8, ease: "power2.out", overwrite: true, onUpdate: () => sea.position.set(drift.x, drift.y) });
    };
    window.addEventListener("pointermove", onMove);
    c.on("destroyed", () => {
      tween.kill();
      gsap.killTweensOf(drift);
      window.removeEventListener("pointermove", onMove);
    });
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

  /**
   * A keeper is a round medallion cut from its card illustration (graphics plan, phase 5).
   * It has a ring in the faction color, a shadow and a reflection on the water.
   * The body (squash and stretch) turns around the bottom of the medallion.
   */
  override keeper(r: Rect, look: KeeperLook): KeeperView {
    if (!MEDALS[look.cardId]) return super.keeper(r, look);
    const c = new Container() as KeeperView;
    c.position.set(r.x + r.w / 2, r.y + r.h / 2);
    c.hitArea = new Rectangle(-r.w / 2, -r.h / 2, r.w, r.h);
    const bottom = MEDAL_Y + MEDAL_R;
    // The shadow and the reflection stay on the water: they do not squash.
    const shadow = new Graphics().ellipse(0, bottom + 1, MEDAL_R * 0.95, 3.2).fill({ color: 0x050a12, alpha: 0.45 });
    const reflection = new Sprite(Texture.EMPTY);
    reflection.anchor.set(0.5, 0);
    reflection.alpha = 0.22;
    reflection.position.set(0, bottom + 2);
    const body = new Container();
    body.position.set(0, bottom);
    // The breath: a slow scale of 2% on an inner container, so it never fights the board's squash.
    const breath = new Container();
    breath.position.set(0, -MEDAL_R);
    const picture = new Sprite(Texture.EMPTY);
    picture.anchor.set(0.5);
    const ring = new Graphics();
    breath.addChild(picture, ring);
    body.addChild(breath);
    const stats = new Container();
    const attackBadge = new Graphics()
      .poly([0, -6, 6, 0, 0, 6, -6, 0]).fill({ color: 0x8e2a1f }).stroke({ color: GOLD, width: 1 });
    attackBadge.position.set(-MEDAL_R + 1, bottom - 3);
    const holdBadge = new Graphics()
      .poly([-5.5, -5.5, 5.5, -5.5, 5.5, 1, 0, 6.5, -5.5, 1]).fill({ color: 0x2d4560 }).stroke({ color: GOLD, width: 1 });
    holdBadge.position.set(MEDAL_R - 1, bottom - 3);
    const attack = new Text({ text: "", style: { ...STAT_FONT, fill: 0xfff4e0 }, resolution: this.resolution * 2 });
    attack.anchor.set(0.5, 0.55);
    attack.position.copyFrom(attackBadge.position);
    const hold = new Text({ text: "", style: { ...STAT_FONT, fill: 0xfff4e0 }, resolution: this.resolution * 2 });
    hold.anchor.set(0.5, 0.6);
    hold.position.copyFrom(holdBadge.position);
    stats.addChild(attackBadge, holdBadge, attack, hold);
    // The faction light around the medallion: firelight flickers, the Vesper lanterns pulse.
    const aura = new Sprite(this.painted.glow);
    aura.anchor.set(0.5);
    // Normal blending keeps the board in few draw calls: an "add" sprite between normal sprites breaks the batch.
    aura.position.set(0, MEDAL_Y);
    let auraTween: gsap.core.Tween | null = null;
    let auraFaction = "";
    const setAura = (faction: string) => {
      if (faction === auraFaction) return;
      auraFaction = faction;
      auraTween?.kill();
      const a = AURA[faction];
      aura.visible = !!a;
      if (!a) return;
      aura.tint = a.color;
      aura.scale.set(a.size / this.painted.glow.width);
      aura.alpha = a.alpha;
      if (a.rhythm === "flicker") {
        auraTween = gsap.to(aura, { alpha: `random(${a.alpha * 0.45}, ${a.alpha})`, duration: "random(0.12, 0.26)", repeat: -1, repeatRefresh: true, ease: "none" });
      } else {
        auraTween = gsap.to(aura, { alpha: a.alpha * 0.4, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
      }
    };
    c.addChild(aura, shadow, reflection, body, stats);
    c.body = body;
    c.on("destroyed", () => auraTween?.kill());

    const breathe = gsap.to(breath.scale, { x: 1.02, y: 1.02, duration: 1.6 + Math.random() * 0.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: Math.random() });
    c.on("destroyed", () => breathe.kill());

    let shown = "";
    let mine = look.mine;
    const show = (cardId: string) => {
      shown = cardId;
      void medalTexture(cardId)?.then((t) => {
        if (c.destroyed || shown !== cardId) return;
        picture.texture = t;
        picture.scale.set(((mine ? 1 : -1) * MEDAL_R * 2) / t.width, (MEDAL_R * 2) / t.height);
        reflection.texture = t;
        reflection.scale.set(((mine ? 1 : -1) * MEDAL_R * 1.6) / t.width, (-MEDAL_R * 0.7) / t.height);
      });
    };
    c.update = (l: KeeperLook) => {
      mine = l.mine;
      if (l.cardId !== shown) show(l.cardId);
      const color = FACTION_COLORS[l.faction];
      ring.clear()
        .circle(0, 0, MEDAL_R).stroke({ color, width: 2.2 })
        .circle(0, 0, MEDAL_R + 1.4).stroke({ color: GOLD, width: 0.8 })
        .circle(0, 0, MEDAL_R - 1.3).stroke({ color: 0x000000, alpha: 0.35, width: 0.6 });
      // A keeper that entered in this round waits: it is darker and it does not breathe.
      picture.tint = l.fresh ? 0x8a8aa8 : 0xffffff;
      reflection.tint = color;
      setAura(l.faction);
      auraTween?.paused(this.reduced());
      breathe.paused(l.fresh || this.reduced());
      if (l.fresh || this.reduced()) breath.scale.set(1);
      attack.text = String(l.attack);
      hold.text = String(l.hold);
      hold.style.fill = l.hold < l.maxHold ? 0xffb0a0 : 0xfff4e0;
    };
    c.update(look);
    return c;
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
    // The lamp light on the water: a long soft glint that breathes with the lamp.
    const glint = new Sprite(this.painted.glow);
    glint.anchor.set(0.5);
    glint.position.set(r.w / 2 + (look.mine ? 14 : -14), r.h + 2);
    glint.scale.set(36 / this.painted.glow.width, 6 / this.painted.glow.height);
    glint.alpha = 0.45;
    const glintTween = gsap.to(glint, { alpha: 0.2, duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
    c.addChild(glint, glow, sprite, badge, light);
    c.on("destroyed", () => {
      breathe.kill();
      glintTween.kill();
    });
    c.update = (l: BeaconLook) => {
      const next = beaconState(l.light);
      if (next !== state) {
        state = next;
        sprite.texture = this.painted.beacon[state];
      }
      glow.visible = glint.visible = state !== "out";
      glow.tint = state === "lit" ? 0xffffff : 0xff8a3a;
      glint.tint = glow.tint;
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

  /** Damage and heal numbers: large painted digits with a dark outline (graphics plan, phase 6). */
  override floatingText(text: string, color: number): Container {
    // A bitmap font: the digits are drawn once, so a new number costs no text rendering.
    if (!damageFontReady) {
      BitmapFont.install({
        name: "tcg-damage",
        style: { fontFamily: "Alegreya, Georgia, serif", fontWeight: "700", fontSize: 32, fill: 0xffffff, stroke: { color: 0x1a0d08, width: 6 } },
        chars: [["0", "9"], "+-×"],
        resolution: Math.max(1, this.resolution / 2),
      });
      damageFontReady = true;
    }
    const t = new BitmapText({ text, style: { fontFamily: "tcg-damage", fontSize: 16 } });
    t.tint = color;
    t.anchor.set(0.5);
    return t;
  }

  /** Soft light effects in place of the pixel sprites: sparks, puffs of mist and hit flashes. */
  override fx(kind: FxKind, tint = 0xffffff): Container {
    const g = new Sprite(this.painted.glow);
    g.anchor.set(0.5);
    const k = 1 / this.painted.glow.width;
    if (kind === "spark") {
      g.blendMode = "add";
      g.tint = tint;
      g.scale.set(9 * k);
      gsap.to(g.scale, { x: 2 * k, y: 2 * k, duration: 0.4, ease: "power1.in" });
      gsap.to(g, { alpha: 0, duration: 0.4, ease: "power1.in", onComplete: () => g.destroy() });
    } else if (kind === "puff") {
      g.tint = tint === 0xffffff ? 0xc9d6dc : tint;
      g.alpha = 0.6;
      g.scale.set(8 * k);
      gsap.to(g.scale, { x: 22 * k, y: 16 * k, duration: 0.5, ease: "power2.out" });
      gsap.to(g, { alpha: 0, duration: 0.5, ease: "power1.in", onComplete: () => g.destroy() });
    } else {
      // Hit: a bright flash and a ring that opens.
      g.blendMode = "add";
      g.tint = tint;
      g.scale.set(30 * k);
      const ring = new Graphics().circle(0, 0, 6).stroke({ color: tint === 0xffffff ? 0xffe0b0 : tint, width: 1.5 });
      g.addChild(ring);
      ring.scale.set(this.painted.glow.width / 30);
      gsap.to(g.scale, { x: 44 * k, y: 44 * k, duration: 0.25, ease: "power2.out" });
      gsap.to(g, { alpha: 0, duration: 0.25, ease: "power1.in", onComplete: () => g.destroy() });
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
