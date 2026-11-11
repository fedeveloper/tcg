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
