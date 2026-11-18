# Rules engine

This document describes the rules engine.
It also lists the rules decisions that the original project plan did not define precisely.

## 1. Engine API

The `@tcg/engine` package exposes these functions:

| Function | Effect |
|---|---|
| `newGame({ seed, decks })` | Creates a match in the mulligan phase. |
| `legalActions(state)` | Returns the valid actions of the player who must act. |
| `apply(state, action)` | Returns `{ state, events }`. The function does not change the original state. |
| `viewFor(state, player)` | Hides the opponent's hand, the decks and the random generator state. |
| `eventsFor(events, player)` | Hides the cards that the opponent draws. |
| `checkInvariants(state)` | Checks the fixed rules of the state. Tests and the simulator use this function. |

The state is a plain JSON object. The random generator (mulberry32) saves its state inside the match state.
The same seed and the same actions always give the same result.

The engine contains no player-facing text. The `@tcg/i18n` package translates the events and generates the rules text from the card effects.

## 2. Effect language

Each card is a JSON object in `packages/cards/data/`. The Zod schema is in `packages/cards/src/schema.ts`.

- `effects`: list of effects. Each effect has a moment (`when`), an optional condition and a list of actions.
- Moments: `play` (Rites), `enterPlay`, `dawn`, `dusk`, `death`, `tideTurn` (Tide Turn).
- Conditions: `highTide` (High Tide), `lowTide` (Ebb), `resonance` (Resonance), `armed` (Armed: you have at least one Relic in play), `haunted` (Haunted: your graveyard has at least 5 cards).
- Actions: `damage`, `heal`, `buff`, `destroy`, `grant`, `draw`, `tide`, `ember`, `summon`, `bounce` (return a Keeper to the hand), `discard` (the opponent discards random cards), `recall` (return the last Keepers of the graveyard to your hand).
- `target`: the target that the player chooses. The actions use this target with the `chosen` reference.
- `aura`: bonus of a Relic for its Keeper, or bonus of a Site for all the Keepers in the lane.
- `abilities`: activated abilities (once per round).

The validator (`pnpm validate:cards`) checks the rules that the schema cannot express.
Example: a Rite does not use lane references, because a Rite has no lane.

## 3. Rules decisions

The engine uses these decisions. Each decision is easy to change.

### 3.1 Actions, responses and the chain

1. Each action other than "pass" goes on the chain: play a card, move a Keeper, activate an ability.
2. After each action, the opponent gets priority. The opponent responds with a Quick Rite or passes.
3. A response gives priority to the other player. The other player can respond again.
4. A "pass" with an open chain resolves the whole chain, from the last card to the first.
5. After the chain, the opponent of the player who opened the chain acts.
6. A response does not count as a turn action.
7. The chain has a limit of 4 cards.
8. The player pays the cost (Ember, Sacrifice) when they declare the action.
9. The engine checks the target when the effect resolves. A Rite with no valid target has no effect and goes to the graveyard.

### 3.2 Playing cards

1. The chosen target of a Rite is required. The chosen target of a Keeper is optional: with no valid target, the effect does nothing.
2. The Tide push (`tidePush`) happens before the effects. So a card can turn on its own High Tide.
3. The engine checks Resonance when the player declares the card.
4. A move costs 1 Ember and puts the Keeper in an empty adjacent slot: the other row of the same lane, or the same row of an adjacent lane.
5. Any player can replace a Site. The Dawn and Dusk effects of a Site apply to the player who played it.
6. A player can play a Keeper on one of their occupied slots. The old Keeper goes to the graveyard with its Relics. This replacement is not a death: no Death effect and no Echo.

### 3.3 Clash

1. The lanes resolve from A to C. Inside a lane, all the damage happens at the same time.
2. A Front Keeper attacks the enemy Front Keeper. With no enemy Front Keeper, it attacks the Beacon.
3. A Keeper with Reach attacks from the Back row like a Front Keeper.
4. A Keeper that just entered does not attack (unless it has Surge). It strikes back at the Front Keeper that attacks it. It does not strike back at a Reach attack.
5. Overrun applies only to the attack, not to the strike back.
6. The engine checks for victory after the complete Clash. Two Beacons that go out in the same Clash give a draw.

### 3.4 Rounds and resources

