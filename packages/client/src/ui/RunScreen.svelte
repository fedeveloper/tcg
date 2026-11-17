<script lang="ts">
  import { CARDS, STARTER_DECKS } from "@tcg/cards";
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
  import CardFlips from "./CardFlips.svelte";
  import Banner from "./Banner.svelte";
  import { hdArtUrl } from "./HdCard.svelte";
  import { deckFaction, FACTION_ART } from "./deckText.ts";
  import seaUrl from "../../../../assets/board/web/sea.webp?url";

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

  /** The islands of the expedition map: a zigzag from left to right in a 1000 x 340 box. */
  const nodes = $derived.by(() => {
    if (!mine || mine.kind !== "expedition") return [];
    const n = mine.opponents.length;
    return mine.opponents.map((_, i) => ({ x: 90 + (i * 820) / Math.max(1, n - 1), y: i % 2 === 0 ? 120 : 220 }));
  });
  /** The route between the islands, as a smooth curve. */
  const route = $derived(
    nodes.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `C${nodes[i - 1]!.x + 70} ${nodes[i - 1]!.y} ${p.x - 70} ${p.y} ${p.x} ${p.y}`)).join(" "),
  );
  /** The part of the route already sailed: an estimate of the curve length up to the current island. */
  const doneLength = $derived(mine && mine.kind === "expedition" ? Math.min(mine.wins, nodes.length - 1) * 190 : 0);

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

