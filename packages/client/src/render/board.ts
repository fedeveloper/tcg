import { Container, Rectangle } from "pixi.js";
import { gsap } from "gsap";
import { CARDS } from "@tcg/cards";
import {
  attackOf,
  holdOf,
  LANES,
  PLAYERS,
  ROWS,
  tideFor,
  type GameEvent,
  type GameState,
  type Lane,
  type PlayerId,
  type Row,
  type Target,
} from "@tcg/engine";
import { cardName, laneName, type Translator } from "@tcg/i18n";
import { beaconRect, center, forward, HEIGHT, ORIENTATION, sameLane, siteRect, slotRect, TIDE, tideX, WIDTH, type Rect } from "./layout.ts";
import type { BeaconView, FxKind, KeeperLook, KeeperView, SiteView, Theme } from "./theme.ts";
import type { Step } from "../game/session.ts";

/** Colours of the "Fari 32" palette for numbers and sparks. */
const PALETTE = { coral: 0xe8766a, glow: 0xfbd35a, sprout: 0xb5d665 } as const;
const FACTION_GLOW: Record<string, number> = {
  forge: 0xf29a2e,
  sprout: 0xb5d665,
  neutral: 0xf6f3e4,
  abyss: 0x7fd8ff,
  gear: 0xf0c27a,
  vesper: 0xd2b4ff,
};

/**
 * The particles of each keyword when a keeper enters (graphics plan, phase 6).
 * dx and dy give the direction of the sparks: dx > 0 goes toward the enemy.
 */
const KEYWORD_FX: Record<string, { tint: number; dx: number; dy: number }> = {
  rooted: { tint: 0x8fd16a, dx: 0, dy: 1 },
  reach: { tint: 0x9fd8ff, dx: 0.6, dy: -1 },
  overrun: { tint: 0xff8a3a, dx: 1, dy: -0.2 },
  echo: { tint: 0xd2b4ff, dx: 0, dy: 0 },
  wear: { tint: 0xb8b0a0, dx: -0.4, dy: -0.6 },
  anchor: { tint: 0xe8c56a, dx: 0, dy: 1 },
  surge: { tint: 0x6fe8e0, dx: 0.3, dy: -1 },
};

/** What the player clicked on the board. */
export type BoardClick =
  | { kind: "slot"; owner: PlayerId; lane: Lane; row: Row }
  | { kind: "keeper"; id: string }
  | { kind: "beacon"; owner: PlayerId; lane: Lane }
  | { kind: "site"; lane: Lane };

/** Animation speed. The player can speed up the queue with a click (plan, section 6.5). */
export interface Speed {
  factor: number;
  /** "Reduce animations" (plan, section 7.4): no shake, no hit stop, no squash, fewer particles, half the time. */
  reduced?: boolean;
}

/**
 * The PixiJS board. It keeps the "visual state": it changes only through sync() and the animations.
 * The rules stay in the engine: the board reads the game state and the events.
 */
export class BoardView {
  readonly root = new Container();
  private readonly keepers = new Map<string, KeeperView>();
  private readonly beacons = new Map<string, BeaconView>();
  private readonly sites: SiteView[] = [];
  private readonly highlights = new Container();
  private readonly fx = new Container();
  private readonly keeperLayer = new Container();
  private tideMarker: Container;
  private current: gsap.core.Timeline | null = null;
  private fxCount = 0;
  private state: GameState | null = null;
  onClick: (c: BoardClick) => void = () => {};

