<script lang="ts">
  import { untrack } from "svelte";
  import { CARDS, DECK_SIZE } from "@tcg/cards";
  import { deckProblems, deckSize, maxCopies, owned, type SavedDeck } from "@tcg/meta";
  import { cardName, type Translator } from "@tcg/i18n";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import CardTile from "./CardTile.svelte";
  import { ALL, filterCards, FILTER_FACTIONS } from "./cardFilter.ts";
  import { problemText } from "./deckText.ts";

  interface Props {
    tr: Translator;
    deck: SavedDeck;
    onSave: (deck: SavedDeck) => void;
    onCancel: () => void;
  }
  let { tr, deck, onSave, onCancel }: Props = $props();

  // The editor works on a copy. The profile changes only on Save.
  let name = $state(untrack(() => deck.name));
  let cards = $state<Record<string, number>>(untrack(() => ({ ...deck.cards })));
  let faction = $state(ALL);
  let text = $state("");

  const collection = $derived(profileStore.profile.collection);
  const pool = $derived(filterCards(tr, { faction, text, maxCost: null }, (c) => owned(collection, c.id) > 0));
  const size = $derived(deckSize(cards));
  const problems = $derived(deckProblems(collection, cards));
  const list = $derived(
    Object.entries(cards)
      .filter(([, n]) => n > 0)
      .sort(([a], [b]) => CARDS[a]!.cost - CARDS[b]!.cost || a.localeCompare(b)),
  );
  const isStarter = $derived(deck.id.startsWith("starter-"));

  function canAdd(id: string): boolean {
    const n = cards[id] ?? 0;
    return n < owned(collection, id) && n < maxCopies(CARDS[id]!) && size < DECK_SIZE;
  }
  function add(id: string) {
    if (canAdd(id)) cards[id] = (cards[id] ?? 0) + 1;
  }
  function remove(id: string) {
    const n = (cards[id] ?? 0) - 1;
    if (n <= 0) delete cards[id];
    else cards[id] = n;
  }
  function save() {
    // A changed starter deck becomes a new deck, so the starter decks stay as they are.
    const id = isStarter ? `deck-${Date.now()}` : deck.id;
    const label = isStarter && name === deck.name ? tr.t("meta.copyOf", { name: tr.t(`deckNames.${deck.name}`) }) : name;
    onSave({ id, name: label.trim().slice(0, 40) || tr.t("meta.newDeck"), cards: { ...cards } });
  }
</script>

<main class="editor">
  <header>
    <button onclick={onCancel}>{tr.t("ui.cancel")}</button>
    <input bind:value={name} maxlength="40" aria-label={tr.t("meta.deckName")} />
    <span class:ok={size === DECK_SIZE}>{size}/{DECK_SIZE}</span>
    <button class="primary" onclick={save}>{tr.t("meta.save")}</button>
  </header>
  {#if problems.length}
    <ul class="problems">{#each problems as p}<li>{problemText(tr, p)}</li>{/each}</ul>
  {/if}
  <div class="cols">
    <section class="pool">
      <div class="filters">
        <select bind:value={faction} aria-label={tr.t("meta.faction")}>
          {#each FILTER_FACTIONS as f}<option value={f}>{f === ALL ? tr.t("meta.allFactions") : tr.t(`factions.${f}`)}</option>{/each}
        </select>
        <input bind:value={text} placeholder={tr.t("meta.search")} aria-label={tr.t("meta.search")} />
      </div>
      <p class="hint">{tr.t("meta.editorHint")}</p>
      <div class="grid">
        {#each pool as c (c.id)}
          <CardTile {tr} cardId={c.id} count={owned(collection, c.id) - (cards[c.id] ?? 0)} dim={!canAdd(c.id)} onclick={() => add(c.id)} />
        {/each}
      </div>
    </section>
    <section class="list">
      <h3>{tr.t("meta.deckList")}</h3>
      {#each list as [id, n] (id)}
        <button class="row f-{CARDS[id]!.faction}" onclick={() => remove(id)}>
          <span class="c">{CARDS[id]!.cost}</span>
          <span class="n">{cardName(tr, id)}</span>
          <span>×{n}</span>
        </button>
      {/each}
    </section>
  </div>
</main>

<style>
  .editor { max-width: 1200px; margin: 0 auto; padding: 12px 16px; }
  header, .filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
  header input { flex: 1; min-width: 140px; }
  .ok { color: #7bd88f; font-weight: bold; }
  .problems { color: #ff9a8a; margin: 0 0 10px; padding-left: 18px; font-size: 13px; }
  .cols { display: flex; gap: 14px; align-items: flex-start; }
  .pool { flex: 1; min-width: 0; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .list { width: 240px; position: sticky; top: 8px; display: flex; flex-direction: column; gap: 3px; }
  .list h3 { margin: 0 0 6px; }
  .row { display: flex; gap: 8px; align-items: center; text-align: left; border-left: 4px solid var(--faction, #888); padding: 4px 8px; }
  .row .n { flex: 1; }
  .row .c { font-weight: bold; color: #e8a33d; }
  .hint { font-size: 12px; opacity: 0.75; margin: 0 0 8px; }
  .f-forge { --faction: #e0703a; } .f-sprout { --faction: #5fbf6a; } .f-abyss { --faction: #4a6fd1; }
  .f-gear { --faction: #c9a64b; } .f-vesper { --faction: #9b6fd1; } .f-neutral { --faction: #8a94a6; }
  @media (max-width: 700px) {
    .cols { flex-direction: column-reverse; }
    .list { width: 100%; position: static; }
  }
</style>
