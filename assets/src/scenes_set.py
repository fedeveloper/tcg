"""Backgrounds and scenes for Abyss, Gear, Vesper and the neutral cards (56x40 pixels)."""
from cards import ALL, H, W, beam, lighthouse, night_sea, stars, waves
from keepers import flame, kelp
from parts import cog, lantern
from px import Canvas, ell, line, path, poly, rect


def halo(c, x, y, r, cols):
    """Soft light: dithered rings from the outside to the centre."""
    for i, col in enumerate(cols):
        k = r * (1 - i / len(cols))
        c.dither(ell(x, y, k, k * 0.8), col, 6 + i * 3)


def seabed(c, y=36, top="deep", low="abyss"):
    c.fill(rect(0, y, W - 1, H - 1), low)
    c.dither(rect(0, y, W - 1, y + 1), top, 8)


# ---------------------------------------------------------------- backgrounds
def bg_abyss_trench(c):
    c.vgrad(ALL, ["deep", "abyss", "ink"], 0, 36)
    c.fill(poly([(0, 0), (7, 0), (4, 14), (8, 28), (3, 39), (0, 39)]), "ink")
    c.fill(poly([(55, 0), (49, 0), (52, 12), (47, 26), (52, 39), (55, 39)]), "ink")
    seabed(c)
    c.dots("verd_light", (10, 9), (46, 17), (40, 5), (15, 22))
    c.dots("sea", (11, 8), (45, 18), (20, 3), (36, 12), (9, 30), (43, 31))


def bg_abyss_flats(c):
    c.vgrad(rect(0, 0, W - 1, 22), ["abyss", "deep", "sea"], 0, 22)
    c.fill(ell(45, 8, 4, 4), "foam")
    c.dots("mist", (44, 9), (47, 7))
    c.fill(rect(0, 23, W - 1, 29), "deep")
    waves(c, 24, 29, "sea", 9)
    c.shade(poly([(0, 39), (0, 30), (20, 31), (40, 30), (55, 32), (55, 39)]), ("deep", "slate", "stone"))
    c.fill(ell(10, 35, 5, 1) | ell(44, 36, 7, 1), "sea")
    c.dots("foam", (9, 35), (43, 36), (47, 36))
    stars(c, [(5, 4), (14, 9), (25, 3), (36, 12), (52, 16), (8, 16)])


def bg_abyss_wreck(c):
    c.vgrad(ALL, ["sea", "deep", "abyss"], 0, 38)
    for i, x in enumerate((38, 43, 48, 53)):
        c.fill(path([(x, 36), (x - 2, 22 - i), (x + 2, 12 - i * 2)], 2), "wood_dark")
    c.fill(poly([(32, 36), (55, 30), (55, 37)]), "ink")
    c.fill(line(5, 36, 9, 4, 2), "wood_dark")
    c.fill(rect(2, 12, 14, 12), "wood_dark")
    c.dither(poly([(4, 13), (13, 13), (11, 22), (6, 20)]), "mist", 6)
    seabed(c)
    c.dots("foam", (20, 6), (21, 3), (30, 14), (31, 10), (46, 4))


def bg_gear_workshop(c):
    c.fill(ALL, "wood_dark")
    c.vgrad(rect(0, 0, W - 1, 20), ["ink", "wood_dark"], 0, 20)
    for x in range(0, W, 8):
        c.fill(rect(x, 0, x, 35), "ink")
    c.fill(rect(0, 36, W - 1, H - 1), "wood")
    c.fill(rect(0, 36, W - 1, 36), "tan")
    c.dither(rect(0, 37, W - 1, 39), "wood_dark", 6)
    c.fill(rect(2, 10, 12, 11), "wood")
    c.fill(rect(3, 6, 5, 9), "copper")
    c.fill(rect(7, 7, 8, 9), "sand")
    c.fill(rect(10, 5, 11, 9), "verd")
    cog(c, 48, 10, 6, 0, "copper", "ink")
    c.fill(rect(43, 22, 53, 31), "tan")
    c.fill(rect(44, 23, 52, 30), "sand")
    c.fill(rect(48, 23, 48, 30) | rect(44, 26, 52, 26), "wood")


def bg_gear_dock(c):
    c.vgrad(rect(0, 0, W - 1, 24), ["tan", "sand", "white"], 0, 24)
    c.fill(rect(0, 25, W - 1, 31), "sea")
    waves(c, 26, 31, "mist", 10)
    c.fill(rect(50, 6, 51, 31), "wood_dark")
    c.fill(line(51, 7, 38, 3, 2), "wood_dark")
    c.fill(rect(39, 4, 39, 12), "wood")
    c.shade(rect(37, 12, 41, 15), "copper")
    c.fill(rect(0, 32, W - 1, H - 1), "wood")
    for x in range(0, W, 7):
        c.fill(rect(x, 33, x, 39), "wood_dark")
    c.fill(rect(0, 32, W - 1, 32), "tan")
    c.shade(rect(2, 25, 7, 31), "bark")
    c.fill(rect(2, 27, 7, 27), "copper")
    c.dots("wood_dark", (12, 6), (13, 5), (14, 6), (20, 9), (21, 8), (22, 9))


