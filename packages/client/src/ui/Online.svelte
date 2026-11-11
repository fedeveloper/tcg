<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import { expandDeck } from "@tcg/cards";
  import { deckProblems } from "@tcg/meta";
  import type { Translator } from "@tcg/i18n";
  import type { MatchSummary, Replay, ServerMessage } from "@tcg/protocol";
  import type { PlayerId } from "@tcg/engine";
  import { profileStore } from "../meta/profileStore.svelte.ts";
  import type { ConnectionStatus, OnlineClient } from "../online/connection.ts";
  import { deckLabel } from "./deckText.ts";

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

<main class="page">
  <header>
    <button onclick={onBack}>{tr.t("ui.menu")}</button>
    <h2>{tr.t("online.title")}</h2>
    <span class="status {status}">{tr.t(`online.status.${status}`)}</span>
  </header>

  <label>
    {tr.t("online.name")}
    <span class="row">
      <input bind:value={name} maxlength="20" />
      <button onclick={rename} disabled={!name.trim() || name.trim() === client.name}>{tr.t("meta.save")}</button>
    </span>
  </label>

  <label>
    {tr.t("ui.yourDeck")}
    <select bind:value={deckId}>
      {#each playable as d (d.id)}<option value={d.id}>{deckLabel(tr, d)}</option>{/each}
    </select>
  </label>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if hosting}
    <section class="box">
      <p>{tr.t("online.shareCode")}</p>
      <p class="code">{hosting.code}</p>
      <p class="hint">{tr.t("online.waitingFriend")}</p>
      <button onclick={cancelHost}>{tr.t("ui.cancel")}</button>
    </section>
  {:else if queued}
    <section class="box">
      <p>{tr.t("online.searching")}</p>
      <button onclick={leaveQueue}>{tr.t("ui.cancel")}</button>
    </section>
  {:else}
    <h3>{tr.t("online.quickTitle")}</h3>
    <button class="primary" disabled={status !== "online"} onclick={quick}>{tr.t("online.quick")}</button>

    <h3>{tr.t("online.privateTitle")}</h3>
    <button disabled={status !== "online"} onclick={create}>{tr.t("online.create")}</button>
    <span class="row">
      <input bind:value={joinCode} maxlength="6" placeholder={tr.t("online.codePlaceholder")} aria-label={tr.t("online.codePlaceholder")} />
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
        <li>
          <span>{tr.t("online.versus", { name: m.opponent ?? "?" })} · {m.winner === null ? tr.t("replay.draw") : m.winner === m.seat ? tr.t("replay.won") : tr.t("replay.lost")}</span>
          <button onclick={() => watch(m)}>{tr.t("replay.watch")}</button>
        </li>
      {/each}
    </ul>
  {/if}

  <p class="hint">{tr.t("online.note")}</p>
</main>

<style>
  .page { max-width: 460px; margin: 4vh auto; padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
  header { display: flex; align-items: center; gap: 12px; }
  header h2 { flex: 1; margin: 0; }
  h3 { font-size: 15px; margin: 8px 0 0; opacity: 0.85; }
  label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .row { display: flex; gap: 8px; }
  .row input { flex: 1; min-width: 0; }
  .status { font-size: 12px; }
  .status.online { color: #6fcf8a; }
  .status.offline { color: #e0605a; }
  .status.connecting { color: var(--muted); }
  .box { border: 1px solid var(--accent); border-radius: 8px; padding: 12px; text-align: center; }
  .code { font-size: 32px; letter-spacing: 6px; color: var(--accent); margin: 4px 0; font-family: monospace; }
  .error { color: #e0605a; margin: 0; }
  .hint { color: var(--muted); font-size: 12px; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  li { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
</style>
