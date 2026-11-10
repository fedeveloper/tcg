"""Card illustrations: 56x40 pixels, one per card.

A Keeper card shows frame 0 of the Keeper sprite on a faction background.
The other cards (Rites, Relics, Sites) have their own small scene.
"""
from keepers import KEEPERS, flame, kelp
from px import Canvas, ell, line, move, path, poly, rect

W, H = 56, 40
ALL = rect(0, 0, W - 1, H - 1)


# ---------------------------------------------------------------- scenery
def waves(c, y0, y1, col="mist", step=9, seed=0):
    for i, y in enumerate(range(y0, y1 + 1, 3)):
        for x in range(-(i * 5 + seed) % step, W, step):
            c.fill(rect(x, y, x + 2 + (i % 2), y), col)


def stars(c, pts, col="foam"):
    c.fill(set(pts), col)


def lighthouse(c, x, base, h, lit=True, body="foam", band="coral_dark"):
    top = base - h
    tower = poly([(x - 3, base), (x - 2, top + 5), (x + 2, top + 5), (x + 3, base)])
    c.shade(tower, (("ash", body, "white")))
    for y in range(top + 8, base, 6):
        c.fill({(px, py) for px, py in tower if y <= py <= y + 1}, band)
    c.fill(rect(x - 3, top + 4, x + 3, top + 4), "slate")
    c.fill(rect(x - 2, top + 1, x + 2, top + 3), "glow" if lit else "slate")
    c.fill(poly([(x - 3, top), (x, top - 3), (x + 3, top)]), "rust")
    if lit:
        c.put(x, top + 2, "white")


def beam(c, x, y, direction=1, length=22, col="glow"):
    for i in range(3, length):
        spread = i // 5
        for dy in range(-spread, spread + 1):
            px, py = x + i * direction, y + dy
            if (px + py) % 2 == 0 and i % 3 != 2:
                c.put(px, py, col)


def bg_forge_hall(c):
    c.vgrad(ALL, ["ink", "soot", "rust"], 0, 34)
    c.fill(rect(0, 34, W - 1, H - 1), "soot")
    c.fill(rect(0, 34, W - 1, 34), "rust")
    c.dither(rect(0, 35, W - 1, H - 1), "ink", 6)
    c.shade(rect(2, 14, 13, 33), "slate")  # furnace
    c.fill(poly([(4, 33), (4, 24), (7, 20), (10, 24), (10, 33)]), "ember")
    c.fill(poly([(5, 33), (5, 26), (7, 23), (9, 26), (9, 33)]), "flame")
    c.fill(rect(6, 29, 8, 33), "glow")
    c.dither(ell(7, 28, 13, 10) - rect(2, 14, 13, 33), "rust", 5)
    for x in (44, 50):
        c.fill(rect(x, 0, x, 9 + (x % 4)), "slate")  # chains
        c.put(x, 10 + (x % 4), "stone")
    c.fill(rect(46, 30, 55, 33), "ink")
    c.fill(rect(48, 27, 55, 29), "ink")


def bg_forge_shore(c):
    c.vgrad(rect(0, 0, W - 1, 25), ["dusk", "coral_dark", "ember", "flame"], 0, 25)
    c.fill(ell(42, 24, 6, 6) - rect(0, 26, W, H), "glow")
    c.fill(rect(0, 26, W - 1, H - 1), "deep")
    c.dither(rect(0, 26, W - 1, 30), "ember", 5)
    waves(c, 27, 34, "flame", 11)
    c.shade(poly([(0, 39), (0, 33), (8, 34), (40, 35), (55, 37), (55, 39)]), "soot")
    c.fill(rect(0, 36, W - 1, H - 1), "soot")
    c.fill(rect(0, 36, W - 1, 36), "rust")
    c.fill(poly([(0, 26), (0, 17), (3, 14), (6, 19), (9, 26)]), "soot")  # far forge
    c.fill(rect(2, 9, 3, 15), "soot")
    c.dots("glow", (2, 21), (5, 22))
    c.dots("stone", (2, 7), (3, 5), (4, 3))


