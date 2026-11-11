<script lang="ts">
  import { CARDS } from "@tcg/cards";
  import { cardName, cardRulesText, keywordName, type Translator } from "@tcg/i18n";
  import { cardArtStyle } from "./cardArt.ts";

  interface Props {
    tr: Translator;
    cardId: string;
    /** Copies shown in the corner (owned cards, or copies in a deck). */
    count?: number | null;
    /** Shows the card in grey (not owned, or not available). */
    dim?: boolean;
    selected?: boolean;
    onclick?: () => void;
  }
  let { tr, cardId, count = null, dim = false, selected = false, onclick }: Props = $props();

  const def = $derived(CARDS[cardId]!);
  const art = $derived(cardArtStyle(cardId));
  const lines = $derived(cardRulesText(tr, def));
</script>

<button class="tile f-{def.faction}" class:dim class:selected type="button" {onclick} disabled={!onclick} title={cardName(tr, cardId)}>
  <span class="cost">{def.cost}</span>
  <span class="name">{cardName(tr, cardId)}</span>
  {#if art}<span class="art" style={art}></span>{:else}<span class="art empty"></span>{/if}
  <span class="type">{tr.t(`types.${def.type}`)} · {tr.t(`rarities.${def.rarity}`)}</span>
  {#if def.keywords.length}<span class="kw">{def.keywords.map((k) => keywordName(tr, k)).join(", ")}</span>{/if}
  {#each lines as l}<span class="rule">{l}</span>{/each}
  {#if def.type === "keeper"}<span class="stats">{def.attack}/{def.hold}</span>{/if}
  {#if count !== null}<span class="count">×{count}</span>{/if}
</button>

<style>
  .tile {
    position: relative; display: flex; flex-direction: column; gap: 3px; width: 136px; min-height: 196px; padding: 6px;
    text-align: left; font-size: 11px; line-height: 1.25; border: 2px solid var(--faction, #888); border-radius: 6px;
    background: var(--panel, #1c2433); color: inherit; cursor: pointer;
  }
  .tile:disabled { cursor: default; opacity: 1; }
  .tile.dim { opacity: 0.45; }
  .tile.selected { outline: 3px solid var(--accent, #ffd166); }
  .cost { position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 50%; background: #e8a33d; color: #111; font-weight: bold; text-align: center; line-height: 20px; }
  .name { font-weight: bold; padding: 0 22px 0 24px; min-height: 28px; }
  .art { width: 112px; height: 80px; align-self: center; image-rendering: pixelated; background-color: #0b1220; }
  .type { opacity: 0.75; }
  .kw { font-style: italic; }
  .stats { margin-top: auto; align-self: flex-end; font-weight: bold; font-size: 13px; }
  .count { position: absolute; top: 4px; right: 6px; font-weight: bold; color: var(--accent, #ffd166); }
  .f-forge { --faction: #e0703a; }
  .f-sprout { --faction: #5fbf6a; }
  .f-abyss { --faction: #4a6fd1; }
  .f-gear { --faction: #c9a64b; }
  .f-vesper { --faction: #9b6fd1; }
  .f-neutral { --faction: #8a94a6; }
</style>
