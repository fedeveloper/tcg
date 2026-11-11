<script lang="ts">
  import { DECK_SIZE } from "@tcg/cards";
  import { deckProblems, deckSize, deleteDeck, saveDeck, type SavedDeck } from "@tcg/meta";
  import type { Translator } from "@tcg/i18n";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import DeckEditor from "./DeckEditor.svelte";
  import { deckLabel } from "./deckText.ts";

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
  <main class="page">
    <header>
      <button onclick={onBack}>{tr.t("ui.menu")}</button>
      <h2>{tr.t("meta.decks")}</h2>
      <button class="primary" onclick={newDeck}>{tr.t("meta.newDeck")}</button>
    </header>
    <ul>
      {#each decks as d (d.id)}
        {@const valid = deckProblems(profileStore.profile.collection, d.cards).length === 0}
        <li>
          <span class="name">{deckLabel(tr, d)}</span>
          <span class:bad={!valid}>{deckSize(d.cards)}/{DECK_SIZE} {valid ? "" : `· ${tr.t("meta.invalid")}`}</span>
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
  .page { max-width: 640px; margin: 0 auto; padding: 12px 16px; }
  header { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  h2 { margin: 0; color: var(--accent); flex: 1; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  li { display: flex; gap: 10px; align-items: center; padding: 6px 8px; border: 1px solid #334; border-radius: 6px; }
  .name { flex: 1; font-weight: bold; }
  .bad { color: #ff9a8a; }
</style>