def bg_gear_clock(c):
    c.vgrad(ALL, ["ink", "wood_dark", "wood"], 0, 46)
    cog(c, 6, 10, 9, 0, "wood", "ink", 10)
    cog(c, 50, 24, 10, 1, "wood", "ink", 12)
    cog(c, 44, 6, 4, 0, "copper", "ink")
    for i in range(22):
        c.dither(rect(22 + i // 3, i, 25 + i // 3, i), "sand", 4)
    c.fill(rect(0, 36, W - 1, H - 1), "wood_dark")
    c.fill(rect(0, 36, W - 1, 36), "copper")
    c.dither(rect(0, 37, W - 1, 39), "ink", 6)


def bg_vesper_fog(c):
    c.vgrad(rect(0, 0, W - 1, 24), ["dusk", "violet", "lilac"], 0, 24)
    lighthouse(c, 47, 25, 16, lit=False, body="ash", band="dusk")
    c.vgrad(rect(0, 25, W - 1, 35), ["violet", "dusk"], 25, 35)
    waves(c, 26, 34, "lilac", 11)
    c.fill(rect(0, 36, W - 1, H - 1), "ink")
    c.dither(rect(0, 36, W - 1, 37), "dusk", 8)
    for y, x0 in ((14, 0), (19, 22), (30, 6)):
        c.dither(rect(x0, y, x0 + 30, y + 2), "white", 5)


def bg_vesper_graves(c):
    c.vgrad(rect(0, 0, W - 1, 30), ["ink", "dusk", "violet"], 0, 30)
    c.fill(ell(8, 8, 4, 4), "lilac")
    c.fill(ell(7, 7, 3, 3), "white")
    c.fill(poly([(0, 39), (0, 30), (18, 27), (40, 29), (55, 26), (55, 39)]), "ink")
    c.dither(poly([(0, 31), (18, 28), (40, 30), (55, 27), (55, 33), (0, 34)]), "dusk", 8)
    for x, h in ((3, 6), (44, 7), (50, 5)):
        c.shade(rect(x, 29 - h, x + 3, 29), ("ink", "slate", "stone"))
        c.fill(rect(x + 1, 28 - h, x + 2, 28 - h), "slate")
    c.fill(rect(39, 19, 39, 28) | rect(37, 21, 41, 21), "slate")
    stars(c, [(20, 4), (30, 9), (44, 3), (51, 12), (16, 14)], "lilac")


def bg_vesper_crypt(c):
    c.vgrad(ALL, ["ink", "dusk"], 0, 44)
    for x in (2, 22, 42):
        c.fill(ell(x + 5, 12, 7, 9) | rect(x - 2, 12, x + 12, 35), "slate")
        c.fill(ell(x + 5, 13, 5, 7) | rect(x, 13, x + 10, 35), "ink")
        c.dither(rect(x, 24, x + 10, 35), "dusk", 5)
    c.fill(rect(0, 36, W - 1, H - 1), "slate")
    c.dither(rect(0, 37, W - 1, 39), "ink", 7)
    c.fill(rect(0, 36, W - 1, 36), "stone")
    halo(c, 51, 29, 6, ("violet", "lilac"))
    c.fill(rect(51, 30, 52, 35), "white")
    c.put(51, 29, "glow")


def bg_neutral_harbor(c):
    c.vgrad(rect(0, 0, W - 1, 22), ["stone", "ash", "white"], 0, 22)
    c.fill(rect(0, 23, W - 1, 31), "sea")
    c.fill(rect(0, 23, W - 1, 23), "mist")
    waves(c, 25, 31, "mist", 10)
    lighthouse(c, 49, 23, 15)
    c.fill(poly([(3, 23), (5, 26), (13, 26), (15, 23)]), "wood_dark")
    c.fill(rect(9, 10, 9, 23), "wood_dark")
    c.fill(poly([(10, 11), (14, 20), (10, 20)]), "white")
    c.shade(rect(0, 32, W - 1, H - 1), "stone")
    for x in range(3, W, 9):
        c.fill(rect(x, 33, x, 39), "slate")
    c.fill(rect(0, 35, W - 1, 35), "slate")


def bg_neutral_deck(c):
    c.vgrad(rect(0, 0, W - 1, 21), ["sea", "mist", "foam"], 0, 21)
    c.fill(ell(12, 6, 6, 2) | ell(17, 8, 5, 2), "white")
    c.fill(rect(0, 22, W - 1, 33), "deep")
    waves(c, 23, 26, "sea", 9)
    c.fill(rect(0, 26, W - 1, 27), "wood")
    for x in range(2, W, 8):
        c.fill(rect(x, 27, x + 1, 33), "wood")
    c.shade(rect(47, 0, 50, 33), "bark")
    c.fill(line(47, 2, 30, 26), "tan")
    c.fill(line(50, 2, 55, 14), "tan")
    c.fill(rect(0, 34, W - 1, H - 1), "tan")
    for y in (36, 38):
        c.fill(rect(0, y, W - 1, y), "wood")
    c.fill(rect(0, 34, W - 1, 34), "sand")


def bg_neutral_cliff(c):
    c.vgrad(rect(0, 0, W - 1, 26), ["slate", "stone", "ash"], 0, 26)
    c.fill(rect(0, 27, W - 1, H - 1), "deep")
    waves(c, 28, 35, "sea", 9)
    c.shade(poly([(36, 39), (39, 20), (45, 14), (55, 12), (55, 39)]), ("ink", "slate", "stone"))
    c.fill(rect(0, 36, W - 1, H - 1), "slate")
    c.fill(rect(0, 36, W - 1, 36), "stone")
    c.dither(rect(0, 37, W - 1, 39), "ink", 5)
    c.dots("white", (8, 7), (9, 6), (10, 7), (20, 12), (21, 11), (22, 12))


BACKGROUNDS = {
    "trench": bg_abyss_trench, "flats": bg_abyss_flats, "wreck": bg_abyss_wreck,
    "workshop": bg_gear_workshop, "dock": bg_gear_dock, "clock": bg_gear_clock,
    "fog": bg_vesper_fog, "graves": bg_vesper_graves, "crypt": bg_vesper_crypt,
    "harbor": bg_neutral_harbor, "deck": bg_neutral_deck, "cliff": bg_neutral_cliff,
}

_BG = {
    "abyss": "flats trench wreck flats wreck flats flats trench wreck flats trench wreck trench trench".split(),
    "gear": "workshop dock dock dock workshop dock dock clock dock clock workshop dock clock workshop".split(),
    "vesper": "fog fog fog fog fog graves crypt crypt graves fog crypt crypt graves fog".split(),
    "neutral": "harbor deck cliff cliff harbor deck harbor deck deck cliff".split(),
}
KEEPER_BG = {f"{fac}-{i + 1:03d}": bg for fac, bgs in _BG.items() for i, bg in enumerate(bgs)}
KEEPER_BG.update({
    "abyss-026": "flats", "gear-026": "workshop", "gear-t01": "workshop", "vesper-024": "graves",
    "vesper-t01": "fog", "neutral-019": "cliff", "neutral-020": "harbor", "forge-026": "shore",
})


# ---------------------------------------------------------------- abyss scenes
def abyss_015():  # Nube d'Inchiostro: only two eyes stay visible in the ink
    c = Canvas(W, H)
    c.vgrad(ALL, ["sea", "deep", "abyss"], 0, 38)
    for x, y, r in ((20, 18, 13), (33, 22, 12), (27, 12, 9), (40, 14, 7), (12, 26, 7)):
        c.dither(ell(x, y, r + 2, r), "abyss", 10)
        c.fill(ell(x, y, r - 2, r - 3), "ink")
    c.fill(rect(22, 17, 24, 18) | rect(30, 17, 32, 18), "foam")
    c.dots("ink", (23, 18), (31, 18))
    for x, y in ((6, 8), (48, 30), (46, 6), (5, 34)):
        c.dither(ell(x, y, 3, 2), "ink", 7)
    c.dots("foam", (50, 12), (51, 9), (4, 20))
    return c


def abyss_016():  # Onda di Ritorno: the wave takes a Keeper back
    c = Canvas(W, H)
    night_sea(c, 24, ("abyss", "deep", "sea"))
    wave = poly([(0, 39), (0, 22), (8, 12), (20, 6), (32, 7), (38, 12), (36, 17), (30, 14), (24, 16), (22, 24), (30, 32), (55, 36), (55, 39)])
    c.shade(wave, "water")
    c.fill(path([(8, 12), (20, 6), (32, 7), (38, 12), (36, 17)], 2), "foam")
    c.dots("white", (39, 14), (37, 19), (34, 18), (41, 11), (30, 5), (12, 8))
    c.dither(poly([(4, 24), (20, 14), (20, 26), (10, 34)]), "deep", 6)
    c.fill(rect(27, 19, 29, 23), "ink")  # the Keeper in the wave
    c.fill(rect(27, 17, 29, 18), "sand")
    c.fill(line(30, 20, 33, 17), "ink")
    return c


def abyss_017():  # Morso del Freddo: jaws of ice close on a small flame
    c = Canvas(W, H)
    c.vgrad(ALL, ["abyss", "deep", "sea"], 0, 44)
    for x in range(2, W, 9):
        h = 12 + (x * 7) % 6
        c.shade(poly([(x, 0), (x + 4, h), (x + 8, 0)]), "foam")
        c.shade(poly([(x - 3, 39), (x + 1, 39 - h + 2), (x + 5, 39)]), "mist")
    halo(c, 28, 21, 7, ("sea", "mist"))
    flame(c, 28, 24, 5, 7, 0)
    c.dots("white", (10, 19), (44, 22), (18, 24), (38, 17), (50, 20), (5, 21))
    return c


def abyss_018():  # Inghiottito: the sea swallows a boat
    c = Canvas(W, H)
    c.fill(ALL, "deep")
    for i, (rx, col) in enumerate(((30, "sea"), (24, "deep"), (18, "sea"), (12, "abyss"), (7, "ink"))):
        c.fill(ell(28, 21, rx, rx * 0.62), col)
        c.dither(ell(28 + 2, 21, rx - 2, rx * 0.62 - 2), "mist" if i < 3 else "deep", 3)
    c.fill(ell(28, 21, 3, 2), "ink")
    for a, b in (((6, 10), (16, 6)), ((40, 34), (50, 30)), ((8, 32), (4, 26)), ((48, 8), (52, 14))):
        c.fill(line(a[0], a[1], b[0], b[1]), "foam")
    c.fill(poly([(36, 14), (44, 13), (42, 17), (38, 17)]), "wood")  # boat
    c.fill(line(40, 13, 41, 7), "wood_dark")
    c.fill(poly([(42, 8), (45, 12), (42, 12)]), "white")
    return c


def abyss_019():  # Ascolto delle Correnti: the currents carry a message
    c = Canvas(W, H)
    c.vgrad(ALL, ["sea", "deep", "abyss"], 0, 38)
    for i, y in enumerate((6, 13, 20, 27)):
        pts = [(x, y + round(2 * ((x + i * 5) % 16 < 8) - 1)) for x in range(-2 + i * 3, W + 4, 4)]
        c.fill(path(pts, 1), "mist" if i % 2 else "sea")
    seabed(c)
    c.shade(ell(28, 30, 8, 5), "foam")  # shell
    for x in (23, 26, 29, 32):
        c.fill(line(28, 34, x, 26), "mist")
    c.fill(rect(26, 34, 30, 35), "mist")
    for r in (11, 15):
        c.dither(ell(28, 29, r, r * 0.7) - ell(28, 29, r - 1, r * 0.7 - 1) - rect(0, 30, W, H), "verd_light", 9)
    c.dots("foam", (10, 16), (44, 9), (47, 23))
    return c


def abyss_020():  # Oblio Marino: a lantern sinks and goes out
    c = Canvas(W, H)
    c.vgrad(ALL, ["deep", "abyss", "ink"], 0, 38)
    halo(c, 30, 24, 9, ("deep", "sea"))
    lantern(c, 30, 21, "mist", "slate", "foam")
    for i, (x, y) in enumerate(((30, 16), (31, 12), (29, 8), (32, 4), (27, 2))):
        c.fill(ell(x, y, 1 if i < 3 else 0.5, 1 if i < 3 else 0.5), "foam" if i % 2 else "mist")
    for x in (8, 14, 44, 50):
        kelp(c, x, 20 + x % 7, 39, 0, "deep", x, 2)
    c.dots("sea", (10, 6), (46, 10), (18, 14), (40, 30))
    return c


def abyss_021():  # Richiamo del Fondo: a light calls, and jaws wait behind it
    c = Canvas(W, H)
    c.fill(ALL, "ink")
    c.dither(ALL, "abyss", 6)
    jaw = poly([(8, 6), (48, 8), (52, 20), (48, 33), (8, 35), (16, 20)])
    c.fill(jaw, "abyss")
    for i in range(7):
        x = 14 + i * 5
        c.fill(poly([(x, 8), (x + 2, 14 + i % 2), (x + 4, 8)]), "mist")
        c.fill(poly([(x, 33), (x + 2, 27 - i % 2), (x + 4, 33)]), "mist")
    c.dots("verd_light", (44, 4), (45, 4))
    halo(c, 28, 20, 8, ("deep", "sea", "verd_light"))
    c.fill(ell(28, 20, 2, 2), "glow")
    c.put(28, 20, "white")
    c.fill(path([(28, 17), (30, 8), (40, 3)], 1), "deep")
    return c


def abyss_022():  # Vortice Nero: a black whirlpool moves every Keeper
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 12), ["ink", "abyss"], 0, 12)
    c.fill(rect(0, 13, W - 1, H - 1), "deep")
    for rx, col in ((27, "abyss"), (20, "deep"), (14, "abyss"), (8, "ink")):
        c.fill(ell(28, 26, rx, rx * 0.45), col)
    for rx in (24, 17, 11):
        ring = ell(28, 26, rx, rx * 0.45) - ell(28, 26, rx - 1, rx * 0.45 - 1)
        c.dither(ring, "foam", 6)
    c.fill(poly([(26, 26), (30, 26), (29, 39), (27, 39)]), "ink")
    c.fill(path([(40, 0), (36, 6), (39, 7), (34, 13)], 1), "foam")
    c.dots("white", (36, 6), (5, 20), (50, 22))
    return c


