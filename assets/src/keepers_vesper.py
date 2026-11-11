"""Vesper Keepers: spirits of the dusk. Dominant colours: dusk, violet, lilac, glow, white."""
from parts import BOB, SWAY, arm, ell, fade, finish, flame, ghost, glints, human, lantern, limb, line, new, path, poly, rect, sparks


def vesper_001(f):  # Fuoco Fatuo: a will-o'-the-wisp
    c = new()
    hop = [0, -1, -2, -1][f]
    c.dither(ell(15, 29, 4, 1), "dusk", 8)
    flame(c, 15, 25 + hop, 11, 16, f, ("violet", "lilac", "white"))
    y = 19 + hop
    c.dots("dusk", (13, y), (17, y), (13, y + 1), (17, y + 1))
    sparks(c, [(7, 12), (23, 10), (19, 5)], f, "lilac")
    return c


def vesper_002(f):  # Portatore di Lanterna: a small hooded lantern bearer
    c = new()
    a = human(c, f, cx=11, L=4, T=7, body="dusk", legs="dusk")
    b = a["b"]
    c.shade(ell(10, a["hy"] - 1, 5, 5), "dusk")
    c.fill(rect(11, a["hy"] - 1, 14, a["hy"] + 2), "sand")
    c.put(13, a["hy"], "ink")
    c.fill(rect(19, 4 + b, 19, 29) | rect(19, 4 + b, 24, 4 + b), "wood_dark")
    arm(c, a["sh_f"], (18, a["ty"] + 4), "dusk")
    ly = 7 + b + abs(SWAY[f])
    lantern(c, 24, ly, "glow", "violet")
    finish(c)
    glints(c, 24, ly, f)
    return c


def vesper_003(f):  # Spirito della Nebbia: a ghost made of mist
    c = new()
    hop = [0, -1, -1, 0][f]
    limb(c, [(21, 15 + hop), (26, 12 + hop + SWAY[f])], "lilac")
    limb(c, [(7, 15 + hop), (3, 17 + hop - SWAY[f])], "lilac")
    ghost(c, 14, 6 + hop, 14, 27, f, "lilac")
    c.dots("dusk", (12, 13 + hop), (17, 13 + hop), (12, 14 + hop), (17, 14 + hop))
    c.fill(rect(14, 17 + hop, 15, 18 + hop), "violet")
    finish(c)
    fade(c, 21, 6)
    return c


def vesper_004(f):  # Danzatore della Risacca: a dancer with ribbons
    c = new()
    b = BOB[f]
    s = SWAY[f]
    c.shade(rect(13, 20, 14, 28), "dusk")
    c.fill(rect(13, 28, 15, 29), "ink")
    limb(c, [(15, 20 + b), (20, 23 + b), (19, 27)], "dusk")
    c.shade(poly([(11, 11 + b), (17, 11 + b), (16, 20 + b), (12, 20 + b)]), "violet")
    c.shade(ell(14, 7 + b, 3, 3), "skin")
    c.put(16, 7 + b, "ink")
    c.fill(rect(11, 4 + b, 16, 5 + b), "dusk")
    c.fill(path([(11, 5 + b), (8, 7 + b + s)], 1), "dusk")
    limb(c, [(17, 12 + b), (23, 8 + b)], "skin")
    limb(c, [(11, 12 + b), (6, 15 + b)], "skin")
    c.fill(path([(23, 8 + b), (26, 11 + b + s), (24, 15 + b), (28, 19 + b - s)], 1), "lilac")
    c.fill(path([(6, 15 + b), (3, 18 + b - s), (5, 22 + b)], 1), "lilac")
    finish(c)
    c.dots("white", (28, 21 + b - s), (4, 24 + b))
    return c


def vesper_005(f):  # Guardiano del Molo: a pier guard with a boathook
    c = new()
    a = human(c, f, cx=12, body="dusk", legs="slate", wide=1)
    b = a["b"]
    c.shade(rect(7, a["hy"] - 5, 17, a["hy"] - 3), "violet")
    c.fill(rect(13, a["hy"] - 3, 19, a["hy"] - 3), "dusk")
    c.fill(rect(12, a["hy"] + 2, 16, a["hy"] + 4), "ash")
    c.dots("glow", (12, a["ty"] + 4), (12, a["ty"] + 7))
    c.fill(rect(23, 3 + b, 23, 29), "wood")
    c.fill(path([(23, 3 + b), (26, 4 + b), (26, 7 + b)], 1), "stone")
    arm(c, a["sh_f"], (22, a["ty"] + 4), "dusk")
    lantern(c, 4, a["waist"] - 3, "glow", "violet")
    return finish(c)


