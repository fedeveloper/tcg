/** Validates every card file and prints a balance hint for each keeper. */
import { RAW_CARD_FILES, referenceGap, validateCardFiles } from "@tcg/cards";

const { problems, cards } = validateCardFiles(RAW_CARD_FILES);
if (problems.length > 0) {
  console.error(`${problems.length} card problems:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Cards OK: ${cards.length} cards (${cards.filter((c) => !c.token).length} collectible).`);

const hints = cards
  .map((c) => ({ id: c.id, gap: referenceGap(c) }))
  .filter((h): h is { id: string; gap: number } => h.gap !== null && Math.abs(h.gap) > 2.5);
if (hints.length > 0) {
  console.log("Balance hints (attack + hold + effect value - (2 × cost + 1)):");
  for (const h of hints) console.log(`  ${h.id.padEnd(12)} ${h.gap > 0 ? "+" : ""}${h.gap.toFixed(1)}`);
}