def abyss_023():  # Lanterna dell'Abisso: a lantern with a cold light
    c = Canvas(W, H)
    c.vgrad(ALL, ["deep", "abyss", "ink"], 0, 40)
    c.shade(poly([(14, 39), (18, 31), (38, 31), (43, 39)]), ("ink", "slate", "stone"))
    halo(c, 28, 20, 14, ("deep", "sea", "verd"))
    c.fill(rect(23, 12, 33, 30), "verd_light")
    c.fill(rect(25, 14, 31, 28), "foam")
    c.fill(ell(28, 21, 1.5, 4), "white")
    c.shade(rect(22, 9, 34, 11), "steel")
    c.shade(rect(22, 30, 34, 32), "steel")
    for x in (22, 28, 34):
        c.fill(rect(x, 12, x, 29), "slate")
    c.fill(path([(24, 8), (28, 4), (32, 8)], 1), "stone")
    c.dots("foam", (12, 10), (44, 14), (10, 24), (46, 27))
    return c


def abyss_024():  # Conchiglia dell'Eco: the shell repeats the first Rite
    c = Canvas(W, H)
    c.vgrad(ALL, ["sea", "deep", "abyss"], 0, 40)
    seabed(c, 34)
    c.shade(ell(24, 23, 11, 9), "foam")
    c.shade(poly([(32, 18), (44, 22), (34, 30)]), "mist")
    for r in (8, 5, 2):
        c.fill(ell(22, 22, r, r * 0.8) - ell(22, 22, r - 1, r * 0.8 - 1), "coral")
    c.fill(ell(22, 22, 1, 1), "coral_dark")
    for r in (6, 10):
        arc = ell(46, 22, r, r) - ell(46, 22, r - 1, r - 1) - rect(0, 0, 47, H)
        c.fill(arc, "verd_light" if r == 6 else "sea")
    c.dots("foam", (8, 8), (50, 6), (6, 30))
    return c


