<script lang="ts">
  import { CARDS } from "@tcg/cards";
  import { createTranslator, detectLang } from "@tcg/i18n";
  import CardBack from "./CardBack.svelte";
  import HdCard from "./HdCard.svelte";

  /** The test cards of phase 1 of the graphics plan: one Keeper per faction, plus a Rite and a Site. */
  const IDS = ["forge-005", "sprout-002", "neutral-007", "abyss-006", "gear-026", "vesper-006", "abyss-022", "vesper-023"];
  const tr = createTranslator(detectLang(navigator.language));
  let width = $state(300);
</script>

<main>
  <header>
    <h1>High Tides · carte HD</h1>
    <label>Larghezza <input type="range" min="120" max="480" step="10" bind:value={width} /> {width}px</label>
  </header>
  <section style="--w: {width}px">
    {#each IDS as id (id)}
      {@const def = CARDS[id]}
      {#if def}<HdCard {def} {tr} {width} />{/if}
    {/each}
    <CardBack {width} />
  </section>
</main>

<style>
  main {
    min-height: 100vh; box-sizing: border-box; padding: 24px 32px 48px;
    background: radial-gradient(90% 70% at 50% 0%, #2c3a63, #12192e 60%, #0a0f1d);
    color: #f2e9d8; font-family: "Alegreya Sans", system-ui, sans-serif;
  }
  header { display: flex; gap: 24px; align-items: baseline; flex-wrap: wrap; margin-bottom: 28px; }
  h1 { font: 700 28px "Alegreya", Georgia, serif; margin: 0; }
  section { display: grid; grid-template-columns: repeat(auto-fill, var(--w)); gap: 36px 28px; justify-content: center; }
</style>