def bg_forge_foundry(c):
    c.fill(ALL, "soot")
    c.vgrad(rect(0, 0, W - 1, 20), ["ink", "soot"], 0, 20)
    for x in range(0, W, 14):
        c.fill(rect(x, 0, x + 1, 35), "ink")
    c.fill(rect(0, 8, W - 1, 9), "ink")
    c.fill(rect(0, 36, W - 1, H - 1), "slate")
    c.fill(rect(0, 36, W - 1, 36), "stone")
    c.fill(rect(0, 38, W - 1, 39), "ember")  # molten channel
    c.dither(rect(0, 38, W - 1, 38), "glow", 8)
    c.dither(rect(0, 28, W - 1, 35), "rust", 4)
    c.shade(ell(47, 15, 5, 6), "slate")  # hanging crucible
    c.fill(rect(47, 0, 47, 9), "stone")
    c.fill(rect(43, 12, 51, 12), "flame")
    c.fill(rect(50, 17, 50, 35), "flame")
    c.fill(rect(50, 17, 50, 22), "glow")


def bg_sprout_reef(c):
    c.vgrad(ALL, ["sea", "deep", "abyss"], 0, 36)
    for x, y, n in ((6, 0, 14), (20, 0, 10), (38, 0, 16)):  # light shafts
        for i in range(n):
            c.dither(rect(x + i // 2, y + i, x + 3 + i // 2, y + i), "mist", 4)
    c.shade(poly([(0, 39), (0, 35), (14, 36), (30, 35), (55, 36), (55, 39)]), ("tan", "sand", "white"))
    c.dither(rect(0, 37, W - 1, 39), "tan", 6)
    for x, h, r in ((3, 14, "kelp"), (8, 20, "leaf"), (48, 22, "kelp"), (52, 13, "leaf")):
        kelp(c, x, 36 - h, 36, 0, r, x, 2)
    c.shade(ell(44, 35, 3, 2), "coral")
    c.dots("foam", (16, 8), (17, 5), (41, 14), (40, 18), (30, 3))


def bg_sprout_pool(c):
    c.vgrad(rect(0, 0, W - 1, 20), ["mist", "foam", "white"], 0, 20)
    c.fill(rect(0, 21, W - 1, 30), "sea")
    c.fill(rect(0, 21, W - 1, 21), "foam")
    waves(c, 23, 29, "mist", 10)
    c.shade(poly([(0, 39), (0, 31), (10, 33), (25, 35), (44, 34), (55, 31), (55, 39)]), "stone")
    c.fill(rect(0, 36, W - 1, H - 1), "slate")
    c.dither(rect(0, 36, W - 1, 37), "stone", 8)
    c.fill(ell(47, 37, 6, 2), "verd")  # tide pool
    c.fill(rect(44, 36, 48, 36), "verd_light")
    c.shade(ell(4, 33, 4, 2), "moss")
    c.shade(ell(52, 31, 3, 2), "moss")
    c.fill(ell(10, 6, 6, 2) | ell(15, 8, 5, 2), "white")
    c.fill(ell(44, 10, 5, 2), "white")
    lighthouse(c, 49, 21, 14)


def bg_sprout_kelp(c):
    c.vgrad(ALL, ["verd", "verd_dark", "kelp_dark"], 0, 34)
    for i, x in enumerate(range(1, W, 6)):
        kelp(c, x, 2 + (i * 7) % 9, 37, 0, "verd_dark", i, 2)
    for i, x in enumerate((0, 5, 46, 52)):
        kelp(c, x, 6 + i * 3, 37, 0, "leaf", i, 3)
    c.fill(rect(0, 36, W - 1, H - 1), "kelp_dark")
    c.dither(rect(0, 36, W - 1, 37), "kelp", 8)
    c.dots("verd_light", (14, 6), (15, 3), (40, 9), (41, 12), (33, 2), (22, 14))
    c.dots("sprout", (10, 38), (30, 37), (44, 38))


BACKGROUNDS = {
    "hall": bg_forge_hall, "shore": bg_forge_shore, "foundry": bg_forge_foundry,
    "reef": bg_sprout_reef, "pool": bg_sprout_pool, "kelpwood": bg_sprout_kelp,
}

KEEPER_BG = {
    "forge-001": "hall", "forge-002": "shore", "forge-003": "shore", "forge-004": "foundry",
    "forge-005": "shore", "forge-006": "shore", "forge-007": "foundry", "forge-008": "shore",
    "forge-009": "shore", "forge-010": "foundry", "forge-011": "foundry", "forge-012": "hall",
    "forge-013": "foundry", "forge-014": "hall",
    "sprout-001": "reef", "sprout-002": "kelpwood", "sprout-003": "pool", "sprout-004": "pool",
    "sprout-005": "kelpwood", "sprout-006": "pool", "sprout-007": "pool", "sprout-008": "pool",
    "sprout-009": "reef", "sprout-010": "kelpwood", "sprout-011": "kelpwood", "sprout-012": "reef",
    "sprout-013": "pool", "sprout-014": "reef", "sprout-015": "pool", "sprout-t01": "pool",
}


def keeper_card(card_id):
    c = Canvas(W, H)
    BACKGROUNDS[KEEPER_BG[card_id]](c)
    c.dither(ell(27, 37, 9, 1), "ink", 8)  # contact shadow
    c.blit(KEEPERS[card_id](0), 12, 7)
    return c


# ---------------------------------------------------------------- forge scenes
def night_sea(c, horizon=26, sky=("ink", "abyss", "dusk")):
    c.vgrad(rect(0, 0, W - 1, horizon - 1), list(sky), 0, horizon)
    c.fill(rect(0, horizon, W - 1, H - 1), "abyss")
    c.vgrad(rect(0, horizon, W - 1, H - 1), ["deep", "abyss"], horizon, H)
    waves(c, horizon + 2, H - 2, "sea", 10)


def forge_015():  # Tizzone: a small, fast, red-hot brand
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "soot", "rust"], 0, 44)
    for i in range(30):
        x, y = 6 + i, 33 - i * 0.8
        c.dither(ell(x, y, 1 + i / 7, 1 + i / 9), "ember", 4 + i // 3)
    for i in range(12, 30):
        c.dither(ell(6 + i, 33 - i * 0.8, i / 10, i / 12), "flame", 10)
    c.shade(ell(40, 8, 5, 4), "flame")
    c.fill(ell(41, 8, 3, 2), "glow")
    c.fill(ell(42, 8, 1, 1), "white")
    c.dots("glow", (48, 5), (50, 9), (46, 2), (30, 10), (22, 19), (14, 22), (34, 20))
    c.dots("flame", (51, 3), (26, 13), (10, 30), (18, 30))
    return c


def forge_016():  # Esplosione di Scintille: sparks burst on a beacon
    c = Canvas(W, H)
    night_sea(c, 30)
    c.fill(poly([(34, 39), (36, 30), (52, 30), (55, 39)]), "ink")
    lighthouse(c, 44, 31, 20, lit=False, body="ash", band="slate")
    cx, cy = 22, 16
    for k, (col, r) in enumerate((("rust", 13), ("ember", 10), ("flame", 7), ("glow", 4))):
        c.dither(ell(cx, cy, r + 2, r), col, 9 + k)
        c.fill(ell(cx, cy, r - 2, r - 3), col)
    c.fill(ell(cx, cy, 2, 1), "white")
    for dx, dy in ((-18, -9), (-14, 8), (-6, -14), (8, -13), (17, -6), (15, 9), (0, 15), (-19, 1), (12, -1)):
        c.fill(line(cx + dx // 2, cy + dy // 2, cx + dx, cy + dy), "flame")
        c.put(cx + dx, cy + dy, "glow")
    c.dots("glow", (3, 4), (40, 3), (7, 27), (33, 24), (30, 6), (48, 8))
    return c


def forge_017():  # Inno della Forgia: the hammer keeps the beat
    c = Canvas(W, H)
    bg_forge_hall(c)
    c.shade(rect(17, 28, 39, 31), "iron")  # anvil
    c.shade(poly([(13, 28), (17, 26), (41, 26), (44, 28)]), "steel")
    c.shade(rect(23, 31, 33, 34), "iron")
    c.shade(rect(20, 34, 36, 36), "iron")
    c.shade(poly([(26, 21), (30, 19), (43, 8), (41, 6), (27, 18)]), "bark")  # handle
    c.shade(poly([(20, 15), (26, 11), (31, 19), (25, 24)]), "steel")
    c.outline("ink")
    for i, (x, y) in enumerate(((10, 14), (18, 6), (33, 4), (46, 15), (48, 24))):  # notes of fire
        c.fill(rect(x, y, x, y + 5), "glow")
        c.fill(rect(x - 2, y + 4, x, y + 6), "flame" if i % 2 else "glow")
        c.fill(rect(x + 1, y, x + 2, y + 1), "glow")
    c.dots("glow", (24, 25), (28, 23), (33, 24), (21, 23))
    return c


def forge_018():  # Raffica del Mantice: hot wind pushes the sea
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 24), ["dusk", "coral_dark", "ember"], 0, 24)
    c.fill(rect(0, 25, W - 1, H - 1), "deep")
    c.shade(poly([(0, 14), (11, 18), (0, 24)]), "bark")  # bellows nozzle
    c.fill(rect(10, 18, 15, 19), "copper")
    for i, y in enumerate((9, 14, 19, 24)):
        pts = [(17 + i * 2, y + 4 - i), (28, y), (38, y + 2), (47, y - 1), (54, y + 1)]
        c.fill(path(pts, 1), "glow" if i % 2 else "flame")
        c.fill(move(path(pts[1:3], 1), 0, 1), "flame")
    wave = poly([(22, 39), (30, 30), (40, 27), (48, 29), (52, 34), (46, 32), (40, 34), (38, 39)])
    c.shade(wave, "water")
    c.fill(path([(40, 27), (48, 29), (52, 34)], 1), "foam")
    c.dots("foam", (53, 30), (50, 26), (54, 36))
    waves(c, 30, 38, "sea", 12)
    return c


def forge_019():  # Pioggia Fusa: molten rain over the sea
    c = Canvas(W, H)
    night_sea(c, 28, ("ink", "soot", "rust"))
    c.fill(ell(12, 3, 14, 4) | ell(34, 2, 16, 4) | ell(50, 4, 9, 3), "soot")
    c.dither(ell(30, 5, 26, 3), "rust", 6)
    for i, (x, y) in enumerate(((6, 12), (13, 22), (20, 9), (26, 18), (33, 13), (40, 23), (46, 10), (51, 19), (9, 30), (37, 32))):
        c.fill(line(x, y, x + 2, y - 6), "ember")
        c.fill(line(x, y, x + 1, y - 3), "flame")
        c.fill(ell(x, y + 1, 1, 1), "glow")
    for x in (12, 29, 44):  # steam where a drop meets the water
        c.fill(rect(x - 2, 29, x + 2, 29), "flame")
        c.dots("mist", (x, 27), (x + 1, 25), (x - 1, 24))
    return c


def forge_020():  # Ondata di Calore: steam becomes a weapon at high tide
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 21), ["flame", "glow", "white"], 0, 21)
    c.fill(ell(28, 21, 9, 9) - rect(0, 22, W, H), "white")
    c.fill(rect(0, 22, W - 1, H - 1), "sea")
    c.vgrad(rect(0, 22, W - 1, H - 1), ["mist", "sea", "deep"], 22, H)
    waves(c, 24, 38, "foam", 9)
    for i, x in enumerate(range(3, W, 8)):
        pts = [(x + [0, 2, 0, -2][(y // 3 + i) % 4], y) for y in range(4 + (i * 5) % 7, 30)]
        c.fill(set(pts), "foam" if i % 2 else "white")
        c.fill(move(set(pts[::2]), 1, 0), "glow")
    return c


def forge_021():  # Surriscaldamento: a furnace beyond its limit
    c = Canvas(W, H)
    c.vgrad(ALL, ["soot", "rust", "ember"], 0, 50)
    body = poly([(12, 39), (14, 10), (20, 4), (36, 4), (42, 10), (44, 39)])
    c.shade(body, "slate")
    c.fill(poly([(20, 39), (20, 24), (28, 17), (36, 24), (36, 39)]), "ember")
    c.fill(poly([(22, 39), (22, 26), (28, 20), (34, 26), (34, 39)]), "flame")
    c.fill(poly([(25, 39), (25, 29), (28, 25), (31, 29), (31, 39)]), "glow")
    c.fill(rect(27, 31, 29, 39), "white")
    for pts in ([(15, 14), (19, 18), (17, 22)], [(41, 13), (37, 16), (39, 21)], [(24, 6), (27, 10), (25, 14)], [(33, 7), (32, 13)]):
        c.fill(path(pts, 1), "flame")
    c.outline("ink")
    c.shade(ell(49, 12, 5, 5), "sand")  # gauge in the red
    c.fill(line(49, 12, 52, 9), "ember")
    c.fill(rect(51, 8, 53, 8), "ember")
    for x, y in ((6, 8), (9, 20), (47, 26), (50, 33), (5, 31)):
        c.fill(rect(x, y, x, y + 2), "glow")
        c.put(x, y - 2, "white")
    return c


def forge_022():  # Martello del Fabbro: a relic hammer
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "soot"], 0, 40)
    c.dither(ell(28, 20, 22, 15), "rust", 6)
    c.dither(ell(28, 20, 14, 10), "ember", 5)
    c.shade(poly([(18, 34), (15, 31), (33, 13), (36, 16)]), "bark")
    c.fill(rect(17, 30, 19, 32), "copper")
    c.shade(poly([(27, 9), (36, 3), (46, 14), (37, 22)]), "steel")
    c.fill(line(31, 9, 40, 18), "stone")
    c.fill(poly([(42, 9), (46, 14), (43, 17), (40, 13)]), "flame")
    c.outline("ink")
    c.dots("glow", (47, 10), (49, 15), (46, 19), (50, 7))
    c.dots("white", (33, 6), (34, 7))
    return c


def forge_023():  # Mantice a Vapore: breathes at every dawn
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 30), ["dusk", "coral_dark", "flame", "glow"], 0, 30)
    c.fill(rect(0, 31, W - 1, H - 1), "soot")
    c.fill(rect(0, 31, W - 1, 31), "rust")
    c.shade(ell(18, 22, 10, 8), "copper")  # boiler
    c.fill(rect(9, 20, 27, 21), "rust")
    c.dots("glow", (12, 20), (18, 20), (24, 20))
    c.shade(rect(14, 30, 16, 34), "iron")
    c.shade(rect(21, 30, 23, 34), "iron")
    c.shade(rect(16, 8, 19, 15), "copper")  # chimney
    for i, y in enumerate(range(17, 30, 3)):  # folds of the bellows
        c.shade(poly([(29, 22), (40 + (i % 2) * 2, y - 2), (40 + (i % 2) * 2, y)]), "bark")
    c.shade(poly([(28, 20), (42, 13), (44, 15), (44, 31), (42, 32), (28, 25)]), "bark")
    for x in (32, 36, 40):
        c.fill(rect(x, 15 + (40 - x) // 3, x, 30 - (40 - x) // 3), "wood_dark")
    c.shade(rect(44, 21, 52, 23), "copper")
    c.outline("ink")
    c.fill(ell(17, 4, 4, 2) | ell(22, 2, 3, 2) | ell(12, 2, 2, 1), "white")
    c.dots("foam", (54, 21), (54, 23), (53, 19))
    return c


def forge_024():  # Fonderia Ardente: the foundry site
    c = Canvas(W, H)
    bg = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 29), ["dusk", "coral_dark", "ember"], 0, 29)
    c.fill(rect(0, 30, W - 1, H - 1), "deep")
    waves(c, 32, 38, "ember", 9)
    bg.shade(poly([(8, 33), (8, 19), (22, 12), (36, 19), (48, 19), (48, 33)]), "soot")
    bg.shade(rect(12, 4, 16, 18), "soot")
    bg.shade(rect(40, 8, 44, 20), "soot")
    bg.fill(rect(12, 6, 16, 7), "rust")
    bg.fill(rect(40, 10, 44, 11), "rust")
    bg.fill(poly([(4, 35), (8, 32), (48, 32), (53, 35)]), "slate")
    bg.outline("ink")
    c.blit(bg)
    for x in (12, 19, 26, 33, 40):
        c.fill(rect(x, 24, x + 3, 29), "flame")
        c.fill(rect(x + 1, 26, x + 2, 29), "glow")
    c.fill(poly([(19, 19), (22, 16), (25, 19)]), "glow")
    c.dither(rect(8, 30, 48, 31), "ember", 8)
    for x, y in ((14, 1), (42, 5)):
        c.fill(ell(x + 2, y, 3, 2), "stone")
        c.fill(ell(x + 6, y - 1, 2, 1), "slate")
    c.dots("glow", (13, 3), (15, 2), (41, 7), (43, 6))
    return c


