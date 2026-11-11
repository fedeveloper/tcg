"""The full list of Keeper sprites and card illustrations of the first set."""
import cards
import keepers
import keepers_abyss
import keepers_gear
import keepers_neutral
import keepers_vesper
import scenes_set
from px import Canvas, ell

KEEPERS = {
    **keepers.KEEPERS, **keepers_abyss.KEEPERS, **keepers_gear.KEEPERS, **keepers_vesper.KEEPERS,
    **keepers_neutral.KEEPERS,
}
SCENES = {**cards.SCENES, **scenes_set.SCENES}
BACKGROUNDS = {**cards.BACKGROUNDS, **scenes_set.BACKGROUNDS}
KEEPER_BG = {**cards.KEEPER_BG, **scenes_set.KEEPER_BG}


def illustration(card_id):
    if card_id not in KEEPERS:
        return SCENES[card_id]()
    c = Canvas(cards.W, cards.H)
    BACKGROUNDS[KEEPER_BG[card_id]](c)
    c.dither(ell(27, 37, 9, 1), "ink", 8)  # contact shadow
    c.blit(KEEPERS[card_id](0), 12, 7)
    return c


def _ids(faction, count, extra=()):
    return [f"{faction}-{i:03d}" for i in range(1, count + 1)] + list(extra)


CARD_IDS = (
    _ids("forge", 26) + _ids("sprout", 26, ["sprout-t01"]) + _ids("abyss", 26) + _ids("gear", 26, ["gear-t01"])
    + _ids("vesper", 26, ["vesper-t01"]) + _ids("neutral", 20, ["neutral-spark"])
)

assert set(CARD_IDS) == set(KEEPERS) | set(SCENES), set(CARD_IDS) ^ (set(KEEPERS) | set(SCENES))
assert set(KEEPERS) <= set(KEEPER_BG)
