<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import { expandDeck } from "@tcg/cards";
  import { deckProblems } from "@tcg/meta";
  import type { Translator } from "@tcg/i18n";
  import type { MatchSummary, Replay, ServerMessage } from "@tcg/protocol";
  import type { PlayerId } from "@tcg/engine";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import type { ConnectionStatus, OnlineClient } from "../online/connection.ts";
  import { deckFaction, deckLabel, FACTION_ART } from "./deckText.ts";
  import Banner from "./Banner.svelte";
  import { MEDALS } from "../render/medals.ts";

  type StateMsg = Extract<ServerMessage, { t: "state" }>;
  interface Props {
    tr: Translator;
    client: OnlineClient;
    /** Called when a match of this player starts or resumes. */
    onMatch: (first: StateMsg) => void;
    /** Called when the server sends the replay of a finished match. */
    onReplay: (replay: Replay, seat: PlayerId) => void;
    onBack: () => void;
  }
  let { tr, client, onMatch, onReplay, onBack }: Props = $props();

  let status = $state<ConnectionStatus>(untrack(() => client.status));
  let name = $state(untrack(() => client.name));
  let deckId = $state("starter-forge");
  let joinCode = $state("");
  let hosting = $state<{ matchId: string; code: string } | null>(null);
  let queued = $state(false);
  let error = $state<string | null>(null);
  let matches = $state.raw<MatchSummary[]>([]);

  const playable = $derived(profileStore.profile.decks.filter((d) => deckProblems(profileStore.profile.collection, d.cards).length === 0));
  const deckCards = $derived.by(() => {
    const d = playable.find((x) => x.id === deckId) ?? playable[0];
    return d ? expandDeck(d.cards) : null;
  });
  /** The avatar: the medallion of the card that stands for the faction of the chosen deck. */
  const avatar = $derived.by(() => {
    const d = playable.find((x) => x.id === deckId) ?? playable[0];
    return MEDALS[FACTION_ART[d ? deckFaction(d.cards) : "neutral"] ?? "neutral-006"] ?? null;
  });
  const active = $derived(matches.filter((m) => m.status === "active"));
  const finished = $derived(matches.filter((m) => m.status === "over" && m.opponent).slice(0, 10));
  /** The seat of the replay that the player asked for. */
  let replaySeat: PlayerId = 0;

  function onMessage(msg: ServerMessage) {
    switch (msg.t) {
      case "welcome":
        name = msg.name;
        client.send({ t: "myMatches" });
        break;
      case "matchCreated":
        hosting = { matchId: msg.matchId, code: msg.code };
        break;
      case "queued":
        queued = true;
        break;
      case "myMatches":
        matches = msg.matches;
        break;
      case "error":
        error = tr.t(`online.errors.${msg.code}`, { defaultValue: msg.message });
        break;
      case "replay":
        onReplay(msg.replay, replaySeat);
        break;
      case "state":
        queued = false;
        hosting = null;
        onMatch(msg);
        break;
    }
  }

  let offMsg = () => {};
  let offStatus = () => {};
  onMount(() => {
    offMsg = client.onMessage(onMessage);
    offStatus = client.onStatus((s) => (status = s));
    client.connect();
    if (client.status === "online") client.send({ t: "myMatches" });
  });
  onDestroy(() => {
    offMsg();
    offStatus();
    if (queued) client.send({ t: "leaveQueue" });
  });

  function rename() {
    const n = name.trim();
    if (!n) return;
    // A new "hello" with the same token renames the account.
    client.close();
    client.connect(n);
  }

  function withDeck(fn: (cards: string[]) => void) {
    error = null;
    const cards = deckCards;
    if (!cards) return (error = tr.t("online.noDeck"));
    fn(cards);
  }

  function create() {
    withDeck((cards) => client.send({ t: "createMatch", deck: cards }));
  }
  function join() {
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return (error = tr.t("online.badCode"));
    withDeck((cards) => client.send({ t: "joinMatch", code, deck: cards }));
  }
  function quick() {
    withDeck((cards) => client.send({ t: "queue", deck: cards }));
  }
  function leaveQueue() {
    client.send({ t: "leaveQueue" });
    queued = false;
  }
  function cancelHost() {
    if (hosting) client.send({ t: "concede", matchId: hosting.matchId });
    hosting = null;
  }
  function watch(m: MatchSummary) {
    replaySeat = m.seat;
    client.send({ t: "replay", matchId: m.matchId });
  }
  function resume(m: MatchSummary) {
    client.send({ t: "resume", matchId: m.matchId });
  }
</script>

