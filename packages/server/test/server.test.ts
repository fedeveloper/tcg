import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { legalActions, type Action, type GameState } from "@tcg/engine";
import { PROTOCOL_VERSION, type ServerMessage } from "@tcg/protocol";
import { GameServer, replayGame, starterDeck, startServer, Store, type Clock, type Connection, type ServerConfig } from "../src/index.ts";

const CONFIG: ServerConfig = { port: 0, host: "127.0.0.1", dbPath: ":memory:", allowedOrigins: [], turnSeconds: 60, maxTimeouts: 3 };

class FakeConn implements Connection {
  inbox: ServerMessage[] = [];
  send(msg: ServerMessage): void {
    this.inbox.push(structuredClone(msg));
  }
  last<T extends ServerMessage["t"]>(t: T): Extract<ServerMessage, { t: T }> | undefined {
    return [...this.inbox].reverse().find((m) => m.t === t) as Extract<ServerMessage, { t: T }> | undefined;
  }
}

class FakeClock implements Clock {
  t = 1_000_000;
  pending = new Map<number, () => void>();
  private next = 1;
  now() {
    return this.t;
  }
  setTimeout(f: () => void) {
    const id = this.next++;
    this.pending.set(id, f);
    return id;
  }
  clearTimeout(h: unknown) {
    this.pending.delete(h as number);
  }
  fireAll() {
    const fs = [...this.pending.values()];
    this.pending.clear();
    for (const f of fs) f();
  }
}

function setup(store = new Store(":memory:"), clock = new FakeClock()) {
  const server = new GameServer(store, CONFIG, clock);
  const a = new FakeConn();
  const b = new FakeConn();
  server.connect(a);
  server.connect(b);
  server.handle(a, { t: "hello", version: PROTOCOL_VERSION, name: "Ada" });
  server.handle(b, { t: "hello", version: PROTOCOL_VERSION, name: "Bruno" });
  return { server, store, clock, a, b };
}

function startMatch(env: ReturnType<typeof setup>) {
  env.server.handle(env.a, { t: "createMatch", deck: starterDeck("forge") });
  const created = env.a.last("matchCreated")!;
  env.server.handle(env.b, { t: "joinMatch", code: created.code, deck: starterDeck("sprout") });
  return created.matchId;
}

/** Plays random legal actions from the player views until the game ends. */
function playOut(env: ReturnType<typeof setup>, matchId: string, seed = 1): GameState {
  let r = seed;
  const rnd = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < 4000; i++) {
    const sa = env.a.last("state")!;
    if (sa.view.phase === "over") return sa.view;
    const conn = sa.view.turn === sa.seat ? env.a : env.b;
    const st = conn.last("state")!;
    // Prefer non-pass actions sometimes, so the game moves on.
    const options = legalActions(st.view);
    const action: Action = options[Math.floor(rnd() * options.length)]!;
    env.server.handle(conn, { t: "action", matchId, seq: st.seq, action });
  }
  throw new Error("the match did not end");
}

