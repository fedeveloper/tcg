<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Application, TextureStyle } from "pixi.js";
  import { CARDS } from "@tcg/cards";
  import { eventsFor, tideFor, totalLight, type Action, type GameState, type PlayerId } from "@tcg/engine";
  import { cardRulesText, cardSummary, describeAction, describeEvent, lookupIn, type Lang, type Translator } from "@tcg/i18n";
  import type { AiLevel } from "@tcg/ai";
  import { GameSession, HUMAN, type PlaySession, type SessionHooks, type Step } from "../game/session.ts";
  import { ScriptedAiDriver, WorkerAiDriver } from "../game/aiDriver.ts";
  import { newScenario } from "@tcg/engine";
  import { LESSONS, type Lesson } from "../tutorial/lessons.ts";
  import { highlightPlaces, narrow, optionsForCard, optionsForKeeper, stageOf } from "../game/selection.ts";
  import { BoardView, type BoardClick } from "../render/board.ts";
  import { integerScale, VIEW_HEIGHT, WIDTH, type Rect } from "../render/layout.ts";
  import { ShapeTheme, type Theme } from "../render/theme.ts";
  import { loadArt, SpriteTheme } from "../render/spriteTheme.ts";
  import PixelCard from "./PixelCard.svelte";
  import type { CardFace } from "./pixelCanvas.ts";

  interface Props {
    tr: Translator;
    lang: Lang;
    deck: string;
    opponentDeck: string;
    level: AiLevel;
    seed: number;
    lesson?: Lesson | null;
    /** Explicit card lists for both players. They replace the deck names. */
    decks?: [string[], string[]];
    /** Called by the button of the result screen. Without it, the button goes back to the menu. */
    onFinish?: (winner: PlayerId | null) => void;
    /** Builds a session that does not run the engine here (online match). It replaces the local session. */
    createSession?: (hooks: SessionHooks) => PlaySession;
    onNext?: () => void;
    onRetry?: () => void;
    onExit: () => void;
  }
  let { tr, lang = $bindable(), deck, opponentDeck, level, seed, lesson = null, decks, onFinish, createSession, onNext, onRetry, onExit }: Props = $props();

  let host: HTMLDivElement;
  let app: Application | null = null;
  let board: BoardView | null = null;
  let session = $state.raw<PlaySession | null>(null);
  /** The seat of the local player. Online, the server can give seat 1. */
  let me = $state<PlayerId>(HUMAN);
  const foe = $derived<PlayerId>(me === 0 ? 1 : 0);
  let names = $state.raw<[string, string] | null>(null);
  let deadline = $state<number | null>(null);
  let now = $state(Date.now());
  const secondsLeft = $derived(deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000)));

  // Reactive copies of the session data. The session itself is a plain class.
  let game = $state.raw<GameState | null>(null);
  let busy = $state(true);
  let log = $state<string[]>([]);
  let options = $state.raw<Action[]>([]);
  let selectedCard = $state<string | null>(null);
  let mulliganPick = $state<string[]>([]);
  const MOTION_KEY = "tcg.reducedMotion";
  function initialReducedMotion(): boolean {
    const saved = localStorage.getItem(MOTION_KEY);
    if (saved !== null) return saved === "1";
    // First visit: follow the setting of the operating system.
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  let reducedMotion = $state(initialReducedMotion());
  const speed: { factor: number; reduced: boolean } = { factor: 1, reduced: false };
  $effect(() => {
    speed.reduced = reducedMotion;
    localStorage.setItem(MOTION_KEY, reducedMotion ? "1" : "0");
  });

  const actions = $derived(session && game && !busy ? session.humanActions() : []);
  const myTurn = $derived(!!game && game.turn === me && !busy && actions.length > 0 && game.phase !== "over");

  function refresh(s: PlaySession) {
    game = s.state;
    busy = s.busy;
    names = s.names ?? null;
    deadline = s.deadline ?? null;
  }

  function addLog(step: { before: GameState; after: GameState; events: Step["events"] }) {
    const lookup = lookupIn(step.after, step.before);
    const lines = eventsFor(step.events, me)
      .map((e) => describeEvent(tr, e, me, lookup))
      .filter((l): l is string => !!l);
    log = [...log, ...lines].slice(-40);
  }

  async function onStep(step: Step) {
    addLog(step);
    speed.factor = 1;
    await board?.play(step);
  }

  onMount(() => {
    TextureStyle.defaultOptions.scaleMode = "nearest";
    const scale = integerScale(Math.min(window.innerWidth, 1440), window.innerHeight * 0.62);
    app = new Application();
    let disposed = false;
    void (async () => {
      await app!.init({ width: WIDTH * scale, height: VIEW_HEIGHT * scale, antialias: false, background: "#1a1423", preference: "webgl" });
      // The pixel art theme needs the spritesheets. The shape theme is the fallback.
      let theme: Theme;
      try {
        theme = new SpriteTheme(await loadArt(), scale, () => speed.reduced);
      } catch (err) {
        console.warn("Sprites not loaded, using shapes", err);
        theme = new ShapeTheme(scale);
      }
      if (disposed) return;
      host.appendChild(app!.canvas);
      app!.stage.scale.set(scale);
      const hooks: SessionHooks = { onStep, onChange: refresh };
      if (createSession) {
        session = createSession(hooks);
      } else {
        const plan = lesson?.opponent;
        const ai = !lesson ? new WorkerAiDriver() : new ScriptedAiDriver(plan?.kind === "script" ? plan.next : () => null, 350);
        const initial = lesson ? newScenario(lesson.scenario) : undefined;
        session = new GameSession({ seed, deck, opponentDeck, decks, level, ai, initial, ...hooks });
      }
      me = session.me;
      board = new BoardView(theme, tr, me, speed);
      board.onClick = onBoardClick;
      app!.stage.addChild(board.root);
      app!.stage.eventMode = "static";
      app!.canvas.addEventListener("pointerdown", () => {
        if (busy) board?.speedUp();
      });
      addLog({ before: session.state, after: session.state, events: session.startEvents });
      board.sync(session.state);
      refresh(session);
      await session.start();
    })();
    const clock = setInterval(() => (now = Date.now()), 1000);
    return () => {
      disposed = true;
      clearInterval(clock);
    };
  });

  onDestroy(() => {
    session?.dispose();
    app?.destroy(true, { children: true });
  });

  $effect(() => {
    board?.setTranslator(tr);
  });

  // ---------------------------------------------------------------- selection

  function clearSelection() {
    selectedCard = null;
    options = [];
    board?.setHighlights([]);
  }

  function showHighlights() {
    if (!board || !game) return;
    const places = highlightPlaces(options);
    const rects: Rect[] = [
      ...places.slots.map((s) => board!.rectOfSlot(me, s.lane, s.row)),
      ...places.lanes.map((l) => board!.rectOfSite(l as 0 | 1 | 2)),
      ...places.targets.map((t) => board!.rectOfTarget(game!, t)).filter((r): r is Rect => !!r),
    ];
    board.setHighlights(rects);
  }

  async function act(a: Action) {
    clearSelection();
    await session?.humanAct(a);
  }

  function choose(list: Action[]) {
    if (list.length === 0) return;
    if (stageOf(list) === "done") {
      void act(list[0]!);
      return;
    }
    options = list;
    showHighlights();
  }

  function pickCard(id: string) {
    if (!myTurn) return;
    if (selectedCard === id) return clearSelection();
    const list = optionsForCard(actions, id);
    if (list.length === 0) return;
    selectedCard = id;
    choose(list);
  }

  function onBoardClick(click: BoardClick) {
    if (!game || busy) return;
    if (options.length > 0) {
      const next = narrow(options, click, game, me);
      if (next.length > 0) return choose(next);
    }
    // No selection: a click on one of my keepers starts a move.
    if (click.kind === "keeper" && game.cards[click.id]?.owner === me && myTurn) {
      clearSelection();
      choose(optionsForKeeper(actions, click.id));
      return;
    }
    clearSelection();
  }

  function pass() {
    const p = actions.find((a) => a.type === "Pass");
    if (p) void act(p);
  }

  function toggleMulligan(id: string) {
    mulliganPick = mulliganPick.includes(id) ? mulliganPick.filter((x) => x !== id) : [...mulliganPick, id];
  }

  function confirmMulligan() {
    const key = [...mulliganPick].sort().join(",");
    const a = actions.find((x) => x.type === "Mulligan" && [...x.cards].sort().join(",") === key);
    mulliganPick = [];
    if (a) void act(a);
  }

  function cardInfo(id: string) {
    const inst = game?.cards[id];
    const def = inst ? CARDS[inst.cardId] : undefined;
    if (!def) return null;
    const echo = !!inst?.echoCopy;
    const keeper = def.type === "keeper";
    // The text box of the pixel card has one line: the keywords of a Keeper, or the type of the card.
    const lines = [keeper && def.keywords.length ? def.keywords.map((k) => tr.t(`keywords.${k}.name`)).join(", ") : tr.t(`types.${def.type}`)];
    const face: CardFace = {
      cardId: def.id,
      name: tr.t(`${def.id}.name`, { ns: "cards" }),
      faction: def.faction,
      cost: def.cost,
      stats: keeper ? { attack: echo ? 1 : (def.attack ?? 0), hold: echo ? 1 : (def.hold ?? 1) } : undefined,
      lines,
    };
    return { def, face, summary: cardSummary(tr, def), rules: cardRulesText(tr, def), echo };
  }

  function playable(id: string): boolean {
    return myTurn && optionsForCard(actions, id).length > 0;
  }

  /** Tutorial result: "done", "failed" or null while the lesson runs. */
  const lessonResult = $derived.by(() => {
    if (!lesson || !game || busy) return null;
    if (lesson.goal(game)) return "done";
    if (game.phase === "over" || game.round > lesson.maxRound) return "failed";
    return null;
  });
  const lessonNumber = $derived(lesson ? LESSONS.indexOf(lesson) + 1 : 0);
  const hasNext = $derived(lessonNumber > 0 && lessonNumber < LESSONS.length);

  const result = $derived.by(() => {
    if (!game?.outcome) return null;
    const w = game.outcome.winner;
    const key = w === null ? "draw" : w === me ? "win" : "lose";
    return `${tr.t(`events.GameOver.${key}`)} ${tr.t(`events.reasons.${game.outcome.reason}`)}`;
  });
</script>

<div class="game">
  <header>
    {#if game}
      <span>{game.phase === "mulligan" ? tr.t("ui.mulligan") : tr.t("ui.round", { round: game.round })}</span>
      <span>{tr.t("ui.tide", { value: tideFor(game, me) > 0 ? `+${tideFor(game, me)}` : tideFor(game, me) })}</span>
      <span>{names ? names[foe] : tr.t("ui.opponent")}: {tr.t("ui.ember", { ember: game.players[foe].ember })} · {tr.t("ui.hand", { count: game.players[foe].hand.length })} · {tr.t("ui.deck", { count: game.players[foe].deck.length })}</span>
      <span class="status">{busy ? tr.t("ui.waiting") : myTurn ? tr.t("ui.yourTurn") : names && game.phase !== "over" ? tr.t("online.opponentTurn") : ""}</span>
      {#if secondsLeft !== null && game.phase !== "over"}<span class="timer" class:low={secondsLeft <= 20}>{tr.t("online.timer", { seconds: secondsLeft })}</span>{/if}
    {/if}
    <span class="spacer"></span>
    <label class="motion"><input type="checkbox" bind:checked={reducedMotion} /> {tr.t("ui.reducedMotion")}</label>
    <select bind:value={lang} aria-label={tr.t("ui.language")}>
      <option value="it">IT</option>
      <option value="en">EN</option>
    </select>
    {#if session?.concede && game && game.phase !== "over"}
      <button onclick={() => confirm(tr.t("online.concedeConfirm")) && session?.concede?.()}>{tr.t("online.concede")}</button>
    {/if}
    <button onclick={onExit}>{tr.t("ui.menu")}</button>
  </header>

  {#if lesson}
    <section class="lesson">
      <strong>{tr.t("tutorial.lesson", { n: lessonNumber })}: {tr.t(`tutorial.lessons.${lesson.id}.title`)}</strong>
      <div>{tr.t(`tutorial.lessons.${lesson.id}.intro`)}</div>
      <div class="goal">{tr.t("tutorial.goalLabel")}: {tr.t(`tutorial.lessons.${lesson.id}.goal`)}</div>
    </section>
  {/if}

  <div class="board" bind:this={host}></div>

  {#if game}
    <section class="me">
      <span>{tr.t("ui.ember", { ember: game.players[me].ember })}</span>
      <span>{tr.t("ui.reserve", { reserve: game.players[me].reserve })}</span>
      <span>{tr.t("ui.deck", { count: game.players[me].deck.length })}</span>
      <span class="spacer"></span>
      {#if options.length > 0}<span class="hint">{tr.t("ui.selectTarget")}</span><button onclick={clearSelection}>{tr.t("ui.cancel")}</button>{/if}
      {#if game.phase === "mulligan"}
        <span class="hint">{tr.t("ui.mulliganHint")}</span>
        <button class="primary" disabled={!myTurn} onclick={confirmMulligan}>{tr.t("ui.confirmMulligan")}</button>
      {:else}
        <button class="primary" disabled={!myTurn} onclick={pass}>{game.chain.length > 0 ? tr.t("actions.resolve") : tr.t("actions.pass")}</button>
      {/if}
    </section>

    {#if game.chain.length > 0}
      <section class="chain">
        <strong>{tr.t("ui.chain")}</strong>
        {#each [...game.chain].reverse() as link}
          <div>{describeAction(tr, game, link.action, link.player)}{link.player === me ? "" : ` (${tr.t("ui.opponent")})`}</div>
        {/each}
      </section>
    {/if}

    <section class="hand">
      {#each game.players[me].hand as id (id)}
        {@const info = cardInfo(id)}
        {#if info}
          <button
            class="card {info.def.faction}"
            class:selected={selectedCard === id || mulliganPick.includes(id)}
            class:dim={game.phase !== "mulligan" && !playable(id)}
            onclick={() => (game?.phase === "mulligan" ? toggleMulligan(id) : pickCard(id))}
          >
            <PixelCard face={info.face} />
            <span class="sr-only">{info.summary}{info.echo ? " [1/1]" : ""}</span>
            {#each info.rules as line}<div class="rules">{line}</div>{/each}
          </button>
        {/if}
      {/each}
    </section>

    <section class="log" aria-live="polite">
      <strong>{tr.t("ui.log")}</strong>
      {#each log.slice(-8) as line}<div>{line}</div>{/each}
      <div class="hint">{tr.t("ui.moveHint")} {tr.t("ui.speedHint")}</div>
    </section>

    {#if lessonResult}
      <div class="over">
        <h2>{tr.t(lessonResult === "done" ? "tutorial.done" : "tutorial.failed")}</h2>
        {#if lessonResult === "done" && hasNext}
          <button class="primary" onclick={() => onNext?.()}>{tr.t("tutorial.next")}</button>
        {/if}
        {#if lessonResult === "failed"}
          <button class="primary" onclick={() => onRetry?.()}>{tr.t("tutorial.retry")}</button>
        {/if}
        <button onclick={onExit}>{tr.t("tutorial.back")}</button>
      </div>
    {:else if result}
      <div class="over">
        <h2>{result}</h2>
        <p>{tr.t("ui.finalScore", { you: totalLight(game, me), opponent: totalLight(game, foe) })}</p>
        {#if onFinish}
          <button class="primary" onclick={() => onFinish(game?.outcome?.winner ?? null)}>{tr.t("meta.continue")}</button>
        {:else}
          <button class="primary" onclick={onExit}>{tr.t("ui.newGame")}</button>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .game { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 16px; }
  header, .me { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; width: 100%; max-width: 1440px; font-size: 13px; }
  .spacer { flex: 1; }
  .motion { display: flex; align-items: center; gap: 4px; cursor: pointer; }
  .status { color: var(--accent); }
  .timer { font-variant-numeric: tabular-nums; }
  .timer.low { color: #e0605a; }
  .hint { color: var(--muted); font-size: 12px; }
  .board { line-height: 0; max-width: 100%; overflow: hidden; }
  .board :global(canvas) { image-rendering: pixelated; max-width: 100%; }
  .hand { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%; max-width: 1440px; }
  .card { width: 148px; padding: 8px 8px 6px; font-size: 11px; text-align: left; display: flex; flex-direction: column; align-items: center; gap: 6px; background: transparent; border: 0; transition: transform 0.12s ease-out; }
  .card:hover:not(.dim) { transform: translateY(-6px) rotate(-1deg); background: transparent; }
  .card.selected { transform: translateY(-12px); filter: drop-shadow(0 0 6px var(--accent)); }
  .card.dim { opacity: 0.55; }
  .card .rules { color: var(--muted); width: 100%; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  .chain, .log { width: 100%; max-width: 1440px; background: var(--panel); border-radius: 4px; padding: 6px 10px; font-size: 12px; }
  .lesson { width: 100%; max-width: 1440px; background: #1d2f22; border: 1px solid #4f9d69; border-radius: 4px; padding: 8px 10px; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
  .lesson .goal { color: var(--accent); }
  .over { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
  .over h2 { color: var(--accent); text-align: center; padding: 0 16px; }
</style>
