<script lang="ts">
  import { STARTER_DECKS, expandDeck } from "@tcg/cards";
  import { createTranslator, detectLang, LANGUAGES, type Lang } from "@tcg/i18n";
  import type { AiLevel } from "@tcg/ai";
  import type { PlayerId } from "@tcg/engine";
  import { deckProblems, recordMatch, recordRunMatch, type MatchReward, type RunOpponent } from "@tcg/meta";
  import Game from "./Game.svelte";
  import Collection from "./Collection.svelte";
  import Decks from "./Decks.svelte";
  import RunScreen from "./RunScreen.svelte";
  import Online from "./Online.svelte";
  import { OnlineClient } from "../online/connection.ts";
  import { RemoteSession } from "../online/remoteSession.ts";
  import { ReplaySession } from "../online/replaySession.ts";
  import type { Replay, ServerMessage } from "@tcg/protocol";
  import CardTile from "./CardTile.svelte";
  import { deckLabel } from "./deckText.ts";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import { LESSONS, type Lesson } from "../tutorial/lessons.ts";

  function savedLang(): Lang {
    try {
      const v = localStorage.getItem("lang");
      if (v === "it" || v === "en") return v;
    } catch {}
    return detectLang(navigator.language);
  }

  type Screen = "menu" | "collection" | "decks" | "expedition" | "draft" | "online" | "game";
  /** What the current match is for: a free match, a match of a run, or a tutorial lesson. */
  type Match = { kind: "free" } | { kind: "run"; mode: "expedition" | "draft" } | { kind: "lesson" } | { kind: "online"; session: RemoteSession } | { kind: "replay"; session: ReplaySession };

  let lang = $state<Lang>(savedLang());
  let tr = $derived(createTranslator(lang));
  let screen = $state<Screen>("menu");
  let deckId = $state("starter-forge");
  let opponentDeck = $state("sprout");
  let level = $state<AiLevel>("easy");
  let seed = $state(0);
  let decks = $state.raw<[string[], string[]] | undefined>(undefined);
  let match = $state.raw<Match>({ kind: "free" });
  let lesson = $state.raw<Lesson | null>(null);
  let showLessons = $state(false);
  let reward = $state.raw<MatchReward | null>(null);
  /** One connection to the PvP server for the whole page. It opens on the first visit of the Online screen. */
  let online: OnlineClient | null = null;
  function onlineClient(): OnlineClient {
    online ??= new OnlineClient();
    return online;
  }

  const playable = $derived(profileStore.profile.decks.filter((d) => deckProblems(profileStore.profile.collection, d.cards).length === 0));

  $effect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {}
    document.documentElement.lang = lang;
  });

  function newSeed(): number {
    return (Date.now() % 1_000_000) >>> 0;
  }

  function startFree() {
    const mine = playable.find((d) => d.id === deckId) ?? playable[0];
    if (!mine) return;
    seed = newSeed();
    lesson = null;
    decks = [expandDeck(mine.cards), expandDeck(STARTER_DECKS[opponentDeck]!)];
    match = { kind: "free" };
    screen = "game";
  }

  function startRunMatch(mode: "expedition" | "draft", deck: string[], foe: RunOpponent) {
    seed = newSeed();
    lesson = null;
    decks = [deck, expandDeck(STARTER_DECKS[foe.deck]!)];
    opponentDeck = foe.deck;
    level = foe.level;
    match = { kind: "run", mode };
    screen = "game";
  }

  function startLesson(l: Lesson) {
    lesson = l;
    decks = undefined;
    seed = l.scenario.seed;
    match = { kind: "lesson" };
    screen = "game";
  }

  function startOnline(first: Extract<ServerMessage, { t: "state" }>) {
    if (screen === "game") return;
    lesson = null;
    seed = newSeed();
    match = { kind: "online", session: new RemoteSession(onlineClient(), first) };
    screen = "game";
  }

  function startReplay(replay: Replay, seat: PlayerId) {
    lesson = null;
    seed = newSeed();
    match = { kind: "replay", session: new ReplaySession(replay, seat) };
    screen = "game";
  }

  function retryLesson() {
    const l = lesson;
    screen = "menu";
    if (l) queueMicrotask(() => startLesson(l));
  }

  function nextLesson() {
    const i = lesson ? LESSONS.indexOf(lesson) : -1;
    const next = LESSONS[i + 1];
    screen = "menu";
    if (next) queueMicrotask(() => startLesson(next));
  }

  function finish(winner: PlayerId | null) {
    const won = winner === (match.kind === "online" ? match.session.me : 0);
    if (match.kind === "free" || match.kind === "online") {
      reward = profileStore.update((p) => recordMatch(p, won));
      screen = "menu";
    } else if (match.kind === "run") {
      const mode = match.mode;
      profileStore.update((p) => p.run && recordRunMatch(p.run, won));
      screen = mode;
    }
  }

  /** Leaving a run match before the end counts as a loss. */
  function exitGame() {
    if (match.kind === "run") finish(1);
    else if (match.kind === "replay") screen = "online";
    else if (match.kind === "online") {
      // The match goes on in the server: the Online screen can resume it.
      if (match.session.over) finish(match.session.state.outcome?.winner ?? null);
      else screen = "online";
    } else screen = "menu";
  }