  constructor(
    private readonly theme: Theme,
    private tr: Translator,
    private readonly viewer: PlayerId,
    private readonly speed: Speed,
  ) {
    this.root.addChild(theme.background(), theme.tideGauge());
    for (const owner of PLAYERS) {
      for (const lane of LANES) {
        for (const row of ROWS) {
          const r = slotRect(viewer, owner, lane, row);
          const slot = theme.slot(r, owner === viewer);
          this.makeClickable(slot, r, { kind: "slot", owner, lane, row });
          this.root.addChild(slot);
        }
        const br = beaconRect(viewer, owner, lane);
        const beacon = theme.beacon(br, { light: 10, mine: owner === viewer, label: "" });
        this.makeClickable(beacon, { x: 0, y: 0, w: br.w, h: br.h }, { kind: "beacon", owner, lane });
        this.beacons.set(`${owner}:${lane}`, beacon);
        this.root.addChild(beacon);
      }
    }
    for (const lane of LANES) {
      const sr = siteRect(lane);
      const site = theme.site(sr, null);
      this.makeClickable(site, { x: 0, y: 0, w: sr.w, h: sr.h }, { kind: "site", lane });
      this.sites.push(site);
      this.root.addChild(site);
    }
    this.tideMarker = theme.tideMarker();
    this.root.addChild(this.keeperLayer, this.tideMarker, this.highlights, this.fx);
  }

  setTranslator(tr: Translator): void {
    this.tr = tr;
    if (this.state) this.sync(this.state);
  }

  private makeClickable(obj: Container, hit: Rect, click: BoardClick): void {
    obj.eventMode = "static";
    obj.cursor = "pointer";
    obj.hitArea = new Rectangle(hit.x, hit.y, hit.w, hit.h);
    obj.on("pointertap", () => this.onClick(click));
  }

  private keeperLook(state: GameState, id: string): KeeperLook {
    const inst = state.cards[id]!;
    const def = CARDS[inst.cardId]!;
    const max = holdOf(state, id);
    return {
      cardId: inst.cardId,
      name: cardName(this.tr, inst.cardId),
      faction: def.faction,
      attack: attackOf(state, id),
      hold: max - inst.damage,
      maxHold: max,
      fresh: inst.enteredRound === state.round,
      mine: inst.owner === this.viewer,
    };
  }

  private keeperRect(state: GameState, id: string): Rect | null {
    const owner = state.cards[id]?.owner;
    if (owner === undefined) return null;
    for (const lane of LANES) {
      for (const row of ROWS) {
        if (state.players[owner].board[lane][row === "front" ? 0 : 1] === id) return slotRect(this.viewer, owner, lane, row);
      }
    }
    return null;
  }

  private ensureKeeper(state: GameState, id: string): KeeperView | null {
    const r = this.keeperRect(state, id);
    if (!r) return null;
    let view = this.keepers.get(id);
    if (!view) {
      view = this.theme.keeper({ ...r, x: 0, y: 0 }, this.keeperLook(state, id));
      view.eventMode = "static";
      view.cursor = "pointer";
      view.on("pointertap", () => this.onClick({ kind: "keeper", id }));
      this.keepers.set(id, view);
      this.keeperLayer.addChild(view);
    }
    return view;
  }

  /** Puts every visual element in the position and look of the state, with no animation. */
  sync(state: GameState): void {
    this.state = state;
    const alive = new Set<string>();
    for (const owner of PLAYERS) {
      for (const lane of LANES) {
        for (const id of state.players[owner].board[lane]) {
          if (!id) continue;
          alive.add(id);
          const view = this.ensureKeeper(state, id)!;
          const r = this.keeperRect(state, id)!;
          gsap.killTweensOf(view);
          gsap.killTweensOf(view.scale);
          view.position.set(Math.round(center(r).x), Math.round(center(r).y));
          view.scale.set(1);
          view.alpha = 1;
          view.filters = [];
          if (view.body) {
            gsap.killTweensOf(view.body.scale);
            view.body.scale.set(1);
          }
          view.update(this.keeperLook(state, id));
        }
        const light = state.players[owner].beacons[lane].light;
        this.beacons.get(`${owner}:${lane}`)!.update({
          light,
          mine: owner === this.viewer,
          label: this.tr.t("board.beacon", { lane: laneName(this.tr, lane) }),
        });
      }
    }
    for (const [id, view] of this.keepers) {
      if (!alive.has(id)) {
        view.destroy();
        this.keepers.delete(id);
      }
    }
    state.sites.forEach((sid, lane) => {
      const cardId = sid ? state.cards[sid]?.cardId : undefined;
      this.sites[lane]!.setName(cardId ? cardName(this.tr, cardId) : null, cardId);
    });
    this.root.position.set(0, 0);
    this.tideMarker.x = Math.round(tideX(tideFor(state, this.viewer)));
  }

