/** A small seeded generator (mulberry32). The profile keeps its state, so rewards are reproducible. */
export function nextRandom(seed: number): { value: number; seed: number } {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: s };
}

/** A generator object that updates a seed holder. */
export class Random {
  constructor(public seed: number) {}
  next(): number {
    const r = nextRandom(this.seed);
    this.seed = r.seed;
    return r.value;
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)]!;
  }
}