</script>

{#if screen === "game"}
  {#key `${seed}-${lesson?.id ?? ""}`}
    <Game
      {tr}
      bind:lang
      deck="forge"
      {opponentDeck}
      {level}
      {seed}
      {lesson}
      {decks}
      createSession={match.kind === "online" || match.kind === "replay" ? (hooks) => (match as { session: RemoteSession | ReplaySession }).session.attach(hooks) : undefined}
      onFinish={match.kind === "lesson" || match.kind === "replay" ? undefined : finish}
      onNext={nextLesson}
      onRetry={retryLesson}
      onExit={exitGame}
    />
  {/key}
{:else if screen === "collection"}
  <Collection {tr} onBack={() => (screen = "menu")} />
{:else if screen === "decks"}
  <Decks {tr} onBack={() => (screen = "menu")} />
{:else if screen === "online"}
  <Online {tr} client={onlineClient()} onMatch={startOnline} onReplay={startReplay} onBack={() => (screen = "menu")} />
{:else if screen === "expedition" || screen === "draft"}
  {@const mode = screen}
  <RunScreen {tr} kind={mode} onPlay={(deck, foe) => startRunMatch(mode, deck, foe)} onBack={() => (screen = "menu")} />
{:else}
  <main class="menu">
    <h1>{tr.t("ui.title")}</h1>
    {#if reward}
      <section class="reward">
        <h3>{tr.t("meta.reward")}</h3>
        {#if reward.kind === "cards"}
          <div class="grid">{#each reward.cards as id}<CardTile {tr} cardId={id} />{/each}</div>
        {:else}
          <p>{tr.t("meta.shardsGained", { count: reward.shards })}</p>
        {/if}
        <button onclick={() => (reward = null)}>{tr.t("meta.continue")}</button>
      </section>
    {/if}
    <label>
      {tr.t("ui.language")}
      <select bind:value={lang}>
        {#each LANGUAGES as l}<option value={l}>{l.toUpperCase()}</option>{/each}
      </select>
    </label>

    <h2>{tr.t("meta.freeMatch")}</h2>
    <label>
      {tr.t("ui.yourDeck")}
      <select bind:value={deckId}>
        {#each playable as d (d.id)}<option value={d.id}>{deckLabel(tr, d)}</option>{/each}
      </select>
    </label>
    <label>
      {tr.t("ui.opponentDeck")}
      <select bind:value={opponentDeck}>
        {#each Object.keys(STARTER_DECKS) as d}<option value={d}>{tr.t(`deckNames.${d}`)}</option>{/each}
      </select>
    </label>
    <label>
      {tr.t("ui.difficulty")}
      <select bind:value={level}>
        <option value="easy">{tr.t("ui.levels.easy")}</option>
        <option value="medium">{tr.t("ui.levels.medium")}</option>
        <option value="hard">{tr.t("ui.levels.hard")}</option>
      </select>
    </label>
    <button class="primary" onclick={startFree} disabled={playable.length === 0}>{tr.t("ui.start")}</button>

    <h2>{tr.t("meta.modes")}</h2>
    <button onclick={() => (screen = "online")}>{tr.t("online.title")}</button>
    <button onclick={() => (screen = "expedition")}>{tr.t("meta.expedition")}</button>
    <button onclick={() => (screen = "draft")}>{tr.t("meta.draft")}</button>
    <button onclick={() => (screen = "collection")}>{tr.t("meta.collection")} · {tr.t("meta.shards", { count: profileStore.profile.collection.shards })}</button>
    <button onclick={() => (screen = "decks")}>{tr.t("meta.decks")}</button>
    <button onclick={() => (showLessons = !showLessons)}>{tr.t("tutorial.title")}</button>
    {#if showLessons}
      <ol class="lessons">
        {#each LESSONS as l, i}
          <li><button onclick={() => startLesson(l)}>{tr.t("tutorial.lesson", { n: i + 1 })}: {tr.t(`tutorial.lessons.${l.id}.title`)}</button></li>
        {/each}
      </ol>
    {/if}
    <p class="stats">{tr.t("meta.record", { wins: profileStore.profile.wins, losses: profileStore.profile.losses })}</p>
  </main>
{/if}

<style>
  .menu { max-width: 420px; margin: 6vh auto; padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
  h1 { color: var(--accent); font-size: 28px; margin: 0 0 8px; }
  h2 { font-size: 16px; margin: 10px 0 0; opacity: 0.8; }
  .lessons { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .lessons button { width: 100%; text-align: left; }
  label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .reward { border: 1px solid var(--accent); border-radius: 8px; padding: 10px; }
  .reward h3 { margin: 0 0 8px; }
  .grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .stats { font-size: 12px; opacity: 0.7; }
</style>
