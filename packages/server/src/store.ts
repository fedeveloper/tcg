import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import type { PlayerId } from "@tcg/engine";
import type { ReplayStep } from "@tcg/protocol";

export interface PlayerRow {
  id: string;
  name: string;
}

export interface MatchRow {
  id: string;
  code: string | null;
  status: "waiting" | "active" | "over";
  seed: number;
  players: [string | null, string | null];
  decks: [string[] | null, string[] | null];
  steps: ReplayStep[];
  winner: PlayerId | null;
  reason: string | null;
  created: number;
  updated: number;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Persistent data in one SQLite file: accounts and matches.
 * The match row keeps the seed, the decks and the list of actions. They rebuild the match and the replay.
 * The server uses the SQLite module of Node.js, so there is no native dependency to build on the Raspberry Pi.
 */
export class Store {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        code TEXT,
        status TEXT NOT NULL,
        seed INTEGER NOT NULL,
        p0 TEXT, p1 TEXT,
        deck0 TEXT, deck1 TEXT,
        steps TEXT NOT NULL DEFAULT '[]',
        winner INTEGER,
        reason TEXT,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS matches_status ON matches(status);
      CREATE INDEX IF NOT EXISTS matches_p0 ON matches(p0);
      CREATE INDEX IF NOT EXISTS matches_p1 ON matches(p1);
    `);
  }

  close(): void {
    this.db.close();
  }

  createPlayer(name: string): { player: PlayerRow; token: string } {
    const id = `p_${randomBytes(9).toString("base64url")}`;
    const token = randomBytes(24).toString("base64url");
    this.db.prepare("INSERT INTO players (id, name, token_hash, created) VALUES (?, ?, ?, ?)").run(id, name, hashToken(token), Date.now());
    return { player: { id, name }, token };
  }

  playerByToken(token: string): PlayerRow | null {
    const row = this.db.prepare("SELECT id, name FROM players WHERE token_hash = ?").get(hashToken(token)) as PlayerRow | undefined;
    return row ?? null;
  }

  playerName(id: string): string | null {
    const row = this.db.prepare("SELECT name FROM players WHERE id = ?").get(id) as { name: string } | undefined;
    return row?.name ?? null;
  }

  renamePlayer(id: string, name: string): void {
    this.db.prepare("UPDATE players SET name = ? WHERE id = ?").run(name, id);
  }

  saveMatch(m: MatchRow): void {
    this.db
      .prepare(
        `INSERT INTO matches (id, code, status, seed, p0, p1, deck0, deck1, steps, winner, reason, created, updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET code = excluded.code, status = excluded.status, p0 = excluded.p0, p1 = excluded.p1,
           deck0 = excluded.deck0, deck1 = excluded.deck1, steps = excluded.steps, winner = excluded.winner,
           reason = excluded.reason, updated = excluded.updated`,
      )
      .run(
        m.id,
        m.code,
        m.status,
        m.seed,
        m.players[0],
        m.players[1],
        m.decks[0] ? JSON.stringify(m.decks[0]) : null,
        m.decks[1] ? JSON.stringify(m.decks[1]) : null,
        JSON.stringify(m.steps),
        m.winner,
        m.reason,
        m.created,
        m.updated,
      );
  }

  private toRow(r: Record<string, unknown>): MatchRow {
    const parse = (v: unknown) => (typeof v === "string" ? (JSON.parse(v) as string[]) : null);
    return {
      id: r.id as string,
      code: (r.code as string | null) ?? null,
      status: r.status as MatchRow["status"],
      seed: Number(r.seed),
      players: [(r.p0 as string | null) ?? null, (r.p1 as string | null) ?? null],
      decks: [parse(r.deck0), parse(r.deck1)],
      steps: JSON.parse(r.steps as string) as ReplayStep[],
      winner: r.winner === null || r.winner === undefined ? null : (Number(r.winner) as PlayerId),
      reason: (r.reason as string | null) ?? null,
      created: Number(r.created),
      updated: Number(r.updated),
    };
  }

  match(id: string): MatchRow | null {
    const r = this.db.prepare("SELECT * FROM matches WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return r ? this.toRow(r) : null;
  }

  /** Matches that were waiting or active when the server stopped. */
  openMatches(): MatchRow[] {
    return (this.db.prepare("SELECT * FROM matches WHERE status != 'over'").all() as Record<string, unknown>[]).map((r) => this.toRow(r));
  }

  matchesOf(playerId: string, limit = 20): MatchRow[] {
    return (
      this.db.prepare("SELECT * FROM matches WHERE p0 = ? OR p1 = ? ORDER BY updated DESC LIMIT ?").all(playerId, playerId, limit) as Record<string, unknown>[]
    ).map((r) => this.toRow(r));
  }
}