def vesper_006(f):  # Becchino delle Scogliere: a pale gravedigger
    c = new()
    a = human(c, f, cx=13, body="dusk", legs="dusk", skin=("stone", "ash", "white"))
    b = a["b"]
    c.shade(poly([(9, a["waist"]), (17, a["waist"]), (18, a["waist"] + 4), (8, a["waist"] + 4)]), "dusk")
    c.shade(rect(10, a["hy"] - 7, 16, a["hy"] - 4), "dusk")
    c.fill(rect(6, a["hy"] - 3, 20, a["hy"] - 3), "dusk")
    c.fill(rect(10, a["ty"] + 1, 16, a["ty"] + 1), "lilac")
    c.fill(line(24, 9 + b, 21, 28), "wood")
    c.shade(poly([(22, 2 + b), (27, 3 + b), (26, 9 + b), (23, 8 + b)]), "steel")
    arm(c, a["sh_f"], (22, a["ty"] + 5), "dusk", hand="ash")
    return finish(c)


def vesper_007(f):  # Veggente del Crepuscolo: a veiled seer with a small moon
    c = new()
    b = BOB[f]
    s = SWAY[f]
    c.shade(poly([(10, 14 + b), (18, 14 + b), (21, 29), (7, 29)]), "violet")
    c.shade(ell(14, 9 + b, 4, 4), "skin")
    c.shade(poly([(9, 10 + b), (10, 5 + b), (14, 3 + b), (18, 5 + b), (19, 8 + b), (14, 6 + b), (10, 12 + b), (8, 19 + b + s)]), "lilac")
    c.fill(rect(13, 9 + b, 17, 9 + b), "lilac")
    limb(c, [(18, 16 + b), (23, 14 + b)], "violet")
    c.dots("glow", (12, 20 + b), (16, 24), (13, 27))
    finish(c)
    oy = 8 + b + s
    c.fill(ell(26, oy, 3, 3), "glow")
    c.fill(ell(28, oy - 1, 2, 2), None)
    c.put(24, oy + 1, "white")
    c.dots("lilac", (22, 3 + f % 2), (29, 15 - f % 2))
    return c


def vesper_008(f):  # Ombra Inquieta: a restless shadow
    c = new()
    b = BOB[f]
    s = SWAY[f]
    body = poly([(9, 29), (8, 16 + b), (11, 8 + b), (16, 6 + b), (21, 9 + b), (23, 18 + b), (22, 29)])
    c.fill(body, "ink")
    c.dither(body, "dusk", 9)
    c.fill(path([(12, 7 + b), (10, 3 + b + s)], 1) | path([(18, 6 + b), (20, 2 + b - s)], 1), "dusk")
    c.fill(path([(22, 14 + b), (27, 12 + b), (29, 15 + b + s)], 2), "dusk")
    c.fill(path([(9, 14 + b), (4, 13 + b), (3, 17 + b - s)], 2), "dusk")
    c.dots("lilac", (29, 17 + b + s), (30, 15 + b + s), (3, 19 + b - s), (2, 17 + b - s))
    c.fill(rect(12, 12 + b, 13, 13 + b) | rect(18, 12 + b, 19, 13 + b), "white")
    c.fill(rect(13, 17 + b, 18, 17 + b), "lilac")
    for x in range(9, 23):
        if (x + f) % 3 == 0:
            c.fill(rect(x, 27, x, 29), None)
    c.outline("violet")
    return c


def vesper_009(f):  # Cavaliere Spettrale: a ghost knight
    c = new()
    hop = [0, -1, -1, 0][f]
    ghost(c, 13, 12 + hop, 10, 28, f, "violet")
    c.shade(rect(8, 12 + hop, 18, 20 + hop), "dusk")
    c.fill(rect(12, 13 + hop, 14, 19 + hop), "violet")
    c.shade(ell(8, 13 + hop, 2, 2), "violet")
    c.shade(ell(18, 13 + hop, 2, 2), "violet")
    c.shade(ell(13, 7 + hop, 4, 4), "dusk")
    c.fill(rect(12, 7 + hop, 17, 7 + hop), "ink")
    c.dots("white", (14, 7 + hop), (16, 7 + hop))
    c.fill(path([(12, 3 + hop), (9, 1 + hop), (6, 3 + hop + SWAY[f])], 2), "lilac")
    limb(c, [(18, 15 + hop), (22, 16 + hop)], "dusk")
    c.fill(rect(23, 3 + hop, 24, 15 + hop), "lilac")
    c.fill(rect(23, 3 + hop, 23, 15 + hop), "white")
    c.fill(rect(21, 16 + hop, 26, 16 + hop), "glow")
    finish(c)
    fade(c, 23, 5)
    return c


