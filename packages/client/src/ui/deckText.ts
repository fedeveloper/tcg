import { CARDS } from "@tcg/cards";
import type { OwnedDeckProblem, SavedDeck } from "@tcg/meta";
import { cardName, type Translator } from "@tcg/i18n";

/** The name of a saved deck. Starter decks use the translated name. */
export function deckLabel(tr: Translator, d: SavedDeck): string {
  return d.id.startsWith("starter-") ? tr.t(`deckNames.${d.name}`) : d.name;
}

/** A readable message for a deck problem. */
export function problemText(tr: Translator, p: OwnedDeckProblem): string {
  switch (p.code) {
    case "size":
      return tr.t("meta.problems.size", { size: p.size });
    case "unknownCard":
    case "notCollectible":
      return tr.t("meta.problems.invalidCard", { card: p.card });
    case "tooManyCopies":
      return tr.t("meta.problems.tooManyCopies", { card: cardName(tr, p.card), copies: p.copies });
    case "tooManyFactions":
      return tr.t("meta.problems.tooManyFactions", { factions: p.factions.map((f) => tr.t(`factions.${f}`)).join(", ") });
    case "notOwned":
      return tr.t("meta.problems.notOwned", { card: cardName(tr, p.card), copies: p.copies, owned: p.owned });
  }
}

/** The faction with most cards in a deck, neutral cards apart. A deck of only neutral cards is "neutral". */
export function deckFaction(cards: Record<string, number>): string {
  const count: Record<string, number> = {};
  for (const [id, n] of Object.entries(cards)) {
    const f = CARDS[id]?.faction;
    if (f && f !== "neutral") count[f] = (count[f] ?? 0) + n;
  }
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";
}

/** The card whose illustration stands for each faction: the faction anchors of the style guide. */
export const FACTION_ART: Record<string, string> = {
  forge: "forge-011",
  sprout: "sprout-008",
  neutral: "neutral-006",
  abyss: "abyss-012",
  gear: "gear-011",
  vesper: "vesper-013",
};
