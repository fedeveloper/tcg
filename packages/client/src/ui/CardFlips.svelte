<script lang="ts">
  import { CARDS } from "@tcg/cards";
  import type { Translator } from "@tcg/i18n";
  import CardBack from "./CardBack.svelte";
  import HdCard from "./HdCard.svelte";

  /** New cards of a reward: each card turns from its back to its face, one after the other (graphics plan, phase 7). */
  let { tr, cards, width = 150 }: { tr: Translator; cards: readonly string[]; width?: number } = $props();
</script>

<div class="flips">
  {#each cards as id, i}
    <div class="flip" style="--i: {i}; --w: {width}px">
      <div class="face back"><CardBack {width} /></div>
      <div class="face front"><HdCard def={CARDS[id]!} {tr} {width} /></div>
    </div>
  {/each}
</div>

<style>
  .flips { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
  .flip { position: relative; width: var(--w); aspect-ratio: 5 / 7; perspective: 800px; }
  .face { position: absolute; inset: 0; backface-visibility: hidden; animation: 0.6s cubic-bezier(0.3, 0, 0.2, 1) calc(0.4s + var(--i) * 0.35s) both; }
  .back { animation-name: turn-back; }
  .front { animation-name: turn-front; }
  @keyframes turn-back { from { transform: rotateY(0); } to { transform: rotateY(180deg); } }
  @keyframes turn-front { from { transform: rotateY(-180deg); } to { transform: rotateY(0); } }
  @media (prefers-reduced-motion: reduce) { .face { animation-duration: 0.01s; animation-delay: 0s; } }
</style>