def abyss_025():  # Fossa delle Luci Morte: a trench with a sunken beacon
    c = Canvas(W, H)
    bg_abyss_trench(c)
    c.shade(poly([(22, 36), (26, 14), (33, 12), (36, 36)]), ("abyss", "slate", "stone"))
    for y in (19, 26):
        c.fill(rect(25, y, 34, y + 1), "deep")
    c.fill(rect(26, 8, 33, 12), "slate")
    c.fill(rect(27, 9, 32, 11), "abyss")
    c.fill(poly([(25, 8), (29, 4), (34, 8)]), "slate")
    for x in (12, 18, 42):
        kelp(c, x, 22 + x % 5, 37, 0, "deep", x, 2)
    c.dots("mist", (14, 12), (40, 20), (20, 28), (44, 9), (30, 10))
    c.dots("verd_light", (29, 10))
    return c


# ---------------------------------------------------------------- gear scenes
def gear_015():  # Lama a Ingranaggio: a sword with a gear for a guard
    c = Canvas(W, H)
    bg_gear_workshop(c)
    c.shade(poly([(10, 34), (40, 7), (44, 5), (43, 10), (14, 37)]), "steel")
    c.fill(line(13, 34, 41, 9), "white")
    c.fill(line(4, 39, 10, 34, 3), "wood")
    cog(c, 12, 33, 5, 0, "copper", "sand")
    c.dots("white", (44, 4), (46, 6), (42, 2))
    return c


def gear_016():  # Corazza a Placche: a plate armour on a stand
    c = Canvas(W, H)
    bg_gear_workshop(c)
    c.fill(rect(27, 30, 28, 36) | rect(22, 36, 33, 36), "wood_dark")
    c.shade(poly([(17, 9), (38, 9), (40, 16), (36, 30), (19, 30), (15, 16)]), "copper")
    c.fill(ell(27.5, 8, 4, 3), "wood_dark")
    for y in (16, 21, 26):
        c.fill(rect(17, y, 38, y), "rust")
    c.fill(rect(27, 11, 28, 29), "rust")
    c.dots("sand", (19, 13), (36, 13), (20, 24), (35, 24), (24, 18), (31, 18))
    c.shade(ell(14, 13, 4, 4), "copper")
    c.shade(ell(41, 13, 4, 4), "copper")
    return c


def gear_017():  # Trivella a Vapore: a steam drill
    c = Canvas(W, H)
    bg_gear_dock(c)
    c.shade(rect(6, 14, 26, 28), "copper")
    c.shade(rect(9, 6, 12, 14), "wood")
    c.fill(rect(4, 28, 28, 30), "wood_dark")
    cog(c, 16, 21, 5, 0, "bark", "sand")
    for i in range(6):
        w = 7 - i
        c.shade(rect(27 + i * 4, 21 - w, 30 + i * 4, 21 + w), "steel")
    c.fill(rect(51, 20, 54, 22), "ash")
    for x, y, r in ((10, 3, 3), (14, 1, 2), (6, 1, 2)):
        c.dither(ell(x, y, r, r - 1), "white", 9)
    c.dots("glow", (53, 17), (55, 24), (50, 26))
    return c


