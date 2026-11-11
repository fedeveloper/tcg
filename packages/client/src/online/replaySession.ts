import { apply, concede, eventsFor, newGame, viewFor, type Action, type GameEvent, type GameState, type PlayerId } from "@tcg/engine";
import type { Replay, ReplayStep } from "@tcg/protocol";
import type { PlaySession, SessionHooks } from "../game/session.ts";

/** Applies one recorded step. A concession works also outside the player's turn (same rule as the server). */
export function applyReplayStep(state: GameState, step: ReplayStep): { state: GameState; events: GameEvent[] } {
  if (step.action.type === "Concede") return concede(state, step.seat);
  return apply(state, step.action);
}

/**
 * Plays a finished PvP match again from its seed, decks and actions.
 * The viewer sees the match as the given seat saw it: the hidden cards stay hidden.
 */
export class ReplaySession implements PlaySession {
  readonly me: PlayerId;
  readonly names: [string, string];
  readonly startEvents: GameEvent[];
  state: GameState;
  busy = false;
  paused = false;
  position = 0;
  private full: GameState;
  private hooks: SessionHooks | null = null;
  private stopped = false;
  private wake: (() => void) | null = null;

  constructor(
    private readonly replay: Replay,
    seat: PlayerId,
    /** Pause between two steps, in milliseconds. */
    private readonly delay = 500,
  ) {
    this.me = seat;
    this.names = replay.names;
    const r = newGame({ seed: replay.seed, decks: replay.decks });
    this.full = r.state;
    this.state = viewFor(r.state, seat);
    this.startEvents = eventsFor(r.events, seat);
  }

  get total(): number {
    return this.replay.steps.length;
  }

  get over(): boolean {
    return this.position >= this.total;
  }

  attach(hooks: SessionHooks): this {
    this.hooks = hooks;
    return this;
  }

  humanActions(): Action[] {
    return [];
  }

  async humanAct(): Promise<void> {}

  get progress(): { position: number; total: number; paused: boolean } {
    return { position: this.position, total: this.total, paused: this.paused };
  }

  togglePause(): void {
    this.paused = !this.paused;
    this.hooks?.onChange?.(this);
    this.wake?.();
  }

  async start(): Promise<void> {
    while (!this.stopped && this.position < this.total) {
      await this.wait();
      if (this.stopped) return;
      const step = this.replay.steps[this.position]!;
      const before = this.state;
      const r = applyReplayStep(this.full, step);
      this.full = r.state;
      this.state = viewFor(r.state, this.me);
      this.position++;
      this.busy = true;
      this.hooks?.onChange?.(this);
      try {
        await this.hooks?.onStep({ action: step.action, player: step.seat, before, after: this.state, events: eventsFor(r.events, this.me) });
      } finally {
        this.busy = false;
        this.hooks?.onChange?.(this);
      }
    }
  }

  /** Waits the delay, and longer while the replay is paused. */
  private wait(): Promise<void> {
    return new Promise((resolve) => {
      const go = () => {
        this.wake = null;
        if (this.paused && !this.stopped) this.wake = go;
        else resolve();
      };
      setTimeout(go, this.delay);
    });
  }

  dispose(): void {
    this.stopped = true;
    this.wake?.();
  }
}
