import { CARDS, CONDITIONS, type CardDef, type Effect, type EffectAction, type Keyword, type TargetRef, type TargetSpec } from "@tcg/cards";
import type { Translator } from "./index.ts";

export function cardName(tr: Translator, cardId: string): string {
  return tr.t(`${cardId}.name`, { ns: "cards" });
}

export function cardFlavor(tr: Translator, cardId: string): string {
  return tr.t(`${cardId}.flavor`, { ns: "cards" });
}

export function keywordName(tr: Translator, k: Keyword): string {
  return tr.t(`keywords.${k}.name`);
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/** Formats a stat change: "+1/+1", "+2 Attack", "+3 Hold". */
export function statsText(tr: Translator, attack: number, hold: number): string {
  if (attack !== 0 && hold !== 0) return tr.t("stats.both", { attack: signed(attack), hold: signed(hold) });
  if (attack !== 0) return tr.t("stats.attack", { value: signed(attack) });
  return tr.t("stats.hold", { value: signed(hold) });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Form = "targets" | "targetsTo";

/** Tracks the first mention of the chosen target. Later mentions say "that Keeper". */
interface TextState {
  chosenSeen: boolean;
}

function specText(tr: Translator, spec: TargetSpec | undefined, form: Form, ts: TextState): string {
  if (!spec) return "?";
  if (ts.chosenSeen) return tr.t(`${form}.again.${spec.kind}`);
  ts.chosenSeen = true;
  if (spec.kind === "beacon") return tr.t(`${form}.beacon.${spec.side}`);
  let s = tr.t(`${form}.keeper.${spec.side}`);
  if (spec.row) s += tr.t(`targets.row.${spec.row}`);
  if (spec.sameLane) s += tr.t("targets.sameLane");
  return s;
}

function targetText(tr: Translator, ref: TargetRef, def: CardDef, spec: TargetSpec | undefined, form: Form, ts: TextState): string {
  if (ref === "chosen") return specText(tr, spec, form, ts);
  if (ref === "attached") return tr.t(def.attachTo === "beacon" ? `${form}.attachedBeacon` : `${form}.attachedKeeper`);
  return tr.t(`${form}.${ref}`);
}

function refIsBeacon(ref: TargetRef, def: CardDef, spec: TargetSpec | undefined): boolean {
  if (ref === "chosen") return spec?.kind === "beacon";
  if (ref === "attached") return def.attachTo === "beacon";
  return ref.includes("Beacon");
}

function actionText(tr: Translator, a: EffectAction, def: CardDef, spec: TargetSpec | undefined, ts: TextState): string {
  const subject = (ref: TargetRef) => targetText(tr, ref, def, spec, "targets", ts);
  switch (a.op) {
    case "damage":
      return tr.t("rules.damage", { count: a.amount, target: targetText(tr, a.target, def, spec, "targetsTo", ts) });
    case "heal":
      return refIsBeacon(a.target, def, spec)
        ? tr.t("rules.healBeacon", { count: a.amount, target: subject(a.target) })
        : tr.t("rules.healKeeper", { count: a.amount, target: subject(a.target) });
    case "buff": {
      const key = a.until === "dusk" ? "rules.buffUntilDusk" : "rules.buff";
      return tr.t(key, { target: subject(a.target), stats: statsText(tr, a.attack ?? 0, a.hold ?? 0) });
    }
    case "destroy":
      return tr.t("rules.destroy", { target: subject(a.target) });
    case "grant":
      return tr.t("rules.grant", { target: subject(a.target), keyword: keywordName(tr, a.keyword) });
    case "draw":
      return tr.t("rules.draw", { count: a.amount });
    case "tide":
      return a.amount >= 0 ? tr.t("rules.tide", { count: a.amount }) : tr.t("rules.tideAway", { count: -a.amount });
    case "ember":
      return tr.t("rules.ember", { count: a.amount });
    case "bounce":
      return tr.t("rules.bounce", { target: subject(a.target) });
    case "discard":
      return tr.t("rules.discard", { count: a.amount });
    case "recall":
      return tr.t("rules.recall", { count: a.amount });
    case "summon": {
      const token = CARDS[a.card];
      const stats = `${token?.attack ?? 0}/${token?.hold ?? 1}`;
      return tr.t(`rules.summon.${a.where}`, { card: cardName(tr, a.card), stats });
    }
  }
}

function sentence(
  tr: Translator,
  prefix: string,
  actions: readonly EffectAction[],
  def: CardDef,
  spec: TargetSpec | undefined,
  ts: TextState,
): string {
  const body = actions.map((a) => actionText(tr, a, def, spec, ts)).join(tr.t("rules.join"));
  return prefix ? `${prefix}${body}.` : `${capitalize(body)}.`;
}

function effectText(tr: Translator, e: Effect, def: CardDef, ts: TextState): string {
  const conds = CONDITIONS
    .filter((c) => e.condition?.[c])
    .map((c) => tr.t(`conditions.${c}.name`))
    .join(", ");
  let prefix = "";
  if (e.when !== "play" && conds) prefix = tr.t("rules.triggerWithCondition", { trigger: tr.t(`triggers.${e.when}`), condition: conds });
  else if (e.when !== "play") prefix = tr.t("rules.triggerPrefix", { trigger: tr.t(`triggers.${e.when}`) });
  else if (conds) prefix = tr.t("rules.conditionPrefix", { condition: conds });
  return sentence(tr, prefix, e.actions, def, def.target, ts);
}

/**
 * Builds the rules text of a card from its effects (plan, section 6.8).
 * Keywords are not in the result: the card frame shows them separately.
 */
export function cardRulesText(tr: Translator, def: CardDef): string[] {
  const lines: string[] = [];
  if (def.sacrifice) lines.push(tr.t("rules.sacrifice", { count: def.sacrifice }));
  if (def.type === "relic") lines.push(tr.t(def.attachTo === "beacon" ? "rules.attachBeacon" : "rules.attachKeeper"));
  if (def.tidePush) {
    lines.push(def.tidePush > 0 ? tr.t("rules.tidePush", { count: def.tidePush }) : tr.t("rules.tidePushAway", { count: -def.tidePush }));
  }
  if (def.aura) {
    const isSite = def.type === "site";
    if (def.aura.attack || def.aura.hold) {
      lines.push(tr.t(isSite ? "rules.auraSite" : "rules.auraKeeper", { stats: statsText(tr, def.aura.attack ?? 0, def.aura.hold ?? 0) }));
    }
    if (def.aura.keywords?.length) {
      const keywords = def.aura.keywords.map((k) => keywordName(tr, k)).join(", ");
      lines.push(tr.t(isSite ? "rules.auraSiteKeywords" : "rules.auraKeeperKeywords", { keywords }));
    }
  }
  const ts: TextState = { chosenSeen: false };
  for (const e of def.effects) lines.push(effectText(tr, e, def, ts));
  for (const ab of def.abilities) {
    const abilityState: TextState = { chosenSeen: false };
    const body = ab.actions.map((a) => actionText(tr, a, def, ab.target, abilityState)).join(tr.t("rules.join"));
    lines.push(tr.t("rules.ability", { cost: ab.cost, text: body }));
  }
  return lines;
}

/** One line that sums up a card: name, cost, type, stats and keywords. */
export function cardSummary(tr: Translator, def: CardDef): string {
  const parts = [`${cardName(tr, def.id)} (${def.cost})`, tr.t(`types.${def.type}`)];
  if (def.type === "keeper") parts.push(`${def.attack ?? 0}/${def.hold ?? 1}`);
  if (def.keywords.length) parts.push(def.keywords.map((k) => keywordName(tr, k)).join(", "));
  return parts.join(" · ");
}
