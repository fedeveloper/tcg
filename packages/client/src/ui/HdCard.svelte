<script lang="ts" module>
  import "@fontsource/alegreya/700.css";
  import "@fontsource/alegreya/400-italic.css";
  import "@fontsource/alegreya-sans/400.css";
  import "@fontsource/alegreya-sans/700.css";

  import { hdArtUrl } from "../render/art.ts";
  export { hdArtUrl };

  /** The emblem of each faction: one SVG path in a 24x24 box (graphics plan, phase 4, step 1). */
  export const EMBLEM: Record<string, string> = {
    forge: "M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z",
    sprout: "M5 19C5 10 11 4 20 4c0 9-6 15-15 15zm0 0 9-9",
    neutral: "M12 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 4v13m-6-6a6 6 0 0 0 12 0m-9-4h6",
    abyss: "M2 13c3-3 5-3 8 0s5 3 8 0 3-2 4-2M2 18c3-3 5-3 8 0s5 3 8 0 3-2 4-2M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
    gear: "M19.1 10.6 22.4 10.7 22.4 13.3 19.1 13.4 18.7 14.7 18.0 16.0 20.3 18.5 18.5 20.3 16.0 18.0 14.8 18.6 13.4 19.1 13.3 22.4 10.7 22.4 10.6 19.1 9.3 18.7 8.0 18.0 5.5 20.3 3.7 18.5 6.0 16.0 5.4 14.8 4.9 13.4 1.6 13.3 1.6 10.7 4.9 10.6 5.3 9.3 6.0 8.0 3.7 5.5 5.5 3.7 8.0 6.0 9.2 5.4 10.6 4.9 10.7 1.6 13.3 1.6 13.4 4.9 14.7 5.3 16.0 6.0 18.5 3.7 20.3 5.5 18.0 8.0 18.6 9.2Z M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z",
    vesper: "M16 3a9 9 0 1 0 5 13A7 7 0 0 1 16 3z",
  };
</script>

<script lang="ts">
  import { cardFlavor, cardName, cardRulesText, keywordName, type Translator } from "@tcg/i18n";
  import type { CardDef } from "@tcg/cards";

  interface Props {
    def: CardDef;
    tr: Translator;
    /** Width of the card in CSS pixels. The height is 1.4 times the width. */
    width?: number;
    /** Attack and Hold to show instead of the printed ones (an Echo copy is 1/1). */
    attack?: number;
    hold?: number;
    /** The animated shine of rare and legendary cards. Off in long lists and with reduced motion. */
    foil?: boolean;
  }
  let { def, tr, width = 320, attack, hold, foil = true }: Props = $props();

  const size = $derived(width * (globalThis.devicePixelRatio ?? 1) > 400 ? "lg" : width * (globalThis.devicePixelRatio ?? 1) > 200 ? "md" : "sm");
  const art = $derived(hdArtUrl(def.id, size));
  const keeper = $derived(def.type === "keeper");
  const shine = $derived(foil && (def.rarity === "rare" || def.rarity === "legendary"));
  const atk = $derived(attack ?? def.attack ?? 0);
  const hld = $derived(hold ?? def.hold ?? 1);
  const keywords = $derived(def.keywords.map((k) => keywordName(tr, k)).join(", "));
  const rules = $derived(cardRulesText(tr, def));
</script>

<article class="hd-card f-{def.faction} r-{def.rarity}" class:keeper class:rite={!keeper} class:shine style="font-size: {width / 16}px" aria-label={cardName(tr, def.id)}>
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
  <svg class="emblem" fill-rule="evenodd" viewBox="0 0 24 24" aria-hidden="true"><path d={EMBLEM[def.faction] ?? EMBLEM.neutral} /></svg>
  {#if keeper}
    <div class="stat atk" class:up={atk > (def.attack ?? 0)} class:down={atk < (def.attack ?? 0)} title={tr.t("stats.attack", { value: atk })}>{atk}</div>
    <div class="stat hold" class:up={hld > (def.hold ?? 1)} class:down={hld < (def.hold ?? 1)} title={tr.t("stats.hold", { value: hld })}>{hld}</div>
  {/if}
</article>

<style>
  .hd-card {
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
  /* Rites, Relics and Sites: an arched window and a ribbon for the name. */
  .rite .art { border-radius: 50% 50% 0.2em 0.2em / 22% 22% 0.2em 0.2em; }
  .rite .name { border-radius: 0.15em; clip-path: polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%, 4% 50%); margin-inline: 0.1em; }
  .rite .text { border-radius: 0.3em 0.3em 1.2em 1.2em; }

  /* The emblem of the faction, at the bottom of the frame. */
  .emblem {
    position: absolute; left: 50%; bottom: -0.15em; transform: translateX(-50%);
    width: 1.5em; height: 1.5em; padding: 0.22em; box-sizing: border-box;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--c) 80%, white 15%), color-mix(in srgb, var(--c) 70%, black));
    box-shadow: 0 0 0 0.09em var(--gold), 0 0 0 0.17em var(--gold-d), 0 0.1em 0.25em rgb(0 0 0 / 0.6);
    fill: var(--l); stroke: var(--l); stroke-width: 0; overflow: visible;
  }
  .f-sprout .emblem path, .f-neutral .emblem path, .f-abyss .emblem path { fill: none; stroke-width: 2; stroke-linecap: round; }

  /* Foil: a light band that crosses rare and legendary cards. */
  .shine::after {
    content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(115deg, transparent 35%, rgb(255 250 220 / 0.32) 45%, rgb(190 230 255 / 0.22) 50%, transparent 60%);
    background-size: 250% 100%; mix-blend-mode: screen;
    animation: shine 4.5s ease-in-out infinite;
  }
  .r-legendary.shine::after { background-image: linear-gradient(115deg, transparent 30%, rgb(255 200 250 / 0.3) 42%, rgb(255 245 200 / 0.35) 50%, rgb(180 240 255 / 0.3) 58%, transparent 70%); }
  @keyframes shine { 0%, 15% { background-position: 120% 0; } 70%, 100% { background-position: -20% 0; } }
  @media (prefers-reduced-motion: reduce) { .shine::after { animation: none; background-position: 50% 0; opacity: 0.5; } }

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
  .stat.up { color: #b6f5a6; }
  .stat.down { color: #ffb0a0; }
  .hold::before {
    background: linear-gradient(160deg, #9fb3c4, #3d5468);
    clip-path: polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%);
  }
</style>