def forge_025():  # Decima di Brace: the forge lends and takes back
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "soot", "soot", "rust"], 0, 40)
    c.dither(ell(28, 18, 20, 12), "rust", 6)
    bowl = (ell(28, 24, 15, 10) - rect(0, 0, W, 23))
    c.shade(bowl, "copper")
    c.fill(rect(13, 23, 43, 24), "copper")
    c.fill(rect(13, 23, 43, 23), "sand")
    c.shade(rect(25, 34, 31, 36), "copper")
    c.shade(rect(21, 37, 35, 38), "rust")
    c.dots("verd", (18, 28), (19, 29), (37, 27), (30, 32))
    for x, y, r in ((20, 21, 3), (27, 20, 4), (35, 21, 3), (31, 18, 2), (23, 18, 2)):
        c.fill(ell(x, y, r, r - 1), "ember")
        c.fill(ell(x, y - 1, r - 1, r - 2), "flame")
        c.put(x, y - 1, "glow")
    c.outline("ink")
    flame(c, 27, 16, 5, 8, 1)
    c.dots("glow", (18, 12), (37, 10), (33, 5), (22, 6))
    return c


# ---------------------------------------------------------------- sprout scenes
def flower(c, cx, cy, r, petals="coral", heart="glow"):
    for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0), (0.7, -0.7), (0.7, 0.7), (-0.7, 0.7), (-0.7, -0.7)):
        c.shade(ell(cx + dx * r, cy + dy * r, r * 0.55, r * 0.55), petals)
    c.fill(ell(cx, cy, r * 0.45, r * 0.45), heart)
    c.put(cx, cy, "white")


