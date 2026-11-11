import { z } from "zod";
import type { Action, GameEvent, GameState, PlayerId } from "@tcg/engine";

/**
 * Network messages between the browser and the PvP server (plan, section 6.6).
 * Zod checks every message that the server receives. The server never trusts the client.
 */

export const PROTOCOL_VERSION = 1;
/** The server closes a connection that sends a bigger message. */
export const MAX_MESSAGE_BYTES = 16_384;
export const NAME_MAX = 20;

const Lane = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const Slot = z.object({ lane: Lane, row: z.enum(["front", "back"]) }).strict();
const Id = z.string().min(1).max(32);
const TargetSchema = z.union([
  z.object({ kind: z.literal("keeper"), id: Id }).strict(),
  z.object({ kind: z.literal("beacon"), player: z.union([z.literal(0), z.literal(1)]), lane: Lane }).strict(),
]);

/** The shape of an engine action. The engine checks if the action is legal. */
export const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Mulligan"), cards: z.array(Id).max(8) }).strict(),
  z
    .object({
      type: z.literal("PlayCard"),
      card: Id,
      slot: Slot.optional(),
      lane: Lane.optional(),
      targets: z.array(TargetSchema).max(3),
      sacrifice: z.array(Id).max(3).optional(),
    })
    .strict(),
  z.object({ type: z.literal("Move"), keeper: Id, to: Slot }).strict(),
  z.object({ type: z.literal("Activate"), source: Id, ability: z.number().int().min(0).max(3), targets: z.array(TargetSchema).max(3) }).strict(),
  z.object({ type: z.literal("Pass") }).strict(),
  z.object({ type: z.literal("Concede") }).strict(),
]);

const Deck = z.array(z.string().min(1).max(32)).min(1).max(40);
const MatchCode = z.string().regex(/^[A-Z0-9]{6}$/);
const MatchId = z.string().min(1).max(40);

export const ClientMessage = z.discriminatedUnion("t", [
  /** First message. With a token the server finds the account; without one it creates a guest account. */
  z.object({ t: z.literal("hello"), version: z.number().int(), token: z.string().max(128).optional(), name: z.string().max(40).optional() }).strict(),
  /** A private match: the server answers with a code for the friend. */
  z.object({ t: z.literal("createMatch"), deck: Deck }).strict(),
  z.object({ t: z.literal("joinMatch"), code: MatchCode, deck: Deck }).strict(),
  /** Quick match: the server pairs the first two players in the queue. */
  z.object({ t: z.literal("queue"), deck: Deck }).strict(),
  z.object({ t: z.literal("leaveQueue") }).strict(),
  /** seq is the number of actions that the client knows. The server refuses an old action. */
  z.object({ t: z.literal("action"), matchId: MatchId, seq: z.number().int().min(0), action: ActionSchema }).strict(),
  z.object({ t: z.literal("concede"), matchId: MatchId }).strict(),
  /** Asks for the current view of a match (after a reconnection). */
  z.object({ t: z.literal("resume"), matchId: MatchId }).strict(),
  z.object({ t: z.literal("myMatches") }).strict(),
  z.object({ t: z.literal("replay"), matchId: MatchId }).strict(),
  z.object({ t: z.literal("ping") }).strict(),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export interface MatchSummary {
  matchId: string;
  code: string | null;
  status: "waiting" | "active" | "over";
  seat: PlayerId;
  opponent: string | null;
  winner: PlayerId | null;
  updated: number;
}

/** One recorded action. The seat matters for a concession outside the player's turn. */
export interface ReplayStep {
  seat: PlayerId;
  action: Action;
}

export interface Replay {
  matchId: string;
  seed: number;
  decks: [string[], string[]];
  names: [string, string];
  steps: ReplayStep[];
}

export type ErrorCode = "badMessage" | "notLoggedIn" | "badDeck" | "noMatch" | "notYourTurn" | "illegal" | "stale" | "busy" | "rateLimited" | "version";

export type ServerMessage =
  | { t: "welcome"; playerId: string; name: string; token: string }
  | { t: "error"; code: ErrorCode; message: string }
  | { t: "matchCreated"; matchId: string; code: string }
  | { t: "queued" }
  | {
      t: "state";
      matchId: string;
      seat: PlayerId;
      names: [string, string];
      /** Number of actions applied so far. The next action must carry this number. */
      seq: number;
      view: GameState;
      /** The events of the last action, from the point of view of this player. */
      events: GameEvent[];
      /** Time limit of the player to act, in milliseconds since 1970, or null. */
      deadline: number | null;
    }
  | { t: "myMatches"; matches: MatchSummary[] }
  | { t: "replay"; replay: Replay }
  | { t: "pong" };

/** Parses a raw text message. Returns null if the text is not a valid client message. */
export function parseClientMessage(text: string): ClientMessage | null {
  if (text.length > MAX_MESSAGE_BYTES) return null;
  try {
    const r = ClientMessage.safeParse(JSON.parse(text));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Removes control characters and extra spaces from a player name. */
export function cleanName(raw: string | undefined): string {
  const s = (raw ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
  return s || "Guest";
}
