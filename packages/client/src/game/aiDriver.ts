import { AiRandom, chooseAction, type AiLevel } from "@tcg/ai";
import { actionKey, legalActions, type Action, type GameState } from "@tcg/engine";
import type { AiDriver } from "./session.ts";

/** Runs the AI in the same thread. Tests use it. */
export class InlineAiDriver implements AiDriver {
  private readonly rng: AiRandom;
  constructor(seed: number) {
    this.rng = new AiRandom(seed);
  }
  async choose(state: GameState, level: AiLevel): Promise<Action> {
    return chooseAction(state, level, this.rng);
  }
}

export interface AiRequest {
  id: number;
  state: GameState;
  level: AiLevel;
}

export interface AiResponse {
  id: number;
  action: Action;
}

/** Runs the AI in a Web Worker, so the interface never blocks (plan, section 8). */
export class WorkerAiDriver implements AiDriver {
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, (a: Action) => void>();
  /** The AI waits at least this time, so the player can follow its moves. */
  private readonly minDelayMs: number;

  constructor(minDelayMs = 350) {
    this.minDelayMs = minDelayMs;
    this.worker = new Worker(new URL("./aiWorker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent<AiResponse>) => {
      const resolve = this.pending.get(e.data.id);
      this.pending.delete(e.data.id);
      resolve?.(e.data.action);
    };
  }

  async choose(state: GameState, level: AiLevel): Promise<Action> {
    const id = this.nextId++;
    const started = Date.now();
    const action = await new Promise<Action>((resolve) => {
      this.pending.set(id, resolve);
      this.worker.postMessage({ id, state, level } satisfies AiRequest);
    });
    const wait = this.minDelayMs - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    return action;
  }

  dispose(): void {
    this.worker.terminate();
  }
}

/** A scripted opponent for the tutorial: the script picks the action, or null to pass. */
export class ScriptedAiDriver implements AiDriver {
  constructor(
    private readonly next: (state: GameState) => Action | null,
    private readonly delayMs = 0,
  ) {}
  async choose(state: GameState): Promise<Action> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    const legal = legalActions(state);
    const wanted = this.next(state);
    const key = wanted ? actionKey(wanted) : null;
    const match = key ? legal.find((a) => actionKey(a) === key) : undefined;
    return match ?? legal.find((a) => a.type === "Pass") ?? legal[0]!;
  }
}
