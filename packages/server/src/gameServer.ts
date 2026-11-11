import { randomBytes } from "node:crypto";
import { CARDS, expandDeck, STARTER_DECKS, validateDeck } from "@tcg/cards";
import { RulesError, type PlayerId } from "@tcg/engine";
import { cleanName, PROTOCOL_VERSION, type ClientMessage, type ErrorCode, type MatchSummary, type ServerMessage } from "@tcg/protocol";
import type { ServerConfig } from "./config.ts";
import { LiveMatch } from "./match.ts";
import type { MatchRow, Store } from "./store.ts";

/** A client connection. The WebSocket layer implements it; the tests use a fake one. */
export interface Connection {
  send(msg: ServerMessage): void;
}

interface Session {
  conn: Connection;
  playerId: string | null;
  name: string;
}

/** Timers are injectable, so the tests can run a timeout at once. */
export interface Clock {
  now(): number;
  setTimeout(f: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (f, ms) => setTimeout(f, ms),
  clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout),
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * The PvP logic, without network code: accounts, private matches with a code, quick match, actions and timers.
 * The server is authoritative (plan, section 6.6): it applies every action with the engine and sends each player only their own view.
 */
export class GameServer {
  private readonly sessions = new Map<Connection, Session>();
  private readonly matches = new Map<string, LiveMatch>();
  private readonly byCode = new Map<string, string>();
  private queue: { playerId: string; deck: string[]; conn: Connection } | null = null;
  private readonly timers = new Map<string, unknown>();

  constructor(
    private readonly store: Store,
    private readonly config: ServerConfig,
    private readonly clock: Clock = realClock,
  ) {
    for (const row of store.openMatches()) {
      const m = LiveMatch.restore(row);
      this.matches.set(row.id, m);
      if (row.code) this.byCode.set(row.code, row.id);
      if (row.status === "active") this.armTimer(m);
    }
  }

  /** Active and waiting matches in memory. */
  get liveMatches(): number {
    return this.matches.size;
  }

  connect(conn: Connection): void {
    this.sessions.set(conn, { conn, playerId: null, name: "" });
  }

  disconnect(conn: Connection): void {
    if (this.queue?.conn === conn) this.queue = null;
    this.sessions.delete(conn);
  }

  stop(): void {
    for (const t of this.timers.values()) this.clock.clearTimeout(t);
    this.timers.clear();
  }

  private error(conn: Connection, code: ErrorCode, message: string): void {
    conn.send({ t: "error", code, message });
  }

  handle(conn: Connection, msg: ClientMessage): void {
    const s = this.sessions.get(conn);
    if (!s) return;
    if (msg.t === "hello") return this.hello(s, msg);
    if (msg.t === "ping") return conn.send({ t: "pong" });
    if (!s.playerId) return this.error(conn, "notLoggedIn", "Send hello first.");
    const me = s.playerId;
    switch (msg.t) {
      case "createMatch":
        return this.createMatch(s, me, msg.deck);
      case "joinMatch":
        return this.joinMatch(s, me, msg.code, msg.deck);
      case "queue":
        return this.enqueue(s, me, msg.deck);
      case "leaveQueue":
        if (this.queue?.playerId === me) this.queue = null;
        return;
      case "action":
        return this.action(s, me, msg.matchId, msg.seq, msg.action);
      case "concede":
        return this.concede(s, me, msg.matchId);
      case "resume": {
        const m = this.matches.get(msg.matchId);
        const seat = m?.seatOf(me);
        if (!m || seat === null || seat === undefined) return this.error(conn, "noMatch", "No such match.");
        return this.sendState(conn, m, seat);
      }
      case "myMatches":
        return conn.send({ t: "myMatches", matches: this.store.matchesOf(me).map((r) => this.summary(r, me)) });
      case "replay": {
        const row = this.store.match(msg.matchId);
        if (!row || row.status !== "over" || !row.decks[0] || !row.decks[1]) return this.error(conn, "noMatch", "The replay exists only for a finished match.");
        return conn.send({
          t: "replay",
          replay: { matchId: row.id, seed: row.seed, decks: [row.decks[0], row.decks[1]], names: this.names(row), steps: row.steps },
        });
      }
    }
  }