def gear_018():  # Specchio Ustorio: a burning mirror
    c = Canvas(W, H)
    bg_gear_dock(c)
    c.fill(ell(44, 6, 4, 4), "glow")
    for i in range(18):
        c.fill(rect(40 - i, 8 + i // 2, 41 - i, 8 + i // 2), "glow" if i % 2 else "flame")
    c.fill(rect(17, 30, 18, 36) | rect(12, 36, 23, 36), "wood_dark")
    c.shade(ell(18, 20, 9, 11), "copper")
    c.fill(ell(19, 20, 7, 9), "sand")
    c.fill(ell(20, 19, 4, 6), "white")
    for i in range(14):
        c.fill(rect(26 + i * 2, 22 + i, 27 + i * 2, 22 + i), "flame" if i % 2 else "glow")
    flame(c, 52, 36, 5, 7, 0)
    return c


def gear_019():  # Caldaia del Faro: the boiler that feeds the light
    c = Canvas(W, H)
    bg_gear_clock(c)
    c.shade(rect(14, 10, 40, 34), "copper")
    c.shade(ell(27, 10, 13, 4), "copper")
    for y in (15, 29):
        c.fill(rect(14, y, 40, y), "rust")
    c.fill(rect(21, 20, 33, 28), "ink")
    c.fill(rect(22, 22, 32, 28), "ember")
    c.fill(rect(24, 24, 30, 28), "flame")
    c.fill(rect(26, 26, 28, 28), "glow")
    c.fill(ell(36, 13, 2, 2), "white")
    c.put(37, 12, "coral_dark")
    c.shade(rect(41, 14, 50, 16), "bark")
    c.shade(rect(48, 0, 50, 14), "bark")
    c.dots("sand", (16, 12), (38, 18), (16, 32), (38, 32))
    return c


def gear_020():  # Zavorra di Piombo: a lead weight on a chain
    c = Canvas(W, H)
    bg_gear_dock(c)
    for i in range(7):
        c.fill(ell(28, 2 + i * 3, 1.5, 1) if i % 2 else rect(28, 1 + i * 3, 28, 3 + i * 3), "stone")
    c.shade(poly([(20, 36), (22, 22), (34, 22), (36, 36)]), "iron")
    c.shade(rect(25, 19, 31, 22), "steel")
    c.fill(rect(24, 27, 32, 31), "slate")
    c.dots("ash", (26, 28), (26, 29), (26, 30), (28, 28), (28, 30), (30, 28), (30, 29), (30, 30))
    c.dither(ell(28, 37, 11, 1), "ink", 8)
    return c


def gear_021():  # Sovraccarico: the gauge goes into the red
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "wood_dark", "rust"], 0, 44)
    c.fill(ell(28, 21, 14, 14), "copper")
    c.fill(ell(28, 21, 12, 12), "sand")
    c.fill(ell(28, 21, 12, 12) - ell(28, 21, 10, 10) - rect(0, 22, W, H) - rect(0, 0, 30, H), "coral_dark")
    for x, y in ((18, 21), (20, 14), (28, 11), (36, 14), (38, 21)):
        c.put(x, y, "ink")
    c.fill(line(28, 21, 36, 15, 2), "coral_dark")
    c.fill(ell(28, 21, 1.5, 1.5), "ink")
    for a, b in (((43, 10), (50, 4)), ((44, 30), (52, 35)), ((12, 9), (5, 4)), ((11, 31), (4, 36))):
        c.fill(line(a[0], a[1], b[0], b[1]), "glow")
        c.put(b[0], b[1], "white")
    c.dither(ell(48, 20, 4, 3), "white", 8)
    c.dither(ell(7, 20, 4, 3), "white", 8)
    return c


def gear_022():  # Progetto Segreto: a blueprint under a lamp
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "wood_dark"], 0, 30)
    c.fill(rect(0, 28, W - 1, H - 1), "wood")
    c.fill(rect(0, 28, W - 1, 28), "tan")
    c.fill(poly([(8, 34), (14, 12), (46, 12), (50, 34)]), "deep")
    cogs = Canvas(W, H)
    cog(cogs, 24, 22, 5, 0, "foam", "deep")
    cog(cogs, 35, 19, 3, 2, "foam", "deep")
    c.blit(cogs)
    c.fill(rect(16, 15, 44, 15) | rect(14, 31, 46, 31), "mist")
    c.fill(line(40, 26, 44, 30) | line(18, 17, 18, 29), "mist")
    c.dots("foam", (40, 22), (42, 22), (44, 22))
    halo(c, 6, 20, 7, ("rust", "flame"))
    c.fill(rect(5, 21, 6, 27), "white")
    c.put(5, 20, "glow")
    return c


def gear_023():  # Bullone Volante: a bolt flies fast
    c = Canvas(W, H)
    bg_gear_dock(c)
    for y, x0 in ((14, 4), (18, 10), (22, 2)):
        c.fill(rect(x0, y, x0 + 18, y), "white")
    c.shade(rect(24, 15, 42, 21), "steel")
    for x in range(26, 41, 3):
        c.fill(line(x, 15, x + 1, 21), "slate")
    c.shade(poly([(42, 11), (48, 11), (50, 18), (48, 25), (42, 25)]), "copper")
    c.dots("glow", (52, 13), (53, 22), (51, 18))
    return c


def gear_024():  # Smontaggio: a machine in pieces
    c = Canvas(W, H)
    bg_gear_workshop(c)
    c.shade(rect(4, 25, 52, 28), "bark")  # bench
    c.fill(rect(7, 29, 9, 36) | rect(46, 29, 48, 36), "wood_dark")
    c.shade(rect(8, 17, 16, 24), "copper")
    c.fill(rect(10, 19, 15, 20), "ink")
    cog(c, 24, 21, 3, 0)
    cog(c, 32, 22, 2, 1, "bark")
    c.shade(rect(37, 20, 39, 24), "steel")
    c.fill(rect(41, 23, 47, 24), "copper")
    c.fill(line(22, 14, 34, 8, 2), "stone")
    c.fill(rect(34, 5, 37, 8), "stone")
    c.put(36, 5, "wood_dark")
    c.dots("sand", (19, 24), (29, 24), (44, 21))
    return c


def gear_025():  # Officina del Porto: the workshop on the pier
    c = Canvas(W, H)
    bg_gear_dock(c)
    c.shade(rect(8, 16, 34, 32), "bark")
    c.shade(poly([(5, 16), (21, 6), (37, 16)]), "copper")
    c.shade(rect(27, 2, 30, 11), "wood")
    c.fill(rect(18, 23, 24, 32), "wood_dark")
    c.fill(rect(11, 20, 15, 24) | rect(27, 20, 31, 24), "glow")
    cog(c, 21, 14, 3, 0, "tan", "wood_dark")
    for x, y, r in ((29, 0, 2), (33, -1, 3)):
        c.dither(ell(x, y, r, r - 1), "white", 9)
    return c


