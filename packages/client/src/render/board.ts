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
import { beaconRect, center, onViewerSide, siteRect, slotRect, tideX, type Rect } from "./layout.ts";
import type { BeaconView, KeeperLook, KeeperView, Theme } from "./theme.ts";
import type { Step } from "../game/session.ts";

/** What the player clicked on the board. */
export type BoardClick =
  | { kind: "slot"; owner: PlayerId; lane: Lane; row: Row }
  | { kind: "keeper"; id: string }
  | { kind: "beacon"; owner: PlayerId; lane: Lane }
  | { kind: "site"; lane: Lane };

/** Animation speed. The player can speed up the queue with a click (plan, section 6.5). */
export interface Speed {
  factor: number;
}

/**
 * The PixiJS board. It keeps the "visual state": it changes only through sync() and the animations.
 * The rules stay in the engine: the board reads the game state and the events.
 */
export class BoardView {
  readonly root = new Container();
  private readonly keepers = new Map<string, KeeperView>();
  private readonly beacons = new Map<string, BeaconView>();
  private readonly sites: (Container & { setName(name: string | null): void })[] = [];
  private readonly highlights = new Container();
  private readonly fx = new Container();
  private readonly keeperLayer = new Container();
  private tideMarker: Container;
  private current: gsap.core.Timeline | null = null;
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
      this.sites[lane]!.setName(cardId ? cardName(this.tr, cardId) : null);
    });
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
    tl.to(t, { alpha: 1, duration: 0.08 }, pos);
    tl.to(t, { y: at.y - 12, duration: 0.5, ease: "power1.out" }, pos);
    tl.to(t, { alpha: 0, duration: 0.2, onComplete: () => t.destroy() }, pos + 0.4);
  }

  /** Builds the animation of one event. Returns the time that the event takes. */
  private animateEvent(e: GameEvent, step: Step, tl: gsap.core.Timeline): void {
    const after = step.after;
    const before = step.before;
    switch (e.type) {
      case "KeeperSummoned": {
        const view = this.ensureKeeper(after, e.card);
        const r = this.keeperRect(after, e.card);
        if (!view || !r) return;
        const c = center(r);
        view.position.set(c.x, c.y - 6);
        view.scale.set(0.6, 1.3);
        view.alpha = 0;
        // Squash and stretch on landing (plan, section 7.2).
        tl.to(view, { alpha: 1, y: c.y, duration: 0.18, ease: "power2.in" });
        tl.to(view.scale, { x: 1.15, y: 0.85, duration: 0.06 });
        tl.to(view.scale, { x: 1, y: 1, duration: 0.14, ease: "back.out(3)" });
        return;
      }
      case "KeeperMoved": {
        const view = this.keepers.get(e.keeper);
        if (!view) return;
        const c = center(slotRect(this.viewer, e.player, e.to.lane, e.to.row));
        tl.to(view, { x: c.x, y: c.y, duration: 0.25, ease: "power2.inOut" });
        return;
      }
      case "KeeperDamaged": {
        const view = this.keepers.get(e.keeper);
        if (!view) return;
        const pos = tl.duration();
        // Hit stop and a small shake.
        tl.to(view, { x: `+=2`, duration: 0.03, repeat: 3, yoyo: true }, pos + 0.07);
        this.float(`-${e.amount}`, 0xff8a7a, { x: view.x, y: view.y - 10 }, tl, pos);
        return;
      }
      case "KeeperDied":
      case "KeeperReplaced": {
        const view = this.keepers.get(e.keeper);
        if (!view) return;
        tl.to(view, { alpha: 0, duration: 0.3, ease: "steps(4)" });
        tl.to(view.scale, { x: 0.8, y: 0.8, duration: 0.3 }, "<");
        return;
      }
      case "BeaconDamaged":
      case "BeaconHealed": {
        const beacon = this.beacons.get(`${e.player}:${e.lane}`);
        if (!beacon) return;
        const pos = tl.duration();
        const sign = e.type === "BeaconDamaged" ? "-" : "+";
        this.float(`${sign}${e.amount}`, e.type === "BeaconDamaged" ? 0xffb347 : 0x9be59b, { x: beacon.x + 24, y: beacon.y + 8 }, tl, pos);
        tl.call(() =>
          beacon.update({
            light: e.light,
            mine: e.player === this.viewer,
            label: this.tr.t("board.beacon", { lane: laneName(this.tr, e.lane) }),
          }),
        );
        tl.to(beacon, { alpha: 0.5, duration: 0.06, yoyo: true, repeat: 1 });
        return;
      }
      case "TideShifted": {
        const sign = this.viewer === 0 ? 1 : -1;
        tl.to(this.tideMarker, { x: tideX(e.to * sign), duration: 0.35, ease: "sine.inOut" });
        return;
      }
      case "LaneClash": {
        // Anticipation: every keeper in the lane steps back 2 pixels, then jumps toward the enemy.
        const laneY = slotRect(this.viewer, 0, e.lane, "front").y;
        const views = [...this.keepers.entries()]
          .map(([id, v]) => ({ v, r: this.keeperRect(before, id) }))
          .filter((x): x is { v: KeeperView; r: Rect } => !!x.r && x.r.y === laneY);
        if (views.length === 0) return;
        const pos = tl.duration();
        for (const { v, r } of views) {
          const dir = onViewerSide(r) ? 1 : -1;
          tl.to(v, { x: `-=${2 * dir}`, duration: 0.1, ease: "power1.out" }, pos);
          tl.to(v, { x: `+=${6 * dir}`, duration: 0.06, ease: "power2.in" }, pos + 0.1);
          tl.to(v, { x: `-=${4 * dir}`, duration: 0.12, ease: "power1.out" }, pos + 0.16);
        }
        return;
      }
      default:
        return;
    }
  }

  /** Makes the running animation faster (a click during the animation). */
  speedUp(): void {
    this.speed.factor = 4;
    this.current?.timeScale(4);
  }

  /** Plays the animations of a step, then shows the exact state "after". */
  async play(step: Step): Promise<void> {
    const tl = gsap.timeline({ paused: true });
    for (const e of step.events) this.animateEvent(e, step, tl);
    if (tl.duration() > 0) {
      tl.timeScale(this.speed.factor);
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
