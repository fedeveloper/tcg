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
  import Wave from "./Wave.svelte";
  import { OnlineClient } from "../online/connection.ts";
  import { RemoteSession } from "../online/remoteSession.ts";
  import { ReplaySession } from "../online/replaySession.ts";
  import type { Replay, ServerMessage } from "@tcg/protocol";
  import CardFlips from "./CardFlips.svelte";
  import Banner from "./Banner.svelte";
  import { deckFaction, deckLabel } from "./deckText.ts";
  import titleUrl from "../../../../assets/ui/web/titolo.webp?url";
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
  <main class="title" style="--key: url({titleUrl})">
    <nav class="lang" aria-label={tr.t("ui.language")}>
      {#each LANGUAGES as l}<button class:on={lang === l} aria-pressed={lang === l} onclick={() => (lang = l)}>{l.toUpperCase()}</button>{/each}
    </nav>
    <section class="left">
      <h1><span class="logo">{tr.t("ui.title")}</span><span class="tagline">{tr.t("ui.tagline")}</span></h1>
      <div class="modes">
        <button onclick={() => (showLessons = !showLessons)} aria-expanded={showLessons}>{tr.t("tutorial.title")}</button>
        {#if showLessons}
          <ol class="lessons">
            {#each LESSONS as l, i}
              <li><button onclick={() => startLesson(l)}>{tr.t("tutorial.lesson", { n: i + 1 })}: {tr.t(`tutorial.lessons.${l.id}.title`)}</button></li>
            {/each}
          </ol>
        {/if}
        <button onclick={() => (screen = "expedition")}>{tr.t("meta.expedition")}</button>
        <button onclick={() => (screen = "draft")}>{tr.t("meta.draft")}</button>
        <button onclick={() => (screen = "online")}>{tr.t("online.title")}</button>
        <button onclick={() => (screen = "collection")}>{tr.t("meta.collection")} <small>{tr.t("meta.shards", { count: profileStore.profile.collection.shards })}</small></button>
        <button onclick={() => (screen = "decks")}>{tr.t("meta.decks")}</button>
      </div>
      <p class="stats">{tr.t("meta.record", { wins: profileStore.profile.wins, losses: profileStore.profile.losses })}</p>
    </section>

    <section class="free panel">
      <h2>{tr.t("meta.freeMatch")}</h2>
      <h3>{tr.t("ui.yourDeck")}</h3>
      <div class="banners">
        {#each playable as d (d.id)}
          <Banner faction={deckFaction(d.cards)} label={deckLabel(tr, d)} selected={d.id === (playable.find((x) => x.id === deckId) ?? playable[0])?.id} onclick={() => (deckId = d.id)} />
        {/each}
      </div>
      <h3>{tr.t("ui.opponentDeck")}</h3>
      <div class="banners small">
        {#each Object.keys(STARTER_DECKS) as d}
          <Banner faction={deckFaction(STARTER_DECKS[d]!)} label={tr.t(`deckNames.${d}`)} selected={d === opponentDeck} onclick={() => (opponentDeck = d)} />
        {/each}
      </div>
      <h3>{tr.t("ui.difficulty")}</h3>
      <div class="levels" role="group" aria-label={tr.t("ui.difficulty")}>
        {#each ["easy", "medium", "hard"] as const as l}
          <button class:on={level === l} aria-pressed={level === l} onclick={() => (level = l)}>{tr.t(`ui.levels.${l}`)}</button>
        {/each}
      </div>
      <button class="primary play" onclick={startFree} disabled={playable.length === 0}>{tr.t("ui.start")}</button>
    </section>
  </main>

  {#if reward}
    <div class="reward-back">
      <section class="reward panel">
        <h3>{tr.t("meta.reward")}</h3>
        {#if reward.kind === "cards"}
          <CardFlips {tr} cards={reward.cards} />
        {:else}
          <p class="shards">{tr.t("meta.shardsGained", { count: reward.shards })}</p>
        {/if}
        <button class="primary" onclick={() => (reward = null)}>{tr.t("meta.continue")}</button>
      </section>
    </div>
  {/if}
{/if}

{#key screen}
  <Wave />
{/key}

<style>
  /* Title screen (graphics plan, phase 7): the lighthouse in the storm, the logo and a vertical menu. */
  .title {
    position: relative; min-height: 100dvh; display: grid; grid-template-columns: minmax(240px, 320px) minmax(300px, 440px); justify-content: start; align-items: center;
    gap: 24px; padding: 48px clamp(16px, 5vw, 72px);
    background: linear-gradient(90deg, rgb(6 10 20 / 0.8) 0, rgb(6 10 20 / 0.45) 50%, rgb(6 10 20 / 0) 70%), var(--key) 75% center / cover no-repeat, #0b1220;
  }
  .lang { position: absolute; top: 12px; right: 16px; display: flex; gap: 4px; }
  .lang button { padding: 4px 10px; font-size: 13px; min-height: 0; }
  .lang .on, .levels .on { border-color: var(--gold); color: #fff4dc; box-shadow: 0 0 0 1px var(--gold), 0 0 10px rgb(251 211 90 / 0.35); }
  .left { display: flex; flex-direction: column; gap: 18px; }
  h1 { margin: 0; display: flex; flex-direction: column; gap: 4px; }
  .logo {
    font-family: Alegreya, Georgia, serif; font-weight: 700; font-size: clamp(44px, 6vw, 76px); line-height: 0.95; letter-spacing: 0.02em; text-transform: uppercase;
    text-shadow: none; background: linear-gradient(#fff8dc, #f6cd6a 50%, #d0903a); -webkit-background-clip: text; background-clip: text; color: transparent;
    filter: drop-shadow(0 2px 0 #3a2410) drop-shadow(0 0 18px rgb(251 211 90 / 0.35));
  }
  .tagline { font-family: Alegreya, Georgia, serif; font-style: italic; font-weight: 400; font-size: 18px; color: #d9e6ee; text-shadow: 0 1px 3px #000; }
  .modes { display: flex; flex-direction: column; gap: 8px; }
  .modes > button { font-size: 18px; padding: 10px 16px; text-align: left; display: flex; justify-content: space-between; align-items: baseline; }
  .modes small { font-size: 12px; color: var(--gold); }
  .lessons { margin: 0 0 0 12px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .lessons button { width: 100%; text-align: left; font-size: 14px; }
  .stats { font-size: 13px; color: #c9d6dc; text-shadow: 0 1px 2px #000; margin: 0; }
  .free { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
  h2 { font-size: 22px; margin: 0; color: var(--gold); border-bottom: 1px solid rgb(217 181 106 / 0.35); padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.08em; color: #cdbf9c; }
  .banners { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; max-height: 260px; overflow: auto; padding: 4px; }
  .banners.small { grid-template-columns: repeat(3, 1fr); }
  .banners.small :global(.banner) { min-height: 52px; }
  .banners.small :global(.label) { font-size: 14px; }
  .levels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .play { margin-top: 8px; font-size: 22px; padding: 12px; }

  /* Reward: the cards turn one after the other. */
  .reward-back { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgb(0 0 0 / 0.65); }
  .reward { padding: 18px 22px; display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 100%; }
  .reward h3 { font-size: 22px; color: var(--gold); text-transform: none; letter-spacing: 0; margin: 0; }
  .shards { font-size: 20px; color: #bfe8ff; text-shadow: 0 0 10px rgb(127 216 255 / 0.6); }

  @media (max-width: 760px) {
    .title { grid-template-columns: 1fr; align-items: start; padding: 48px 16px 24px; background-position: 30% center; }
    .modes > button { font-size: 16px; padding: 8px 12px; }
  }
</style>
