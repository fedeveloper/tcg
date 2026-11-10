import type { GameState } from "./types.ts";

/**
 * Seeded pseudo-random number generator (mulberry32).
 * The generator state is a single 32-bit integer in GameState.rng,
 * so the game state stays plain JSON.
 */
export function nextRandom(state: GameState): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(state: GameState, maxExclusive: number): number {
  return Math.floor(nextRandom(state) * maxExclusive);
}

/** Fisher-Yates shuffle in place. */
export function shuffle<T>(state: GameState, items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(state, i + 1);
    const a = items[i] as T;
    items[i] = items[j] as T;
    items[j] = a;
  }
}