describe("game server", () => {
  it("creates guest accounts and finds them again with the token", () => {
    const { server, a } = setup();
    const w = a.last("welcome")!;
    expect(w.name).toBe("Ada");
    const again = new FakeConn();
    server.connect(again);
    server.handle(again, { t: "hello", version: PROTOCOL_VERSION, token: w.token });
    expect(again.last("welcome")!.playerId).toBe(w.playerId);
  });

  it("refuses an old protocol and messages before hello", () => {
    const { server } = setup();
    const c = new FakeConn();
    server.connect(c);
    server.handle(c, { t: "myMatches" });
    expect(c.last("error")!.code).toBe("notLoggedIn");
    server.handle(c, { t: "hello", version: 999 });
    expect(c.last("error")!.code).toBe("version");
  });

  it("refuses a deck that breaks the deck rules", () => {
    const { server, a } = setup();
    server.handle(a, { t: "createMatch", deck: ["forge-001", "forge-001", "forge-001"] });
    expect(a.last("error")!.code).toBe("badDeck");
  });

  it("plays a full match and stores a replay that rebuilds the same game", () => {
    const env = setup();
    const matchId = startMatch(env);
    const first = env.a.last("state")!;
    const oppHand = first.view.players[first.seat === 0 ? 1 : 0].hand;
    expect(oppHand.every((id) => first.view.cards[id]!.cardId === "hidden")).toBe(true);
    const end = playOut(env, matchId);
    expect(end.outcome).not.toBeNull();
    env.server.handle(env.a, { t: "replay", matchId });
    const rep = env.a.last("replay")!.replay;
    const rebuilt = replayGame(rep.seed, rep.decks, rep.steps);
    expect(rebuilt.outcome).toEqual(end.outcome);
    expect(rebuilt.round).toBe(end.round);
    env.server.handle(env.b, { t: "myMatches" });
    expect(env.b.last("myMatches")!.matches[0]!.status).toBe("over");
  });

  it("refuses stale, illegal and out-of-turn actions", () => {
    const env = setup();
    const matchId = startMatch(env);
    const st = env.a.last("state")!;
    const mine = st.view.turn === st.seat;
    const actor = mine ? env.a : env.b;
    const waiter = mine ? env.b : env.a;
    const seq = actor.last("state")!.seq;
    env.server.handle(waiter, { t: "action", matchId, seq, action: { type: "Pass" } });
    expect(waiter.last("error")!.code).toBe("notYourTurn");
    env.server.handle(actor, { t: "action", matchId, seq: seq + 5, action: { type: "Pass" } });
    expect(actor.last("error")!.code).toBe("stale");
    env.server.handle(actor, { t: "action", matchId, seq, action: { type: "Move", keeper: "c1", to: { lane: 0, row: "front" } } });
    expect(actor.last("error")!.code).toBe("illegal");
  });

  it("plays Pass after a timeout and ends the match after too many timeouts", () => {
    const env = setup();
    const matchId = startMatch(env);
    const before = env.a.last("state")!.seq;
    env.clock.fireAll();
    expect(env.a.last("state")!.seq).toBe(before + 1);
    for (let i = 0; i < 20 && env.a.last("state")!.view.phase !== "over"; i++) env.clock.fireAll();
    const end = env.a.last("state")!.view;
    expect(end.phase).toBe("over");
    expect(end.outcome!.reason).toBe("concede");
    env.server.handle(env.a, { t: "resume", matchId });
    expect(env.a.last("error")!.code).toBe("noMatch");
  });

  it("lets a player concede outside their turn", () => {
    const env = setup();
    const matchId = startMatch(env);
    const st = env.a.last("state")!;
    const waiter = st.view.turn === st.seat ? env.b : env.a;
    env.server.handle(waiter, { t: "concede", matchId });
    expect(env.a.last("state")!.view.outcome!.reason).toBe("concede");
    expect(env.a.last("state")!.view.outcome!.winner).toBe(waiter === env.a ? 1 - st.seat : st.seat);
  });

  it("restores an active match after a restart", () => {
    const env = setup();
    const matchId = startMatch(env);
    const st = env.a.last("state")!;
    const actor = st.view.turn === st.seat ? env.a : env.b;
    env.server.handle(actor, { t: "action", matchId, seq: st.seq, action: { type: "Mulligan", cards: [] } });
    env.server.stop();
    const server2 = new GameServer(env.store, CONFIG, new FakeClock());
    const c = new FakeConn();
    server2.connect(c);
    server2.handle(c, { t: "hello", version: PROTOCOL_VERSION, token: env.a.last("welcome")!.token });
    server2.handle(c, { t: "resume", matchId });
    expect(c.last("state")!.seq).toBe(1);
    expect(c.last("state")!.view).toEqual(env.a.last("state")!.view);
  });

  it("pairs two players in the quick match queue", () => {
    const env = setup();
    env.server.handle(env.a, { t: "queue", deck: starterDeck("gear") });
    expect(env.a.last("queued")).toBeDefined();
    env.server.handle(env.b, { t: "queue", deck: starterDeck("vesper") });
    expect(env.a.last("state")!.matchId).toBe(env.b.last("state")!.matchId);
  });

  it("keeps 10 simulated matches under 200 MB (plan, section 6.7)", () => {
    const before = process.memoryUsage().heapUsed;
    const envs = Array.from({ length: 10 }, () => setup());
    const ids = envs.map((e) => startMatch(e));
    envs.forEach((e, i) => playOut(e, ids[i]!, i + 3));
    const used = (process.memoryUsage().heapUsed - before) / 1024 / 1024;
    expect(used).toBeLessThan(200);
  });
});

describe("WebSocket server", () => {
  let close: (() => Promise<void>) | null = null;
  afterEach(async () => {
    await close?.();
    close = null;
  });

  function client(port: number): Promise<{ ws: WebSocket; inbox: ServerMessage[]; wait: (t: string) => Promise<ServerMessage> }> {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const inbox: ServerMessage[] = [];
      const waiters: { t: string; f: (m: ServerMessage) => void }[] = [];
      ws.on("message", (d) => {
        const m = JSON.parse(String(d)) as ServerMessage;
        inbox.push(m);
        const i = waiters.findIndex((w) => w.t === m.t);
        if (i >= 0) waiters.splice(i, 1)[0]!.f(m);
      });
      const wait = (t: string) =>
        new Promise<ServerMessage>((res) => {
          const found = inbox.find((m) => m.t === t);
          if (found) {
            inbox.splice(inbox.indexOf(found), 1);
            res(found);
          } else waiters.push({ t, f: res });
        });
      ws.on("open", () => resolve({ ws, inbox, wait }));
    });
  }

  it("connects two browsers and starts a quick match", async () => {
    const s = await startServer(CONFIG);
    close = s.close;
    const a = await client(s.port);
    const b = await client(s.port);
    a.ws.send(JSON.stringify({ t: "hello", version: PROTOCOL_VERSION, name: "A" }));
    b.ws.send(JSON.stringify({ t: "hello", version: PROTOCOL_VERSION, name: "B" }));
    await a.wait("welcome");
    await b.wait("welcome");
    a.ws.send("not json");
    expect(((await a.wait("error")) as { code: string }).code).toBe("badMessage");
    a.ws.send(JSON.stringify({ t: "queue", deck: starterDeck("forge") }));
    await a.wait("queued");
    b.ws.send(JSON.stringify({ t: "queue", deck: starterDeck("abyss") }));
    const sa = (await a.wait("state")) as Extract<ServerMessage, { t: "state" }>;
    const sb = (await b.wait("state")) as Extract<ServerMessage, { t: "state" }>;
    expect(sa.matchId).toBe(sb.matchId);
    expect(sa.seat).not.toBe(sb.seat);
    expect(sa.names).toEqual(sb.names);
    a.ws.close();
    b.ws.close();
  });
});
