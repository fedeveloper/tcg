import { other } from "./core.ts";
import type { GameEvent, GameState, PlayerId } from "./types.ts";

/** The card id that replaces a secret card in a player view. */
export const HIDDEN_CARD = "hidden";

/**
 * The game state as one player sees it.
 * The function hides the opponent's hand, both decks and the random generator state.
 */
export function viewFor(state: GameState, player: PlayerId): GameState {
  const view: GameState = structuredClone(state);
  const foe = other(player);
  const secret = [...view.players[foe].hand, ...view.players[0].deck, ...view.players[1].deck];
  for (const id of secret) {
    const c = view.cards[id];
    if (c) c.cardId = HIDDEN_CARD;
  }
  // The deck order is secret too: sort the ids so the order gives no information.
  for (const p of [0, 1] as const) view.players[p].deck.sort();
  view.rng = 0;
  view.seed = 0;
  return view;
}

/** The events as one player sees them. The opponent's draws are hidden. */
export function eventsFor(events: readonly GameEvent[], player: PlayerId): GameEvent[] {
  return events.map((e) => {
    if (e.type === "CardDrawn" && e.player !== player) return { ...e, cardId: HIDDEN_CARD };
    return e;
  });
}
