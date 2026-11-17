<script lang="ts">
  import { untrack } from "svelte";
  import { CARDS, DECK_SIZE } from "@tcg/cards";
  import { deckProblems, deckSize, maxCopies, owned, type SavedDeck } from "@tcg/meta";
  import { cardName, type Translator } from "@tcg/i18n";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import CardTile from "./CardTile.svelte";
  import { ALL, filterCards } from "./cardFilter.ts";
  import FactionFilter from "./FactionFilter.svelte";
  import { problemText } from "./deckText.ts";
  import { hdArtUrl } from "./HdCard.svelte";

  interface Props {
    tr: Translator;
    deck: SavedDeck;
    onSave: (deck: SavedDeck) => void;
    onCancel: () => void;
  }
  let { tr, deck, onSave, onCancel }: Props = $props();

  // The editor works on a copy. The profile changes only on Save.
  // A starter deck shows its translated name: "Copia di Fucina". Saving it makes a new deck.
  let name = $state(untrack(() => (deck.id.startsWith("starter-") ? tr.t("meta.copyOf", { name: tr.t(`deckNames.${deck.name}`) }) : deck.name)));
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
  /** Copies by cost, from 0 to 7 or more: the cost curve (graphics plan, phase 7). */
  const curve = $derived.by(() => {
    const c = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const [id, n] of Object.entries(cards)) c[Math.min(CARDS[id]!.cost, 7)]! += n;
    return c;
  });
  const curveMax = $derived(Math.max(4, ...curve));
  let dragOver = $state<"pool" | "list" | null>(null);

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
    onSave({ id, name: name.trim().slice(0, 40) || tr.t("meta.newDeck"), cards: { ...cards } });
  }
</script>

