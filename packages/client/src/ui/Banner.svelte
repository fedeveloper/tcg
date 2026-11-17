<script lang="ts">
  import { EMBLEM, hdArtUrl } from "./HdCard.svelte";
  import { FACTION_ART } from "./deckText.ts";

  /**
   * A faction banner: a button with the faction illustration, its emblem and a name
   * (graphics plan, phase 7: deck selection without <select>).
   */
  let { faction, label, sub = "", selected = false, onclick }: { faction: string; label: string; sub?: string; selected?: boolean; onclick: () => void } = $props();
  const art = $derived(hdArtUrl(FACTION_ART[faction] ?? "neutral-006", "sm"));
  const stroke = $derived(faction === "sprout" || faction === "neutral" || faction === "abyss");
</script>

<button class="banner f-{faction}" class:selected aria-pressed={selected} {onclick}>
  {#if art}<img src={art} alt="" loading="lazy" />{/if}
  <svg class="emblem" class:stroke viewBox="0 0 24 24" fill-rule="evenodd" aria-hidden="true"><path d={EMBLEM[faction] ?? EMBLEM.neutral} /></svg>
  <span class="label">{label}</span>
  {#if sub}<span class="sub">{sub}</span>{/if}
</button>

<style>
  .banner {
    --c: #8a8a8a;
    position: relative; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start;
    width: 100%; min-height: 76px; padding: 8px 10px 8px 40px; overflow: hidden; text-align: left;
    border-radius: 6px 6px 18px 18px / 6px 6px 10px 10px;
    background: #0d1622; border: 1px solid var(--gold-d); box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.5), 0 2px 6px rgb(0 0 0 / 0.5);
    transition: transform 0.12s ease-out, box-shadow 0.12s, filter 0.12s;
    filter: saturate(0.7) brightness(0.85);
  }
  .banner:hover { transform: translateY(-2px); filter: none; }
  .banner.selected { filter: none; border-color: var(--gold); box-shadow: 0 0 0 2px var(--gold), 0 0 16px rgb(251 211 90 / 0.45); }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
  .banner::after { content: ""; position: absolute; inset: 0; z-index: 1; background: linear-gradient(90deg, color-mix(in srgb, var(--c) 85%, black) 0 28px, transparent 28px), linear-gradient(transparent 25%, rgb(5 8 14 / 0.88)); }
  .emblem { position: absolute; left: 6px; top: 8px; width: 18px; height: 18px; z-index: 2; fill: #f6e7b8; }
  .emblem.stroke { fill: none; stroke: #f6e7b8; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .label, .sub { position: relative; z-index: 2; text-shadow: 0 1px 2px #000; }
  .label { font-family: Alegreya, Georgia, serif; font-weight: 700; font-size: 16px; color: #fff4dc; line-height: 1.1; }
  .sub { font-size: 12px; color: #d6c9a8; }
  .f-forge { --c: #a8432f; }
  .f-sprout { --c: #3f7d4f; }
  .f-neutral { --c: #6f6f6f; }
  .f-abyss { --c: #24406a; }
  .f-gear { --c: #8c6d3d; }
  .f-vesper { --c: #5f4682; }
  @media (prefers-reduced-motion: reduce) { .banner { transition: none; } }
</style>
