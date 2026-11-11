<script lang="ts">
  import { CARDS } from "@tcg/cards";
  import {
    chooseDraftFactions,
    choosePick,
    claimRunReward,
    DRAFT_DECK,
    DRAFT_MAX_LOSSES,
    DRAFT_MAX_WINS,
    EXPEDITION_FACTIONS,
    nextOpponent,
    readyToPlay,
    startDraft,
    startExpedition,
    withRandom,
    type RunOpponent,
  } from "@tcg/meta";
  import { cardName, type Translator } from "@tcg/i18n";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import CardTile from "./CardTile.svelte";

  interface Props {
    tr: Translator;
    kind: "expedition" | "draft";
    onPlay: (deck: string[], opponent: RunOpponent) => void;
    onBack: () => void;
  }
  let { tr, kind, onPlay, onBack }: Props = $props();

  let reward = $state.raw<{ cards: string[]; shards: number } | null>(null);

  const run = $derived(profileStore.profile.run);
  const mine = $derived(run && run.kind === kind ? run : null);
  const other = $derived(run && run.kind !== kind ? run : null);
  const opponent = $derived(mine ? nextOpponent(mine) : null);
  const deckList = $derived(
    mine
      ? Object.entries(mine.deck.reduce<Record<string, number>>((m, id) => ((m[id] = (m[id] ?? 0) + 1), m), {})).sort(
          ([a], [b]) => CARDS[a]!.cost - CARDS[b]!.cost || a.localeCompare(b),
        )
      : [],
  );

  function seed(): number {
    return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  }
  function start(faction?: string) {
    profileStore.update((p) => (p.run = faction ? startExpedition(seed(), faction) : startDraft(seed())));
  }
  function abandon() {
    profileStore.update((p) => (p.run = null));
  }
  function pick(id: string | null) {
    profileStore.update((p) => p.run && choosePick(p.run, id));
  }
  function claim() {
    reward = profileStore.update((p) => {
      const r = p.run ? withRandom(p, (rng) => claimRunReward(p.run!, p.collection, rng)) : null;
      p.run = null;
      return r;
    });
  }
</script>

<main class="page">
  <header>
    <button onclick={onBack}>{tr.t("ui.menu")}</button>
    <h2>{tr.t(`meta.${kind}`)}</h2>
  </header>

  {#if reward}
    <section>
      <h3>{tr.t("meta.reward")}</h3>
      {#if reward.shards}<p>{tr.t("meta.shardsGained", { count: reward.shards })}</p>{/if}
      <div class="grid">{#each reward.cards as id}<CardTile {tr} cardId={id} />{/each}</div>
      <button class="primary" onclick={() => (reward = null)}>{tr.t("meta.continue")}</button>
    </section>
  {:else if other}
    <p>{tr.t("meta.otherRunActive", { mode: tr.t(`meta.${other.kind}`) })}</p>
    <button onclick={abandon}>{tr.t("meta.abandon")}</button>
  {:else if !mine}
    <p>{tr.t(`meta.${kind}Intro`)}</p>
    {#if kind === "expedition"}
      <div class="choices">
        {#each EXPEDITION_FACTIONS as f}<button class="f-{f}" onclick={() => start(f)}>{tr.t(`factions.${f}`)}</button>{/each}
      </div>
    {:else}
      <button class="primary" onclick={() => start()}>{tr.t("meta.startDraft")}</button>
    {/if}
  {:else}
    <p class="status">
      {tr.t("meta.record", { wins: mine.wins, losses: mine.losses })}
      {#if mine.kind === "expedition"}· {tr.t("meta.lives", { count: mine.lives })} · {tr.t("meta.stage", { n: Math.min(mine.wins + 1, mine.opponents.length), total: mine.opponents.length })}{/if}
      {#if mine.kind === "draft"}· {tr.t("meta.draftLimits", { wins: DRAFT_MAX_WINS, losses: DRAFT_MAX_LOSSES })}{/if}
    </p>

    {#if mine.status !== "active"}
      <h3>{tr.t(mine.status === "won" ? "meta.runWon" : "meta.runLost")}</h3>
      <button class="primary" onclick={claim}>{tr.t("meta.claim")}</button>
    {:else if mine.kind === "draft" && mine.factionChoices.length}
      <h3>{tr.t("meta.chooseFactions")}</h3>
      <div class="choices">
        {#each mine.factionChoices as pair, i}
          <button onclick={() => profileStore.update((p) => p.run?.kind === "draft" && chooseDraftFactions(p.run, i))}>
            {pair.map((f) => tr.t(`factions.${f}`)).join(" + ")}
          </button>
        {/each}
      </div>
    {:else if mine.pick}
      <h3>{mine.kind === "draft" ? tr.t("meta.draftPick", { n: mine.deck.length + 1, total: DRAFT_DECK }) : tr.t("meta.chooseCard")}</h3>
      <div class="grid">
        {#each mine.pick.options as id (id)}<CardTile {tr} cardId={id} onclick={() => pick(id)} />{/each}
      </div>
      {#if mine.kind === "expedition"}<button onclick={() => pick(null)}>{tr.t("meta.skip")}</button>{/if}
    {:else if opponent && readyToPlay(mine)}
      <p>
        {tr.t(opponent.boss ? "meta.nextBoss" : "meta.nextOpponent", { deck: tr.t(`deckNames.${opponent.deck}`) })}
        ({tr.t(`ui.levels.${opponent.level}`)})
      </p>
      <button class="primary" onclick={() => onPlay([...mine.deck], opponent)}>{tr.t("ui.start")}</button>
    {/if}

    {#if deckList.length}
      <h3>{tr.t("meta.runDeck", { count: mine.deck.length })}</h3>
      <ul class="deck">
        {#each deckList as [id, n] (id)}<li><b>{CARDS[id]!.cost}</b> {cardName(tr, id)} ×{n}</li>{/each}
      </ul>
    {/if}
    {#if mine.status === "active"}<button class="danger" onclick={abandon}>{tr.t("meta.abandon")}</button>{/if}
  {/if}
</main>

<style>
  .page { max-width: 900px; margin: 0 auto; padding: 12px 16px; }
  header { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  h2 { margin: 0; color: var(--accent); }
  .choices, .grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .deck { columns: 2; font-size: 13px; padding-left: 16px; }
  .status { font-weight: bold; }
  .danger { margin-top: 16px; }
</style>
