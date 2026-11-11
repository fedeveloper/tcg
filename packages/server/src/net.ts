import { createServer, type Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { MAX_MESSAGE_BYTES, parseClientMessage, type ServerMessage } from "@tcg/protocol";
import type { ServerConfig } from "./config.ts";
import { GameServer, type Connection } from "./gameServer.ts";
import { Store } from "./store.ts";

/** Messages per connection in one window. Above the limit the server answers with an error. */
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 10_000;

export interface RunningServer {
  http: Server;
  game: GameServer;
  store: Store;
  port: number;
  close(): Promise<void>;
}

/**
 * Starts the HTTP and WebSocket server. Caddy serves the static client and forwards /ws here (plan, section 6.7).
 * GET /health answers "ok", the open matches and the memory (RSS) for the monitoring.
 */
export function startServer(config: ServerConfig): Promise<RunningServer> {
  const store = new Store(config.dbPath);
  const game = new GameServer(store, config);
  const http = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "text/plain" });
      const rss = Math.round(process.memoryUsage().rss / 1048576);
      res.end(`ok matches=${game.liveMatches} rss=${rss}MB uptime=${Math.round(process.uptime())}s\n`);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const wss = new WebSocketServer({
    server: http,
    path: "/ws",
    maxPayload: MAX_MESSAGE_BYTES,
    verifyClient: ({ origin }: { origin: string }) => config.allowedOrigins.length === 0 || config.allowedOrigins.includes(origin),
  });

  wss.on("connection", (ws: WebSocket) => {
    const conn: Connection = {
      send: (msg: ServerMessage) => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
      },
    };
    let windowStart = Date.now();
    let count = 0;
    game.connect(conn);
    ws.on("message", (data) => {
      const now = Date.now();
      if (now - windowStart > RATE_WINDOW_MS) {
        windowStart = now;
        count = 0;
      }
      if (++count > RATE_LIMIT) return conn.send({ t: "error", code: "rateLimited", message: "Too many messages." });
      const msg = parseClientMessage(String(data));
      if (!msg) return conn.send({ t: "error", code: "badMessage", message: "The message is not valid." });
      try {
        game.handle(conn, msg);
      } catch (e) {
        console.error("handler error", e);
        conn.send({ t: "error", code: "busy", message: "Server error." });
      }
    });
    ws.on("close", () => game.disconnect(conn));
    ws.on("error", () => game.disconnect(conn));
  });

  return new Promise((resolve) => {
    http.listen(config.port, config.host, () => {
      const addr = http.address();
      const port = typeof addr === "object" && addr ? addr.port : config.port;
      resolve({
        http,
        game,
        store,
        port,
        close: () =>
          new Promise<void>((done) => {
            game.stop();
            for (const c of wss.clients) c.terminate();
            wss.close();
            http.close(() => {
              store.close();
              done();
            });
          }),
      });
    });
  });
}
