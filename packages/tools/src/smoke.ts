/**
 * Smoke and load test of an installed PvP server, through the real WebSocket connection.
 * It opens 2 guest accounts for each match, pairs them with a private code and plays every match to the end.
 *
 * Usage: pnpm smoke [--url ws://raspberrypi.local/ws] [--matches 1] [--seed 1]
 * With --matches 10 it checks the plan budget: 10 active matches at the same time.
 * The server accepts at most 40 messages in 10 s for each connection, so each player waits --pace ms between two actions.
 */
import { parseArgs } from "node:util";
import { AiRandom, chooseAction } from "@tcg/ai";
import { expandDeck, STARTER_DECKS } from "@tcg/cards";
import { legalActions, type Action, type GameState } from "@tcg/engine";
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from "@tcg/protocol";

type StateMsg = Extract<ServerMessage, { t: "state" }>;

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "ws://127.0.0.1:8787/ws" },
    matches: { type: "string", default: "1" },
    seed: { type: "string", default: "1" },
    timeout: { type: "string", default: "600" },
    pace: { type: "string", default: "260" },
  },
});
const url = values.url!;
const matches = Number(values.matches);
const rng = new AiRandom(Number(values.seed));
const latencies: number[] = [];

/** One player: a WebSocket with a queue of received messages. */
class Player {
  ws: WebSocket;
  inbox: ServerMessage[] = [];
  private waiters: Array<{ test: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }> = [];
  sentAt = 0;
  lastSend = 0;
  state: StateMsg | null = null;

  constructor(name: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data)) as ServerMessage;
      if (msg.t === "state") {
        if (this.sentAt) latencies.push(performance.now() - this.sentAt);
        this.sentAt = 0;
        this.state = msg;
      }
      this.inbox.push(msg);
      this.waiters = this.waiters.filter((w) => (w.test(msg) ? (w.resolve(msg), false) : true));
    };
    this.ws.onopen = () => this.send({ t: "hello", version: PROTOCOL_VERSION, name });
  }

  send(msg: ClientMessage): void {
    this.ws.send(JSON.stringify(msg));
  }

  next<T extends ServerMessage["t"]>(t: T): Promise<Extract<ServerMessage, { t: T }>> {
    const found = this.inbox.find((m) => m.t === t);
    if (found) {
      this.inbox.splice(this.inbox.indexOf(found), 1);
      return Promise.resolve(found as Extract<ServerMessage, { t: T }>);
    }
    return new Promise((resolve) => this.waiters.push({ test: (m) => m.t === t, resolve: resolve as (m: ServerMessage) => void }));
  }
}

function choose(view: GameState): Action {
  try {
    return chooseAction(view, "easy", rng);
  } catch {
    const options = legalActions(view);
    return options[rng.int(options.length)]!;
  }
}

async function playMatch(n: number): Promise<{ outcome: string; actions: number }> {
  const names = Object.keys(STARTER_DECKS);
  const a = new Player(`Smoke ${n}A`);
  const b = new Player(`Smoke ${n}B`);
  await Promise.all([a.next("welcome"), b.next("welcome")]);
  a.send({ t: "createMatch", deck: expandDeck(STARTER_DECKS[names[n % names.length]!]!) });
  const { code, matchId } = await a.next("matchCreated");
  b.send({ t: "joinMatch", code, deck: expandDeck(STARTER_DECKS[names[(n + 1) % names.length]!]!) });
  await Promise.all([a.next("state"), b.next("state")]);
  let actions = 0;
  for (;;) {
    const sa = a.state!;
    const sb = b.state!;
    if (sa.view.phase === "over" && sb.view.phase === "over") {
      a.ws.close();
      b.ws.close();
      const w = sa.view.outcome?.winner;
      return { outcome: w === null || w === undefined ? "draw" : w === sa.seat ? "A" : "B", actions };
    }
    const errors = [...a.inbox, ...b.inbox].filter((m) => m.t === "error");
    if (errors.length > 0) throw new Error(`match ${n}: ${JSON.stringify(errors[0])}`);
    if (sa.seq !== sb.seq) {
      // One player has not received the last view yet.
      await new Promise((r) => setTimeout(r, 5));
      continue;
    }
    const mover = sa.view.turn === sa.seat ? a : b;
    const wait = mover.lastSend + Number(values.pace) - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const st = mover.state!;
    mover.lastSend = performance.now();
    mover.sentAt = performance.now();
    mover.send({ t: "action", matchId, seq: st.seq, action: choose(st.view) });
    actions++;
    const seq = st.seq;
    while (a.state!.seq === seq || b.state!.seq === seq) {
      await new Promise((r) => setTimeout(r, 2));
      if ([...a.inbox, ...b.inbox].some((m) => m.t === "error")) break;
    }
  }
}

async function health(): Promise<string> {
  const http = url.replace(/^ws/, "http").replace(/\/ws$/, "/health");
  try {
    return (await (await fetch(http)).text()).trim();
  } catch (e) {
    return `not reachable (${(e as Error).message})`;
  }
}

const start = performance.now();
console.log(`server: ${url}`);
console.log(`health before: ${await health()}`);
const timer = setTimeout(() => {
  console.error(`timeout after ${values.timeout} s`);
  process.exit(1);
}, Number(values.timeout) * 1000);
const results = await Promise.allSettled(Array.from({ length: matches }, (_, i) => playMatch(i)));
const peak = await health();
clearTimeout(timer);

const ok = results.filter((r) => r.status === "fulfilled");
const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
latencies.sort((x, y) => x - y);
const pct = (p: number) => (latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))]!.toFixed(1) : "-");
const total = ok.reduce((s, r) => s + (r as PromiseFulfilledResult<{ actions: number }>).value.actions, 0);
console.log(`matches: ${ok.length} finished, ${failed.length} failed, ${total} actions, ${((performance.now() - start) / 1000).toFixed(1)} s`);
console.log(`action round trip: median ${pct(50)} ms, p95 ${pct(95)} ms, max ${pct(100)} ms`);
console.log(`health after: ${peak}`);
for (const f of failed) console.error(`- ${String(f.reason)}`);
process.exit(failed.length > 0 ? 1 : 0);
