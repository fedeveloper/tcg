/**
 * PvP soak test: plays many matches through the GameServer with two players that see only their own views.
 * Exit criterion of phase 4 (plan, section 10): 100 PvP matches without synchronization errors.
 *
 * A synchronization error is one of these:
 * - the server refuses an action that the client computed as legal from its view;
 * - a view that the client received differs from the view rebuilt from the replay;
 * - the replay does not rebuild the same end of the match.
 */
import { AiRandom, chooseAction } from "@tcg/ai";
import { expandDeck, STARTER_DECKS } from "@tcg/cards";
import { legalActions, newGame, viewFor, type Action, type GameState, type PlayerId } from "@tcg/engine";
import { PROTOCOL_VERSION, type ServerMessage } from "@tcg/protocol";
import type { ServerConfig } from "./config.ts";
import { GameServer, type Clock, type Connection } from "./gameServer.ts";
import { applyStep } from "./match.ts";
import { Store } from "./store.ts";

export interface SoakOptions {
  games: number;
  seed: number;
  /** Every n-th match, a player disconnects and resumes in the middle of the match. */
  reconnectEvery?: number;
}

export interface SoakReport {
  games: number;
  actions: number;
  wins: [number, number];
  draws: number;
  reconnections: number;
  errors: string[];
}

type StateMsg = Extract<ServerMessage, { t: "state" }>;

class Client implements Connection {
  inbox: ServerMessage[] = [];
  /** The views by sequence number, as the client received them. */
  views = new Map<number, GameState>();
  send(msg: ServerMessage): void {
    // The server builds a new view for every message, so the client can keep it without a copy.
    const copy = msg;
    this.inbox.push(copy);
    if (copy.t === "state") this.views.set(copy.seq, copy.view);
  }
  last<T extends ServerMessage["t"]>(t: T): Extract<ServerMessage, { t: T }> | undefined {
    for (let i = this.inbox.length - 1; i >= 0; i--) if (this.inbox[i]!.t === t) return this.inbox[i] as Extract<ServerMessage, { t: T }>;
    return undefined;
  }
  errors(): string[] {
    return this.inbox.filter((m): m is Extract<ServerMessage, { t: "error" }> => m.t === "error").map((m) => `${m.code}: ${m.message}`);
  }
}

const noClock: Clock = { now: () => 0, setTimeout: () => 0, clearTimeout: () => {} };
const CONFIG: ServerConfig = { port: 0, host: "", dbPath: ":memory:", allowedOrigins: [], turnSeconds: 120, maxTimeouts: 3 };

/** The client chooses only from its view: the easy AI, or a random legal action when the AI fails on hidden cards. */
function choose(view: GameState, rng: AiRandom): Action {
  try {
    return chooseAction(view, "easy", rng);
  } catch {
    const options = legalActions(view);
    return options[rng.int(options.length)]!;
  }
}

export function runSoak(opts: SoakOptions): SoakReport {
  const store = new Store(":memory:");
  const server = new GameServer(store, CONFIG, noClock);
  const report: SoakReport = { games: 0, actions: 0, wins: [0, 0], draws: 0, reconnections: 0, errors: [] };
  const deckNames = Object.keys(STARTER_DECKS);
  const rng = new AiRandom(opts.seed);

  let a = new Client();
  const b = new Client();
  server.connect(a);
  server.connect(b);
  server.handle(a, { t: "hello", version: PROTOCOL_VERSION, name: "Soak A" });
  server.handle(b, { t: "hello", version: PROTOCOL_VERSION, name: "Soak B" });
  const tokenA = a.last("welcome")!.token;

  for (let g = 0; g < opts.games; g++) {
    const fail = (msg: string) => report.errors.push(`match ${g}: ${msg}`);
    for (const c of [a, b]) {
      c.inbox = [];
      c.views.clear();
    }
    const deckA = expandDeck(STARTER_DECKS[deckNames[g % deckNames.length]!]!);
    const deckB = expandDeck(STARTER_DECKS[deckNames[Math.floor(g / deckNames.length) % deckNames.length]!]!);
    // Half of the matches use the queue, half a private code.
    let matchId: string;
    if (g % 2 === 0) {
      server.handle(a, { t: "createMatch", deck: deckA });
      const created = a.last("matchCreated")!;
      server.handle(b, { t: "joinMatch", code: created.code, deck: deckB });
      matchId = created.matchId;
    } else {
      server.handle(a, { t: "queue", deck: deckA });
      server.handle(b, { t: "queue", deck: deckB });
      matchId = b.last("state")!.matchId;
    }

    let reconnected = false;
    let steps = 0;
    for (;;) {
      const sa = a.last("state");
      const sb = b.last("state");
      if (!sa || !sb) {
        fail("a player has no view");
        break;
      }
      if (sa.seq !== sb.seq) {
        fail(`the players see different sequence numbers: ${sa.seq} and ${sb.seq}`);
        break;
      }
      if (sa.view.phase === "over") break;
      if (steps++ > 5000) {
        fail("the match did not end");
        break;
      }
      // A disconnection in the middle of the match: a new connection with the same token resumes it.
      if (opts.reconnectEvery && g % opts.reconnectEvery === 0 && !reconnected && sa.seq > 20) {
        reconnected = true;
        report.reconnections++;
        server.disconnect(a);
        const fresh = new Client();
        fresh.views = a.views;
        a = fresh;
        server.connect(a);
        server.handle(a, { t: "hello", version: PROTOCOL_VERSION, token: tokenA });
        server.handle(a, { t: "resume", matchId });
        const resumed = a.last("state");
        if (!resumed || resumed.seq !== sb.seq) fail("the resume did not give the current view");
        continue;
      }
      const mover: Client = sa.view.turn === sa.seat ? a : b;
      const st = mover.last("state") as StateMsg;
      const before = mover.inbox.length;
      server.handle(mover, { t: "action", matchId, seq: st.seq, action: choose(st.view, rng) });
      report.actions++;
      const errs = mover.inbox.slice(before).filter((m) => m.t === "error");
      if (errs.length > 0) {
        fail(`the server refused a legal action: ${JSON.stringify(errs[0])}`);
        break;
      }
    }

    // Rebuild the match from the replay and compare every view that the players received.
    server.handle(a, { t: "replay", matchId });
    const replay = a.last("replay")?.replay;
    const end = a.last("state")!;
    if (!replay) {
      fail("no replay");
      continue;
    }
    const seatA = end.seat;
    const seatB: PlayerId = seatA === 0 ? 1 : 0;
    let state = newGame({ seed: replay.seed, decks: replay.decks }).state;
    const check = (seq: number) => {
      for (const [client, seat] of [[a, seatA], [b, seatB]] as const) {
        const got = client.views.get(seq);
        if (got && JSON.stringify(got) !== JSON.stringify(viewFor(state, seat))) fail(`the view of seat ${seat} at step ${seq} differs from the replay`);
      }
    };
    check(0);
    replay.steps.forEach((s, i) => {
      state = applyStep(state, s).state;
      check(i + 1);
    });
    if (JSON.stringify(state.outcome) !== JSON.stringify(end.view.outcome)) fail("the replay ends with another outcome");

    report.games++;
    const w = end.view.outcome?.winner;
    if (w === null || w === undefined) report.draws++;
    else report.wins[w === seatA ? 0 : 1]++;
  }
  return report;
}