# ---------------------------------------------------------------- vesper scenes
def vesper_015():  # Offerta alla Nebbia: a candle on the water
    c = Canvas(W, H)
    bg_vesper_fog(c)
    halo(c, 28, 24, 9, ("violet", "lilac"))
    c.shade(poly([(21, 28), (35, 28), (32, 33), (24, 33)]), "bark")
    c.fill(rect(27, 23, 28, 28), "white")
    flame(c, 28, 23, 3, 5, 0, ("flame", "glow", "white"))
    for x0, d in ((6, 1), (49, -1)):
        c.dither(path([(x0, 30), (x0 + d * 6, 24), (x0 + d * 12, 26)], 3), "white", 8)
    return c


def vesper_016():  # Richiamo delle Anime: the souls come back from the sea
    c = Canvas(W, H)
    night_sea(c, 24, ("ink", "dusk", "violet"))
    for i, (x, y) in enumerate(((10, 28), (20, 20), (31, 26), (40, 16), (47, 27))):
        c.dither(ell(x, y + 5, 2, 4), "lilac", 6)
        c.fill(ell(x, y, 2, 2), "lilac")
        c.fill(rect(x - 1, y + 2, x + 1, y + 4), "lilac")
        c.put(x, y, "white")
        c.dots("dusk", (x - 1, y), (x + 1, y))
    lantern(c, 28, 4, "glow", "violet")
    halo(c, 28, 7, 6, ("violet",))
    lantern(c, 28, 4, "glow", "violet")
    return c


def vesper_017():  # Gelo Spettrale: a ghost hand brings the cold
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "dusk", "violet"], 0, 44)
    c.shade(poly([(0, 30), (16, 22), (30, 20), (30, 28), (16, 32), (0, 39)]), "lilac")
    for i, y in enumerate((16, 19, 23, 27)):
        c.shade(path([(29, 21 + i * 2), (38 + (i % 2) * 2, y), (44 - i, y - 2 + i)], 2), "lilac", rim=False)
    c.dither(rect(0, 28, 12, 39), "dusk", 6)
    for x, y in ((48, 10), (40, 6), (50, 24), (36, 32)):
        c.fill(line(x - 2, y, x + 2, y) | line(x, y - 2, x, y + 2), "white")
        c.dots("lilac", (x - 1, y - 1), (x + 1, y + 1), (x - 1, y + 1), (x + 1, y - 1))
    return c


def vesper_018():  # Patto Oscuro: a contract with a violet seal
    c = Canvas(W, H)
    bg_vesper_crypt(c)
    c.shade(poly([(14, 8), (42, 6), (44, 32), (16, 34)]), "sand")
    for y in (12, 16, 20):
        c.fill(rect(19, y, 38, y), "wood")
    c.fill(path([(20, 26), (24, 24), (27, 27), (30, 24)], 1), "ink")
    c.fill(ell(37, 27, 4, 4), "violet")
    c.fill(ell(37, 27, 2, 2), "lilac")
    c.fill(poly([(35, 30), (34, 37), (37, 34), (40, 37), (39, 30)]), "violet")
    c.fill(line(46, 34, 52, 16), "ash")  # quill
    c.fill(poly([(50, 16), (55, 6), (53, 18)]), "lilac")
    return c


def vesper_019():  # Marea dei Ricordi: small lights on the tide
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 17), ["ink", "dusk", "violet"], 0, 17)
    c.fill(ell(40, 9, 5, 5), "lilac")
    c.fill(ell(39, 8, 4, 4), "white")
    c.vgrad(rect(0, 18, W - 1, H - 1), ["violet", "dusk", "ink"], 18, H)
    waves(c, 20, 38, "lilac", 12)
    for x, y in ((8, 24), (18, 30), (27, 22), (36, 33), (46, 26), (51, 36), (13, 37)):
        c.fill(rect(x - 1, y + 1, x + 1, y + 1), "wood")
        c.put(x, y, "glow")
        c.put(x, y - 1, "white")
        c.dither(rect(x - 1, y + 2, x + 1, y + 4), "glow", 6)
    stars(c, [(5, 4), (14, 9), (25, 3), (52, 6), (30, 12)], "lilac")
    return c


def vesper_020():  # Notte Senza Lanterne: every light goes out
    c = Canvas(W, H)
    c.fill(ALL, "ink")
    c.dither(rect(0, 0, W - 1, 22), "dusk", 5)
    c.fill(rect(0, 28, W - 1, H - 1), "ink")
    c.dither(rect(0, 28, W - 1, 30), "dusk", 6)
    lighthouse(c, 14, 29, 20, lit=False, body="slate", band="ink")
    lighthouse(c, 42, 29, 16, lit=False, body="slate", band="ink")
    for x, y in ((14, 6), (42, 10)):
        c.dither(ell(x + 2, y - 3, 3, 2), "stone", 7)
    for x, y in ((24, 20), (30, 34), (50, 22), (5, 35)):
        c.dots("lilac", (x, y), (x + 3, y))
    return c


def vesper_021():  # Velo Funebre: a veil that hides a Keeper
    c = Canvas(W, H)
    bg_vesper_crypt(c)
    veil = poly([(12, 4), (44, 4), (48, 34), (38, 30), (28, 36), (18, 30), (8, 34)])
    c.fill(veil, "dusk")
    c.dither(veil, "violet", 9)
    c.fill(rect(12, 3, 44, 4), "glow")
    for x in (16, 22, 28, 34, 40):
        c.fill(line(x, 5, x + (x - 28) // 4, 30), "lilac")
    c.dither(ell(28, 17, 5, 6), "ink", 9)  # a face behind the veil
    c.dots("white", (26, 16), (30, 16))
    return c


def vesper_022():  # Lanterna del Ritorno: the soul turns around the lantern
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "dusk", "violet"], 0, 46)
    halo(c, 28, 20, 14, ("dusk", "violet", "lilac"))
    c.fill(rect(23, 11, 33, 29), "lilac")
    c.fill(rect(25, 13, 31, 27), "white")
    c.fill(ell(28, 20, 1.5, 4), "glow")
    c.shade(rect(22, 8, 34, 10), ("dusk", "violet", "lilac"))
    c.shade(rect(22, 29, 34, 31), ("dusk", "violet", "lilac"))
    for x in (22, 28, 34):
        c.fill(rect(x, 11, x, 28), "dusk")
    c.fill(path([(24, 7), (28, 3), (32, 7)], 1), "violet")
    c.fill(path([(12, 30), (10, 22), (14, 14), (20, 9)], 1), "white")
    c.fill(path([(44, 10), (46, 18), (42, 27), (36, 33)], 1), "white")
    c.fill(ell(12, 31, 1.5, 1.5) | ell(44, 9, 1.5, 1.5), "white")
    return c


