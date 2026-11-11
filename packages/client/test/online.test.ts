import { describe, expect, it } from "vitest";
import type { Action } from "@tcg/engine";
import { parseClientMessage, type ServerMessage } from "@tcg/protocol";
import { GameServer, starterDeck, Store, type Clock, type Connection } from "@tcg/server";
import { OnlineClient, type SocketLike } from "../src/online/connection.ts";
import { RemoteSession } from "../src/online/remoteSession.ts";

const clock: Clock = { now: () => Date.now(), setTimeout: () => 0, clearTimeout: () => {} };
const config = { port: 0, host: "", dbPath: ":memory:", allowedOrigins: [], turnSeconds: 120, maxTimeouts: 3 };

/** A socket that talks to a GameServer in the same process, with asynchronous delivery like a real network. */
function fakeSocket(server: GameServer): SocketLike {
  const sock: SocketLike = { readyState: 1, onopen: null, onclose: null, onmessage: null, send: () => {}, close: () => {} };
  const conn: Connection = { send: (msg: ServerMessage) => setTimeout(() => sock.onmessage?.({ data: JSON.stringify(msg) })) };
  server.connect(conn);
  sock.send = (data) => {
    const msg = parseClientMessage(data);
    if (msg) setTimeout(() => server.handle(conn, msg));
  };
  sock.close = () => server.disconnect(conn);
  setTimeout(() => sock.onopen?.({}));
  return sock;
}

const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(cond: () => boolean, max = 200): Promise<void> {
  for (let i = 0; i < max && !cond(); i++) await tick();
  expect(cond()).toBe(true);
}

function firstState(client: OnlineClient) {
  return new Promise<Extract<ServerMessage, { t: "state" }>>((resolve) => {
    const off = client.onMessage((m) => {
      if (m.t === "state") {
        off();
        resolve(m);
      }
    });
  });
}

/** Keeps the hand, plays the first non-Pass action once in a while, otherwise passes. */
function pick(actions: Action[], n: number): Action {
  const keep = actions.find((a) => a.type === "Mulligan" && a.cards.length === 0);
  if (keep) return keep;
  const play = actions.filter((a) => a.type !== "Pass" && a.type !== "Concede");
  if (play.length > 0 && n % 3 === 0) return play[n % play.length]!;
  return actions.find((a) => a.type === "Pass") ?? actions[0]!;
}

describe("online client", () => {
  it("plays a private match through the server with two remote sessions", async () => {
    const server = new GameServer(new Store(":memory:"), config, clock);
    const a = new OnlineClient("ws://test", () => fakeSocket(server));
    const b = new OnlineClient("ws://test", () => fakeSocket(server));
    a.connect("Ada");
    b.connect("Bruno");
    await until(() => a.status === "online" && b.status === "online");

    const code = new Promise<string>((resolve) => a.onMessage((m) => m.t === "matchCreated" && resolve(m.code)));
    a.send({ t: "createMatch", deck: starterDeck("forge") });
    const sa = firstState(a);
    const sb = firstState(b);
    b.send({ t: "joinMatch", code: await code, deck: starterDeck("vesper") });

    let steps = 0;
    const hooks = { onStep: () => void steps++ };
    const ra = new RemoteSession(a, await sa).attach(hooks);
    const rb = new RemoteSession(b, await sb).attach(hooks);
    expect(new Set([ra.me, rb.me])).toEqual(new Set([0, 1]));
    expect(ra.names).toEqual(rb.names);
    await ra.start();
    await rb.start();

    for (let n = 0; n < 3000 && !(ra.over && rb.over); n++) {
      for (const s of [ra, rb]) {
        const actions = s.humanActions();
        if (actions.length > 0) await s.humanAct(pick(actions, n));
      }
      await tick();
    }
    expect(ra.over && rb.over).toBe(true);
    expect(ra.state.outcome).toEqual(rb.state.outcome);
    expect(steps).toBeGreaterThan(10);
    // The views stay secret: the opponent hand is hidden.
    const foeHand = ra.state.players[ra.me === 0 ? 1 : 0].hand;
    expect(foeHand.every((id) => ra.state.cards[id]!.cardId === "hidden")).toBe(true);
    ra.dispose();
    rb.dispose();
    a.close();
    b.close();
  });
});