  private hello(s: Session, msg: Extract<ClientMessage, { t: "hello" }>): void {
    if (msg.version !== PROTOCOL_VERSION) return this.error(s.conn, "version", `The server uses protocol ${PROTOCOL_VERSION}. Reload the page.`);
    let token = msg.token ?? "";
    let player = token ? this.store.playerByToken(token) : null;
    if (!player) {
      const created = this.store.createPlayer(cleanName(msg.name));
      player = created.player;
      token = created.token;
    } else if (msg.name && cleanName(msg.name) !== player.name) {
      player = { ...player, name: cleanName(msg.name) };
      this.store.renamePlayer(player.id, player.name);
    }
    s.playerId = player.id;
    s.name = player.name;
    s.conn.send({ t: "welcome", playerId: player.id, name: player.name, token });
  }

  /** PvP decks follow the deck rules (plan, section 3.9). The collection stays in the browser, so the server checks only the rules. */
  private deckOk(conn: Connection, deck: string[]): boolean {
    const problems = validateDeck(deck, CARDS);
    if (problems.length > 0) {
      this.error(conn, "badDeck", `The deck is not valid: ${JSON.stringify(problems[0])}`);
      return false;
    }
    return true;
  }

  private newCode(): string {
    for (;;) {
      const bytes = randomBytes(6);
      const code = Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
      if (!this.byCode.has(code)) return code;
    }
  }

  private createMatch(s: Session, me: string, deck: string[]): void {
    if (!this.deckOk(s.conn, deck)) return;
    const m = LiveMatch.create(this.newCode(), me, deck);
    this.matches.set(m.row.id, m);
    this.byCode.set(m.row.code!, m.row.id);
    this.store.saveMatch(m.row);
    s.conn.send({ t: "matchCreated", matchId: m.row.id, code: m.row.code! });
  }

  private joinMatch(s: Session, me: string, code: string, deck: string[]): void {
    if (!this.deckOk(s.conn, deck)) return;
    const id = this.byCode.get(code);
    const m = id ? this.matches.get(id) : undefined;
    if (!m || m.row.status !== "waiting") return this.error(s.conn, "noMatch", "No match with this code.");
    if (m.row.players[0] === me) return this.error(s.conn, "noMatch", "You cannot join your own match.");
    this.byCode.delete(code);
    this.begin(m, me, deck);
  }

  private enqueue(s: Session, me: string, deck: string[]): void {
    if (!this.deckOk(s.conn, deck)) return;
    const q = this.queue;
    if (!q || q.playerId === me) {
      this.queue = { playerId: me, deck, conn: s.conn };
      s.conn.send({ t: "queued" });
      return;
    }
    this.queue = null;
    const m = LiveMatch.create(null, q.playerId, q.deck);
    this.matches.set(m.row.id, m);
    this.begin(m, me, deck);
  }

  private begin(m: LiveMatch, guest: string, deck: string[]): void {
    m.start(guest, deck);
    this.store.saveMatch(m.row);
    this.armTimer(m);
    this.broadcast(m);
  }

  private action(s: Session, me: string, matchId: string, seq: number, action: Parameters<LiveMatch["play"]>[0]["action"]): void {
    const m = this.matches.get(matchId);
    const seat = m?.seatOf(me);
    if (!m || seat === null || seat === undefined || !m.state) return this.error(s.conn, "noMatch", "No such match.");
    if (seq !== m.seq) {
      this.error(s.conn, "stale", "Your view is old.");
      return this.sendState(s.conn, m, seat);
    }
    if (action.type === "Concede") return this.concede(s, me, matchId);
    if (m.state.turn !== seat) return this.error(s.conn, "notYourTurn", "Wait for your turn.");
    try {
      m.play({ seat, action });
    } catch (e) {
      if (e instanceof RulesError) return this.error(s.conn, "illegal", e.message);
      throw e;
    }
    m.timeouts[seat] = 0;
    this.afterStep(m);
  }