def vesper_023():  # Cimitero Sommerso: graves under the tide
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 15), ["dusk", "violet", "lilac"], 0, 15)
    c.vgrad(rect(0, 16, W - 1, H - 1), ["violet", "dusk", "ink"], 16, H)
    c.fill(rect(0, 16, W - 1, 16), "lilac")
    waves(c, 18, 24, "lilac", 12)
    for x, top, w in ((6, 10, 7), (20, 14, 6), (33, 8, 8), (47, 13, 6)):
        stone = ell(x + w / 2, top + 3, w / 2, 3) | rect(x, top + 3, x + w, 36)
        c.shade(stone, ("ink", "slate", "stone"))
        c.fill(rect(x + w // 2, top + 3, x + w // 2, top + 9) | rect(x + w // 2 - 1, top + 5, x + w // 2 + 1, top + 5), "ink")
        c.dither({p for p in stone if p[1] > 16}, "dusk", 8)
    seabed(c, 36, "dusk", "ink")
    for x in (15, 29, 44):
        kelp(c, x, 26, 37, 0, "dusk", x, 2)
    c.dots("lilac", (12, 28), (40, 22), (27, 31))
    return c


def vesper_025():  # Veglia dei Morti: candles on the shore, and those who come back
    c = Canvas(W, H)
    bg_vesper_fog(c)
    for x, h in ((8, 5), (15, 7), (23, 4), (31, 8), (39, 5), (47, 6)):
        c.dither(ell(x, 35 - h, 3, 3), "glow", 5)
        c.fill(rect(x, 36 - h, x + 1, 36), "white")
        c.put(x, 35 - h, "glow")
        c.put(x, 34 - h, "flame")
    for x, y in ((12, 14), (27, 10), (42, 15)):
        c.dither(ell(x, y, 3, 3) | rect(x - 3, y, x + 3, y + 9), "white", 7)
        c.dots("dusk", (x - 1, y), (x + 1, y))
    return c


def vesper_026():  # Promessa di Ritorno: a ring tied to a ribbon
    c = Canvas(W, H)
    c.vgrad(ALL, ["ink", "dusk", "violet"], 0, 46)
    halo(c, 28, 22, 12, ("dusk", "violet"))
    ring = ell(28, 22, 8, 8) - ell(28, 22, 5, 5)
    c.shade(ring, "glow")
    c.fill(poly([(26, 13), (28, 9), (30, 13)]), "lilac")
    c.put(28, 11, "white")
    c.fill(path([(28, 9), (22, 2), (14, 4), (8, 0)], 2), "lilac")
    c.fill(path([(36, 26), (44, 32), (50, 30), (55, 36)], 2), "lilac")
    c.dots("white", (16, 16), (42, 12), (40, 34), (12, 30))
    return c


# ---------------------------------------------------------------- neutral scenes
def neutral_011():  # Colpo di Fionda: a stone flies from the sling
    c = Canvas(W, H)
    bg_neutral_cliff(c)
    c.fill(path([(4, 36), (10, 22), (18, 14)], 1), "tan")
    c.fill(path([(8, 36), (12, 24), (18, 16)], 1), "tan")
    c.shade(rect(16, 13, 21, 17), "bark")
    for x, y in ((24, 13), (29, 11), (34, 10)):
        c.put(x, y, "white")
    c.shade(ell(41, 9, 3, 3), "stone")
    c.dots("white", (46, 6), (47, 10), (45, 13))
    return c


def neutral_012():  # Bottiglia alla Deriva: a message in a bottle
    c = Canvas(W, H)
    bg_neutral_harbor(c)
    c.fill(rect(0, 24, W - 1, H - 1), "sea")
    c.vgrad(rect(0, 28, W - 1, H - 1), ["sea", "deep"], 28, H)
    waves(c, 25, 38, "mist", 11)
    bottle = poly([(18, 30), (34, 22), (38, 28), (22, 36)])
    c.shade(bottle, "verd")
    c.shade(poly([(34, 22), (41, 19), (43, 22), (38, 26)]), "verd")
    c.fill(rect(41, 18, 44, 20), "wood")
    c.fill(poly([(23, 30), (31, 26), (33, 29), (25, 33)]), "sand")
    c.fill(line(25, 31, 31, 28), "wood")
    c.fill(line(20, 30, 32, 24), "white")
    c.fill(rect(14, 35, 40, 35), "foam")
    return c


def neutral_013():  # Coraggio del Marinaio: a fist against the storm
    c = Canvas(W, H)
    c.vgrad(ALL, ["slate", "stone", "sand", "glow"], 0, 36)
    for i in range(9):
        x = round(28 + (i - 4) * 9)
        c.dither(poly([(28, 30), (x - 3, 0), (x + 3, 0)]), "white", 5)
    c.fill(rect(0, 34, W - 1, H - 1), "deep")
    waves(c, 35, 38, "sea", 8)
    c.shade(rect(22, 20, 33, 39), "white")
    for y in (24, 28, 32, 36):
        c.fill(rect(22, y, 33, y + 1), "deep")
    c.shade(rect(21, 9, 34, 20), "skin")
    for x in (24, 27, 30):
        c.fill(rect(x, 9, x, 14), "tan")
    c.shade(rect(18, 13, 22, 18), "skin")
    return c


def neutral_014():  # Olio per i Fari: oil for the lamp
    c = Canvas(W, H)
    night_sea(c, 28)
    lighthouse(c, 42, 30, 22)
    beam(c, 42, 10, -1, 26)
    c.shade(poly([(8, 36), (9, 22), (20, 22), (21, 36)]), "copper")
    c.shade(rect(11, 18, 18, 21), "copper")
    c.fill(path([(20, 24), (27, 18), (30, 19)], 2), "copper")
    c.fill(path([(8, 25), (4, 28), (8, 32)], 1), "rust")
    c.fill(rect(30, 20, 30, 26), "glow")
    c.dots("glow", (30, 28), (30, 31))
    c.dots("sand", (11, 25), (18, 33))
    return c


def neutral_015():  # Tempesta Perfetta: the storm hits every Keeper
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 22), ["ink", "slate", "stone"], 0, 22)
    for x, y, r in ((10, 5, 9), (26, 3, 11), (44, 6, 10), (36, 10, 7), (18, 10, 6)):
        c.fill(ell(x, y, r, r * 0.5), "slate")
        c.dither(ell(x, y - 1, r - 2, r * 0.3), "stone", 7)
    for pts in ([(20, 9), (17, 16), (21, 16), (16, 25)], [(42, 11), (45, 17), (41, 18), (44, 25)]):
        c.fill(path(pts, 1), "glow")
        c.fill(path(pts[:2], 2), "white")
    c.fill(rect(0, 23, W - 1, H - 1), "deep")
    for x, top in ((-4, 26), (12, 22), (30, 27), (44, 23)):
        c.shade(poly([(x, 39), (x + 8, top), (x + 14, top + 4), (x + 18, 39)]), "sea")
        c.fill(path([(x + 6, top + 1), (x + 8, top), (x + 14, top + 4)], 1), "foam")
    c.fill(poly([(25, 27), (35, 25), (33, 30), (27, 30)]), "wood")
    c.fill(line(30, 26, 32, 18), "wood_dark")
    for x in range(3, W, 6):
        c.fill(line(x, 12 + x % 9, x - 2, 17 + x % 9), "mist")
    return c


