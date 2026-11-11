<script lang="ts">
  import { CARDS } from "@tcg/cards";
  import { breakCard, breakExtras, craftCard, CRAFT_COST, extraCopies, owned, SHARD_VALUE } from "@tcg/meta";
  import type { Translator } from "@tcg/i18n";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import CardTile from "./CardTile.svelte";
  import { ALL, filterCards, FILTER_FACTIONS } from "./cardFilter.ts";

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
</script>

<main class="page">
  <header>
    <button onclick={onBack}>{tr.t("ui.menu")}</button>
    <h2>{tr.t("meta.collection")}</h2>
    <span>{tr.t("meta.cardsOwned", { count: total })}</span>
    <span class="shards">{tr.t("meta.shards", { count: collection.shards })}</span>
    <button disabled={extras === 0} onclick={() => profileStore.update((p) => breakExtras(p.collection))}>{tr.t("meta.breakExtras", { count: extras })}</button>
  </header>
  <div class="filters">
    <select bind:value={faction} aria-label={tr.t("meta.faction")}>
      {#each FILTER_FACTIONS as f}<option value={f}>{f === ALL ? tr.t("meta.allFactions") : tr.t(`factions.${f}`)}</option>{/each}
    </select>
    <input bind:value={text} placeholder={tr.t("meta.search")} aria-label={tr.t("meta.search")} />
    <label><input type="checkbox" bind:checked={ownedOnly} /> {tr.t("meta.ownedOnly")}</label>
  </div>
  {#if sel && selected}
    <div class="detail">
      <span>{tr.t("meta.copies", { count: owned(collection, selected) })}</span>
      <button disabled={collection.shards < CRAFT_COST[sel.rarity]} onclick={() => profileStore.update((p) => craftCard(p.collection, selected!))}>
        {tr.t("meta.craft", { cost: CRAFT_COST[sel.rarity] })}
      </button>
      <button disabled={owned(collection, selected) === 0} onclick={() => profileStore.update((p) => breakCard(p.collection, selected!))}>
        {tr.t("meta.break", { value: SHARD_VALUE[sel.rarity] })}
      </button>
    </div>
  {/if}
  <div class="grid">
    {#each cards as c (c.id)}
      <CardTile {tr} cardId={c.id} count={owned(collection, c.id)} dim={owned(collection, c.id) === 0} selected={selected === c.id} onclick={() => (selected = selected === c.id ? null : c.id)} />
    {/each}
  </div>
</main>

<style>
  .page { max-width: 1100px; margin: 0 auto; padding: 12px 16px; }
  header, .filters, .detail { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
  h2 { margin: 0; color: var(--accent); }
  .shards { font-weight: bold; }
  .detail { position: sticky; top: 0; z-index: 1; padding: 8px; background: var(--bg, #0e1420); border: 1px solid #334; border-radius: 6px; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
