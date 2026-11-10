import { HAND_LIMIT, holdOf, TIDE_LIMIT, BEACON_LIGHT } from "./core.ts";
import { LANES, PLAYERS, type GameState } from "./types.ts";

/**
 * Checks the rules invariants of a state. Returns a list of problems (empty if the state is valid).
 * Tests and the simulator use this function after every action.
 */
export function checkInvariants(state: GameState): string[] {
  const problems: string[] = [];
  if (state.tide < -TIDE_LIMIT || state.tide > TIDE_LIMIT) problems.push(`tide out of range: ${state.tide}`);

  const seen = new Map<string, string>();
  const place = (id: string, zone: string) => {
    if (!state.cards[id]) problems.push(`${zone} holds unknown instance ${id}`);
    const prev = seen.get(id);
    if (prev) problems.push(`instance ${id} is in ${prev} and ${zone}`);
    seen.set(id, zone);
  };

  for (const p of PLAYERS) {
    const ps = state.players[p];
    ps.deck.forEach((id) => place(id, `deck${p}`));
    ps.hand.forEach((id) => place(id, `hand${p}`));
    ps.graveyard.forEach((id) => place(id, `graveyard${p}`));
    ps.relics.forEach((id) => place(id, `relics${p}`));
    if (ps.hand.length > HAND_LIMIT) problems.push(`hand${p} has ${ps.hand.length} cards`);
    if (ps.ember < 0) problems.push(`ember${p} is negative`);
    for (const lane of LANES) {
      const light = ps.beacons[lane].light;
      if (light < 0 || light > BEACON_LIGHT) problems.push(`beacon ${p}/${lane} light ${light}`);
      for (const id of ps.board[lane]) {
        if (!id) continue;
        place(id, `board${p}`);
        const c = state.cards[id];
        if (!c) continue;
        if (c.owner !== p) problems.push(`keeper ${id} is on the wrong side`);
        if (state.phase !== "over" && c.damage >= holdOf(state, id)) problems.push(`keeper ${id} should be dead`);
      }
    }
  }
  state.sites.forEach((id) => id && place(id, "sites"));
  for (const link of state.chain) if (link.action.type === "PlayCard") place(link.action.card, "chain");

  for (const [id, c] of Object.entries(state.cards)) {
    if (!seen.has(id)) problems.push(`instance ${id} (${c.cardId}) is in no zone`);
  }
  return problems;
}

/** Number of cards that are not tokens. This number never changes during a game. */
export function countRealCards(state: GameState): number {
  return Object.values(state.cards).filter((c) => !c.token).length;
}
