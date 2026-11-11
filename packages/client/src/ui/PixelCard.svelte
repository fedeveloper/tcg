<script lang="ts">
  import { CARD_H, CARD_W, drawCard, faceKey, type CardFace } from "./pixelCanvas.ts";

  interface Props {
    face: CardFace;
    /** Integer scale of the card. */
    scale?: number;
  }
  let { face, scale = 2 }: Props = $props();
  let canvas: HTMLCanvasElement;
  /** The face on the canvas. A new object with the same face does not draw again. */
  let shown = "";

  $effect(() => {
    const key = faceKey(face);
    if (key === shown) return;
    shown = key;
    void drawCard(canvas, face);
  });
</script>

<canvas bind:this={canvas} width={CARD_W} height={CARD_H} style="width: {CARD_W * scale}px; height: {CARD_H * scale}px" aria-hidden="true"></canvas>

<style>
  canvas { image-rendering: pixelated; display: block; }
</style>
