"""Abyss Keepers: creatures of the deep. Dominant colours: abyss, deep, sea, mist, foam."""
import math

from parts import BOB, SWAY, arm, ell, finish, glints, human, limb, line, new, path, poly, rect


def abyss_001(f):  # Pescatore Cieco: a blind angler with a glowing lure
    c = new()
    a = human(c, f, cx=11, L=4, T=8, body="sea", legs="slate", eye=False)
    b = a["b"]
    c.shade(ell(11, a["hy"] - 2, 5, 2), "water")  # rain hat
    c.fill(rect(5, a["hy"] - 1, 17, a["hy"] - 1), "deep")
    c.fill(rect(8, a["hy"], 15, a["hy"]), "foam")  # blindfold
    c.fill(line(16, a["ty"] + 5, 27, 6 + b), "wood")  # rod
    arm(c, a["sh_f"], (16, a["ty"] + 4), "sea")
    finish(c)
    ly = 14 + b + abs(SWAY[f])
    c.fill(line(27, 7 + b, 27, ly), "mist")
    c.fill(rect(26, ly + 1, 28, ly + 3), "verd_light")
    c.put(27, ly + 2, "white")
    return c


def abyss_002(f):  # Lanciatore di Aculei: a sea urchin that shoots its spines
    c = new()
    b = BOB[f]
    cx, cy = 13, 22 + b
    for i, ang in enumerate(range(-175, 6, 20)):
        r = 9 + (2 if (i + f) % 3 == 0 else 0)
        x, y = cx + r * math.cos(math.radians(ang)), cy + r * math.sin(math.radians(ang))
        c.fill(line(cx, cy, round(x), round(y)), "sea" if i % 2 else "deep")
        c.put(round(x), round(y), "foam")
    c.shade(ell(cx, cy, 6, 5), "sea")
    c.dots("foam", (cx + 1, cy - 1), (cx + 4, cy - 1))
    c.dots("ink", (cx + 2, cy - 1), (cx + 5, cy - 1))
    c.fill(rect(cx - 4, 28, cx - 3, 29) | rect(cx + 2, 28, cx + 3, 29), "deep")
    finish(c)
    x = 23 + f * 2
    c.fill(line(x, 13, x + 3, 11), "mist")
    c.put(x + 3, 11, "white")
    return c


def abyss_003(f):  # Medusa Vagante: a drifting jellyfish
    c = new()
    s = SWAY[f]
    hop = [0, -1, -1, 0][f]
    c.dither(ell(15, 29, 5, 1), "ink", 8)
    for i, x in enumerate((10, 13, 17, 20)):
        limb(c, [(x, 14 + hop), (x + (s if i % 2 else -s), 20 + hop), (x, 25 + hop + i % 2)], "mist", 1)
    c.shade(ell(15, 10 + hop, 7, 5), "mist")
    c.fill(rect(8, 13 + hop, 22, 14 + hop), "sea")
    c.dither(ell(13, 8 + hop, 3, 2), "white", 8)
    c.dots("ink", (13, 11 + hop), (18, 11 + hop))
    finish(c)
    c.dots("verd_light", (15, 6 + hop), (10, 21 + hop + s), (20, 22 + hop - s))
    return c


def abyss_004(f):  # Granchio delle Fosse: a trench crab with one large claw
    c = new()
    b = BOB[f]
    s = SWAY[f]
    for x in (8, 11, 19, 22):
        side = -1 if x < 15 else 1
        c.fill(path([(x, 24 + b), (x + side * 2, 26), (x + side * 3, 29)], 2), "deep")
    c.shade(ell(15, 21 + b, 9, 5), "sea")
    c.fill(rect(12, 14 + b, 12, 17 + b) | rect(18, 14 + b, 18, 17 + b), "deep")
    c.dots("verd_light", (12, 13 + b), (18, 13 + b))
    limb(c, [(22, 19 + b), (26, 15 + b + s)], "sea")
    c.shade(ell(26, 10 + b + s, 4, 4), "water")
    c.fill(poly([(27, 9 + b + s), (31, 6 + b + s), (31, 11 + b + s)]), None)
    limb(c, [(8, 20 + b), (5, 17 + b)], "sea")
    c.shade(ell(4, 15 + b, 2, 2), "water")
    c.dots("foam", (11, 21 + b), (16, 23 + b), (19, 20 + b))
    c.fill(rect(13, 23 + b, 17, 23 + b), "deep")
    return finish(c)