  private concede(s: Session, me: string, matchId: string): void {
    const m = this.matches.get(matchId);
    const seat = m?.seatOf(me);
    if (!m || seat === null || seat === undefined) return this.error(s.conn, "noMatch", "No such match.");
    if (m.row.status === "waiting") {
      // The host cancels a match that nobody joined.
      if (m.row.code) this.byCode.delete(m.row.code);
      m.row.status = "over";
      m.row.reason = "cancelled";
      this.store.saveMatch(m.row);
      this.matches.delete(m.row.id);
      return;
    }
    if (m.row.status !== "active") return;
    m.play({ seat, action: { type: "Concede" } });
    this.afterStep(m);
  }

  private afterStep(m: LiveMatch): void {
    this.store.saveMatch(m.row);
    this.armTimer(m);
    this.broadcast(m);
    if (m.row.status === "over") this.matches.delete(m.row.id);
  }

  /** Starts the timer of the player who must act. A timeout plays Pass (or keeps the hand). */
  private armTimer(m: LiveMatch): void {
    const old = this.timers.get(m.row.id);
    if (old !== undefined) this.clock.clearTimeout(old);
    this.timers.delete(m.row.id);
    if (m.row.status !== "active" || !m.state) {
      m.deadline = null;
      return;
    }
    const ms = this.config.turnSeconds * 1000;
    m.deadline = this.clock.now() + ms;
    const seq = m.seq;
    this.timers.set(
      m.row.id,
      this.clock.setTimeout(() => this.timeout(m, seq), ms),
    );
  }

  /** Runs when a player does not act in time. */
  timeout(m: LiveMatch, seq: number): void {
    this.timers.delete(m.row.id);
    if (m.row.status !== "active" || !m.state || m.seq !== seq) return;
    const seat = m.state.turn;
    m.timeouts[seat]++;
    if (m.timeouts[seat] >= this.config.maxTimeouts) m.play({ seat, action: { type: "Concede" } });
    else m.play({ seat, action: m.timeoutAction() });
    this.afterStep(m);
  }

  private names(row: MatchRow): [string, string] {
    return [this.store.playerName(row.players[0] ?? "") ?? "?", this.store.playerName(row.players[1] ?? "") ?? "?"];
  }

  private sendState(conn: Connection, m: LiveMatch, seat: PlayerId): void {
    const view = m.view(seat);
    if (!view) {
      // A waiting match has no state yet: send the code again.
      if (m.row.code) conn.send({ t: "matchCreated", matchId: m.row.id, code: m.row.code });
      return;
    }
    conn.send({ t: "state", matchId: m.row.id, seat, names: this.names(m.row), seq: m.seq, view, events: m.lastEvents[seat], deadline: m.deadline });
  }

  /** Sends the new view to every connection of the two players. */
  private broadcast(m: LiveMatch): void {
    for (const s of this.sessions.values()) {
      if (!s.playerId) continue;
      const seat = m.seatOf(s.playerId);
      if (seat !== null) this.sendState(s.conn, m, seat);
    }
  }

  private summary(row: MatchRow, me: string): MatchSummary {
    const seat: PlayerId = row.players[1] === me ? 1 : 0;
    const foe = row.players[seat === 0 ? 1 : 0];
    return {
      matchId: row.id,
      code: row.code,
      status: row.status,
      seat,
      opponent: foe ? this.store.playerName(foe) : null,
      winner: row.winner,
      updated: row.updated,
    };
  }
}

/** A starter deck as a card list: useful for tests and for a quick start. */
export function starterDeck(name: string): string[] {
  return expandDeck(STARTER_DECKS[name]!);
}
