import forgeData from "../data/forge.json" with { type: "json" };
import sproutData from "../data/sprout.json" with { type: "json" };
import neutralData from "../data/neutral.json" with { type: "json" };
import { CardFile, type CardDef } from "./schema.ts";

export * from "./schema.ts";
export * from "./decks.ts";

export type CardDB = Readonly<Record<string, CardDef>>;

/** Raw card files, before validation. The validator tool reads them too. */
export const RAW_CARD_FILES: Readonly<Record<string, unknown>> = {
  "forge.json": forgeData,
  "sprout.json": sproutData,
  "neutral.json": neutralData,
};

function buildDb(): CardDB {
  const db: Record<string, CardDef> = {};
  for (const [file, raw] of Object.entries(RAW_CARD_FILES)) {
    const parsed = CardFile.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid card file ${file}: ${parsed.error.message}`);
    }
    for (const card of parsed.data) {
      if (db[card.id]) throw new Error(`Duplicate card id ${card.id}`);
      db[card.id] = card;
    }
  }
  return Object.freeze(db);
}

/** Every card definition, validated with the Zod schema. */
export const CARDS: CardDB = buildDb();

export function getCard(id: string): CardDef {
  const card = CARDS[id];
  if (!card) throw new Error(`Unknown card id ${id}`);
  return card;
}

/** The card that the second player receives at the start (plan, section 3.9). */
export const SPARK_CARD_ID = "neutral-spark";

export function collectibleCards(): CardDef[] {
  return Object.values(CARDS).filter((c) => !c.token);
}
export * from "./validate.ts";
