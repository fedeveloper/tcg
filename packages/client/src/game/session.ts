import { expandDeck, STARTER_DECKS } from "@tcg/cards";
import { apply, legalActions, newGame, type Action, type GameEvent, type GameState, type PlayerId } from "@tcg/engine";
import type { AiLevel } from "@tcg/ai";

/** One applied action: the client animates the events, then shows the state "after". */
export interface Step {
  action: Action;
  player: PlayerId;
  before: GameState;
  after: GameState;
  events: GameEvent[];
}

/** Chooses the AI action. The browser runs it in a Web Worker; tests run it inline. */
export interface AiDriver {
  choose(state: GameState, level: AiLevel): Promise<Action>;
  dispose?(): void;
}

export interface SessionOptions {
  seed: number;
  deck: string;
  opponentDeck: string;
  /** A fixed starting position (the tutorial). It replaces the decks. */
  initial?: { state: GameState; events: GameEvent[] };
  level: AiLevel;
  ai: AiDriver;
  /** Called for every step. The session waits for the returned promise (the animation). */
  onStep: (step: Step) => Promise<void> | void;
  /** Called when the state changes and when the human must act. */
  onChange?: (session: GameSession) => void;
}

export const HUMAN: PlayerId = 0;

/**
 * The game flow of the client. The engine computes the rules; this class only sequences
 * the human actions, the AI actions and the animations. It has no DOM code, so tests run it in Node.
 */
export class GameSession {
  state: GameState;
  /** True while an action or an animation runs. The input stays locked (plan, section 6.5). */
  busy = false;
  readonly startEvents: GameEvent[];
  private readonly opts: SessionOptions;

  constructor(opts: SessionOptions) {
    this.opts = opts;
    const r =
      opts.initial ??
      newGame({ seed: opts.seed, decks: [expandDeck(STARTER_DECKS[opts.deck]!), expandDeck(STARTER_DECKS[opts.opponentDeck]!)] });
    this.state = r.state;
    this.startEvents = r.events;
  }

  get over(): boolean {
    return this.state.phase === "over";
  }

  /** The legal actions of the human, or an empty list when the human cannot act now. */
  humanActions(): Action[] {
    if (this.busy || this.over || this.state.turn !== HUMAN) return [];
    return legalActions(this.state, HUMAN);
  }

  /** Starts the game: the AI acts if it must act first. */
  async start(): Promise<void> {
    await this.runAi();
  }

  async humanAct(action: Action): Promise<void> {
    if (this.busy || this.state.turn !== HUMAN) return;
    await this.step(action);
    await this.runAi();
  }

  private async step(action: Action): Promise<void> {
    this.busy = true;
    this.opts.onChange?.(this);
    try {
      const before = this.state;
      const player = before.turn;
      const r = apply(before, action);
      this.state = r.state;
      await this.opts.onStep({ action, player, before, after: r.state, events: r.events });
    } finally {
      this.busy = false;
      this.opts.onChange?.(this);
    }
  }

  /** Plays the AI turns, and passes for the human when "let the chain resolve" is the only option. */
  private async runAi(): Promise<void> {
    while (!this.over) {
      if (this.state.turn === HUMAN) {
        const options = legalActions(this.state, HUMAN);
        if (options.length === 1 && this.state.chain.length > 0) {
          await this.step(options[0]!);
          continue;
        }
        return;
      }
      this.busy = true;
      this.opts.onChange?.(this);
      const action = await this.opts.ai.choose(this.state, this.opts.level);
      await this.step(action);
    }
  }

  dispose(): void {
    this.opts.ai.dispose?.();
  }
}
