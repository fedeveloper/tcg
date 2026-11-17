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