def abyss_005(f):  # Seppia d'Inchiostro: a cuttlefish in an ink cloud
    c = new()
    b = BOB[f]
    s = SWAY[f]
    y = 19 + b
    c.dither(ell(15, 29, 7, 1), "ink", 8)
    c.shade(ell(13, y, 8, 5), "water")
    c.fill(path([(5, y - 4), (13, y - 6), (21, y - 4)], 1), "mist")
    for i in range(4):
        limb(c, [(20, y + i - 1), (25, y + i * 2 - 3 + (s if i % 2 else 0)), (29, y + i * 3 - 5)], "sea", 1)
    c.fill(rect(17, y - 1, 19, y), "foam")
    c.dots("ink", (17, y), (19, y), (18, y - 1))
    c.dots("deep", (8, y - 1), (10, y + 1), (12, y - 2), (14, y + 2), (7, y + 2))
    finish(c)
    c.dither(ell(4 - f % 2, y + 5, 3 + f % 2, 2 + f % 2), "ink", 9)
    c.dither(ell(2, y + 1 - f, 2, 1), "ink", 6)
    return c


def abyss_006(f):  # Ladra di Sussurri: a thief who listens to a shell
    c = new()
    a = human(c, f, cx=13, body="sea", legs="slate")
    c.shade(poly([(9, a["ty"]), (4, a["waist"] + 3 + SWAY[f]), (9, a["waist"] + 1)]), "sea")  # cape
    c.shade(ell(12, a["hy"] - 1, 5, 5), "sea")  # hood
    c.fill(rect(13, a["hy"] - 1, 16, a["hy"] + 2), "sand")
    c.put(15, a["hy"], "ink")
    c.fill(rect(13, a["hy"] + 2, 16, a["hy"] + 2), "deep")  # mask
    arm(c, a["sh_f"], (20, a["hy"] + 1), "sea")
    c.shade(ell(23, a["hy"], 2, 3), "foam")  # shell
    c.put(23, a["hy"], "coral")
    arm(c, a["sh_b"], (8, a["ty"] + 7), "sea")
    finish(c)
    c.dots("mist", (27, a["hy"] - 2 - f % 2), (29, a["hy"] + SWAY[f]), (27, a["hy"] + 3))
    return c


def abyss_007(f):  # Anguilla del Riflusso: an eel that rises from the water
    c = new()
    b = BOB[f]
    s = SWAY[f]
    c.shade(path([(6, 29), (10, 25), (16, 25 + s), (20, 20), (15, 15 + b), (18, 10 + b), (24, 9 + b)], 3), "sea")
    c.shade(ell(25, 9 + b, 4, 3), "water")
    c.fill(rect(26, 11 + b, 29, 11 + b), "ink")
    c.put(26, 8 + b, "glow")
    c.dots("mist", (12, 26), (18, 22), (17, 13 + b), (20, 10 + b))
    c.fill(path([(14, 13 + b), (12, 11 + b), (16, 8 + b)], 1), "mist")
    finish(c)
    c.dots("foam", (3, 28), (9, 29 - f % 2), (4, 26 + f % 2))
    return c


def abyss_008(f):  # Rana Pescatrice: an anglerfish with a lure
    c = new()
    b = BOB[f]
    s = SWAY[f]
    c.fill(poly([(5, 20 + b), (1, 15 + b + s), (1, 25 + b - s)]), "deep")
    c.shade(ell(14, 20 + b, 9, 8), "sea")
    c.fill(poly([(15, 19 + b), (24, 17 + b), (24, 25 + b), (15, 24 + b)]), "ink")
    for x in (17, 19, 21, 23):
        c.put(x, 18 + b, "foam")
        c.put(x - 1, 24 + b, "foam")
    c.fill(rect(16, 14 + b, 17, 15 + b), "foam")
    c.put(17, 15 + b, "ink")
    c.fill(rect(10, 28, 12, 29) | rect(16, 28, 18, 29), "deep")
    c.dots("deep", (9, 17 + b), (7, 21 + b), (11, 23 + b))
    lx, ly = 25, 9 + b + abs(s)
    c.fill(path([(14, 12 + b), (16, 6 + b), (22, 5 + b), (lx, ly - 1)], 1), "deep")
    finish(c)
    c.fill(ell(lx, ly + 1, 1, 1), "glow")
    c.put(lx, ly + 1, "white")
    glints(c, lx, ly - 2, f, "glow", 3)
    return c