  /** Shows the valid targets of the selected card. */
  setHighlights(rects: Rect[]): void {
    this.highlights.removeChildren().forEach((c) => c.destroy());
    for (const r of rects) this.highlights.addChild(this.theme.highlight(r));
  }

  rectOfTarget(state: GameState, t: Target): Rect | null {
    if (t.kind === "beacon") return beaconRect(this.viewer, t.player, t.lane);
    return this.keeperRect(state, t.id);
  }

  rectOfSlot(owner: PlayerId, lane: Lane, row: Row): Rect {
    return slotRect(this.viewer, owner, lane, row);
  }

  rectOfSite(lane: Lane): Rect {
    return siteRect(lane);
  }

  private float(text: string, color: number, at: { x: number; y: number }, tl: gsap.core.Timeline, pos: number): void {
    const t = this.theme.floatingText(text, color);
    t.position.set(at.x, at.y);
    t.alpha = 0;
    this.fx.addChild(t);
    // The number pops out with a bounce, then rises and fades (graphics plan, phase 6).
    const big = /\d+/.exec(text) && Number(/\d+/.exec(text)![0]) >= 3 ? 1.3 : 1;
    t.scale.set(0.3);
    tl.to(t, { alpha: 1, duration: 0.08 }, pos);
    tl.to(t.scale, { x: big, y: big, duration: 0.28, ease: "back.out(3)" }, pos);
    tl.to(t, { y: at.y - 14, duration: 0.7, ease: "power1.out" }, pos + 0.1);
    tl.to(t, { alpha: 0, duration: 0.2, onComplete: () => t.destroy() }, pos + 0.6);
  }

  /** Adds an effect sprite to the timeline. Themes without effects skip it. */
  private spawn(tl: gsap.core.Timeline, pos: number, kind: FxKind, x: number, y: number, tint?: number, drift?: { x: number; y: number }): void {
    if (!this.theme.fx) return;
    // Reduced motion keeps 3 particles out of 10.
    if (this.speed.reduced && this.fxCount++ % 10 % 3 !== 0) return;
    tl.call(
      () => {
        const s = this.theme.fx!(kind, tint);
        s.position.set(Math.round(x), Math.round(y));
        this.fx.addChild(s);
        if (drift) {
          const tween = gsap.to(s, { x: x + drift.x, y: y + drift.y, duration: 0.3, ease: "power1.out" });
          s.on("destroyed", () => tween.kill());
        }
      },
      undefined,
      pos,
    );
  }

