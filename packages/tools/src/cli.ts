/**
 * Text interface: play a game against the AI in the terminal.
 *
 * Usage: pnpm play [--lang it|en] [--deck forge|sprout|forgeSprout] [--opponent <deck>]
 *                  [--ai easy|medium|random] [--seed N] [--auto]
 * --auto lets the AI play for you too (useful to watch a game).
 */
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { AiRandom, chooseAction, type AiLevel } from "@tcg/ai";
import { CARDS, CONDITIONS, expandDeck, STARTER_DECKS, KEYWORDS } from "@tcg/cards";
import { apply, eventsFor, legalActions, newGame, totalLight, viewFor, type Action, type GameEvent, type GameState, type PlayerId } from "@tcg/engine";
import {
  cardFlavor,
  cardRulesText,
  cardSummary,
  createTranslator,
  describeAction,
  describeEvent,
  detectLang,
  isLang,
  lookupIn,
  type Translator,
} from "@tcg/i18n";
import { renderBoard, renderHand } from "./render.ts";

const HUMAN: PlayerId = 0;

function printEvents(tr: Translator, events: GameEvent[], before: GameState, after: GameState): void {
  const lookup = lookupIn(after, before);
  for (const e of eventsFor(events, HUMAN)) {
    const line = describeEvent(tr, e, HUMAN, lookup);
    if (line) console.log(`  · ${line}`);
  }
}

function keywordHelp(tr: Translator): string {
  const lines = [tr.t("ui.keywordsTitle")];
  for (const k of KEYWORDS) lines.push(`  ${tr.t(`keywords.${k}.name`)}: ${tr.t(`keywords.${k}.reminder`)}`);
  for (const c of CONDITIONS) lines.push(`  ${tr.t(`conditions.${c}.name`)}: ${tr.t(`conditions.${c}.reminder`)}`);
  return lines.join("\n");
}

function cardDetail(tr: Translator, state: GameState, index: number): string | null {
  const id = state.players[HUMAN].hand[index];
  const cardId = id ? state.cards[id]?.cardId : undefined;
  const def = cardId ? CARDS[cardId] : undefined;
  if (!def) return null;
  const lines = [cardSummary(tr, def), ...cardRulesText(tr, def).map((l) => `  ${l}`)];
  for (const k of def.keywords) lines.push(`  ${tr.t(`keywords.${k}.name`)}: ${tr.t(`keywords.${k}.reminder`)}`);
  const flavor = cardFlavor(tr, def.id);
  if (flavor) lines.push(`  "${flavor}"`);
  return lines.join("\n");
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      lang: { type: "string" },
      deck: { type: "string", default: "forge" },
      opponent: { type: "string", default: "sprout" },
      ai: { type: "string", default: "easy" },
      seed: { type: "string" },
      auto: { type: "boolean", default: false },
    },
  });
  const lang = values.lang && isLang(values.lang) ? values.lang : detectLang(process.env.LC_ALL || process.env.LANG);
  const tr = createTranslator(lang);
  const deckName = values.deck && STARTER_DECKS[values.deck] ? values.deck : "forge";
  const foeDeckName = values.opponent && STARTER_DECKS[values.opponent] ? values.opponent : "sprout";
  const level: AiLevel = values.ai === "random" || values.ai === "medium" ? values.ai : "easy";
  const seed = values.seed ? Number(values.seed) : Date.now() % 1_000_000;
  const rng = new AiRandom(seed + 17);

  console.log(`${tr.t("ui.title")} — ${tr.t("ui.subtitle")}`);
  console.log(tr.t("ui.help"));
  console.log(`${tr.t("ui.deckLabel", { deck: tr.t(`deckNames.${deckName}`) })} · seed ${seed}\n`);

  const start = newGame({ seed, decks: [expandDeck(STARTER_DECKS[deckName]!), expandDeck(STARTER_DECKS[foeDeckName]!)] });
  let state = start.state;
  printEvents(tr, start.events, state, state);

  const rl = values.auto ? null : createInterface({ input: process.stdin, terminal: false });
  // The async iterator buffers the lines, so piped input works too.
  const lines = rl ? rl[Symbol.asyncIterator]() : null;

  while (state.phase !== "over") {
    let action: Action;
    if (state.turn === HUMAN && lines) {
      const actions = legalActions(state);
      // During a chain, the only option can be to let it resolve: do it without asking.
      if (actions.length === 1 && state.chain.length > 0) {
        action = actions[0]!;
      } else {
        const view = viewFor(state, HUMAN);
        console.log(`\n${renderBoard(tr, view, HUMAN)}\n${renderHand(tr, view, HUMAN)}`);
        if (state.phase === "mulligan") console.log(tr.t("ui.mulliganTitle"));
        console.log(state.chain.length > 0 ? tr.t("ui.chooseResponse") : tr.t("ui.chooseAction"));
        actions.forEach((a, i) => console.log(`  ${String(i + 1).padStart(2)}) ${describeAction(tr, view, a, HUMAN)}`));
        action = await ask(lines, tr, state, actions);
      }
    } else {
      action = chooseAction(state, level, rng);
    }
    const before = state;
    const result = apply(state, action);
    state = result.state;
    printEvents(tr, result.events, before, state);
  }

  console.log(`\n${renderBoard(tr, state, HUMAN)}`);
  console.log(tr.t("ui.finalScore", { you: totalLight(state, HUMAN), opponent: totalLight(state, 1) }));
  rl?.close();
}

async function ask(lines: AsyncIterator<string>, tr: Translator, state: GameState, actions: Action[]): Promise<Action> {
  for (;;) {
    process.stdout.write(tr.t("ui.prompt"));
    const next = await lines.next();
    if (next.done) {
      console.log(`\n${tr.t("ui.goodbye")}`);
      process.exit(0);
    }
    const input = String(next.value).trim().toLowerCase();
    if (input === "q") {
      console.log(tr.t("ui.goodbye"));
      process.exit(0);
    }
    if (input === "k") {
      console.log(keywordHelp(tr));
      continue;
    }
    const card = /^c\s*(\d+)$/.exec(input);
    if (card) {
      console.log(cardDetail(tr, state, Number(card[1]) - 1) ?? tr.t("ui.invalid"));
      continue;
    }
    const n = Number(input);
    const chosen = Number.isInteger(n) ? actions[n - 1] : undefined;
    if (chosen) return chosen;
    console.log(tr.t("ui.invalid"));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
