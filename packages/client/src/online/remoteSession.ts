import { legalActions, type Action, type GameEvent, type GameState, type PlayerId } from "@tcg/engine";
import type { ServerMessage } from "@tcg/protocol";
import type { PlaySession, SessionHooks } from "../game/session.ts";
import type { OnlineClient } from "./connection.ts";

type StateMsg = Extract<ServerMessage, { t: "state" }>;

/**
 * A PvP match. The server applies the rules and sends a new view after every action.
 * This class animates each view in order and sends the actions of the local player.
 * The client computes the legal actions only to build the interface; the server checks them again.
 */
export class RemoteSession implements PlaySession {
  readonly me: PlayerId;
  readonly matchId: string;
  state: GameState;
  busy = false;
  names: [string, string];
  deadline: number | null;
  readonly startEvents: GameEvent[];
  private seq: number;
  /** True after the local player sent an action, until the server answers. */
  private waiting = false;
  private queue: StateMsg[] = [];
  private draining = false;
  private readonly off: () => void;
  /** The game screen attaches later: the views that arrive before wait in the queue. */
  private hooks: SessionHooks | null = null;

  constructor(
    private readonly client: OnlineClient,
    first: StateMsg,
  ) {
    this.me = first.seat;
    this.matchId = first.matchId;
    this.state = first.view;
    this.names = first.names;
    this.deadline = first.deadline;
    this.seq = first.seq;
    this.startEvents = first.events;
    client.activeMatch = first.matchId;
    this.off = client.onMessage((msg) => this.receive(msg));
  }

  /** Connects the game screen. The queued views play after this call. */
  attach(hooks: SessionHooks): this {
    this.hooks = hooks;
    return this;
  }

  get over(): boolean {
    return this.state.phase === "over";
  }

  humanActions(): Action[] {
    if (this.busy || this.waiting || this.over || this.state.turn !== this.me) return [];
    return legalActions(this.state, this.me);
  }

  async start(): Promise<void> {
    await this.drain();
  }

  async humanAct(action: Action): Promise<void> {
    if (this.busy || this.waiting || this.over || this.state.turn !== this.me) return;
    this.waiting = true;
    this.hooks?.onChange?.(this);
    this.client.send({ t: "action", matchId: this.matchId, seq: this.seq, action });
  }

  concede(): void {
    this.client.send({ t: "concede", matchId: this.matchId });
  }

  private receive(msg: ServerMessage): void {
    if (msg.t === "state" && msg.matchId === this.matchId) {
      this.queue.push(msg);
      void this.drain();
    } else if (msg.t === "error" && this.waiting) {
      // The server refused the action (old view or illegal move): unlock the input.
      this.waiting = false;
      this.hooks?.onChange?.(this);
    }
  }

  /** Animates the views one after the other. A resend of the same view only refreshes the deadline. */
  private async drain(): Promise<void> {
    const hooks = this.hooks;
    if (this.draining || !hooks) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const msg = this.queue.shift()!;
        this.names = msg.names;
        this.deadline = msg.deadline;
        if (msg.seq <= this.seq) {
          this.waiting = false;
          this.hooks?.onChange?.(this);
          continue;
        }
        const before = this.state;
        const player = before.turn;
        this.seq = msg.seq;
        this.waiting = false;
        this.busy = true;
        this.hooks?.onChange?.(this);
        this.state = msg.view;
        try {
          // A reconnection after many actions jumps to the new view: the events describe only the last action.
          await hooks.onStep({ action: { type: "Pass" }, player, before, after: msg.view, events: msg.events });
        } finally {
          this.busy = false;
          this.hooks?.onChange?.(this);
        }
      }
    } finally {
      this.draining = false;
    }
    this.autoResolve();
  }

  /** "Let the chain resolve" as the only option: the client sends it, as in the matches against the AI. */
  private autoResolve(): void {
    const options = this.humanActions();
    if (options.length === 1 && this.state.chain.length > 0) void this.humanAct(options[0]!);
  }

  dispose(): void {
    this.off();
    if (this.client.activeMatch === this.matchId) this.client.activeMatch = null;
  }
}