def abyss_009(f):  # Sentinella Abissale: a diver in a heavy suit with a trident
    c = new()
    a = human(c, f, cx=12, L=6, T=10, body="iron", legs="slate", wide=1, eye=False)
    b = a["b"]
    c.shade(ell(12, a["hy"], 5, 5), "sea")  # helmet
    c.fill(ell(14, a["hy"], 2, 2), "verd_light")
    c.put(14, a["hy"] - 1, "white")
    c.fill(rect(8, a["ty"] + 1, 16, a["ty"] + 2), "copper")
    c.fill(rect(9, a["ty"] + 5, 15, a["ty"] + 6), "sea")
    c.fill(rect(23, 5 + b, 23, 29), "stone")  # trident
    c.fill(rect(20, 5 + b, 26, 5 + b) | rect(20, 2 + b, 20, 5 + b) | rect(26, 2 + b, 26, 5 + b) | rect(23, 1 + b, 23, 5 + b), "ash")
    arm(c, a["sh_f"], (22, a["ty"] + 5), "iron", hand="slate")
    finish(c)
    c.dots("foam", (17, a["hy"] - 6 - f), (19, a["hy"] - 9 - f % 2))  # air bubbles
    return c


def abyss_010(f):  # Risucchio Vivente: a living whirlpool
    c = new()
    s = SWAY[f]
    for i, (y, r) in enumerate(((8, 11), (12, 9), (16, 7), (20, 5), (24, 3), (27, 2))):
        c.shade(ell(15 + (s if i % 2 else -s) * (1 if i < 4 else 0), y, r, 2), "water" if i % 2 else "sea")
    c.dots("foam", (12, 12), (18, 12))
    c.dots("ink", (12, 13), (18, 13))
    finish(c)
    for i in range(6):
        x = 15 + ((i * 7 + f * 3) % (22 - i * 4)) - (11 - i * 2)
        c.put(x, 8 + i * 4, "foam")
    c.dots("foam", (4, 4 - f % 2), (27, 5 + f % 2), (15, 29))
    return c


def abyss_011(f):  # Oracolo Senza Occhi: a tall oracle with no eyes
    c = new()
    b = BOB[f]
    c.shade(poly([(10, 13 + b), (19, 13 + b), (23, 29), (6, 29)]), "sea")
    c.fill(rect(14, 15 + b, 15, 28), "deep")
    c.shade(ell(14, 8 + b, 4, 5), "foam")
    c.shade(ell(13, 5 + b, 5, 2), "water")
    c.fill(rect(9, 6 + b, 10, 12 + b), "sea")
    c.fill(rect(14, 11 + b, 16, 11 + b), "mist")
    limb(c, [(19, 16 + b), (24, 14 + b)], "sea")
    limb(c, [(10, 16 + b), (7, 19 + b)], "sea")
    c.dots("foam", (10, 24), (19, 26), (12, 27))
    finish(c)
    oy = 10 + b + SWAY[f]
    c.fill(ell(26, oy, 2, 2), "verd_light")
    c.put(25, oy - 1, "white")
    c.dots("mist", (26, oy - 4 - f % 2), (29, oy + 2), (23, oy + 4 + f % 2))
    return c


def abyss_012(f):  # Calamaro Colossale: a giant squid
    c = new()
    b = BOB[f]
    s = SWAY[f]
    for i, x in enumerate((4, 8, 12, 17, 21, 26)):
        limb(c, [(9 + i * 2, 17 + b), (x, 23), (x + (s if i % 2 else -s), 29)], "sea")
    limb(c, [(21, 17 + b), (27, 13 + b), (29, 8 + b + s)], "sea")
    c.shade(poly([(8, 8 + b), (4, 5 + b), (10, 4 + b)]), "sea")
    c.shade(poly([(22, 8 + b), (26, 5 + b), (20, 4 + b)]), "sea")
    c.shade(poly([(8, 18 + b), (10, 6 + b), (15, 1 + b), (20, 6 + b), (22, 18 + b)]), "water")
    c.fill(rect(11, 14 + b, 13, 16 + b) | rect(18, 14 + b, 20, 16 + b), "foam")
    c.dots("ink", (12, 15 + b), (19, 15 + b))
    c.dots("mist", (15, 5 + b), (13, 9 + b), (17, 11 + b))
    c.dots("foam", (29, 7 + b + s), (4, 27), (26, 26))
    return finish(c)


