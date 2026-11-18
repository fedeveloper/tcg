# Browser client

The client is in `packages/client`. The client shows the match and animates the engine events. The client does not compute the rules.

## Data flow

1. The player chooses a card in the hand (Svelte), then clicks a highlighted point of the board (PixiJS).
2. `selection.ts` reduces the legal actions to one action.
3. `GameSession` applies the action with the engine and receives the new state and the events.
4. `BoardView.play()` animates the events with a GSAP timeline, then shows the exact state.
5. The AI chooses its action in a Web Worker (`aiWorker.ts`). The interface does not freeze.

Input stays blocked during the animations. A click on the board speeds up the current animation.

## Main files

| File | Content |
|---|---|
| `src/game/session.ts` | Sequence of player actions, AI actions and animations. No DOM code. |
| `src/game/selection.ts` | Click selection: card, then slot, lane or target. |
| `src/game/aiDriver.ts`, `src/game/aiWorker.ts` | AI in the Web Worker (browser) or in the same thread (tests). |
| `src/render/layout.ts` | Geometry of the two boards: horizontal 480 × 270 and vertical 270 × 392. |
| `src/render/theme.ts` | `Theme` interface and the fallback theme `ShapeTheme` (simple shapes). |
| `src/render/board.ts` | PixiJS board, visual state, animations for each event. |
| `src/ui/App.svelte`, `src/ui/Game.svelte` | Menu, hand, buttons, log, end screen. |

## Graphic theme

The board uses the `PaintedTheme` theme (`src/render/paintedTheme.ts`). The theme implements the `Theme` interface.
The style rules are in the art style guide ([guida-di-stile.md](guida-di-stile.md), in Italian).

- `loadPainted()` loads the sea, the painted Beacons and the wood of the pier. The Keeper medallions and the small illustrations load on first use.
- Keepers are round medallions (`assets/art/web/medal/`). Sites show their illustration in a brass frame.
- The damage numbers use the bitmap font "tcg-damage" (Alegreya). The effects are soft lights: sparks, puffs, hits.
- The `ShapeTheme` theme stays as a fallback. The client uses it if the images do not load.
- The hand shows the HD cards (`HdCard.svelte`). `src/render/art.ts` gives the URL of each illustration in 3 sizes.
- The scene fills the whole screen. On the horizontal board, the hand, the Ember and the main button are on the pier, at the bottom of the scene.
- The vertical board puts the hand below the scene. The "Board" option chooses: Automatic, Horizontal, Vertical.
- The CSS variable `--u` is the size of one scene pixel in CSS pixels. The DOM elements above the canvas use `--u` for position and size.
- The log and the board list are in a panel on the right ("Log" button). Language, board and "Reduce animations" are in the "Options" menu.

Three `Theme` methods are optional: `fx` (sparks, puffs, hits), `cardGhost` (illustration of the played card) and `dissolve` (dithered dissolve).
`BoardView.animateEvent` applies the timings of `assets/animations/animations.json`. See [animations.md](animations.md).

The "Reduce animations" option is in the "Options" menu of the match. The client saves the choice in `localStorage`.
On the first visit, the client follows the `prefers-reduced-motion` setting of the operating system.
When the option is on, `BoardView` halves the durations, turns off shake, hit stop and squash and stretch, and creates 3 particles out of 10.

The canvas draws the scene at an integer scale with the `nearest` filter. Then CSS scales the canvas continuously to the free space: the scene fills the screen.

## Tutorial

The tutorial has five lessons. Each lesson teaches one rule.

1. Keepers and Beacons.
2. Blocking and Reach.
3. Ember and Reserve.
4. The Tide.
5. Responses and the chain.

- `packages/engine/src/scenario.ts` creates a fixed position with `newScenario`. The match starts in the Maneuver phase, with no mulligan and no shuffle.
- `packages/client/src/tutorial/lessons.ts` contains the lessons: scenario, opponent, goal and maximum round.
- The tutorial opponent uses `ScriptedAiDriver`: it passes, or it follows a script.
- The texts are in the `tutorial.*` keys of the language files.
- `packages/client/test/tutorial.test.ts` checks that each lesson ends with the expected moves.

