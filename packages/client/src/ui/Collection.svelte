<script lang="ts">
  import { CARDS } from "@tcg/cards";
  import { breakCard, breakExtras, craftCard, CRAFT_COST, extraCopies, owned, SHARD_VALUE } from "@tcg/meta";
  import type { Translator } from "@tcg/i18n";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import CardTile from "./CardTile.svelte";
  import HdCard from "./HdCard.svelte";
  import { ALL, filterCards } from "./cardFilter.ts";
  import FactionFilter from "./FactionFilter.svelte";

  let { tr, onBack }: { tr: Translator; onBack: () => void } = $props();

  let faction = $state(ALL);
  let text = $state("");
  let ownedOnly = $state(false);
  let selected = $state<string | null>(null);

  const collection = $derived(profileStore.profile.collection);
  const cards = $derived(filterCards(tr, { faction, text, maxCost: null }, (c) => !ownedOnly || owned(collection, c.id) > 0));
  const extras = $derived(Object.values(extraCopies(collection)).reduce((a, b) => a + b, 0));
  const total = $derived(Object.values(collection.cards).reduce((a, b) => a + b, 0));
  const sel = $derived(selected ? CARDS[selected] : undefined);
  /** Counts the cards crafted in this visit: the big card plays its animation again for each one. */
  let crafted = $state(0);
  const bigWidth = window.innerWidth < 760 ? 130 : 240;
  function craft() {
    if (!selected) return;
    const id = selected;
    profileStore.update((p) => craftCard(p.collection, id));
    crafted++;
  }
</script>

<main class="page screen">
  <header class="bar panel">
    <button onclick={onBack}>{tr.t("ui.menu")}</button>
    <h2>{tr.t("meta.collection")}</h2>
    <span class="count">{tr.t("meta.cardsOwned", { count: total })}</span>
    <span class="shards"><i aria-hidden="true"></i>{tr.t("meta.shards", { count: collection.shards })}</span>
    <button disabled={extras === 0} onclick={() => profileStore.update((p) => breakExtras(p.collection))}>{tr.t("meta.breakExtras", { count: extras })}</button>
  </header>
  <div class="filters">
    <FactionFilter {tr} bind:value={faction} />
    <input bind:value={text} placeholder={tr.t("meta.search")} aria-label={tr.t("meta.search")} />
    <label><input type="checkbox" bind:checked={ownedOnly} /> {tr.t("meta.ownedOnly")}</label>
  </div>
  <div class="cols">
    <div class="grid">
      {#each cards as c (c.id)}
        <CardTile {tr} cardId={c.id} count={owned(collection, c.id)} dim={owned(collection, c.id) === 0} selected={selected === c.id} onclick={() => (selected = selected === c.id ? null : c.id)} />
      {/each}
    </div>
    {#if sel && selected}
      <aside class="detail panel">
        {#key crafted}
          <div class="big" class:glow={crafted > 0}><HdCard def={sel} {tr} width={bigWidth} /></div>
        {/key}
        <span class="copies">{tr.t("meta.copies", { count: owned(collection, selected) })}</span>
        <div class="actions">
          <button class="primary" disabled={collection.shards < CRAFT_COST[sel.rarity]} onclick={craft}>
            {tr.t("meta.craft", { cost: CRAFT_COST[sel.rarity] })}
          </button>
          <button disabled={owned(collection, selected) === 0} onclick={() => profileStore.update((p) => breakCard(p.collection, selected!))}>
            {tr.t("meta.break", { value: SHARD_VALUE[sel.rarity] })}
          </button>
          <button class="close" onclick={() => (selected = null)} aria-label={tr.t("ui.close")}>×</button>
        </div>
      </aside>
    {/if}
  </div>
</main>

<style>
  .page { max-width: 1280px; margin: 0 auto; padding: 12px 16px 24px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; padding: 10px 14px; margin-bottom: 12px; }
  .bar h2 { margin: 0; flex: 1; color: var(--gold); font-size: 26px; }
  .count { color: #d6c9a8; }
  .shards { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: #bfe8ff; }
  .shards i { width: 12px; height: 16px; background: linear-gradient(#e8fbff, #6fc6e8 60%, #2d6f9a); clip-path: polygon(50% 0, 100% 35%, 75% 100%, 25% 100%, 0 35%); filter: drop-shadow(0 0 4px #7fd8ff); }
  .filters { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; margin-bottom: 14px; }
  .filters input:not([type]) { min-width: 180px; }
  .cols { display: flex; gap: 16px; align-items: flex-start; }
  .grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, 136px); gap: 14px 10px; justify-content: center; }
  .detail { position: sticky; top: 12px; width: 280px; padding: 18px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .copies { color: #d6c9a8; }
  .actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  .close { position: absolute; top: 6px; right: 6px; width: 30px; height: 30px; min-height: 0; padding: 0; border-radius: 50%; }
  .glow { animation: crafted 0.9s ease-out; }
  @keyframes crafted {
    0% { transform: scale(0.85) rotateY(90deg); filter: brightness(3) drop-shadow(0 0 30px #fff3c0); }
    50% { transform: scale(1.05) rotateY(0); filter: brightness(1.6) drop-shadow(0 0 24px #fbd35a); }
    100% { transform: none; filter: none; }
  }
  @media (max-width: 760px) {
    .grid { grid-template-columns: repeat(auto-fill, 136px); }
    .detail { position: fixed; left: 0; right: 0; bottom: 0; top: auto; width: auto; z-index: 20; border-radius: 12px 12px 0 0; flex-direction: row; flex-wrap: wrap; justify-content: center; }
  }
  @media (prefers-reduced-motion: reduce) { .glow { animation: none; } }
</style>
