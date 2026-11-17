<script module lang="ts">
  /** The first screen of the page has no wave. */
  let first = true;
</script>

<script lang="ts">
  /**
   * The screen transition (graphics plan, phase 6): a painted wave crosses the screen
   * and uncovers the new screen. It does not take clicks.
   * "Reduce animations" and the system setting turn it off.
   */
  function reduced(): boolean {
    try {
      const v = localStorage.getItem("tcg.reducedMotion");
      if (v !== null) return v === "1";
    } catch {}
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  const show = !first && !reduced();
  first = false;
  let done = $state(!show);
</script>

{#if !done}
  <div class="wave" aria-hidden="true" onanimationend={() => (done = true)}>
    <svg viewBox="0 0 120 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="wave-sea" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#0b1626" />
          <stop offset="0.8" stop-color="#173a5c" />
          <stop offset="1" stop-color="#2f6f8f" />
        </linearGradient>
      </defs>
      <path
        d="M0 0 H100 C108 6 104 14 110 20 C116 27 106 33 111 41 C117 50 105 56 110 64 C115 72 104 79 109 87 C113 94 106 98 104 100 H0 Z"
        fill="url(#wave-sea)"
      />
      <path
        d="M100 0 C108 6 104 14 110 20 C116 27 106 33 111 41 C117 50 105 56 110 64 C115 72 104 79 109 87 C113 94 106 98 104 100"
        fill="none"
        stroke="#e8f4f2"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-dasharray="6 3 2 3"
        opacity="0.85"
      />
    </svg>
  </div>
{/if}

<style>
  .wave {
    position: fixed;
    inset: 0 -20vw 0 0;
    z-index: 50;
    pointer-events: none;
    animation: wave 0.7s cubic-bezier(0.55, 0, 0.3, 1) forwards;
  }
  svg { width: 100%; height: 100%; display: block; }
  @keyframes wave {
    from { transform: translateX(0); }
    to { transform: translateX(110%); }
  }
</style>
