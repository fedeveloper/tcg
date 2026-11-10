<script lang="ts">
  import { STARTER_DECKS } from "@tcg/cards";
  import { createTranslator, detectLang, LANGUAGES, type Lang } from "@tcg/i18n";
  import type { AiLevel } from "@tcg/ai";
  import Game from "./Game.svelte";

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

  $effect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {}
    document.documentElement.lang = lang;
  });

  function start() {
    seed = (Date.now() % 1_000_000) >>> 0;
    playing = true;
  }
</script>

{#if playing}
  <Game {tr} bind:lang {deck} {opponentDeck} {level} {seed} onExit={() => (playing = false)} />
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
  </main>
{/if}

<style>
  .menu { max-width: 360px; margin: 10vh auto; padding: 0 16px; display: flex; flex-direction: column; gap: 14px; }
  h1 { color: var(--accent); font-size: 28px; margin: 0 0 8px; }
  label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
</style>