def neutral_016():  # Giubbotto di Sughero: a cork life vest
    c = Canvas(W, H)
    bg_neutral_deck(c)
    c.shade(poly([(17, 8), (39, 8), (41, 34), (15, 34)]), "tan")
    c.fill(ell(28, 8, 4, 4), "deep")
    c.fill(rect(27, 10, 28, 33), "wood")
    for y in (14, 21, 28):
        c.fill(rect(16, y, 40, y), "wood")
    for x in (21, 34):
        c.fill(rect(x, 9, x, 33), "wood")
    c.fill(rect(15, 18, 41, 19) | rect(15, 30, 41, 31), "coral_dark")
    c.dots("sand", (18, 11), (24, 17), (31, 24), (37, 11), (19, 25))
    return c


def neutral_017():  # Lente di Ricambio: a spare lens in a crate
    c = Canvas(W, H)
    bg_neutral_harbor(c)
    c.shade(rect(10, 22, 46, 37), "bark")
    for x in (10, 22, 34, 46):
        c.fill(rect(x, 22, x, 37), "wood_dark")
    c.fill(rect(10, 22, 46, 23), "tan")
    c.dither(rect(12, 18, 44, 22), "sand", 10)
    lens = ell(28, 13, 9, 11) - rect(0, 23, W, H)
    c.fill(lens, "mist")
    for r in (8, 5, 2):
        ring = (ell(28, 13, r, r * 1.2) - ell(28, 13, r - 1, r * 1.2 - 1)) & lens
        c.fill(ring, "foam")
    c.fill(lens - ell(28, 13, 8, 10), "copper")
    c.dots("white", (24, 7), (25, 6), (23, 9))
    c.dots("glow", (36, 5), (38, 9), (18, 4))
    return c


def neutral_018():  # Banchina di Pietra: a stone quay
    c = Canvas(W, H)
    c.vgrad(rect(0, 0, W - 1, 18), ["sea", "mist", "foam"], 0, 18)
    c.fill(ell(40, 6, 6, 2) | ell(45, 8, 5, 2), "white")
    c.fill(rect(0, 19, W - 1, H - 1), "sea")
    waves(c, 20, 38, "mist", 10)
    quay = poly([(0, 39), (0, 22), (30, 20), (44, 27), (44, 39)])
    c.shade(quay, "stone")
    for y in (26, 31, 36):
        c.fill({(x, yy) for x, yy in quay if yy == y}, "slate")
    for x in range(4, 44, 9):
        c.fill({(xx, yy) for xx, yy in quay if xx == x + (yy // 5 % 2) * 4 and yy > 22}, "slate")
    for x, y in ((8, 19), (24, 18)):
        c.shade(rect(x, y - 4, x + 3, y + 2), "iron")
        c.fill(rect(x - 1, y - 5, x + 4, y - 4), "slate")
    c.fill(path([(26, 16), (36, 22), (50, 20)], 1), "tan")
    c.fill(poly([(46, 20), (55, 19), (55, 25), (48, 25)]), "wood")
    return c


def sprout_026():  # Linfa Marina: a drop of sap wakes the sprouts
    c = Canvas(W, H)
    c.vgrad(ALL, ["verd", "verd_dark", "kelp_dark"], 0, 40)
    halo(c, 28, 16, 10, ("kelp", "moss"))
    c.fill(ell(28, 18, 4, 4) | poly([(25, 16), (28, 8), (31, 16)]), "sprout")
    c.fill(ell(27, 18, 2, 2), "white")
    c.fill(rect(0, 32, W - 1, H - 1), "kelp_dark")
    for r in (6, 11):
        c.fill((ell(28, 33, r, r * 0.3) - ell(28, 33, r - 1, r * 0.3 - 1)), "verd_light")
    for x, h in ((8, 6), (15, 9), (41, 9), (48, 6)):
        c.fill(rect(x, 36 - h, x, 38), "moss")
        c.shade(ell(x - 2, 35 - h, 2, 1), "sprout")
        c.shade(ell(x + 2, 34 - h, 2, 1), "sprout")
    c.dots("verd_light", (12, 8), (44, 12), (20, 4), (38, 22))
    return c


SCENES = {fn.__name__.replace("_", "-"): fn for fn in (
    abyss_015, abyss_016, abyss_017, abyss_018, abyss_019, abyss_020, abyss_021, abyss_022, abyss_023, abyss_024,
    abyss_025,
    gear_015, gear_016, gear_017, gear_018, gear_019, gear_020, gear_021, gear_022, gear_023, gear_024, gear_025,
    vesper_015, vesper_016, vesper_017, vesper_018, vesper_019, vesper_020, vesper_021, vesper_022, vesper_023,
    vesper_025, vesper_026,
    neutral_011, neutral_012, neutral_013, neutral_014, neutral_015, neutral_016, neutral_017, neutral_018,
    sprout_026,
)}