<main class="page screen">
  <header class="bar panel">
    <button onclick={onBack}>{tr.t("ui.menu")}</button>
    <h2>{tr.t(`meta.${kind}`)}</h2>
    {#if mine}
      <span class="status">
        {tr.t("meta.record", { wins: mine.wins, losses: mine.losses })}
        {#if mine.kind === "draft"}· {tr.t("meta.draftLimits", { wins: DRAFT_MAX_WINS, losses: DRAFT_MAX_LOSSES })}{/if}
      </span>
      {#if mine.kind === "expedition"}
        <span class="lives" title={tr.t("meta.lives", { count: mine.lives })} aria-label={tr.t("meta.lives", { count: mine.lives })}>
          {#each Array(2) as _, i}<i class:off={i >= mine.lives}></i>{/each}
        </span>
      {/if}
    {/if}
  </header>

  {#if reward}
    <section class="panel center">
      <h3>{tr.t("meta.reward")}</h3>
      {#if reward.shards}<p class="shards">{tr.t("meta.shardsGained", { count: reward.shards })}</p>{/if}
      <CardFlips {tr} cards={reward.cards} />
      <button class="primary" onclick={() => (reward = null)}>{tr.t("meta.continue")}</button>
    </section>
  {:else if other}
    <section class="panel center">
      <p>{tr.t("meta.otherRunActive", { mode: tr.t(`meta.${other.kind}`) })}</p>
      <button onclick={abandon}>{tr.t("meta.abandon")}</button>
    </section>
  {:else if !mine}
    <section class="panel intro">
      <p>{tr.t(`meta.${kind}Intro`)}</p>
      {#if kind === "expedition"}
        <div class="banners">
          {#each EXPEDITION_FACTIONS as f}<Banner faction={f} label={tr.t(`factions.${f}`)} onclick={() => start(f)} />{/each}
        </div>
      {:else}
        <button class="primary big" onclick={() => start()}>{tr.t("meta.startDraft")}</button>
      {/if}
    </section>
  {:else}
    {#if mine.kind === "expedition"}
      <!-- The voyage: one island for each opponent, the boss on the last one (graphics plan, phase 7). -->
      <svg class="map" viewBox="0 0 1000 340" role="img" aria-label={tr.t("meta.stage", { n: Math.min(mine.wins + 1, mine.opponents.length), total: mine.opponents.length })}>
        <defs>
          <radialGradient id="isle" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#d9c48e" /><stop offset="0.55" stop-color="#7f9a52" /><stop offset="1" stop-color="#3d5a35" /></radialGradient>
          <radialGradient id="glow"><stop offset="0" stop-color="#fff1b0" stop-opacity="0.9" /><stop offset="1" stop-color="#fbd35a" stop-opacity="0" /></radialGradient>
        </defs>
        <image href={seaUrl} x="0" y="0" width="1000" height="340" preserveAspectRatio="xMidYMid slice" />
        <rect width="1000" height="340" fill="rgb(6 12 24 / 0.35)" />
        <path d={route} class="route" />
        <path d={route} class="route done" style="stroke-dasharray: {doneLength} 4000" />
        {#each nodes as n, i}
          {@const o = mine.opponents[i]!}
          {@const art = hdArtUrl(FACTION_ART[deckFaction(STARTER_DECKS[o.deck] ?? {})] ?? "neutral-006", "sm")}
          <g class="node" class:past={i < mine.wins} class:now={i === mine.wins && mine.status === "active"} class:boss={o.boss} transform="translate({n.x} {n.y})">
            <ellipse rx={o.boss ? 70 : 54} ry={o.boss ? 34 : 26} cy="18" fill="url(#isle)" class="isle" />
            {#if i === mine.wins && mine.status === "active"}<circle r="62" fill="url(#glow)" class="halo" />{/if}
            <clipPath id="medal-{i}"><circle r={o.boss ? 30 : 24} /></clipPath>
            {#if art}<image href={art} x="-40" y="-30" width="80" height="57" clip-path="url(#medal-{i})" preserveAspectRatio="xMidYMid slice" />{/if}
            <circle r={o.boss ? 30 : 24} class="ring" />
            {#if i < mine.wins}<path d="M-10 0 l7 7 l14 -16" class="check" />{/if}
            {#if o.boss}<path d="M-16 -40 l6 10 l10 -14 l10 14 l6 -10 l-4 16 h-24 z" class="crown" />{/if}
            <text y={o.boss ? 62 : 54}>{tr.t(`deckNames.${o.deck}`)}</text>
          </g>
        {/each}
      </svg>
    {/if}

    {#if mine.status !== "active"}
      <section class="panel center">
        <h3 class="end" class:won={mine.status === "won"}>{tr.t(mine.status === "won" ? "meta.runWon" : "meta.runLost")}</h3>
        <button class="primary big" onclick={claim}>{tr.t("meta.claim")}</button>
      </section>
    {:else if mine.kind === "draft" && mine.factionChoices.length}
      <section class="panel center">
        <h3>{tr.t("meta.chooseFactions")}</h3>
        <div class="pairs">
          {#each mine.factionChoices as pair, i}
            <div class="pair">
              {#each pair as f}<Banner faction={f} label={tr.t(`factions.${f}`)} onclick={() => profileStore.update((p) => p.run?.kind === "draft" && chooseDraftFactions(p.run, i))} />{/each}
            </div>
          {/each}
        </div>
      </section>
    {:else if mine.pick}
      <section class="center">
        <h3>{mine.kind === "draft" ? tr.t("meta.draftPick", { n: mine.deck.length + 1, total: DRAFT_DECK }) : tr.t("meta.chooseCard")}</h3>
        {#key mine.pick}
          <div class="picks">
            {#each mine.pick.options as id, i (id)}<div class="deal" style="--i: {i}"><CardTile {tr} cardId={id} width={240} onclick={() => pick(id)} /></div>{/each}
          </div>
        {/key}
        {#if mine.kind === "expedition"}<button onclick={() => pick(null)}>{tr.t("meta.skip")}</button>{/if}
      </section>
    {:else if opponent && readyToPlay(mine)}
      <section class="panel next">
        <Banner faction={deckFaction(STARTER_DECKS[opponent.deck] ?? {})} label={tr.t(`deckNames.${opponent.deck}`)} sub={tr.t(`ui.levels.${opponent.level}`)} onclick={() => onPlay([...mine.deck], opponent)} />
        <p>{tr.t(opponent.boss ? "meta.nextBoss" : "meta.nextOpponent", { deck: tr.t(`deckNames.${opponent.deck}`) })}</p>
        <button class="primary big" onclick={() => onPlay([...mine.deck], opponent)}>{tr.t("ui.start")}</button>
      </section>
    {/if}

    {#if deckList.length}
      <section class="panel deckbox">
        <h3>{tr.t("meta.runDeck", { count: mine.deck.length })}</h3>
        <ul class="deck">
          {#each deckList as [id, n] (id)}
            {@const art = hdArtUrl(id, "sm")}
            <li class="f-{CARDS[id]!.faction}" style={art ? `--art: url(${art})` : ""}><b>{CARDS[id]!.cost}</b> <span>{cardName(tr, id)}</span> <em>×{n}</em></li>
          {/each}
        </ul>
        {#if mine.status === "active"}<button class="danger" onclick={abandon}>{tr.t("meta.abandon")}</button>{/if}
      </section>
    {/if}
  {/if}
</main>

<style>
  .page { max-width: 1040px; margin: 0 auto; padding: 12px 16px 24px; display: flex; flex-direction: column; gap: 14px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; padding: 10px 14px; }
  h2 { margin: 0; flex: 1; color: var(--gold); font-size: 26px; }
  h3 { margin: 0 0 10px; color: var(--gold); font-size: 20px; text-align: center; }
  .status { color: #d6c9a8; }
  .lives { display: flex; gap: 4px; }
  .lives i { width: 14px; height: 22px; border-radius: 4px 4px 2px 2px; background: radial-gradient(circle at 50% 45%, #fff2b0, #f29a2e 55%, #6a3a10); box-shadow: 0 0 8px #fbd35a; }
  .lives i.off { background: #2a3340; box-shadow: none; }
  .center { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px; text-align: center; }
  .intro { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
  .intro p { margin: 0; line-height: 1.5; }
  .banners { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .big { font-size: 20px; padding: 10px 28px; }
  .shards { color: #bfe8ff; font-size: 18px; }
  .end { font-size: 28px; color: #c8d4e0; }
  .end.won { color: #fff1c0; text-shadow: 0 0 16px rgb(251 211 90 / 0.6); }
  .pairs { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; width: 100%; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 10px; box-shadow: 0 0 0 1px var(--gold-d); }
  .picks { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px; }
  .deal { animation: deal 0.45s cubic-bezier(0.2, 1.3, 0.4, 1) calc(var(--i) * 0.12s) both; }
  @keyframes deal { from { opacity: 0; transform: translateY(40px) rotate(-6deg) scale(0.85); } }
  .next { display: grid; grid-template-columns: 220px 1fr auto; gap: 16px; align-items: center; padding: 14px 16px; }
  .next p { margin: 0; font-size: 18px; }
  .deckbox { padding: 14px 16px; }
  .deck { list-style: none; margin: 0 0 10px; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px; }
  .deck li {
    --c: #888; display: flex; gap: 8px; align-items: center; padding: 4px 8px; border-left: 4px solid var(--c); border-radius: 4px; font-size: 13px;
    background: linear-gradient(90deg, rgb(10 14 22 / 0.95) 40%, rgb(10 14 22 / 0.4)), var(--art, none) 80% 30% / 55% auto no-repeat, #141c28;
  }
  .deck li span { flex: 1; font-family: Alegreya, Georgia, serif; font-weight: 700; }
  .deck li b { color: #8fd0ff; }
  .deck li em { color: var(--gold); font-style: normal; font-weight: 700; }
  .f-forge { --c: #e0703a; } .f-sprout { --c: #5fbf6a; } .f-abyss { --c: #4a6fd1; } .f-gear { --c: #c9a64b; } .f-vesper { --c: #9b6fd1; } .f-neutral { --c: #8a94a6; }

  .map { width: 100%; height: auto; border-radius: 12px; box-shadow: var(--frame), 0 6px 20px rgb(0 0 0 / 0.5); background: #0b1a2a; }
  .route { fill: none; stroke: #f6e7b8; stroke-width: 3; stroke-dasharray: 2 10; stroke-linecap: round; opacity: 0.55; }
  .route.done { stroke: #fbd35a; stroke-width: 4; stroke-dasharray: none; opacity: 0.9; }
  .node .isle { filter: drop-shadow(0 6px 4px rgb(0 0 0 / 0.45)); }
  .node .ring { fill: none; stroke: #8a94a6; stroke-width: 3; }
  .node image { filter: grayscale(0.6) brightness(0.7); }
  .node.past image { filter: grayscale(1) brightness(0.45); }
  .node.now .ring { stroke: #fbd35a; stroke-width: 4; }
  .node.now image { filter: none; }
  .node.boss .ring { stroke: #c8553d; }
  .node .check { fill: none; stroke: #9be3a6; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
  .node .crown { fill: #fbd35a; stroke: #6a3a10; stroke-width: 1.5; }
  .node text { fill: #fff4dc; font: 700 15px Alegreya, Georgia, serif; text-anchor: middle; paint-order: stroke; stroke: #0a0f18; stroke-width: 4px; }
  .halo { animation: halo 1.6s ease-in-out infinite alternate; transform-origin: center; }
  @keyframes halo { from { opacity: 0.5; transform: scale(0.9); } to { opacity: 1; transform: scale(1.05); } }
  @media (max-width: 700px) {
    .next { grid-template-columns: 1fr; text-align: center; }
    .node text { font-size: 22px; }
  }
  @media (prefers-reduced-motion: reduce) { .deal, .halo { animation: none; } }
</style>