  /** A burst of sparks around a point. The pattern is fixed: the animation is the same in every replay. */
  private burst(tl: gsap.core.Timeline, pos: number, x: number, y: number, count: number, spread: number, tint?: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.4;
      this.spawn(tl, pos + i * 0.012, "spark", x, y, tint, { x: Math.cos(a) * spread, y: Math.sin(a) * spread * 0.7 - 3 });
    }
  }

  /** The particles of the keywords of a keeper that enters. */
  private keywordFx(tl: gsap.core.Timeline, pos: number, cardId: string, x: number, y: number, dir: { x: number; y: number }): void {
    const keywords = CARDS[cardId]?.keywords ?? [];
    keywords.forEach((k, n) => {
      const fx = KEYWORD_FX[k];
      if (!fx) return;
      const at = pos + n * 0.08;
      if (fx.dx === 0 && fx.dy === 0) {
        // Echo: a ring that opens.
        this.burst(tl, at, x, y, 8, 16, fx.tint);
        return;
      }
      for (let i = 0; i < 6; i++) {
        const spread = (i - 2.5) * 3;
        const along = fx.dx * (14 + i);
        this.spawn(tl, at + i * 0.02, "spark", x + spread * Math.abs(fx.dy), y + spread * Math.abs(fx.dx) * 0.5, fx.tint, {
          x: dir.x * along + spread * 0.4,
          y: dir.y * along + fx.dy * (12 + i),
        });
      }
    });
  }

  /** Camera shake: at most 3 pixels (docs/animazioni.md). */
  private shake(tl: gsap.core.Timeline, pos: number, amount: number, duration: number): void {
    if (amount <= 0 || this.speed.reduced) return;
    const n = Math.max(2, Math.round(duration / 0.04));
    for (let i = 0; i < n; i++) {
      const k = amount * (1 - i / n) * (i % 2 ? -1 : 1);
      tl.set(this.root, { x: k, y: i % 3 === 0 ? -k / 2 : k / 2 }, pos + i * 0.04);
    }
    tl.set(this.root, { x: 0, y: 0 }, pos + n * 0.04);
  }

  /** Hit stop: the timeline waits. Only the effect sprites keep moving. */
  private hitStop(tl: gsap.core.Timeline, seconds: number): void {
    if (seconds > 0 && !this.speed.reduced) tl.to({}, { duration: seconds });
  }

  /** Squash and stretch: a scale tween. Reduced motion skips it. */
  private squash(tl: gsap.core.Timeline, scale: object, vars: gsap.TweenVars, pos?: number): void {
    if (!this.speed.reduced) tl.to(scale, vars, pos);
  }

  /** Builds the animation of one event. The timings follow assets/animations/animations.json. */
  private animateEvent(e: GameEvent, step: Step, tl: gsap.core.Timeline): void {
    const after = step.after;
    const before = step.before;
    switch (e.type) {
      case "CardPlayed": {
        const ghost = this.theme.cardGhost?.(e.cardId);
        if (!ghost) return;
        const mine = e.player === this.viewer;
        const target = e.targets[0] ? this.rectOfTarget(before, e.targets[0]) : null;
        const to = target ? center(target) : center(slotRect(this.viewer, e.player, 1, "front"));
        const from = ORIENTATION === "vertical" ? { x: mine ? WIDTH / 2 : WIDTH - 20, y: mine ? HEIGHT + 20 : -24 } : { x: mine ? 240 : 470, y: mine ? 200 : -24 };
        ghost.position.set(from.x, from.y);
        ghost.visible = false;
        this.fx.addChild(ghost);
        const pos = tl.duration();
        // Anticipation: the card lifts and stretches. Then it flies, lands with a squash and dissolves.
        tl.set(ghost, { visible: true }, pos);
        tl.to(ghost, { y: from.y - 6, duration: 0.09, ease: "power2.out" }, pos);
        this.squash(tl, ghost.scale, { x: 0.92, y: 1.08, duration: 0.09, ease: "power2.out" }, pos);
        tl.to(ghost, { x: to.x, y: to.y - 10, duration: 0.2, ease: "power3.out" }, pos + 0.09);
        this.squash(tl, ghost.scale, { x: 1.12, y: 0.9, duration: 0.06, ease: "power1.out" }, pos + 0.29);
        this.squash(tl, ghost.scale, { x: 1, y: 1, duration: 0.07, ease: "back.out(2)" }, pos + 0.35);
        this.burst(tl, pos + 0.29, to.x, to.y - 10, 6, 14, FACTION_GLOW[CARDS[e.cardId]?.faction ?? "neutral"]);
        const dissolve = this.theme.dissolve?.(ghost);
        if (dissolve) tl.to(dissolve, { threshold: 1, duration: 0.22, ease: "power1.in" }, pos + 0.42);
        else tl.to(ghost, { alpha: 0, duration: 0.22, ease: "steps(4)" }, pos + 0.42);
        tl.call(() => ghost.destroy({ children: true }), undefined, pos + 0.64);
        return;
      }
      case "KeeperSummoned": {
        const view = this.ensureKeeper(after, e.card);
        const r = this.keeperRect(after, e.card);
        if (!view || !r) return;
        const c = center(r);
        const body = view.body ?? view;
        view.position.set(c.x, c.y - 20);
        if (!this.speed.reduced) body.scale.set(0.8, 1.25);
        view.alpha = 0;
        const pos = tl.duration();
        // The keeper falls stretched, lands with a squash, then springs back (plan, section 7.2).
        tl.set(view, { alpha: 1 }, pos);
        tl.to(view, { y: c.y, duration: 0.16, ease: "power2.in" }, pos);
        this.squash(tl, body.scale, { x: 1.25, y: 0.75, duration: 0.07, ease: "power1.out" }, pos + 0.16);
        this.spawn(tl, pos + 0.16, "puff", c.x - 10, c.y + 17, undefined, { x: -5, y: -2 });
        this.spawn(tl, pos + 0.16, "puff", c.x + 10, c.y + 17, undefined, { x: 5, y: -2 });
        this.squash(tl, body.scale, { x: 1, y: 1, duration: 0.23, ease: "elastic.out(1, 0.5)" }, pos + 0.23);
        this.keywordFx(tl, pos + 0.24, e.cardId, c.x, c.y, forward(r));
        return;
      }
      case "KeeperMoved": {
        const view = this.keepers.get(e.keeper);
        if (!view) return;
        const c = center(slotRect(this.viewer, e.player, e.to.lane, e.to.row));
        const body = view.body ?? view;
        const pos = tl.duration();
        tl.to(view, { x: c.x, y: c.y, duration: 0.25, ease: "power2.inOut" }, pos);
        this.squash(tl, body.scale, { x: 1.1, y: 0.92, duration: 0.12, yoyo: true, repeat: 1, ease: "sine.inOut" }, pos);
        return;
      }
      case "KeeperDamaged": {
        const view = this.keepers.get(e.keeper);
        if (!view) return;
        const lethal = this.keeperRect(after, e.keeper) === null;
        const r = this.keeperRect(before, e.keeper);
        // The knock back goes away from the enemy.
        const f = r ? forward(r) : { x: 0, y: 0 };
        const body = view.body ?? view;
        const pos = tl.duration();
        const x = view.x;
        const y = view.y;
        this.spawn(tl, pos, "hit", x, view.y + 4);
        this.float(`-${e.amount}`, PALETTE.coral, { x, y: view.y - 12 }, tl, pos);
        this.shake(tl, pos, lethal ? 2 : e.amount >= 3 ? 1 : 0, 0.12);
        // Hit stop: 60 ms for a strong hit, 80 ms for a lethal hit.
        this.hitStop(tl, lethal ? 0.08 : e.amount >= 3 ? 0.06 : 0);
        const hit = tl.duration();
        // Knock back and squash, then an elastic return.
        tl.to(view, { x: x - 3 * f.x, y: y - 3 * f.y, duration: 0.06, ease: "power2.out" }, hit);
        // A short red flash on the keeper.
        tl.set(view, { tint: 0xff6a5a }, pos);
        tl.set(view, { tint: 0xffffff }, hit + 0.1);
        this.squash(tl, body.scale, { x: 0.85, y: 1.12, duration: 0.06, ease: "power2.out" }, hit);
        tl.to(view, { x, y, duration: 0.24, ease: "elastic.out(1, 0.4)" }, hit + 0.06);
        this.squash(tl, body.scale, { x: 1, y: 1, duration: 0.24, ease: "elastic.out(1, 0.4)" }, hit + 0.06);
        return;
      }
      case "KeeperDied":
      case "KeeperReplaced": {
        const view = this.keepers.get(e.keeper);
        if (!view) return;
        const body = view.body ?? view;
        const pos = tl.duration();
        const tint = FACTION_GLOW[CARDS[e.cardId]?.faction ?? "neutral"];
        this.squash(tl, body.scale, { x: 1.2, y: 0.8, duration: 0.08, ease: "power1.out" }, pos);
        // Dither dissolve: the pixels vanish with a 4x4 Bayer pattern.
        const dissolve = this.theme.dissolve?.(view);
        if (dissolve) tl.to(dissolve, { threshold: 1, duration: 0.44, ease: "power1.in" }, pos + 0.08);
        else tl.to(view, { alpha: 0, duration: 0.44, ease: "steps(4)" }, pos + 0.08);
        tl.to(view, { y: view.y + 3, duration: 0.44, ease: "sine.inOut" }, pos + 0.08);
        this.spawn(tl, pos + 0.12, "puff", view.x - 6, view.y + 12, undefined, { x: -4, y: -6 });
        this.spawn(tl, pos + 0.12, "puff", view.x + 6, view.y + 10, undefined, { x: 4, y: -7 });
        this.spawn(tl, pos + 0.16, "puff", view.x, view.y + 2, undefined, { x: 0, y: -8 });
        this.burst(tl, pos + 0.12, view.x, view.y + 4, 5, 12, tint);
        tl.set(view, { alpha: 0 }, pos + 0.52);
        return;
      }
      case "BeaconDamaged":
      case "BeaconHealed": {
        const beacon = this.beacons.get(`${e.player}:${e.lane}`);
        if (!beacon) return;
        const pos = tl.duration();
        const damaged = e.type === "BeaconDamaged";
        const look = {
          light: e.light,
          mine: e.player === this.viewer,
          label: this.tr.t("board.beacon", { lane: laneName(this.tr, e.lane) }),
        };
        const x = beacon.x;
        this.float(`${damaged ? "-" : "+"}${e.amount}`, damaged ? PALETTE.glow : PALETTE.sprout, { x: x + 24, y: beacon.y + 2 }, tl, pos);
        if (!damaged) {
          tl.call(() => beacon.update(look), undefined, pos);
          this.burst(tl, pos, x + 24, beacon.y + 10, 4, 10, PALETTE.sprout);
          tl.to({}, { duration: 0.2 }, pos);
          return;
        }
        this.spawn(tl, pos, "hit", x + 24, beacon.y + 10);
        this.shake(tl, pos, e.amount >= 3 ? 2 : 1, 0.16);
        this.hitStop(tl, e.amount >= 3 ? 0.08 : 0.04);
        const hit = tl.duration();
        // The BeaconOut event shows the dark tower. Until then the beacon keeps its damaged look.
        tl.call(() => beacon.update({ ...look, light: Math.max(e.light, 1) }), undefined, hit + 0.06);
        for (let i = 0; i < 6; i++) tl.set(beacon, { x: x + (i % 2 ? -1 : 1) * (2 - i / 3) }, hit + i * 0.05);
        tl.set(beacon, { x }, hit + 0.3);
        return;
      }
      case "BeaconOut": {
        const beacon = this.beacons.get(`${e.player}:${e.lane}`);
        if (!beacon) return;
        const pos = tl.duration();
        const lamp = { x: beacon.x + 24, y: beacon.y + 10 };
        this.hitStop(tl, 0.08);
        this.shake(tl, pos, 3, 0.26);
        // A last bright pulse, then the light goes out.
        this.spawn(tl, pos + 0.08, "hit", lamp.x, lamp.y, PALETTE.glow);
        this.burst(tl, pos + 0.2, lamp.x, lamp.y, 10, 18, PALETTE.glow);
        tl.to(beacon, { alpha: 0.35, duration: 0.05, repeat: 5, yoyo: true }, pos + 0.2);
        tl.call(
          () => beacon.update({ light: 0, mine: e.player === this.viewer, label: this.tr.t("board.beacon", { lane: laneName(this.tr, e.lane) }) }),
          undefined,
          pos + 0.45,
        );
        this.spawn(tl, pos + 0.5, "puff", lamp.x, lamp.y - 4, undefined, { x: 2, y: -10 });
        this.spawn(tl, pos + 0.62, "puff", lamp.x - 2, lamp.y - 2, undefined, { x: -2, y: -12 });
        tl.to({}, { duration: 0.35 }, pos + 0.5);
        return;
      }
      case "TideShifted": {
        const sign = this.viewer === 0 ? 1 : -1;
        const to = tideX(e.to * sign);
        const from = tideX(e.from * sign);
        const dir = Math.sign(to - from) || 1;
        const pos = tl.duration();
        // Anticipation against the motion, then the buoy slides and overshoots a little.
        tl.to(this.tideMarker, { x: from - 2 * dir, duration: 0.08, ease: "power2.out" }, pos);
        this.squash(tl, this.tideMarker.scale, { y: 0.85, duration: 0.08 }, pos);
        tl.to(this.tideMarker, { x: to, duration: 0.36, ease: "back.out(1.6)" }, pos + 0.08);
        this.squash(tl, this.tideMarker.scale, { y: 1, duration: 0.2, ease: "back.out(2)" }, pos + 0.08);
        if (Math.abs(e.to) >= 2 && Math.abs(e.from) < 2) {
          // The tide crossed the threshold of Alta Marea or Riflusso.
          this.spawn(tl, pos + 0.44, "puff", to - 5, TIDE.y + 8, undefined, { x: -4, y: -3 });
          this.spawn(tl, pos + 0.44, "puff", to + 5, TIDE.y + 8, undefined, { x: 4, y: -3 });
        }
        return;
      }
      case "LaneClash": {
        // Anticipation: every keeper in the lane steps back 2 pixels, then lunges toward the enemy.
        const laneRect = slotRect(this.viewer, 0, e.lane, "front");
        const views = [...this.keepers.entries()]
          .map(([id, v]) => ({ v, r: this.keeperRect(before, id) }))
          .filter((x): x is { v: KeeperView; r: Rect } => !!x.r && sameLane(x.r, laneRect));
        if (views.length === 0) return;
        const pos = tl.duration();
        for (const { v, r } of views) {
          const f = forward(r);
          const { x, y } = center(r);
          const body = v.body ?? v;
          tl.to(v, { x: x - 2 * f.x, y: y - 2 * f.y, duration: 0.12, ease: "power2.out" }, pos);
          tl.to(v, { x: x + 10 * f.x, y: y + 10 * f.y, duration: 0.09, ease: "power4.in" }, pos + 0.12);
          // The stretch follows the lunge: wide on the horizontal board, tall on the vertical board.
          this.squash(tl, body.scale, f.x !== 0 ? { x: 1.15, y: 0.9, duration: 0.09, ease: "power4.in" } : { x: 0.9, y: 1.15, duration: 0.09, ease: "power4.in" }, pos + 0.12);
          tl.to(v, { x, y, duration: 0.22, ease: "power2.out" }, pos + 0.27);
          this.squash(tl, body.scale, { x: 1, y: 1, duration: 0.22, ease: "power2.out" }, pos + 0.27);
        }
        tl.to({}, { duration: 0.21 }, pos);
        return;
      }
      default:
        return;
    }
  }

  /** Makes the running animation faster (a click during the animation). */
  speedUp(): void {
    this.speed.factor = 4;
    this.current?.timeScale(4 * (this.speed.reduced ? 2 : 1));
  }

  /** Plays the animations of a step, then shows the exact state "after". */
  async play(step: Step): Promise<void> {
    const tl = gsap.timeline({ paused: true });
    for (const e of step.events) this.animateEvent(e, step, tl);
    if (tl.duration() > 0) {
      tl.timeScale(this.speed.factor * (this.speed.reduced ? 2 : 1));
      this.current = tl;
      await new Promise<void>((resolve) => {
        tl.eventCallback("onComplete", () => resolve());
        tl.play();
      });
      this.current = null;
    }
    this.sync(step.after);
  }
}