NOTE: keep game state, actions and lessons in `$state.raw`. The engine uses `structuredClone`, and this function does not copy Svelte proxies.

## Modes and profile

The menu offers Free match, Expedition, Draft, Collection, Decks and Tutorial.

- `packages/meta` contains the logic with no interface: collection, Shards, rewards, Expedition and Draft. The tests are in `packages/meta/test`.
- `src/meta/profileStore.svelte.ts` saves the profile in browser storage (`localStorage`, key `tcg.profile`). The profile stays in one browser.
- The starting collection contains the cards of the starter decks. A win in Free match gives 3 cards, a loss gives 10 Shards.
- An extra copy above the deck limit breaks into Shards. Shards create cards (cost by rarity in `packages/meta/src/collection.ts`).
- Expedition: a 20-card deck of one faction, 6 opponents, 2 lives, a new card after each win.
- Draft: two factions, 30 picks of 1 card out of 3, then matches until 7 wins or 3 losses.
- Leaving a match of a run counts as a loss.

## Online mode

The **Online** screen plays against other players through the PvP server (see [server.md](server.md)).

- `src/online/connection.ts`: the WebSocket connection. It saves the guest account token in the browser and reconnects automatically.
- `src/online/remoteSession.ts`: the session of an online match. The server sends a view after each action. The session animates the views in order.
- `src/ui/Online.svelte`: quick match, match with a code and list of matches in progress.
- `src/online/replaySession.ts`: the replay of a finished online match. The client rebuilds the match from seed, decks and actions, and shows it from the seat of the player: hidden cards stay hidden. The "Pause" button stops the replay.

`Game.svelte` uses the `PlaySession` interface. `GameSession` runs the engine in the browser. `RemoteSession` receives the views from the server.
The local player is `me`. Online, `me` can be seat 1: the board always shows the local player on the left.
The client computes the legal actions only for the interface. The server checks each action again.

## Accessibility

- **Keyboard.** Tab moves the focus between cards and buttons. Enter selects. P passes or confirms the mulligan. Esc cancels the choice or closes the card detail.
- **Board choices.** During a choice, the "Choose where" section shows the same slots, lanes and targets that the board highlights, as buttons.
- **Board list.** The "Board" section lists the Keepers of both players with position, Attack and Hold. The "Actions" button opens the move and the abilities of a Keeper.
- **Card detail.** A right click or the I key on a card opens the card full screen, with the keywords explained, the full rules text and the flavor text.
- **Tests.** `pnpm e2e` runs the end-to-end tests with Playwright, also the keyboard-only flow.

## Phone in portrait orientation

- Below 700 px of width and in portrait orientation, the client uses the vertical board. The hand stays at the bottom as a fan.
- The player bar stays above the hand, and the main button is always visible.
- The cards in the hand are small. The rules text appears only in the card detail.
- With the "Horizontal" option, the horizontal board fits the width of the screen.
- An e2e test checks the layout on a 412 × 915 px phone: hand on one row, button visible, no horizontal scroll.

## Performance

- The target is 60 frames per second on a mid-range phone from 2022.
- The cards in the hand are HTML and CSS (`HdCard.svelte`): no canvas for each card.
- The vertical board draws at most the pixels of the horizontal board on the same screen. `PERF_BOARD=horizontal` measures the horizontal board.
- `PERF=1 pnpm e2e perf` measures a match on a phone with a CPU slowed down 4 times. The test fails below 50 fps.
- The test is not in the CI, because the result depends on the machine.

| Measure (CPU 4× slower, 412 × 915) | Before | After |
|---|---|---|
| Frames per second | 57.7 | 58.8 |
| p99 frame | 49.9 ms | 33.3 ms |
| Long tasks (over 50 ms) | 13 | 3 |