def abyss_013(f):  # Fauci della Fossa: a huge mouth from the trench
    c = new()
    b = BOB[f]
    j = [0, 1, 2, 1][f]
    c.shade(poly([(8, 6 + b), (12, 1 + b), (15, 5 + b)]), "deep")
    c.shade(ell(13, 13 + b, 11, 9), "sea")
    c.shade(poly([(4, 20), (27, 22 + j), (24, 29), (8, 29)]), "sea")
    c.fill(poly([(10, 17 + b), (28, 13 + b), (27, 22 + j), (10, 21)]), "ink")
    for i in range(6):
        x, y = 11 + i * 3, round(17 + b - i * 0.67)
        c.fill({(x, y), (x, y + 1), (x + 1, y)}, "foam")
    for i in range(5):
        x, y = 12 + i * 3, 21 + (j if i > 2 else 0)
        c.fill({(x, y), (x, y - 1)}, "foam")
    c.put(19, 8 + b, "verd_light")
    c.put(20, 8 + b, "ink")
    c.dots("mist", (8, 12 + b), (11, 10 + b), (6, 15 + b))
    c.dots("deep", (12, 26), (17, 27), (21, 26))
    return finish(c)


def abyss_014(f):  # Leviatano Cieco: a blind sea serpent
    c = new()
    b = BOB[f]
    s = SWAY[f]
    for x, y in ((4, 19), (9, 18), (11, 11 + b), (14, 4 + b)):
        c.fill(poly([(x, y), (x + 1, y - 3), (x + 3, y)]), "mist")
    c.shade(path([(2, 29), (4, 23), (8, 21), (11, 24), (12, 29)], 4), "sea")
    c.shade(path([(15, 29), (16, 20), (14, 12 + b), (17, 7 + b), (22, 6 + b)], 5), "sea")
    c.shade(ell(25, 7 + b, 5, 4), "water")
    c.shade(rect(24, 10 + b, 30, 12 + b), "sea")
    c.fill(rect(25, 10 + b, 30, 10 + b), "ink")
    c.dots("foam", (26, 11 + b), (28, 11 + b), (30, 11 + b))
    c.fill(line(24, 5 + b, 27, 6 + b), "deep")  # the scar where the eye was
    c.fill(path([(29, 13 + b), (30, 17 + b + s)], 1), "mist")
    c.fill(path([(26, 13 + b), (26, 18 + b - s)], 1), "mist")
    c.dots("mist", (16, 24), (15, 16 + b), (5, 25), (10, 26))
    finish(c)
    c.dots("foam", (1, 27 - f % 2), (13, 28), (19, 28 + f % 2), (8, 29))
    return c


def abyss_026(f):  # Predatore delle Secche: a shark that jumps from shallow water
    c = new()
    hop = [0, -1, -1, 0][f]
    c.shade(poly([(11, 15 + hop), (9, 8 + hop), (15, 11 + hop)]), "deep")
    c.shade(poly([(6, 27), (10, 17 + hop), (18, 9 + hop), (27, 6 + hop), (24, 13 + hop), (17, 22), (12, 29)]), "sea")
    c.fill(poly([(14, 25), (21, 14 + hop), (24, 13 + hop), (17, 22)]), "mist")
    c.shade(poly([(18, 18 + hop), (24, 20 + hop), (19, 22)]), "deep")
    c.put(23, 8 + hop, "ink")
    c.fill(line(23, 12 + hop, 26, 9 + hop), "ink")
    c.dots("white", (24, 12 + hop), (25, 11 + hop))
    c.dots("deep", (19, 12 + hop), (18, 14 + hop))
    finish(c)
    c.fill(ell(9, 28, 6, 1), "mist")
    c.dots("foam", (3, 26 - f % 2), (15, 27), (6, 24 + f % 2), (12, 25 - f % 2), (18, 28))
    return c


KEEPERS = {f"abyss-{i:03d}": fn for i, fn in (
    (1, abyss_001), (2, abyss_002), (3, abyss_003), (4, abyss_004), (5, abyss_005), (6, abyss_006), (7, abyss_007),
    (8, abyss_008), (9, abyss_009), (10, abyss_010), (11, abyss_011), (12, abyss_012), (13, abyss_013),
    (14, abyss_014), (26, abyss_026),
)}
