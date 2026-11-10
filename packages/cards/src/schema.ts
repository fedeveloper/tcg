import { z } from "zod";

/**
 * Card data schema. Card files hold no player-visible text:
 * names, flavor and rules text live in the i18n package.
 */

export const FACTIONS = ["forge", "abyss", "sprout", "gear", "vesper", "neutral"] as const;
export const Faction = z.enum(FACTIONS);
export type Faction = z.infer<typeof Faction>;

export const CARD_TYPES = ["keeper", "quickRite", "slowRite", "relic", "site"] as const;
export const CardType = z.enum(CARD_TYPES);
export type CardType = z.infer<typeof CardType>;

export const RARITIES = ["common", "uncommon", "rare", "legendary"] as const;
export const Rarity = z.enum(RARITIES);
export type Rarity = z.infer<typeof Rarity>;

/** Keywords that a keeper can have. Conditions (high tide, ebb, resonance) and sacrifice are not here. */
export const KEYWORDS = ["rooted", "reach", "overrun", "echo", "wear", "anchor", "surge"] as const;
export const Keyword = z.enum(KEYWORDS);
export type Keyword = z.infer<typeof Keyword>;

/** A target that the player chooses when the card is played or the ability is activated. */
export const TargetSpec = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("keeper"),
    side: z.enum(["enemy", "ally", "any"]),
    row: z.enum(["front", "back"]).optional(),
    sameLane: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("beacon"),
    side: z.enum(["enemy", "ally"]),
  }),
]);
export type TargetSpec = z.infer<typeof TargetSpec>;

/** Who an effect action hits. "chosen" refers to the target that the player chose. */
export const TARGET_REFS = [
  "chosen",
  "self",
  "attached",
  "enemyBeaconSameLane",
  "allyBeaconSameLane",
  "enemyFrontSameLane",
  "enemyKeepersSameLane",
  "allyKeepersSameLane",
  "allEnemyKeepers",
  "allAllyKeepers",
  "allEnemyBeacons",
  "allAllyBeacons",
] as const;
export const TargetRef = z.enum(TARGET_REFS);
export type TargetRef = z.infer<typeof TargetRef>;

const amount = z.number().int().min(1).max(10);
const signed = z.number().int().min(-10).max(10);

export const EffectAction = z.discriminatedUnion("op", [
  z.object({ op: z.literal("damage"), amount, target: TargetRef }),
  z.object({ op: z.literal("heal"), amount, target: TargetRef }),
  z.object({
    op: z.literal("buff"),
    attack: signed.optional(),
    hold: signed.optional(),
    until: z.enum(["dusk", "permanent"]),
    target: TargetRef,
  }),
  z.object({ op: z.literal("destroy"), target: TargetRef }),
  z.object({ op: z.literal("grant"), keyword: Keyword, target: TargetRef }),
  z.object({ op: z.literal("draw"), amount }),
  z.object({ op: z.literal("tide"), amount: signed }),
  z.object({ op: z.literal("ember"), amount }),
  z.object({
    op: z.literal("summon"),
    card: z.string(),
    where: z.enum(["sameLaneFront", "sameLaneBack", "eachLaneBack"]),
  }),
]);
export type EffectAction = z.infer<typeof EffectAction>;

export const TRIGGERS = ["play", "enterPlay", "dawn", "dusk", "death"] as const;
export const Trigger = z.enum(TRIGGERS);
export type Trigger = z.infer<typeof Trigger>;

export const Condition = z
  .object({
    highTide: z.boolean().optional(),
    lowTide: z.boolean().optional(),
    resonance: z.boolean().optional(),
  })
  .strict();
export type Condition = z.infer<typeof Condition>;

export const Effect = z.object({
  when: Trigger,
  condition: Condition.optional(),
  actions: z.array(EffectAction).min(1),
});
export type Effect = z.infer<typeof Effect>;

export const Ability = z.object({
  cost: z.number().int().min(0).max(10),
  target: TargetSpec.optional(),
  actions: z.array(EffectAction).min(1),
});
export type Ability = z.infer<typeof Ability>;

export const Aura = z.object({
  attack: signed.optional(),
  hold: signed.optional(),
  keywords: z.array(Keyword).optional(),
});
export type Aura = z.infer<typeof Aura>;

export const CardDef = z
  .object({
    id: z.string().regex(/^[a-z]+-[a-z0-9]+$/),
    type: CardType,
    faction: Faction,
    rarity: Rarity,
    cost: z.number().int().min(0).max(10),
    attack: z.number().int().min(0).max(20).optional(),
    hold: z.number().int().min(1).max(20).optional(),
    keywords: z.array(Keyword).max(2).default([]),
    /** Moves the tide toward the owner when the card resolves. */
    tidePush: signed.optional(),
    /** Sacrifice X: destroy X of your keepers to play the card. */
    sacrifice: z.number().int().min(1).max(3).optional(),
    /** A chosen target for the "chosen" references in the effects. */
    target: TargetSpec.optional(),
    effects: z.array(Effect).default([]),
    /** Activated abilities. Each ability works once per round. */
    abilities: z.array(Ability).default([]),
    /** Relics: what the relic attaches to. */
    attachTo: z.enum(["keeper", "beacon"]).optional(),
    /** Relics: bonus for the host keeper. Sites: bonus for every keeper in the lane. */
    aura: Aura.optional(),
    /** Tokens exist only on the battlefield and are not collectible. */
    token: z.boolean().default(false),
  })
  .strict();
export type CardDef = z.infer<typeof CardDef>;
export type CardDefInput = z.input<typeof CardDef>;

export const CardFile = z.array(CardDef);
