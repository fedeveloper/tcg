<script lang="ts">
  interface Props {
    /** Width of the card in CSS pixels. The height is 1.4 times the width. */
    width?: number;
  }
  let { width = 320 }: Props = $props();
</script>

<!-- The back of every card (graphics plan, phase 4, step 1): a lighthouse on a compass rose. -->
<svg class="back" viewBox="0 0 160 224" style="width: {width}px; height: {width * 1.4}px" aria-hidden="true">
  <defs>
    <radialGradient id="cb-sea" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#2c4f7a" /><stop offset="0.6" stop-color="#14263f" /><stop offset="1" stop-color="#0a1322" />
    </radialGradient>
    <linearGradient id="cb-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3d9a0" /><stop offset="0.5" stop-color="#d9b56a" /><stop offset="1" stop-color="#7a5a24" />
    </linearGradient>
    <radialGradient id="cb-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffe9a8" stop-opacity="0.9" /><stop offset="1" stop-color="#ffb84d" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect x="1" y="1" width="158" height="222" rx="14" fill="url(#cb-sea)" stroke="url(#cb-gold)" stroke-width="2" />
  <rect x="8" y="8" width="144" height="208" rx="9" fill="none" stroke="#7a5a24" stroke-width="1.5" />
  <rect x="11" y="11" width="138" height="202" rx="7" fill="none" stroke="#d9b56a" stroke-width="0.6" stroke-dasharray="2 3" />
  <!-- compass rose -->
  <g transform="translate(80 118)" fill="none" stroke="#d9b56a" stroke-opacity="0.55" stroke-width="0.8">
    <circle r="54" /><circle r="46" stroke-dasharray="1 3" /><circle r="30" />
    <path d="M0-62 6-6 62 0 6 6 0 62-6 6-62 0-6-6Z" fill="#d9b56a" fill-opacity="0.12" />
    <path d="M-40-40-4 0-40 40 0 4 40 40 4 0 40-40 0-4Z" stroke-opacity="0.35" />
  </g>
  <!-- light beams -->
  <path d="M80 82 8 58v34Z M80 82l72-24v34Z" fill="#ffe2a0" opacity="0.18" />
  <circle cx="80" cy="82" r="22" fill="url(#cb-glow)" />
  <!-- lighthouse -->
  <g stroke="#2a1f16" stroke-width="1.2" stroke-linejoin="round">
    <path d="M73 92h14l4 52H69Z" fill="#efe3c8" />
    <path d="M72 104h16l1 9H71Zm-2 20h20l1 9H69Z" fill="#c8553d" />
    <rect x="73" y="78" width="14" height="14" rx="2" fill="#ffd77a" />
    <path d="M71 78h18l-9-9Z" fill="#c8553d" />
    <path d="M64 144h32l4 8H60Z" fill="#6b5a46" />
  </g>
  <!-- waves -->
  <path d="M14 166c10-6 18-6 28 0s18 6 28 0 18-6 28 0 18 6 28 0 14-4 20-2M14 178c10-6 18-6 28 0s18 6 28 0 18-6 28 0 18 6 28 0 14-4 20-2" fill="none" stroke="#b9dcf2" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" />
  <text x="80" y="200" text-anchor="middle" font-family="Alegreya, Georgia, serif" font-weight="700" font-size="13" fill="url(#cb-gold)" letter-spacing="2">HIGH TIDES</text>
</svg>

<style>
  .back { display: block; filter: drop-shadow(0 0.4em 0.8em rgb(0 0 0 / 0.55)); }
</style>