def sprout_016():  # Fioritura: a season in one breath
    c = Canvas(W, H)
    bg_sprout_reef(c)
    c.shade(path([(28, 37), (27, 28), (28, 22)], 2), "leaf", rim=False)
    c.shade(ell(22, 30, 4, 2), "moss")
    c.shade(ell(34, 28, 4, 2), "moss")
    flower(c, 28, 14, 8)
    c.shade(path([(12, 37), (12, 30)], 1), "leaf", rim=False)
    flower(c, 12, 27, 3, "lilac")
    c.shade(path([(43, 37), (43, 31)], 1), "leaf", rim=False)
    flower(c, 43, 28, 3, "sand", "flame")
    c.dots("glow", (17, 9), (40, 7), (36, 20), (19, 20), (44, 16), (10, 14))
    return c


def sprout_017():  # Ricrescita: the wound closes before the blow
    c = Canvas(W, H)
    c.vgrad(ALL, ["kelp_dark", "verd_dark", "verd"], 0, 44)
    c.dither(ell(30, 14, 16, 11), "verd_light", 5)
    trunk = poly([(4, 39), (8, 25), (22, 23), (36, 26), (38, 30), (22, 31), (16, 39)])
    c.shade(trunk, "bark")
    c.shade(ell(37, 28, 2, 3), "sand")  # the cut
    c.fill(ell(37, 28, 1, 1), "tan")
    c.fill(path([(10, 30), (20, 27), (30, 28)], 1), "wood_dark")
    c.outline("ink")
    c.shade(path([(37, 26), (38, 18), (42, 12)], 2), "moss", rim=False)
    c.shade(ell(46, 10, 4, 2), "sprout")
    c.shade(ell(37, 14, 3, 2), "sprout")
    c.shade(ell(44, 18, 3, 1), "moss")
    c.dots("white", (40, 6), (50, 14), (33, 10), (47, 4))
    c.dots("glow", (41, 5), (40, 7), (39, 6), (51, 13), (32, 9))
    return c


