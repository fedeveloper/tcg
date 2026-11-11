import { CardFile, type CardDef, type EffectAction, type TargetRef, type Trigger } from "./schema.ts";
import { expandDeck, STARTER_DECKS, validateDeck } from "./decks.ts";

/** Rules that the Zod schema cannot express. Each problem is a readable English message. */

const TRIGGERS_BY_TYPE: Record<CardDef["type"], readonly Trigger[]> = {
  keeper: ["enterPlay", "dawn", "dusk", "death", "tideTurn"],
  quickRite: ["play"],
  slowRite: ["play"],
  relic: ["enterPlay", "dawn", "dusk", "tideTurn"],
  site: ["enterPlay", "dawn", "dusk", "tideTurn"],
};

const LANE_REFS: readonly TargetRef[] = [
  "enemyBeaconSameLane",
  "allyBeaconSameLane",
  "enemyFrontSameLane",
  "enemyKeepersSameLane",
  "allyKeepersSameLane",
];

/** The plan allows at most one line of free text, plus up to one conditional variant (section 3.8). */
export const MAX_TEXT_LINES = 2;

function refsOf(actions: readonly EffectAction[]): TargetRef[] {
  return actions.flatMap((a) => ("target" in a ? [a.target] : []));
}

export function validateCard(card: CardDef, db: Readonly<Record<string, CardDef>>): string[] {
  const p: string[] = [];
  const err = (msg: string) => p.push(`${card.id}: ${msg}`);

  const prefix = card.id.split("-")[0];
  if (prefix !== card.faction) err(`id prefix "${prefix}" does not match faction "${card.faction}"`);

  const isKeeper = card.type === "keeper";
  if (isKeeper && (card.attack === undefined || card.hold === undefined)) err("a keeper needs attack and hold");
  if (!isKeeper && (card.attack !== undefined || card.hold !== undefined)) err("only keepers have attack and hold");
  if (!isKeeper && card.keywords.length > 0) err("only keepers have keywords");
  if (new Set(card.keywords).size !== card.keywords.length) err("duplicate keyword");
  if (!isKeeper && card.abilities.length > 0) err("only keepers have activated abilities");

  if (card.type === "relic" && !card.attachTo) err("a relic needs attachTo");
  if (card.type !== "relic" && card.attachTo) err("only relics have attachTo");
  if (card.aura && card.type !== "relic" && card.type !== "site") err("only relics and sites have an aura");
  if (card.aura && card.type === "relic" && card.attachTo !== "keeper") err("a relic with an aura must attach to a keeper");
  if ((card.type === "relic" || card.type === "site") && !card.aura && card.effects.length === 0) err("a relic or a site needs an aura or an effect");

  if (card.effects.length + card.abilities.length > MAX_TEXT_LINES) err(`more than ${MAX_TEXT_LINES} lines of rules text`);
  if (!card.token && isKeeper === false && card.effects.length === 0 && !card.aura) err("the card does nothing");

  let chosenUsed = false;
  for (const e of card.effects) {
    if (!TRIGGERS_BY_TYPE[card.type].includes(e.when)) err(`trigger "${e.when}" is not valid for a ${card.type}`);
    if (e.condition?.resonance && e.when !== "play" && e.when !== "enterPlay") err("resonance works only on play or enterPlay");
    if (e.condition && Object.keys(e.condition).length === 0) err("empty condition");
    const refs = refsOf(e.actions);
    if (refs.includes("chosen")) {
      chosenUsed = true;
      if (e.when !== "play" && e.when !== "enterPlay") err(`"chosen" cannot be used in a ${e.when} effect`);
    }
    for (const r of refs) {
      if (r === "self" && !isKeeper) err(`"self" works only on keepers`);
      if (r === "attached" && card.type !== "relic") err(`"attached" works only on relics`);
      if (LANE_REFS.includes(r) && (card.type === "quickRite" || card.type === "slowRite")) err(`rites have no lane: "${r}" is not valid`);
    }
    for (const a of e.actions) {
      if (a.op === "summon") {
        const token = db[a.card];
        if (!token) err(`summon of unknown card ${a.card}`);
        else if (!token.token || token.type !== "keeper") err(`summon target ${a.card} must be a token keeper`);
        if (card.type === "quickRite") err("a quick rite cannot summon keepers");
        if (a.where !== "eachLaneBack" && (card.type === "quickRite" || card.type === "slowRite")) err("rites have no lane: use eachLaneBack");
      }
      if (a.op === "buff" && !a.attack && !a.hold) err("a buff needs attack or hold");
      if (a.op === "heal" && (a.target === "allEnemyBeacons" || a.target === "enemyBeaconSameLane")) err("healing enemy beacons is not allowed");
    }
  }
  if (chosenUsed && !card.target) err(`"chosen" needs a target spec`);
  if (card.target && !chosenUsed) err("the target spec is not used by any effect");
  if (card.target?.kind === "keeper" && card.target.sameLane && card.type !== "keeper") err("sameLane targets need a keeper");

  card.abilities.forEach((ab, i) => {
    const uses = refsOf(ab.actions).includes("chosen");
    if (uses && !ab.target) err(`ability ${i} uses "chosen" without a target spec`);
    if (ab.target && !uses) err(`ability ${i} has an unused target spec`);
  });
  return p;
}

export interface CardFileReport {
  problems: string[];
  cards: CardDef[];
}

/** Validates the raw card files: schema, unique ids, card rules and starter decks. */
export function validateCardFiles(files: Readonly<Record<string, unknown>>): CardFileReport {
  const problems: string[] = [];
  const cards: CardDef[] = [];
  const db: Record<string, CardDef> = {};
  for (const [file, raw] of Object.entries(files)) {
    const parsed = CardFile.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) problems.push(`${file}: ${issue.path.join(".")}: ${issue.message}`);
      continue;
    }
    for (const card of parsed.data) {
      if (db[card.id]) problems.push(`${file}: duplicate id ${card.id}`);
      db[card.id] = card;
      cards.push(card);
    }
  }
  for (const card of cards) problems.push(...validateCard(card, db));
  for (const [name, list] of Object.entries(STARTER_DECKS)) {
    for (const d of validateDeck(expandDeck(list), db)) problems.push(`starter deck ${name}: ${JSON.stringify(d)}`);
  }
  return { problems, cards };
}

/**
 * Rough reference value from the plan (section 9.2): attack + hold + effect value ≈ 2 × cost + 1.
 * The effect value is an estimate. The tool prints it as a hint for designers, not as an error.
 */
export function referenceGap(card: CardDef): number | null {
  if (card.type !== "keeper" || card.token) return null;
  let value = (card.attack ?? 0) + (card.hold ?? 0);
  value += card.keywords.length * 1;
  value += Math.abs(card.tidePush ?? 0);
  for (const e of card.effects) {
    const weight = e.condition ? 0.5 : 1;
    const repeat = e.when === "dusk" || e.when === "dawn" ? 2 : 1;
    for (const a of e.actions) {
      const base = "amount" in a ? Math.abs(a.amount) : a.op === "buff" ? Math.abs(a.attack ?? 0) + Math.abs(a.hold ?? 0) : 2;
      value += base * weight * repeat;
    }
  }
  return value - (2 * card.cost + 1);
}