<main class="editor screen">
  <header class="bar panel">
    <button onclick={onCancel}>{tr.t("ui.cancel")}</button>
    <input bind:value={name} maxlength="40" aria-label={tr.t("meta.deckName")} />
    <span class="size" class:ok={size === DECK_SIZE}>{size}/{DECK_SIZE}</span>
    <button class="primary" onclick={save}>{tr.t("meta.save")}</button>
  </header>
  {#if problems.length}
    <ul class="problems">{#each problems as p}<li>{problemText(tr, p)}</li>{/each}</ul>
  {/if}
  <div class="cols">
    <section
      class="pool"
      aria-label={tr.t("meta.collection")}
      class:target={dragOver === "pool"}
      ondragover={(e) => { e.preventDefault(); dragOver = "pool"; }}
      ondragleave={() => (dragOver = null)}
      ondrop={(e) => { e.preventDefault(); dragOver = null; const id = e.dataTransfer?.getData("text/x-deck"); if (id) remove(id); }}
    >
      <div class="filters">
        <FactionFilter {tr} bind:value={faction} />
        <input bind:value={text} placeholder={tr.t("meta.search")} aria-label={tr.t("meta.search")} />
      </div>
      <p class="hint">{tr.t("meta.editorHint")}</p>
      <div class="grid">
        {#each pool as c (c.id)}
          <CardTile {tr} cardId={c.id} count={owned(collection, c.id) - (cards[c.id] ?? 0)} dim={!canAdd(c.id)} onclick={() => add(c.id)} draggable />
        {/each}
      </div>
    </section>
    <section
      class="list panel"
      class:target={dragOver === "list"}
      aria-label={tr.t("meta.deckList")}
      ondragover={(e) => { e.preventDefault(); dragOver = "list"; }}
      ondragleave={() => (dragOver = null)}
      ondrop={(e) => { e.preventDefault(); dragOver = null; const id = e.dataTransfer?.getData("text/plain"); if (id) add(id); }}
    >
      <h3>{tr.t("meta.deckList")}</h3>
      <div class="curve" aria-hidden="true">
        {#each curve as n, cost}
          <div class="bar-col"><span class="bar" style="height: {(n / curveMax) * 100}%"><b>{n || ""}</b></span><span class="cost">{cost === curve.length - 1 ? `${cost}+` : cost}</span></div>
        {/each}
      </div>
      {#each list as [id, n] (id)}
        {@const art = hdArtUrl(id, "sm")}
        <button
          class="row f-{CARDS[id]!.faction}"
          onclick={() => remove(id)}
          draggable="true"
          ondragstart={(e) => e.dataTransfer?.setData("text/x-deck", id)}
          style={art ? `--art: url(${art})` : ""}
        >
          <span class="c">{CARDS[id]!.cost}</span>
          <span class="n">{cardName(tr, id)}</span>
          <span class="x">×{n}</span>
        </button>
      {/each}
    </section>
  </div>
</main>

<style>
  .editor { max-width: 1320px; margin: 0 auto; padding: 12px 16px 24px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 10px 14px; margin-bottom: 10px; }
  .bar input { flex: 1; min-width: 140px; font-family: Alegreya, Georgia, serif; font-size: 20px; font-weight: 700; }
  .size { font-family: Alegreya, Georgia, serif; font-weight: 700; font-size: 18px; color: #d6c9a8; }
  .ok { color: #9be3a6; }
  .filters { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; margin-bottom: 8px; }
  .problems { color: #ffb0a0; margin: 0 0 10px; padding-left: 18px; font-size: 13px; }
  .cols { display: flex; gap: 16px; align-items: flex-start; }
  .pool { flex: 1; min-width: 0; border-radius: 10px; padding: 4px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, 136px); gap: 14px 10px; justify-content: center; }
  .target { outline: 2px dashed var(--gold); outline-offset: 2px; }
  .list { width: 270px; position: sticky; top: 8px; display: flex; flex-direction: column; gap: 3px; padding: 12px; max-height: calc(100dvh - 24px); overflow: auto; }
  .list h3 { margin: 0 0 6px; color: var(--gold); }
  .curve { display: flex; gap: 4px; height: 70px; align-items: stretch; margin-bottom: 8px; padding-bottom: 2px; border-bottom: 1px solid rgb(217 181 106 / 0.35); }
  .bar-col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 2px; }
  .bar { width: 100%; min-height: 2px; display: flex; justify-content: center; border-radius: 3px 3px 0 0; background: linear-gradient(#f6cd6a, #a8742c); transition: height 0.2s ease-out; }
  .bar b { font-size: 10px; color: #2a1a08; line-height: 1.2; }
  .bar-col .cost { font-size: 11px; color: #bfe8ff; font-weight: 700; }
  .row {
    position: relative; display: flex; gap: 8px; align-items: center; text-align: left; padding: 4px 8px; min-height: 0; overflow: hidden; font-size: 14px; box-shadow: none; color: #fff4dc;
    border: 0; border-left: 4px solid var(--faction, #888); border-radius: 4px;
    background: linear-gradient(90deg, rgb(10 14 22 / 0.95) 35%, rgb(10 14 22 / 0.35)), var(--art, none) 80% 30% / 60% auto no-repeat, #141c28;
  }
  .row .n { flex: 1; font-size: 14px; line-height: 1.2; font-family: Alegreya, Georgia, serif; font-weight: 700; text-shadow: 0 1px 2px #000; }
  .row .c { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; font-weight: 700; color: #fff; background: radial-gradient(circle at 35% 30%, #8fd0ff, #2a5f9a); font-size: 12px; }
  .row .x { color: var(--gold); font-weight: 700; }
  .hint { font-size: 12px; opacity: 0.75; margin: 0 0 8px; }
  .f-forge { --faction: #e0703a; } .f-sprout { --faction: #5fbf6a; } .f-abyss { --faction: #4a6fd1; }
  .f-gear { --faction: #c9a64b; } .f-vesper { --faction: #9b6fd1; } .f-neutral { --faction: #8a94a6; }
  @media (max-width: 700px) {
    .cols { flex-direction: column-reverse; }
    .list { width: 100%; position: static; max-height: none; }
  }
</style>
