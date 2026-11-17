<script lang="ts" module>
  import "@fontsource/alegreya/700.css";
  import "@fontsource/alegreya/400-italic.css";
  import "@fontsource/alegreya-sans/400.css";
  import "@fontsource/alegreya-sans/700.css";

  /** The painted illustrations, in three sizes (plan "piano-grafica", section 6.4). */
  const ART: Record<string, string> = {};
  const files = import.meta.glob("../../../../assets/art/web/*/*.webp", { query: "?url", import: "default", eager: true }) as Record<string, string>;
  for (const [path, url] of Object.entries(files)) {
    const m = /web\/(lg|md|sm)\/([^/]+)\.webp$/.exec(path);
    if (m) ART[`${m[1]}/${m[2]}`] = url;
  }

  /** The URL of the illustration of a card, or null when the card has no painted illustration yet. */
  export function hdArtUrl(cardId: string, size: "lg" | "md" | "sm"): string | null {
    return ART[`${size}/${cardId}`] ?? null;
  }
</script>

<script lang="ts">
  import { cardFlavor, cardName, cardRulesText, keywordName, type Translator } from "@tcg/i18n";
  import type { CardDef } from "@tcg/cards";

  interface Props {
    def: CardDef;
    tr: Translator;
    /** Width of the card in CSS pixels. The height is 1.4 times the width. */
    width?: number;
  }
  let { def, tr, width = 320 }: Props = $props();

  const size = $derived(width * (globalThis.devicePixelRatio ?? 1) > 400 ? "lg" : width * (globalThis.devicePixelRatio ?? 1) > 200 ? "md" : "sm");
  const art = $derived(hdArtUrl(def.id, size));
  const keeper = $derived(def.type === "keeper");
  const keywords = $derived(def.keywords.map((k) => keywordName(tr, k)).join(", "));
  const rules = $derived(cardRulesText(tr, def));
</script>

