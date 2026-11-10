/** Fails if a translation key exists in one language and is missing in another. */
import { checkLocales } from "@tcg/i18n";

const problems = checkLocales();
if (problems.length > 0) {
  console.error(`${problems.length} localization problems:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log("Locales OK: every key exists in Italian and English.");
