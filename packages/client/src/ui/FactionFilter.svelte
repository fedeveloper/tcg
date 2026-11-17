<script lang="ts">
  import type { Translator } from "@tcg/i18n";
  import { EMBLEM } from "./HdCard.svelte";
  import { ALL, FILTER_FACTIONS } from "./cardFilter.ts";

  /** The faction filter as a row of emblems (graphics plan, phase 7), in place of a <select>. */
  let { tr, value = $bindable(ALL) }: { tr: Translator; value?: string } = $props();
  const STROKE = new Set(["sprout", "neutral", "abyss"]);
</script>

<div class="factions" role="group" aria-label={tr.t("meta.faction")}>
  {#each FILTER_FACTIONS as f}
    {@const label = f === ALL ? tr.t("meta.allFactions") : tr.t(`factions.${f}`)}
    <button class="f-{f}" class:on={value === f} aria-pressed={value === f} title={label} aria-label={label} onclick={() => (value = f)}>
      {#if f === ALL}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>
      {:else}
        <svg viewBox="0 0 24 24" fill-rule="evenodd" class:stroke={STROKE.has(f)} aria-hidden="true"><path d={EMBLEM[f]} /></svg>
      {/if}
    </button>
  {/each}
</div>

<style>
  .factions { display: flex; gap: 6px; flex-wrap: wrap; }
  button { --c: #6f6f6f; width: 40px; height: 40px; min-height: 0; padding: 0; display: grid; place-items: center; border-radius: 50%; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 70%, white), var(--c) 60%, color-mix(in srgb, var(--c) 60%, black)); opacity: 0.6; }
  button:hover { opacity: 0.9; }
  button.on { opacity: 1; box-shadow: 0 0 0 2px var(--gold), 0 0 12px rgb(251 211 90 / 0.5); }
  svg { width: 22px; height: 22px; fill: #fff4dc; }
  svg.stroke { fill: none; stroke: #fff4dc; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .f-all { --c: #4a5566; }
  .f-forge { --c: #a8432f; }
  .f-sprout { --c: #3f7d4f; }
  .f-neutral { --c: #6f6f6f; }
  .f-abyss { --c: #24406a; }
  .f-gear { --c: #8c6d3d; }
  .f-vesper { --c: #5f4682; }
</style>