1. In round 1, each player draws 1 card at Dawn, as in the other rounds.
2. The Reserve adds to the Ember maximum. With 10 maximum Ember and 2 in the Reserve, the player has 12 Ember.
3. Spark is a Quick Rite with cost 0: "Gain 1 Ember".
4. The mulligan draws the new cards, then shuffles the replaced cards back into the deck.
5. Healing does not go above 10 Light and does not light a Beacon that is out.
6. An Echo copy and a Keeper created by an effect are **tokens**: they leave the game when they leave the board.
7. A **Tide Turn** happens when the Tide moves from one side to the other, or leaves 0. The `tideTurn` effects of all cards in play trigger, first those of the player with the Initiative.
8. A Tide Turn inside another Tide Turn does not trigger the effects again. This rule prevents infinite loops.
9. A Keeper that returns to the hand loses damage and modifiers. With a full hand, it goes to the graveyard. A token leaves the game.
10. **Rising Tide.** From round 14, at the end of Dusk, each lit Beacon of both players loses 1 Light. A Beacon at 1 Light goes out. The engine checks for victory immediately after. This rule reduces the matches that reach round 20 (from about 15% to about 4% with the easy AI). The round number is the constant `RISING_TIDE_ROUND`.

## 4. Artificial intelligence

| Level | Technique | Measured result |
|---|---|---|
| Random | Chooses a random legal action. | Used only by the simulator. |
| Easy | Evaluates each action after the Clash of the round. | Wins 30 matches out of 30 against the random player. |
| Medium | Searches sequences of 2 own actions (5 candidates per level). | Wins 60% of the decided matches against easy (177 matches). |
| Hard | In the Maneuver phase, searches sequences of 3 own actions (8 candidates per level). On the chain, uses ISMCTS. | Wins 53% of the decided matches against medium (319 matches, 8 pairings of different decks). |

The evaluation function considers Light (with a concave value: one point is worth more on a weak Beacon), board, hand, Tide and the expected damage of the next Clash.
The medium AI does not look at hidden cards: the search assumes that the opponent passes.
The command `pnpm duel --a medium --b easy --games 30` compares two levels.

### 4.1 Hard AI and ISMCTS

ISMCTS (Information Set Monte Carlo Tree Search) looks for a move without knowing the hidden cards. The code is in `packages/ai/src/ismcts.ts`.

1. **Determinization.** Each iteration guesses the hidden information: the cards in the opponent's hand and deck, the order of the decks and the random generator state. The guess uses only the list of unseen cards, not their real positions. A test checks that the choice does not change when the hidden cards change.
2. **Tree.** One tree serves all the guesses. UCB counts, for each action, only the iterations where the action is legal.
3. **Width.** The root searches the 8 best actions according to the quick evaluation. The nodes below the root search 5 actions and "Pass".
4. **Evaluation.** After 3 actions, the round ends with passes. The reward is `tanh((value − value of "Pass") / 6)`.
5. **Time.** The AI uses at most 800 ms per move, in the Web Worker.

In tests, ISMCTS alone does not beat the medium AI: the two AIs use the same evaluation function, and the search over the opponent's responses adds little.
For this reason, the hard AI uses ISMCTS only on the chain, where the opponent's hidden cards matter more.
In the Maneuver phase, it uses the medium AI search, wider and deeper.
The current limit is the evaluation function: an even deeper search (6 × 4) does not win more.

`pnpm duel --a hard --b medium --games 40 --iterations 800` compares the hard AI with the medium AI.
The command plays each seed twice, with the seats swapped. With two different levels, every second pair also swaps the decks.
`--iterations` sets the number of ISMCTS iterations, so the result is reproducible.

## 5. Tests

| Type | File |
|---|---|
| Round rules, mulligan, resources | `packages/engine/test/rounds.test.ts` |
| Clash and combat keywords | `packages/engine/test/combat.test.ts` |
| Card effects, Relics, Sites | `packages/engine/test/cards.test.ts` |
| Responses and the chain | `packages/engine/test/chain.test.ts` |
| Properties (fast-check), replay, views | `packages/engine/test/properties.test.ts` |
| Card data and decks | `packages/cards/test/cards.test.ts` |
| Texts and localization | `packages/i18n/test/i18n.test.ts` |

The CI also runs the simulator: 500 matches with random moves and 30 matches with the easy AI.
The simulator checks the invariants after each action.
