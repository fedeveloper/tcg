import { actionKey, apply, legalActions, other, type Action, type GameState, type PlayerId } from "@tcg/engine";
import type { AiRandom } from "./random.ts";

/**
 * Hard AI (plan, section 8): Information Set Monte Carlo Tree Search (single observer).
 *
 * Every iteration:
 * 1. Determinization: the AI guesses the hidden information. The opponent's hand and deck get a random
 *    assignment of the opponent's unseen cards. Both decks get a random order and the random generator a new state.
 * 2. Selection and expansion: the AI walks one tree shared by all the guesses. A child counts as "available" only
 *    in the guesses where its action is legal, and UCB uses that count (ISMCTS).
 * 3. Evaluation: the AI ends the round with passes and evaluates the state with the static evaluation.
 * 4. Backpropagation: every node adds the reward from the point of view of the player who chose its action.
 *
 * The AI never reads the opponent's hidden cards: the determinization replaces them before any use.
 */

export interface SearchHooks {
  /** Static evaluation of a state for a player. */
  evaluate(state: GameState, me: PlayerId): number;
  /** Plays passes until the round ends. It may change its input. */
  settle(state: GameState): GameState;
  /** Root actions to search, best first. The search uses the first HARD_ROOT_WIDTH of them. */
  rank(state: GameState, actions: Action[], me: PlayerId): Action[];
  /** A cheaper ranking for the nodes below the root, best first, from the point of view of `actor`. */
  quickRank(state: GameState, actions: Action[], actor: PlayerId): Action[];
}

export interface HardOptions {
  /** Maximum number of iterations. */
  iterations?: number;
  /** Time budget in milliseconds (plan, section 8: about 800 ms per action). */
  timeMs?: number;
  /** Depth of the tree. Default HARD_TREE_DEPTH. */
  depth?: number;
  /** Actions per node below the root. Default HARD_INNER_WIDTH. */
  innerWidth?: number;
  /** Exploration constant of UCB. Default HARD_EXPLORATION. */
  exploration?: number;
  /** Scale of the reward. Default HARD_REWARD_SCALE. */
  rewardScale?: number;
  /** Beam and depth of the search of my own actions in the Maneuver phase. Defaults HARD_BEAM and HARD_DEPTH. */
  beam?: number;
  searchDepth?: number;
}

/** Default budget of the hard AI. */
export const HARD_TIME_MS = 800;
export const HARD_MAX_ITERATIONS = 4000;
/** Root actions in the search, after the ranking. Pass is always one of them. */
export const HARD_ROOT_WIDTH = 8;
/** Actions per node below the root, after the quick ranking. Pass is always one of them. */
export const HARD_INNER_WIDTH = 5;
/** Depth of the tree: my action, the answer of the opponent, my next action. Then the round ends with passes. */
export const HARD_TREE_DEPTH = 3;
/** Exploration constant of UCB. Rewards are between -1 and 1. */
export const HARD_EXPLORATION = 0.35;
/**
 * Scale of the reward: tanh((evaluation - baseline) / scale). The baseline is the value of "pass now".
 * One action changes the evaluation by a few points, so a small scale keeps the differences visible to UCB.
 */
export const HARD_REWARD_SCALE = 6;

interface Node {
  action: Action | null;
  /** The player who chose the action of this node. */
  player: PlayerId;
  children: Map<string, Node>;
  visits: number;
  total: number;
  /** Number of iterations in which the action of this node was legal. */
  avail: number;
  /** Keys of the actions to search from this node. The first visit sets them with the quick ranking. */
  candidates: Set<string> | null;
}

function newNode(action: Action | null, player: PlayerId): Node {
  return { action, player, children: new Map(), visits: 0, total: 0, avail: 0, candidates: null };
}

function shuffle<T>(items: T[], rng: AiRandom): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
}

/**
 * A copy of the state with a random guess of the information that `me` cannot see.
 * The card ids of the opponent's hand and deck are a random permutation of the same cards,
 * so the guess uses only the opponent's card list, not their positions.
 */
