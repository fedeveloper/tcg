<script lang="ts">
  import { DECK_SIZE } from "@tcg/cards";
  import { deckProblems, deckSize, deleteDeck, saveDeck, type SavedDeck } from "@tcg/meta";
  import type { Translator } from "@tcg/i18n";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import DeckEditor from "./DeckEditor.svelte";
  import { deckFaction, deckLabel, FACTION_ART } from "./deckText.ts";
  import { hdArtUrl } from "./HdCard.svelte";

  let { tr, onBack }: { tr: Translator; onBack: () => void } = $props();
  let editing = $state.raw<SavedDeck | null>(null);

  const decks = $derived(profileStore.profile.decks);

  function newDeck() {
    editing = { id: `deck-${Date.now()}`, name: tr.t("meta.newDeck"), cards: {} };
  }
  function onSave(d: SavedDeck) {
    profileStore.update((p) => saveDeck(p, d));
    editing = null;
  }
</script>

{#if editing}
  <DeckEditor {tr} deck={editing} {onSave} onCancel={() => (editing = null)} />
{:else}
  <main class="page screen">
    <header class="bar panel">
      <button onclick={onBack}>{tr.t("ui.menu")}</button>
      <h2>{tr.t("meta.decks")}</h2>
      <button class="primary" onclick={newDeck}>{tr.t("meta.newDeck")}</button>
    </header>
    <ul>
      {#each decks as d (d.id)}
        {@const valid = deckProblems(profileStore.profile.collection, d.cards).length === 0}
        {@const faction = deckFaction(d.cards)}
        {@const art = hdArtUrl(FACTION_ART[faction] ?? "neutral-006", "md")}
        <li class="f-{faction}" style={art ? `--art: url(${art})` : ""}>
          <span class="name">{deckLabel(tr, d)}</span>
          <span class="size" class:bad={!valid}>{deckSize(d.cards)}/{DECK_SIZE} {valid ? "" : `· ${tr.t("meta.invalid")}`}</span>
          <button onclick={() => (editing = d)}>{tr.t("meta.edit")}</button>
          {#if !d.id.startsWith("starter-")}
            <button onclick={() => profileStore.update((p) => deleteDeck(p, d.id))}>{tr.t("meta.delete")}</button>
          {/if}
        </li>
      {/each}
    </ul>
  </main>
{/if}

<style>
  .page { max-width: 760px; margin: 0 auto; padding: 12px 16px 24px; }
  .bar { display: flex; gap: 10px; align-items: center; padding: 10px 14px; margin-bottom: 14px; }
  h2 { margin: 0; color: var(--gold); flex: 1; font-size: 26px; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  li {
    --c: #6f6f6f;
    display: flex; flex-wrap: wrap; gap: 10px; align-items: center; min-height: 72px; padding: 10px 14px 10px 22px; border-radius: 8px;
    background: linear-gradient(90deg, var(--c) 0 8px, rgb(8 12 20 / 0.92) 8px, rgb(8 12 20 / 0.75) 45%, rgb(8 12 20 / 0.15)), var(--art, none) right 30% / 60% auto no-repeat, #0d1622;
    box-shadow: 0 0 0 1px var(--gold-d), 0 3px 8px rgb(0 0 0 / 0.5);
  }
  .name { flex: 1; font-family: Alegreya, Georgia, serif; font-weight: 700; font-size: 20px; color: #fff4dc; text-shadow: 0 1px 2px #000; }
  .size { color: #d6c9a8; text-shadow: 0 1px 2px #000; }
  .bad { color: #ffb0a0; }
  .f-forge { --c: #a8432f; } .f-sprout { --c: #3f7d4f; } .f-abyss { --c: #24406a; }
  .f-gear { --c: #8c6d3d; } .f-vesper { --c: #5f4682; }
</style>