def sprout_018():  # Vivaio di Marea: every wave leaves a seed
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 15), ["mist", "foam"], 0, 15)
    c.fill(rect(0, 16, W - 1, 26), "sea")
    wave = poly([(0, 26), (0, 14), (8, 9), (16, 8), (22, 11), (24, 16), (20, 14), (15, 15), (14, 20), (20, 26)])
    c.shade(wave, "water")
    c.fill(path([(8, 9), (16, 8), (22, 11), (24, 16)], 1), "white")
    waves(c, 18, 25, "mist", 9)
    c.shade(rect(0, 27, W - 1, H - 1), ("tan", "sand", "white"))
    c.dither(rect(0, 30, W - 1, H - 1), "tan", 5)
    for i, x in enumerate(range(6, W, 9)):
        h = 2 + i
        c.fill(rect(x - 2, 33, x + 2, 34), "wood")
        c.fill(rect(x, 33 - h, x, 33), "moss")
        c.shade(ell(x - 2, 32 - h, 2, 1), "sprout")
        c.shade(ell(x + 2, 31 - h, 2, 1), "sprout")
    c.dots("glow", (27, 20), (33, 23), (40, 19))
    return c


def sprout_019():  # Radici Profonde: no current moves it
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 11), ["sea", "mist"], 0, 11)
    c.fill(rect(0, 12, W - 1, H - 1), "wood_dark")
    c.vgrad(rect(0, 12, W - 1, H - 1), ["wood", "wood_dark", "ink"], 12, H)
    c.fill(rect(0, 11, W - 1, 12), "moss")
    c.dither(rect(0, 13, W - 1, 13), "kelp", 8)
    c.shade(rect(25, 0, 31, 13), "bark")
    c.fill(rect(24, 0, 24, 13), "ink")
    c.fill(rect(32, 0, 32, 13), "ink")
    roots = [
        [(28, 13), (28, 24), (26, 32), (27, 39)],
        [(26, 14), (19, 19), (13, 27), (11, 35)],
        [(30, 14), (37, 20), (43, 27), (46, 36)],
        [(19, 19), (9, 21), (3, 25)],
        [(37, 20), (47, 21), (53, 24)],
        [(28, 24), (34, 30), (36, 37)],
        [(13, 27), (18, 33)],
    ]
    for r in roots:
        c.shade(path(r, 2), "tan", rim=False)
    for x, y in ((6, 31), (22, 36), (41, 34), (50, 30), (17, 24), (40, 16)):
        c.shade(ell(x, y, 2, 1), "stone")
    c.dots("sprout", (11, 36), (46, 37), (3, 26), (53, 25), (36, 38), (27, 39))
    return c


