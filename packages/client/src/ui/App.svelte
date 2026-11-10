<script lang="ts">
  import { STARTER_DECKS } from "@tcg/cards";
  import { createTranslator, detectLang, LANGUAGES, type Lang } from "@tcg/i18n";
  import type { AiLevel } from "@tcg/ai";
  import Game from "./Game.svelte";
  import { LESSONS, type Lesson } from "../tutorial/lessons.ts";

  function savedLang(): Lang {
    try {
      const v = localStorage.getItem("lang");
      if (v === "it" || v === "en") return v;
    } catch {}
    return detectLang(navigator.language);
  }

  let lang = $state<Lang>(savedLang());
  let tr = $derived(createTranslator(lang));
  let deck = $state("forge");
  let opponentDeck = $state("sprout");
  let level = $state<AiLevel>("easy");
  let playing = $state(false);
  let seed = $state(0);
  let lesson = $state.raw<Lesson | null>(null);
  let showLessons = $state(false);

  $effect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {}
    document.documentElement.lang = lang;
  });

  function start() {
    seed = (Date.now() % 1_000_000) >>> 0;
    lesson = null;
    playing = true;
  }

  function startLesson(l: Lesson) {
    lesson = l;
    seed = l.scenario.seed;
    playing = true;
  }

  function retryLesson() {
    const l = lesson;
    playing = false;
    if (l) queueMicrotask(() => startLesson(l));
  }

  function nextLesson() {
    const i = lesson ? LESSONS.indexOf(lesson) : -1;
    const next = LESSONS[i + 1];
    playing = false;
    if (next) queueMicrotask(() => startLesson(next));
  }
</script>

{#if playing}
  {#key `${seed}-${lesson?.id ?? ""}`}
    <Game {tr} bind:lang {deck} {opponentDeck} {level} {seed} {lesson} onNext={nextLesson} onRetry={retryLesson} onExit={() => (playing = false)} />
  {/key}
{:else}
  <main class="menu">
    <h1>{tr.t("ui.title")}</h1>
    <label>
      {tr.t("ui.language")}
      <select bind:value={lang}>
        {#each LANGUAGES as l}<option value={l}>{l.toUpperCase()}</option>{/each}
      </select>
    </label>
    <label>
      {tr.t("ui.yourDeck")}
      <select bind:value={deck}>
        {#each Object.keys(STARTER_DECKS) as d}<option value={d}>{tr.t(`deckNames.${d}`)}</option>{/each}
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
      </select>
    </label>
    <button class="primary" onclick={start}>{tr.t("ui.start")}</button>
    <button onclick={() => (showLessons = !showLessons)}>{tr.t("tutorial.title")}</button>
    {#if showLessons}
      <ol class="lessons">
        {#each LESSONS as l, i}
          <li><button onclick={() => startLesson(l)}>{tr.t("tutorial.lesson", { n: i + 1 })}: {tr.t(`tutorial.lessons.${l.id}.title`)}</button></li>
        {/each}
      </ol>
    {/if}
  </main>
{/if}

<style>
  .menu { max-width: 360px; margin: 10vh auto; padding: 0 16px; display: flex; flex-direction: column; gap: 14px; }
  h1 { color: var(--accent); font-size: 28px; margin: 0 0 8px; }
  .lessons { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .lessons button { width: 100%; text-align: left; }
  label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
</style>