<article class="card f-{def.faction} r-{def.rarity}" class:keeper style="font-size: {width / 16}px" aria-label={cardName(tr, def.id)}>
  <div class="art">
    {#if art}<img src={art} alt="" draggable="false" />{/if}
  </div>
  <div class="cost" >{def.cost}</div>
  <h3 class="name">{cardName(tr, def.id)}</h3>
  <div class="type">
    <span>{tr.t(`types.${def.type}`)}</span>
    <i class="gem" title={tr.t(`rarities.${def.rarity}`)}></i>
  </div>
  <div class="text">
    {#if keywords}<p class="kw">{keywords}</p>{/if}
    {#each rules as line}<p>{line}</p>{/each}
    <p class="flavor">{cardFlavor(tr, def.id)}</p>
  </div>
  {#if keeper}
    <div class="stat atk" title={tr.t("stats.attack", { value: def.attack ?? 0 })}>{def.attack ?? 0}</div>
    <div class="stat hold" title={tr.t("stats.hold", { value: def.hold ?? 1 })}>{def.hold ?? 1}</div>
  {/if}
</article>

<style>
  .card {
    /* Faction colors: --c main, --d dark, --l light (style guide, section 3). */
    --c: #8a8a8a; --d: #2b2e33; --l: #e8e4da;
    --gold: #d9b56a; --gold-d: #7a5a24; --ink: #2a1f16; --paper: #efe3c8;
    position: relative;
    width: 16em; height: 22.4em;
    box-sizing: border-box;
    padding: 0.55em;
    border-radius: 0.9em;
    background:
      radial-gradient(120% 60% at 50% 0%, color-mix(in srgb, var(--c) 55%, transparent), transparent 70%),
      linear-gradient(170deg, var(--d), color-mix(in srgb, var(--d) 70%, black));
    box-shadow:
      inset 0 0 0 0.12em var(--gold),
      inset 0 0 0 0.3em var(--gold-d),
      inset 0 0 0 0.38em color-mix(in srgb, var(--c) 80%, black),
      0 0.4em 1.2em rgb(0 0 0 / 0.55);
    color: var(--ink);
    font-family: "Alegreya Sans", system-ui, sans-serif;
    display: flex; flex-direction: column;
    user-select: none;
  }
  .f-forge { --c: #c8553d; --d: #3a1a14; --l: #f6c99a; }
  .f-sprout { --c: #4f9d69; --d: #15301f; --l: #cfe8b0; }
  .f-neutral { --c: #8a8a8a; --d: #2b2e33; --l: #e8e4da; }
  .f-abyss { --c: #2d6ba3; --d: #0d1b2e; --l: #b9dcf2; }
  .f-gear { --c: #b08d57; --d: #33261a; --l: #f0d9a8; }
  .f-vesper { --c: #7a5c99; --d: #22172f; --l: #dccbf0; }

  .art {
    aspect-ratio: 7 / 5;
    border-radius: 0.5em 0.5em 0.2em 0.2em;
    overflow: hidden;
    background: color-mix(in srgb, var(--c) 40%, black);
    box-shadow: 0 0 0 0.1em var(--gold), 0 0 0 0.22em var(--gold-d);
  }
  .art img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .cost {
    position: absolute; top: -0.35em; left: -0.35em;
    width: 2.3em; height: 2.3em;
    display: grid; place-items: center;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff8 0 8%, transparent 30%), radial-gradient(circle, #6fc6e8, #1d5f86 70%, #0c2c42);
    box-shadow: 0 0 0 0.14em var(--gold), 0 0 0 0.26em var(--gold-d), 0 0.15em 0.4em rgb(0 0 0 / 0.6);
    color: #fff;
    font: 700 1.45em/1 "Alegreya", Georgia, serif;
    font-size: 1.45em; width: calc(2.3em / 1.45); height: calc(2.3em / 1.45);
    text-shadow: 0 0.06em 0.12em #000;
  }

  .name {
    margin: -0.75em 0.4em 0; position: relative;
    padding: 0.18em 0.5em 0.12em;
    text-align: center;
    font: 700 1.05em/1.15 "Alegreya", Georgia, serif;
    color: #fff6e0;
    text-shadow: 0 0.08em 0.15em #000;
    background: linear-gradient(180deg, color-mix(in srgb, var(--c) 85%, white 5%), color-mix(in srgb, var(--c) 60%, black));
    border-radius: 0.35em;
    box-shadow: 0 0 0 0.09em var(--gold), 0 0 0 0.18em var(--gold-d), 0 0.2em 0.4em rgb(0 0 0 / 0.5);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .type {
    display: flex; justify-content: space-between; align-items: center;
    margin: 0.35em 0.5em 0.25em;
    font-size: 0.72em; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--l);
  }
  .gem { width: 0.8em; height: 0.8em; transform: rotate(45deg); background: #c9c2b4; box-shadow: 0 0 0 0.12em var(--gold-d); }
  .r-uncommon .gem { background: #8fd0e8; }
  .r-rare .gem { background: #f2c14e; }
  .r-legendary .gem { background: #e06cd8; }

  .text {
    flex: 1;
    margin: 0 0.15em;
    padding: 0.45em 0.7em 1em;
    border-radius: 0.3em;
    background:
      radial-gradient(120% 90% at 50% 40%, transparent 60%, rgb(120 80 30 / 0.25)),
      var(--paper);
    box-shadow: inset 0 0 0 0.08em var(--gold-d), inset 0 0.1em 0.5em rgb(80 50 20 / 0.35);
    font-size: 0.86em; line-height: 1.25;
    display: flex; flex-direction: column; gap: 0.3em;
    overflow: hidden;
  }
  .text p { margin: 0; }
  .kw { font-weight: 700; }
  .flavor {
    margin-top: auto !important;
    padding-top: 0.3em;
    border-top: 0.06em solid rgb(122 90 36 / 0.45);
    font-family: "Alegreya", Georgia, serif; font-style: italic;
    color: #5a4630;
    text-align: center;
  }
  .keeper .flavor { padding-inline: 1.3em; }

  .stat {
    position: absolute; bottom: -0.3em;
    width: 2.1em; height: 2.1em;
    display: grid; place-items: center;
    font: 700 1.6em/1 "Alegreya", Georgia, serif;
    width: calc(2.7em / 1.6); height: calc(2.7em / 1.6);
    color: #fff; text-shadow: 0 0.06em 0.12em #000;
    filter: drop-shadow(0 0 0.04em var(--gold)) drop-shadow(0 0 0.04em var(--gold)) drop-shadow(0 0.1em 0.12em rgb(0 0 0 / 0.7));
  }
  .stat::before { content: ""; position: absolute; inset: 0; z-index: -1; }
  .stat { isolation: isolate; }
  .atk { left: -0.25em; }
  .atk::before {
    background: linear-gradient(160deg, #e0724f, #8f2a17);
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    outline: none;
  }
  .hold { right: -0.25em; }
  .hold::before {
    background: linear-gradient(160deg, #9fb3c4, #3d5468);
    clip-path: polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%);
  }
</style>
