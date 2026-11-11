import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from "@tcg/protocol";

/** Address of the PvP server. VITE_SERVER_URL wins; otherwise the same host on /ws (Caddy), or port 8787 in development. */
export function serverUrl(): string {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  if (typeof env.VITE_SERVER_URL === "string" && env.VITE_SERVER_URL) return env.VITE_SERVER_URL;
  const secure = location.protocol === "https:";
  if (env.DEV) return `ws://${location.hostname}:8787/ws`;
  return `${secure ? "wss" : "ws"}://${location.host}/ws`;
}

const TOKEN_KEY = "tcg.online.token";
const NAME_KEY = "tcg.online.name";

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private window: the account lives only in this page.
  }
}

export type ConnectionStatus = "connecting" | "online" | "offline";

/** The smallest WebSocket surface that the client uses. Tests give a fake one. */
export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
}

/**
 * One connection to the PvP server. It logs in with the saved guest token,
 * and it reconnects by itself (1 s, 2 s, 4 s ... 15 s). After a reconnection it asks again for the open match.
 */
export class OnlineClient {
  status: ConnectionStatus = "offline";
  name = read(NAME_KEY);
  playerId = "";
  /** The match to resume after a reconnection. */
  activeMatch: string | null = null;
  private socket: SocketLike | null = null;
  private listeners = new Set<(msg: ServerMessage) => void>();
  private statusListeners = new Set<(s: ConnectionStatus) => void>();
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private outbox: ClientMessage[] = [];

  constructor(
    private readonly url: string = serverUrl(),
    private readonly makeSocket: (url: string) => SocketLike = (u) => new WebSocket(u) as unknown as SocketLike,
  ) {}

  onMessage(fn: (msg: ServerMessage) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  connect(name?: string): void {
    if (name !== undefined) {
      this.name = name;
      write(NAME_KEY, name);
    }
    this.closed = false;
    if (this.socket) return;
    this.setStatus("connecting");
    const ws = this.makeSocket(this.url);
    this.socket = ws;
    ws.onopen = () => {
      this.retry = 0;
      const token = read(TOKEN_KEY);
      this.sendNow({ t: "hello", version: PROTOCOL_VERSION, ...(token ? { token } : {}), ...(this.name ? { name: this.name } : {}) });
    };
    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }
      if (msg.t === "welcome") {
        write(TOKEN_KEY, msg.token);
        this.playerId = msg.playerId;
        this.name = msg.name;
        this.setStatus("online");
        if (this.activeMatch) this.sendNow({ t: "resume", matchId: this.activeMatch });
        for (const m of this.outbox.splice(0)) this.sendNow(m);
      }
      for (const fn of this.listeners) fn(msg);
    };
    ws.onclose = () => {
      this.socket = null;
      this.setStatus("offline");
      if (this.closed) return;
      const delay = Math.min(15_000, 1000 * 2 ** this.retry++);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.connect();
      }, delay);
    };
  }

  /** Sends now when the player is logged in; otherwise after the next "welcome". */
  send(msg: ClientMessage): void {
    if (this.status === "online") this.sendNow(msg);
    else this.outbox.push(msg);
  }

  private sendNow(msg: ClientMessage): void {
    if (this.socket && this.socket.readyState === 1) this.socket.send(JSON.stringify(msg));
  }

  private setStatus(s: ConnectionStatus): void {
    this.status = s;
    for (const fn of this.statusListeners) fn(s);
  }

  close(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.socket?.close();
    this.socket = null;
    this.setStatus("offline");
  }
}