def sprout_020():  # Giardino del Faro: kelp protects the flame
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 27), ["deep", "sea", "mist"], 0, 27)
    c.fill(rect(0, 28, W - 1, H - 1), "sea")
    waves(c, 30, 38, "mist", 10)
    c.shade(poly([(14, 39), (18, 31), (38, 31), (43, 39)]), "stone")
    beam(c, 28, 8, 1, 26)
    beam(c, 28, 8, -1, 26)
    lighthouse(c, 28, 32, 27)
    for i, x in enumerate((21, 24, 31, 34)):
        kelp(c, x, 14 + (i % 2) * 5, 34, 0, "leaf" if i % 2 else "moss", i, 2)
    c.shade(ell(19, 33, 3, 2), "moss")
    c.shade(ell(37, 33, 3, 2), "moss")
    flower(c, 22, 20, 2, "coral")
    flower(c, 35, 23, 2, "coral")
    c.dots("coral", (25, 28), (32, 29))
    return c


def sprout_021():  # Nube di Polline: the enemy coughs and waits
    c = Canvas(W, H)
    bg_sprout_kelp(c)
    for x, y, rx, ry in ((18, 18, 12, 8), (34, 14, 13, 9), (28, 24, 15, 8), (44, 22, 9, 6), (10, 26, 7, 5)):
        c.dither(ell(x, y, rx + 2, ry + 2), "moss", 6)
        c.dither(ell(x, y, rx, ry), "sprout", 9)
        c.dither(ell(x - 1, y - 1, rx - 4, ry - 3), "glow", 8)
    c.dots("white", (17, 14), (33, 10), (27, 22), (40, 19), (22, 27), (45, 25), (12, 22), (36, 16))
    c.shade(path([(6, 37), (7, 31)], 1), "leaf", rim=False)
    flower(c, 7, 30, 2, "sand", "flame")
    return c


