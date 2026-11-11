/** Server settings from environment variables (plan, section 6.7). */
export interface ServerConfig {
  port: number;
  host: string;
  /** Path of the SQLite file. ":memory:" keeps the data in RAM (tests). */
  dbPath: string;
  /** Allowed browser origins, separated by commas. Empty: every origin. */
  allowedOrigins: string[];
  /** Time limit for one decision, in seconds. */
  turnSeconds: number;
  /** After this many timeouts in a row, the player loses the match. */
  maxTimeouts: number;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    port: num(env.PORT, 8787),
    host: env.HOST ?? "127.0.0.1",
    dbPath: env.DB_PATH ?? "tcg.sqlite",
    allowedOrigins: (env.ALLOWED_ORIGIN ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    turnSeconds: num(env.TURN_SECONDS, 120),
    maxTimeouts: num(env.MAX_TIMEOUTS, 3),
  };
}
