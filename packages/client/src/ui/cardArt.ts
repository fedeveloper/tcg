import artData from "../../../../assets/sheets/card-art.json";
import artUrl from "../../../../assets/sheets/card-art.png?url";

/** CSS for the illustration of a card: one frame of the art sheet at the given scale. */
export function cardArtStyle(cardId: string, scale = 2): string | null {
  const f = (artData.frames as Record<string, { frame: { x: number; y: number } }>)[`art/${cardId}`]?.frame;
  if (!f) return null;
  const { w, h } = artData.meta.size;
  return `background-image: url(${artUrl}); background-position: -${f.x * scale}px -${f.y * scale}px; background-size: ${w * scale}px ${h * scale}px;`;
}
