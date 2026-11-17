<script lang="ts">
  import { CARDS } from "@tcg/cards";
  import { cardName, cardSummary, type Translator } from "@tcg/i18n";
  import HdCard from "./HdCard.svelte";

  interface Props {
    tr: Translator;
    cardId: string;
    /** Copies shown in the corner (owned cards, or copies in a deck). */
    count?: number | null;
    /** Shows the card in grey (not owned, or not available). */
    dim?: boolean;
    selected?: boolean;
    /** Width of the card in CSS pixels (graphics plan, phase 7: the painted HD card in every list). */
    width?: number;
    onclick?: () => void;
    /** Drag and drop: the card id travels in the "text/plain" data. */
    draggable?: boolean;
  }
  let { tr, cardId, count = null, dim = false, selected = false, width = 136, onclick, draggable = false }: Props = $props();

  const def = $derived(CARDS[cardId]!);
</script>

<button
  class="tile"
  class:dim
  class:selected
  type="button"
  {onclick}
  disabled={!onclick}
  title={cardName(tr, cardId)}
  aria-label={cardSummary(tr, def)}
  draggable={draggable && !dim}
  ondragstart={(e) => e.dataTransfer?.setData("text/plain", cardId)}
  style="--w: {width}px"
>
  <HdCard {def} {tr} {width} foil={selected} />
  {#if count !== null}<span class="count">×{count}</span>{/if}
</button>

<style>
  .tile {
    position: relative; display: block; width: var(--w); padding: 0; border: 0; background: none; box-shadow: none; cursor: pointer;
    border-radius: calc(var(--w) * 0.06); transition: transform 0.12s ease-out, filter 0.12s;
  }
  .tile:hover:not(:disabled) { transform: translateY(-3px); filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.5)); background: none; }
  .tile:disabled { cursor: default; opacity: 1; }
  .tile.dim { filter: grayscale(0.85) brightness(0.6); }
  .tile.selected { filter: drop-shadow(0 0 8px var(--accent, #ffd166)) drop-shadow(0 0 2px var(--accent, #ffd166)); }
  .count {
    position: absolute; top: -6px; right: -6px; z-index: 3; min-width: 26px; padding: 2px 6px; border-radius: 12px;
    font-family: Alegreya, Georgia, serif; font-weight: 700; font-size: 14px; color: #2a1a08; background: linear-gradient(#fff2c0, #e2b252); box-shadow: 0 1px 3px rgb(0 0 0 / 0.6);
  }
  @media (prefers-reduced-motion: reduce) { .tile { transition: none; } }
</style>