export function determinize(state: GameState, me: PlayerId, rng: AiRandom): GameState {
  const s = structuredClone(state);
  const foe = s.players[other(me)];
  const unseen = [...foe.hand, ...foe.deck].sort();
  // Sort first: the guess must not depend on where the hidden cards really are.
  const cardIds = unseen.map((id) => s.cards[id]!.cardId).sort();
  shuffle(cardIds, rng);
  unseen.forEach((id, i) => {
    s.cards[id]!.cardId = cardIds[i]!;
  });
  foe.deck.sort();
  shuffle(foe.deck, rng);
  s.players[me].deck.sort();
  shuffle(s.players[me].deck, rng);
  s.rng = (rng.next() * 4294967296) >>> 0;
  return s;
}

function ucb(child: Node, c: number): number {
  if (child.visits === 0) return Infinity;
  return child.total / child.visits + c * Math.sqrt(Math.log(Math.max(1, child.avail)) / child.visits);
}

/** Chooses an action with ISMCTS. The player to act is state.turn. */
export function ismctsChoose(state: GameState, rng: AiRandom, hooks: SearchHooks, options: HardOptions = {}): Action {
  const me = state.turn;
  const all = legalActions(state, me);
  if (all.length === 1) return all[0]!;
  // The root actions depend only on my own cards, so they are the same in every determinization.
  const ranked = hooks.rank(determinize(state, me, rng), all, me);
  const rootActions = ranked.slice(0, HARD_ROOT_WIDTH);
  const pass = all.find((a) => a.type === "Pass");
  if (pass && !rootActions.includes(pass)) rootActions.push(pass);

  const root = newNode(null, other(me));
  const maxIterations = options.iterations ?? HARD_MAX_ITERATIONS;
  const deadline = options.timeMs === undefined ? Infinity : Date.now() + options.timeMs;

  const treeDepth = options.depth ?? HARD_TREE_DEPTH;
  const innerWidth = options.innerWidth ?? HARD_INNER_WIDTH;
  const exploration = options.exploration ?? HARD_EXPLORATION;
  const scale = options.rewardScale ?? HARD_REWARD_SCALE;
  const baseline = hooks.evaluate(hooks.settle(determinize(state, me, rng)), me);
  for (let it = 0; it < maxIterations; it++) {
    // Check the clock every 8 iterations: Date.now() is not free.
    if ((it & 7) === 0 && Date.now() > deadline) break;
    let s = determinize(state, me, rng);
    let node = root;
    const path: Node[] = [root];
    for (let depth = 0; depth < treeDepth && s.phase !== "over"; depth++) {
      const actor = s.turn;
      let legal = rootActions;
      if (depth > 0) {
        const all = legalActions(s, actor);
        if (!node.candidates) {
          const ranked = all.length > innerWidth ? hooks.quickRank(s, all, actor).slice(0, innerWidth) : all;
          node.candidates = new Set(ranked.map(actionKey));
          node.candidates.add(actionKey({ type: "Pass" }));
        }
        const keys = node.candidates;
        legal = all.filter((a) => keys.has(actionKey(a)));
        if (legal.length === 0) legal = all;
      }
      const untried: Action[] = [];
      for (const a of legal) {
        const child = node.children.get(actionKey(a));
        if (child) child.avail++;
        else untried.push(a);
      }
      let next: Node;
      if (untried.length > 0) {
        const a = untried[rng.int(untried.length)]!;
        next = newNode(a, actor);
        next.avail = 1;
        node.children.set(actionKey(a), next);
      } else {
        let best: Node | null = null;
        let bestScore = -Infinity;
        for (const a of legal) {
          const child = node.children.get(actionKey(a))!;
          const score = ucb(child, exploration);
          if (score > bestScore) {
            bestScore = score;
            best = child;
          }
        }
        next = best!;
      }
      s = apply(s, next.action!, { trusted: true, inPlace: true }).state;
      path.push(next);
      node = next;
      if (untried.length > 0) break;
    }
    const value = hooks.evaluate(s.phase === "over" ? s : hooks.settle(s), me);
    const reward = Math.tanh((value - baseline) / scale);
    for (const n of path) {
      n.visits++;
      n.total += n.player === me ? reward : -reward;
    }
  }

  // The most visited root action is the most robust choice.
  let best = rootActions[0]!;
  let bestVisits = -1;
  for (const a of rootActions) {
    const child = root.children.get(actionKey(a));
    if (child && child.visits > bestVisits) {
      bestVisits = child.visits;
      best = a;
    }
  }
  return best;
}
