/** The round keeper medallions (graphics plan, phase 5), cut by assets/art/build.py. Card id → URL. */
export const MEDALS: Record<string, string> = {};
for (const [path, url] of Object.entries(
  import.meta.glob("../../../../assets/art/web/medal/*.webp", { query: "?url", import: "default", eager: true }) as Record<string, string>,
)) {
  const id = /([^/]+)\.webp$/.exec(path)?.[1];
  if (id) MEDALS[id] = url;
}