<main class="page screen">
  <header class="bar panel">
    <button onclick={onBack}>{tr.t("ui.menu")}</button>
    <h2>{tr.t("online.title")}</h2>
    <span class="status {status}"><i aria-hidden="true"></i>{tr.t(`online.status.${status}`)}</span>
  </header>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <div class="cols">
    <section class="me panel">
      <div class="avatar" class:live={status === "online"}>
        {#if avatar}<img src={avatar} alt="" />{/if}
      </div>
      <label class="name">
        <span>{tr.t("online.name")}</span>
        <span class="row">
          <input bind:value={name} maxlength="20" />
          <button onclick={rename} disabled={!name.trim() || name.trim() === client.name}>{tr.t("meta.save")}</button>
        </span>
      </label>
      <h3>{tr.t("ui.yourDeck")}</h3>
      <div class="banners">
        {#each playable as d (d.id)}
          <Banner faction={deckFaction(d.cards)} label={deckLabel(tr, d)} selected={d.id === (playable.find((x) => x.id === deckId) ?? playable[0])?.id} onclick={() => (deckId = d.id)} />
        {/each}
      </div>
    </section>

    <section class="play panel">
      {#if hosting}
        <div class="box">
          <p>{tr.t("online.shareCode")}</p>
          <p class="code" aria-label={hosting.code}>{#each hosting.code.split("") as ch}<span>{ch}</span>{/each}</p>
          <div class="radar" aria-hidden="true"></div>
          <p class="hint">{tr.t("online.waitingFriend")}</p>
          <button onclick={cancelHost}>{tr.t("ui.cancel")}</button>
        </div>
      {:else if queued}
        <div class="box">
          <div class="radar" aria-hidden="true"></div>
          <p>{tr.t("online.searching")}</p>
          <button onclick={leaveQueue}>{tr.t("ui.cancel")}</button>
        </div>
      {:else}
        <h3>{tr.t("online.quickTitle")}</h3>
        <button class="primary big" disabled={status !== "online"} onclick={quick}>{tr.t("online.quick")}</button>

        <h3>{tr.t("online.privateTitle")}</h3>
        <button disabled={status !== "online"} onclick={create}>{tr.t("online.create")}</button>
        <span class="row">
          <input class="join" bind:value={joinCode} maxlength="6" placeholder={tr.t("online.codePlaceholder")} aria-label={tr.t("online.codePlaceholder")} />
          <button disabled={status !== "online"} onclick={join}>{tr.t("online.join")}</button>
        </span>
      {/if}

      {#if active.length > 0}
        <h3>{tr.t("online.activeMatches")}</h3>
        <ul>
          {#each active as m (m.matchId)}
            <li>
              <span>{tr.t("online.versus", { name: m.opponent ?? "?" })}</span>
              <button onclick={() => resume(m)}>{tr.t("online.resume")}</button>
            </li>
          {/each}
        </ul>
      {/if}

      {#if finished.length > 0}
        <h3>{tr.t("replay.title")}</h3>
        <ul>
          {#each finished as m (m.matchId)}
            <li class:won={m.winner === m.seat} class:lost={m.winner !== null && m.winner !== m.seat}>
              <span>{tr.t("online.versus", { name: m.opponent ?? "?" })} · {m.winner === null ? tr.t("replay.draw") : m.winner === m.seat ? tr.t("replay.won") : tr.t("replay.lost")}</span>
              <button onclick={() => watch(m)}>{tr.t("replay.watch")}</button>
            </li>
          {/each}
        </ul>
      {/if}
      <p class="hint">{tr.t("online.note")}</p>
    </section>
  </div>
</main>

<style>
  .page { max-width: 980px; margin: 0 auto; padding: 12px 16px 24px; display: flex; flex-direction: column; gap: 14px; }
  .bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px; }
  .bar h2 { flex: 1; margin: 0; color: var(--gold); font-size: 26px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
  .me, .play { padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
  h3 { font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.08em; color: #cdbf9c; }
  .avatar { align-self: center; width: 112px; height: 112px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 3px var(--gold-d), 0 0 0 5px #0a0f18, 0 4px 14px rgb(0 0 0 / 0.6); background: #0d1622; transition: box-shadow 0.3s; }
  .avatar.live { box-shadow: 0 0 0 3px var(--gold), 0 0 0 5px #0a0f18, 0 0 22px rgb(251 211 90 / 0.45); }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .name { display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; gap: 8px; }
  .row input { flex: 1; min-width: 0; }
  .banners { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; max-height: 250px; overflow: auto; padding: 4px; }
  .status { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 3px 10px; border-radius: 12px; background: rgb(0 0 0 / 0.35); }
  .status i { width: 9px; height: 9px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
  .status.online { color: #6fcf8a; }
  .status.offline { color: #e0605a; }
  .status.connecting { color: #e8c56a; }
  .status.connecting i { animation: blink 0.8s ease-in-out infinite alternate; }
  @keyframes blink { to { opacity: 0.2; } }
  .big { font-size: 20px; padding: 12px; }
  .join { text-transform: uppercase; letter-spacing: 0.2em; font-family: Alegreya, Georgia, serif; font-weight: 700; }
  .box { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 8px 0; }
  .box p { margin: 0; }
  .code { display: flex; gap: 6px; }
  .code span { width: 38px; height: 50px; display: grid; place-items: center; border-radius: 6px; font: 700 30px Alegreya, Georgia, serif; color: #2a1a08; background: linear-gradient(#fff2c0, #e2b252); box-shadow: inset 0 -3px 0 rgb(0 0 0 / 0.25), 0 2px 6px rgb(0 0 0 / 0.5); }
  .radar { width: 64px; height: 64px; border-radius: 50%; border: 2px solid rgb(251 211 90 / 0.4); background: conic-gradient(from 0deg, rgb(251 211 90 / 0.55), transparent 30%); animation: sweep 1.4s linear infinite; }
  @keyframes sweep { to { transform: rotate(360deg); } }
  .error { color: #ffb0a0; margin: 0; padding: 8px 12px; border-radius: 6px; background: rgb(80 20 20 / 0.6); }
  .hint { color: var(--muted); font-size: 12px; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; background: rgb(0 0 0 / 0.3); border-left: 4px solid #8a94a6; }
  li.won { border-left-color: #fbd35a; }
  li.lost { border-left-color: #6a7a8a; }
  @media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) { .radar, .status.connecting i { animation: none; } }
</style>