def vesper_010(f):  # Campanaro dei Naufragi: he rings the bell for the lost ships
    c = new()
    a = human(c, f, cx=10, body="dusk", legs="dusk")
    s = SWAY[f]
    c.shade(ell(9, a["hy"] - 1, 5, 5), "violet")
    c.fill(rect(11, a["hy"], 13, a["hy"] + 2), "sand")
    c.put(13, a["hy"], "ink")
    c.fill(rect(27, 5, 28, 29) | rect(16, 5, 28, 6), "wood_dark")
    bx = 21 + s
    c.fill(line(21, 7, bx, 9), "stone")
    c.shade(poly([(bx - 1, 9), (bx + 1, 9), (bx + 4, 16), (bx - 4, 16)]), "copper")
    c.fill(rect(bx - 4, 17, bx + 4, 17), "sand")
    c.put(bx - s, 19, "ink")
    c.put(bx - s, 18, "ink")
    arm(c, a["sh_f"], (16, a["ty"] + 3), "dusk")
    c.fill(line(17, a["ty"] + 3, bx - 3, 18), "tan")
    finish(c)
    c.dots("glow" if f % 2 == 0 else "lilac", (14, 11 - f % 2), (26, 12 + f % 2), (18, 2))
    return c


def vesper_011(f):  # Divoratore di Anime: a bloated thing with a mouth in the belly
    c = new()
    b = BOB[f]
    s = SWAY[f]
    c.shade(rect(10, 22, 11, 29), "dusk")
    c.shade(rect(18, 22, 19, 29), "dusk")
    limb(c, [(8, 13 + b), (3, 17 + b), (4, 23 + b + s)], "violet")
    limb(c, [(22, 13 + b), (27, 17 + b), (26, 23 + b - s)], "violet")
    c.shade(ell(15, 16 + b, 8, 8), "dusk")
    c.fill(ell(15, 17 + b, 5, 4), "ink")
    for x in (11, 13, 15, 17, 19):
        c.put(x, 14 + b + abs(x - 15) // 3, "white")
        c.put(x, 20 + b - abs(x - 15) // 3, "white")
    c.fill(ell(15, 17 + b, 2, 1), "lilac")
    c.put(15, 17 + b, "white")
    c.fill(line(12, 3 + b, 10, 1 + b) | line(18, 3 + b, 20, 1 + b), "lilac")
    c.shade(ell(15, 5 + b, 3, 3), "violet")
    c.dots("glow", (14, 5 + b), (17, 5 + b))
    finish(c)
    for i, (x, y) in enumerate(((27, 6), (29, 10), (3, 7), (1, 11))):
        if (i + f) % 2 == 0:
            c.fill(rect(x, y, x, y + 1), "lilac")
            c.put(x, y, "white")
    return c


def vesper_012(f):  # Custode della Cripta: a heavy guard with a tombstone shield
    c = new()
    a = human(c, f, cx=12, L=6, T=11, body="iron", legs="slate", wide=2, eye=False)
    b = a["b"]
    c.shade(poly([(6, a["ty"] + 1), (2, 27), (6, 29)]), "violet")
    c.shade(ell(12, a["hy"] - 1, 5, 5), "dusk")
    c.fill(rect(11, a["hy"], 16, a["hy"]), "ink")
    c.dots("lilac", (13, a["hy"]), (15, a["hy"]))
    c.dots("glow", (9, a["waist"]), (9, a["waist"] + 1), (10, a["waist"] + 2))
    c.shade(poly([(18, 13 + b), (20, 10 + b), (25, 10 + b), (27, 13 + b), (27, 28), (18, 28)]), "stone")
    c.fill(rect(22, 14 + b, 23, 23 + b) | rect(20, 16 + b, 25, 17 + b), "dusk")
    return finish(c)


def vesper_013(f):  # Regina delle Lanterne Spente: a queen with dead lanterns
    c = new()
    b = BOB[f]
    s = SWAY[f]
    c.shade(poly([(11, 12 + b), (18, 12 + b), (24, 29), (5, 29)]), "dusk")
    c.fill(poly([(14, 14 + b), (15, 14 + b), (17, 29), (12, 29)]), "violet")
    c.fill(rect(10, 5 + b, 12, 13 + b), "dusk")
    c.shade(ell(14, 7 + b, 4, 4), ("ash", "white", "white"))
    c.put(16, 7 + b, "ink")
    c.fill(rect(11, 3 + b, 17, 3 + b), "glow")
    for x in (11, 14, 17):
        c.fill(rect(x, 1 + b, x, 2 + b), "glow")
    limb(c, [(18, 14 + b), (23, 12 + b)], "dusk")
    lantern(c, 25, 14 + b, "slate", "stone", "ink")
    c.dots("lilac", (9, 22), (20, 25), (13, 26))
    finish(c)
    for i, (x, y) in enumerate(((4, 8), (29, 4))):
        yy = y + (s if i else -s)
        c.fill(rect(x - 1, yy, x + 1, yy + 3), "slate")
        c.fill(rect(x - 1, yy, x + 1, yy), "stone")
        c.put(x, yy + 2, "lilac" if f == i * 2 else "ink")
    return c


def vesper_014(f):  # Orrore della Nebbia: a fog horror with many eyes
    c = new()
    b = BOB[f]
    s = SWAY[f]
    limb(c, [(4, 14 + b), (1, 18 + b + s), (2, 24)], "violet")
    limb(c, [(26, 14 + b), (30, 18 + b - s), (29, 24)], "violet")
    ghost(c, 15, 3 + b, 22, 29, f, "violet")
    c.dither(ell(11, 7 + b, 5, 3), "lilac", 6)
    for i, (x, y) in enumerate(((9, 10), (15, 8), (21, 11), (12, 15), (19, 16))):
        c.fill(rect(x, y + b, x + 1, y + 1 + b), "white")
        c.put(x + (1 if (i + f) % 2 else 0), y + 1 + b, "ink")
    c.fill(rect(10, 20 + b, 21, 22 + b), "ink")
    c.dots("lilac", (11, 20 + b), (14, 20 + b), (17, 20 + b), (20, 20 + b), (12, 22 + b), (16, 22 + b), (19, 22 + b))
    finish(c)
    fade(c, 25, 5)
    return c


def vesper_024(f):  # Pellegrina del Crepuscolo: a pilgrim with a staff and a moon charm
    c = new()
    a = human(c, f, cx=12, body="violet", legs="dusk")
    b = a["b"]
    c.shade(rect(4, a["ty"] + 1, 8, a["ty"] + 7), "bark")
    c.shade(rect(4, a["ty"] - 1, 8, a["ty"]), "tan")
    c.shade(ell(11, a["hy"] - 1, 5, 5), "lilac")
    c.fill(rect(12, a["hy"] - 1, 15, a["hy"] + 2), "sand")
    c.put(14, a["hy"], "ink")
    c.fill(rect(20, 5 + b, 20, 29), "wood")
    arm(c, a["sh_f"], (19, a["ty"] + 4), "violet")
    finish(c)
    cy = 8 + b + abs(SWAY[f])
    c.fill(line(21, 5 + b, 23, cy - 1), "lilac")
    c.fill(rect(22, cy, 24, cy + 2), "glow")
    c.put(24, cy, None)
    c.put(23, cy + 1, "white")
    return c


def vesper_t01(f):  # Anima Errante: a small lost soul
    c = new()
    hop = [0, -1, -2, -1][f]
    c.dither(ell(15, 29, 3, 1), "dusk", 8)
    c.fill(path([(15, 17 + hop), (16, 14 + hop), (15 + SWAY[f], 12 + hop)], 1), "lilac")
    ghost(c, 15, 16 + hop, 8, 27 + hop, f, "lilac")
    c.dots("dusk", (14, 20 + hop), (17, 20 + hop))
    finish(c)
    c.dots("white", (9, 18 + hop - f % 2), (21, 22 + hop))
    return c


KEEPERS = {f"vesper-{i:03d}": fn for i, fn in (
    (1, vesper_001), (2, vesper_002), (3, vesper_003), (4, vesper_004), (5, vesper_005), (6, vesper_006),
    (7, vesper_007), (8, vesper_008), (9, vesper_009), (10, vesper_010), (11, vesper_011), (12, vesper_012),
    (13, vesper_013), (14, vesper_014), (24, vesper_024),
)}
KEEPERS["vesper-t01"] = vesper_t01
