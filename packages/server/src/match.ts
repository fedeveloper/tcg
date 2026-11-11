import { randomBytes } from "node:crypto";
import { apply, concede, eventsFor, newGame, viewFor, type Action, type GameEvent, type GameState, type PlayerId } from "@tcg/engine";
import type { ReplayStep } from "@tcg/protocol";
import type { MatchRow } from "./store.ts";

/** Rebuilds a game from its seed, decks and actions. The engine is deterministic, so the result is always the same. */
export function replayGame(seed: number, decks: [string[], string[]], steps: readonly ReplayStep[]): GameState {
  let state = newGame({ seed, decks }).state;
  for (const s of steps) state = applyStep(state, s).state;
  return state;
}

/** Applies one recorded step. A concession works also outside the player's turn. */
export function applyStep(state: GameState, step: ReplayStep): { state: GameState; events: GameEvent[] } {
  if (step.action.type === "Concede") return concede(state, step.seat);
  if (state.turn !== step.seat) throw new Error("not the turn of this seat");
  return apply(state, step.action);
}

/** One live match on the server. It owns the authoritative game state. */
export class LiveMatch {
  state: GameState | null = null;
  /** The events of the last step, for each seat. */
  lastEvents: [GameEvent[], GameEvent[]] = [[], []];
  deadline: number | null = null;
  timeouts: [number, number] = [0, 0];

  constructor(public row: MatchRow) {}

  static create(code: string | null, host: string, deck: string[]): LiveMatch {
    const now = Date.now();
    return new LiveMatch({
      id: `m_${randomBytes(9).toString("base64url")}`,
      code,
      status: "waiting",
      seed: randomBytes(4).readUInt32LE(0),
      players: [host, null],
      decks: [deck, null],
      steps: [],
      winner: null,
      reason: null,
      created: now,
      updated: now,
    });
  }

  /** Rebuilds a match from the database after a restart. */
  static restore(row: MatchRow): LiveMatch {
    const m = new LiveMatch(row);
    if (row.status !== "waiting" && row.decks[0] && row.decks[1]) m.state = replayGame(row.seed, [row.decks[0], row.decks[1]], row.steps);
    return m;
  }

  seatOf(playerId: string): PlayerId | null {
    if (this.row.players[0] === playerId) return 0;
    if (this.row.players[1] === playerId) return 1;
    return null;
  }

  /** The second player joins: the game starts. The seats are random, so the host does not always play first. */
  start(guest: string, deck: string[]): GameEvent[] {
    const swap = (this.row.seed & 1) === 1;
    const host = this.row.players[0]!;
    const hostDeck = this.row.decks[0]!;
    this.row.players = swap ? [guest, host] : [host, guest];
    this.row.decks = swap ? [deck, hostDeck] : [hostDeck, deck];
    this.row.status = "active";
    this.row.code = null;
    const r = newGame({ seed: this.row.seed, decks: [this.row.decks[0]!, this.row.decks[1]!] });
    this.state = r.state;
    this.lastEvents = [eventsFor(r.events, 0), eventsFor(r.events, 1)];
    this.touch();
    return r.events;
  }

  get seq(): number {
    return this.row.steps.length;
  }

  /** Applies a step. The engine throws an error if the action is not legal. */
  play(step: ReplayStep): void {
    if (!this.state) throw new Error("the match has not started");
    const r = applyStep(this.state, step);
    this.state = r.state;
    this.row.steps.push(step);
    this.lastEvents = [eventsFor(r.events, 0), eventsFor(r.events, 1)];
    if (r.state.phase === "over") {
      this.row.status = "over";
      this.row.winner = r.state.outcome?.winner ?? null;
      this.row.reason = r.state.outcome?.reason ?? null;
      this.deadline = null;
    }
    this.touch();
  }

  view(seat: PlayerId): GameState | null {
    return this.state ? viewFor(this.state, seat) : null;
  }

  /** The action that the server plays when a player does not act in time. */
  timeoutAction(): Action {
    if (this.state?.phase === "mulligan") return { type: "Mulligan", cards: [] };
    return { type: "Pass" };
  }

  private touch(): void {
    this.row.updated = Date.now();
  }
}