def sprout_022():  # Corona di Corallo: grows on the head of those who resist
    c = Canvas(W, H)
    c.vgrad(ALL, ["abyss", "deep", "sea"], 0, 44)
    c.dither(ell(28, 20, 22, 14), "mist", 4)
    band = ell(28, 29, 16, 5)
    c.shade(band, "coral")
    c.fill(ell(28, 28, 12, 2), "coral_dark")
    for x, h in ((13, 10), (19, 15), (28, 20), (37, 15), (43, 10)):
        c.shade(path([(x, 28), (x, 28 - h)], 3), "coral", rim=False)
        c.shade(path([(x, 28 - h // 2), (x - 3, 28 - h // 2 - 4)], 2), "coral", rim=False)
        c.shade(path([(x + 1, 28 - h // 2 - 2), (x + 4, 28 - h // 2 - 6)], 2), "coral", rim=False)
    c.outline("ink")
    for x, h in ((13, 10), (19, 15), (28, 20), (37, 15), (43, 10)):
        c.put(x, 27 - h, "white")
    c.fill(ell(28, 30, 2, 2), "verd_light")
    c.dots("verd_light", (17, 31), (39, 31))
    c.dots("foam", (6, 8), (48, 6), (50, 20), (5, 22))
    return c


def sprout_023():  # Lanterna di Radici: a light that feeds on salt
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "kelp_dark", "verd_dark"], 0, 44)
    c.dither(ell(28, 21, 20, 15), "moss", 5)
    c.dither(ell(28, 21, 13, 10), "sprout", 6)
    c.fill(rect(27, 0, 28, 6), "wood")
    c.shade(rect(22, 6, 33, 8), "bark")
    c.fill(rect(22, 9, 33, 29), "sprout")
    c.fill(rect(24, 11, 31, 27), "glow")
    c.fill(ell(27.5, 20, 2, 4), "white")
    c.shade(rect(21, 30, 34, 32), "bark")
    for x in (22, 33):
        c.fill(rect(x, 9, x, 29), "wood")
    for pts in ([(21, 31), (19, 22), (24, 15), (22, 9)], [(34, 31), (36, 24), (31, 17), (33, 10)], [(27, 32), (25, 36), (20, 39)], [(29, 32), (32, 36), (38, 38)], [(28, 32), (28, 39)]):
        c.shade(path(pts, 2), "bark", rim=False)
    c.outline("ink")
    c.dots("sprout", (18, 21), (37, 23), (19, 39), (39, 38))
    c.dots("white", (12, 12), (44, 15), (42, 30), (11, 28))
    return c


def sprout_024():  # Foresta di Alghe: the kelp forest site
    c = Canvas(W, H)
    c.vgrad(ALL, ["mist", "sea", "deep", "abyss"], 0, 38)
    for x in (8, 22, 40):
        for i in range(24):
            c.dither(rect(x + i // 3, i, x + 4 + i // 3, i), "foam", 4)
    for i, x in enumerate(range(2, W, 5)):
        kelp(c, x, 8 + (i * 5) % 11, 37, 0, "verd_dark", i, 2)
    for i, x in enumerate((0, 9, 19, 33, 44, 51)):
        top = 1 + (i * 4) % 9
        k = kelp(c, x, top, 37, 0, "leaf", i + 1, 3)
        for y in range(top + 2, 34, 5):
            c.shade(ell(x + (4 if (y // 5) % 2 else -2), y, 2, 1), "moss")
    c.shade(poly([(0, 39), (0, 36), (20, 37), (40, 36), (55, 37), (55, 39)]), "kelp")
    c.shade(ell(27, 31, 4, 2), "verd")  # a fish
    c.fill(poly([(22, 29), (24, 31), (22, 33)]), "verd_light")
    c.put(29, 30, "ink")
    c.dots("foam", (15, 12), (16, 9), (38, 20), (37, 24))
    return c


def sprout_025():  # Marea Sorgiva: when the moon is right, everything grows
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 21), ["abyss", "deep", "verd_dark"], 0, 21)
    c.dither(ell(28, 10, 13, 10), "verd", 5)
    c.fill(ell(28, 10, 7, 7), "foam")
    c.fill(ell(26, 8, 5, 5), "white")
    c.dots("mist", (30, 12), (31, 8), (27, 13))
    c.fill(rect(0, 22, W - 1, H - 1), "deep")
    c.vgrad(rect(0, 22, W - 1, H - 1), ["verd", "verd_dark", "deep"], 22, H)
    for y in range(23, 38, 2):  # moon path
        c.fill(rect(28 - (y - 20) // 3, y, 28 + (y - 20) // 3, y), "foam" if y % 4 else "verd_light")
    waves(c, 24, 38, "verd_light", 11)
    for i, (x, h) in enumerate(((5, 9), (12, 13), (44, 12), (51, 8))):
        c.fill(rect(x, 37 - h, x, 39), "moss")
        c.shade(ell(x - 2, 36 - h, 2, 1), "sprout")
        c.shade(ell(x + 2, 35 - h, 2, 1), "sprout")
    stars(c, [(4, 3), (11, 8), (46, 4), (52, 11), (40, 13), (17, 2)])
    return c


def neutral_spark():  # Scintilla: a small help for the second player
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "abyss", "dusk"], 0, 44)
    c.dither(ell(28, 20, 14, 11), "violet", 5)
    c.dither(ell(28, 20, 8, 6), "flame", 7)
    cx, cy = 28, 20
    c.fill(line(cx, cy - 12, cx, cy + 12) | line(cx - 12, cy, cx + 12, cy), "flame")
    c.fill(line(cx, cy - 7, cx, cy + 7) | line(cx - 7, cy, cx + 7, cy), "glow")
    c.fill(line(cx - 4, cy - 4, cx + 4, cy + 4) | line(cx - 4, cy + 4, cx + 4, cy - 4), "glow")
    c.fill(ell(cx, cy, 2, 2), "white")
    stars(c, [(8, 6), (46, 9), (12, 30), (44, 31), (20, 4), (38, 35), (50, 22), (5, 18)])
    return c


SCENES = {
    "forge-015": forge_015, "forge-016": forge_016, "forge-017": forge_017, "forge-018": forge_018,
    "forge-019": forge_019, "forge-020": forge_020, "forge-021": forge_021, "forge-022": forge_022,
    "forge-023": forge_023, "forge-024": forge_024, "forge-025": forge_025,
    "sprout-016": sprout_016, "sprout-017": sprout_017, "sprout-018": sprout_018, "sprout-019": sprout_019,
    "sprout-020": sprout_020, "sprout-021": sprout_021, "sprout-022": sprout_022, "sprout-023": sprout_023,
    "sprout-024": sprout_024, "sprout-025": sprout_025, "neutral-spark": neutral_spark,
}


def illustration(card_id):
    return keeper_card(card_id) if card_id in KEEPERS else SCENES[card_id]()


CARD_IDS = (
    [f"forge-{i:03d}" for i in range(1, 26)]
    + [f"sprout-{i:03d}" for i in range(1, 26)]
    + ["sprout-t01", "neutral-spark"]
)
