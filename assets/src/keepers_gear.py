"""Gear Keepers: machines and their makers. Dominant colours: wood_dark, wood, copper, tan, sand."""
import math

from parts import BOB, SWAY, arm, cog, ell, finish, human, limb, line, new, path, poly, puff, rect


def gear_001(f):  # Apprendista Orologiaio: a small apprentice with a gear
    c = new()
    a = human(c, f, cx=12, L=4, T=7, body="tan", legs="wood")
    c.fill(rect(9, a["ty"] + 3, 15, a["waist"]), "sand")  # apron
    c.shade(ell(12, a["hy"] - 2, 4, 2), "bark")
    c.fill(rect(14, a["hy"] - 1, 15, a["hy"]), "copper")  # loupe
    arm(c, a["sh_f"], (19, a["ty"] + 3), "tan")
    cog(c, 23, a["ty"] + 2, 3, f)
    return finish(c)


def gear_002(f):  # Balestriere a Molla: a crossbow with a spring
    c = new()
    a = human(c, f, cx=11, body="bark", legs="wood")
    c.shade(ell(11, a["hy"] - 3, 5, 2), "wood")
    c.fill(line(8, a["hy"] - 4, 5, a["hy"] - 7), "copper")
    y = a["ty"] + 3
    pull = [0, 0, 1, 1][f]
    c.fill(rect(15, y, 27, y + 1), "wood_dark")
    c.fill(path([(24, y - 5), (27, y - 1), (27, y + 2), (24, y + 6)], 1), "copper")
    c.fill(line(24, y - 5, 23 - pull, y) | line(23 - pull, y + 1, 24, y + 6), "sand")
    c.fill(rect(20, y - 1, 29, y - 1), "stone")
    c.put(30, y - 1, "ash")
    c.dots("stone", (16, y + 2), (17, y + 3), (18, y + 2), (19, y + 3))
    arm(c, a["sh_f"], (17, y), "bark")
    return finish(c)


def gear_003(f):  # Pesa della Marea: a scale that weighs the tide
    c = new()
    t = [-1, 0, 1, 0][f]
    c.fill(line(15, 20, 9, 29, 2) | line(15, 20, 21, 29, 2), "wood_dark")
    c.shade(rect(14, 8, 16, 24), "bark")
    c.shade(ell(15, 14, 3, 3), "copper")
    c.put(15, 14, "sand")
    c.put(15 + t, 13, "ink")
    c.fill(line(5, 7 - t, 25, 7 + t, 2), "copper")
    for x, dy in ((5, -t), (25, t)):
        c.fill(line(x, 9 + dy, x - 3, 14 + dy) | line(x + 1, 9 + dy, x + 4, 14 + dy), "tan")
        c.shade(rect(x - 4, 15 + dy, x + 5, 16 + dy), "copper")
    c.fill(rect(2, 14 - t, 9, 14 - t), "sea")
    c.shade(rect(24, 12 + t, 27, 14 + t), "iron")
    c.shade(ell(15, 5, 2, 2), "copper")
    c.fill(rect(13, 28, 17, 29), "wood_dark")
    return finish(c)


def gear_004(f):  # Guardiano di Bronzo: a bronze guard with a round shield
    c = new()
    b = BOB[f]
    c.fill(rect(4, 5 + b, 4, 29), "wood")  # spear
    c.fill(poly([(3, 5 + b), (4, 1 + b), (5, 5 + b)]), "ash")
    c.shade(rect(9, 23, 11, 29), "copper")
    c.shade(rect(15, 23, 17, 29), "copper")
    c.fill(rect(8, 28, 12, 29) | rect(14, 28, 18, 29), "rust")
    c.shade(rect(7, 12 + b, 19, 23), "copper")
    c.shade(rect(9, 5 + b, 17, 11 + b), "copper")
    c.fill(rect(11, 7 + b, 17, 8 + b), "ink")
    c.put(15, 7 + b, "glow")
    c.fill(rect(12, 3 + b, 14, 4 + b), "rust")
    c.dots("sand", (8, 14 + b), (18, 14 + b), (8, 21), (18, 21))
    c.dots("verd", (10, 18 + b), (11, 19 + b), (16, 10 + b))
    limb(c, [(7, 14 + b), (4, 18 + b)], "copper")
    c.shade(ell(22, 18 + b, 5, 6), "bark")
    c.shade(ell(22, 18 + b, 2, 2), "copper")
    return finish(c)


def gear_005(f):  # Pistone Furioso: a small boiler with a punching piston
    c = new()
    b = BOB[f]
    p = [0, 2, 4, 2][f]
    c.shade(rect(8, 24, 10, 29), "rust")
    c.shade(rect(14, 24, 16, 29), "rust")
    c.fill(rect(6, 6 + b, 7, 13 + b), "wood_dark")  # chimney
    c.shade(ell(12, 18 + b, 6, 6), "copper")
    c.shade(rect(9, 8 + b, 15, 12 + b), "bark")
    c.fill(line(11, 9 + b, 15, 10 + b), "ink")
    c.dots("flame", (12, 11 + b), (14, 11 + b))
    c.shade(rect(17, 15 + b, 20, 20 + b), "steel")
    c.fill(rect(21, 17 + b, 22 + p, 18 + b), "ash")
    c.shade(rect(23 + p, 14 + b, 25 + p, 21 + b), "copper")
    c.dots("sand", (9, 17 + b), (12, 22 + b))
    finish(c)
    if f in (1, 2):
        puff(c, 6, 3 + b, f)
    return c


def gear_006(f):  # Inventore del Porto: an inventor with goggles and a wrench
    c = new()
    a = human(c, f, cx=13, body="tan", legs="wood")
    b = a["b"]
    c.shade(rect(5, a["ty"], 9, a["ty"] + 7), "copper")  # backpack
    c.fill(rect(6, a["ty"] - 5, 6, a["ty"] - 1), "wood_dark")
    c.shade(ell(13, a["hy"] - 3, 5, 2), "steel")  # grey hair
    c.fill(rect(12, a["hy"] - 1, 17, a["hy"]), "copper")
    c.dots("verd_light", (13, a["hy"]), (16, a["hy"]))
    c.fill(rect(10, a["waist"] - 1, 17, a["waist"] - 1), "wood_dark")
    arm(c, a["sh_f"], (21, a["ty"] - 1), "tan")
    c.fill(line(22, a["ty"] - 1, 25, a["ty"] - 7, 2), "stone")
    c.fill(rect(24, a["ty"] - 10, 27, a["ty"] - 8), "stone")
    c.put(26, a["ty"] - 10, None)
    c.put(25, a["ty"] - 10, None)
    finish(c)
    puff(c, 6, a["ty"] - 8, f)
    return c


def gear_007(f):  # Ancora Meccanica: an anchor with a gear and a will of its own
    c = new()
    b = BOB[f]
    c.shade(path([(5, 19), (7, 25), (15, 28), (23, 25), (25, 19)], 3), "steel")
    c.fill(poly([(3, 20), (5, 15), (8, 20)]), "stone")
    c.fill(poly([(22, 20), (25, 15), (27, 20)]), "stone")
    c.shade(rect(14, 9 + b, 16, 26), "steel")
    c.shade(rect(9, 12 + b, 21, 13 + b), "steel")
    cog(c, 15, 6 + b, 4, f)
    c.dots("glow", (14, 17 + b), (16, 17 + b))
    c.dots("verd", (7, 24), (22, 26), (10, 12 + b))
    for i in range(4):
        c.put(21 + i * 2, 5 + b + i + (i % 2), "wood_dark")
    return finish(c)


def gear_008(f):  # Torretta del Faro: a turret with a lens
    c = new()
    b = BOB[f]
    c.fill(line(15, 20, 7, 29, 2) | line(15, 20, 23, 29, 2) | rect(14, 20, 16, 29), "wood_dark")
    c.shade(rect(11, 17, 19, 20), "bark")
    c.shade(rect(19, 9 + b, 27, 12 + b), "steel")
    c.fill(rect(27, 8 + b, 28, 13 + b), "copper")
    c.shade(ell(14, 11 + b, 6, 6), "copper")
    c.fill(ell(13, 11 + b, 2, 2), "glow")
    c.put(12, 10 + b, "white")
    cog(c, 9, 17 + b, 2, f, "bark")
    c.dots("sand", (17, 7 + b), (18, 14 + b))
    finish(c)
    if f == 2:
        c.dots("flame", (30, 10 + b), (30, 11 + b))
        c.put(31, 10 + b, "glow")
    return c


def gear_009(f):  # Ariete a Vapore: a steam ram on wheels
    c = new()
    b = BOB[f]
    c.shade(rect(6, 3 + b, 8, 9 + b), "wood")  # chimney
    c.fill(rect(5, 3 + b, 9, 3 + b), "copper")
    c.shade(rect(4, 13 + b, 21, 22), "bark")
    c.shade(ell(10, 13 + b, 6, 5), "copper")
    c.shade(rect(18, 15 + b, 26, 18 + b), "wood")
    c.shade(ell(27, 16 + b, 3, 4), "copper")
    c.fill(path([(26, 13 + b), (23, 11 + b), (22, 14 + b)], 1), "sand")
    c.put(28, 15 + b, "ink")
    c.dots("sand", (6, 20), (12, 20), (18, 20))
    for x in (8, 19):
        cog(c, x, 25, 4, f, "wood", "copper")
    finish(c)
    puff(c, 7, 1 + b, f)
    return c


def gear_010(f):  # Custode degli Ingranaggi: an old keeper with a great gear behind him
    c = new()
    cog(c, 10, 12, 8, f, "copper", "wood_dark", 10)
    a = human(c, f, cx=15, L=6, T=10, body="bark", legs="wood")
    b = a["b"]
    c.shade(poly([(10, a["ty"] + 2), (20, a["ty"] + 2), (22, 29), (8, 29)]), "bark")
    c.fill(rect(15, a["ty"] + 3, 15, 28), "copper")
    c.shade(rect(11, a["hy"] - 5, 19, a["hy"] - 3), "wood")
    c.fill(rect(15, a["hy"] + 2, 18, a["hy"] + 4), "ash")
    c.fill(rect(26, 8 + b, 26, 29), "wood")
    arm(c, (19, a["ty"] + 4), (25, a["ty"] + 6), "bark")
    cog(c, 26, 6 + b, 3, f)
    return finish(c)


def gear_011(f):  # Gigante di Rame: a copper giant with a furnace in the chest
    c = new()
    b = BOB[f]
    c.shade(rect(8, 23, 12, 29), "rust")
    c.shade(rect(18, 23, 22, 29), "rust")
    c.shade(ell(15, 15 + b, 9, 8), "copper")
    c.shade(ell(5, 19 + b, 4, 6), "copper")
    c.shade(ell(26, 19 + b, 4, 6), "copper")
    c.shade(rect(12, 3 + b, 18, 8 + b), "copper")
    c.fill(rect(13, 5 + b, 18, 6 + b), "ink")
    c.dots("glow", (15, 5 + b), (17, 5 + b))
    c.fill(rect(10, 12 + b, 20, 12 + b), "rust")
    c.fill(ell(15, 17 + b, 2, 2), "flame")
    c.put(15, 17 + b, "glow" if f % 2 else "white")
    c.dots("verd", (8, 13 + b), (21, 19 + b), (4, 21 + b), (26, 16 + b), (12, 21 + b))
    c.dots("sand", (9, 16 + b), (21, 14 + b), (5, 17 + b), (27, 21 + b))
    return finish(c)


def gear_012(f):  # Colosso Armato: a war machine with a cannon arm
    c = new()
    b = BOB[f]
    c.shade(rect(8, 22, 12, 29), "steel")
    c.shade(rect(17, 22, 21, 29), "steel")
    c.shade(rect(3, 13 + b, 6, 22 + b), "copper")
    c.fill(poly([(2, 23 + b), (4, 29), (6, 23 + b)]), "ash")
    c.shade(rect(6, 9 + b, 22, 22), "copper")
    c.shade(rect(3, 7 + b, 9, 12 + b), "steel")
    c.shade(rect(19, 7 + b, 25, 12 + b), "steel")
    c.shade(rect(11, 3 + b, 17, 8 + b), "steel")
    c.fill(rect(12, 5 + b, 17, 5 + b), "ink")
    c.put(16, 5 + b, "flame")
    c.shade(rect(22, 13 + b, 29, 17 + b), "iron")
    c.fill(rect(29, 12 + b, 30, 18 + b), "copper")
    cog(c, 14, 15 + b, 3, f, "bark", "sand")
    c.dots("sand", (7, 20), (21, 20), (7, 11 + b))
    finish(c)
    if f == 1:
        c.dots("flame", (31, 15 + b), (31, 14 + b))
    return c


def gear_013(f):  # Grande Orologio del Faro: the lighthouse clock walks
    c = new()
    s = SWAY[f]
    c.fill(rect(9, 27, 12, 29) | rect(18, 27, 21, 29), "wood_dark")
    c.shade(rect(8, 8, 22, 27), "bark")
    c.shade(poly([(6, 8), (15, 1), (24, 8)]), "copper")
    c.fill(ell(15, 13, 5, 5), "copper")
    c.fill(ell(15, 13, 4, 4), "sand")
    ang = math.radians(f * 90 - 60)
    c.fill(line(15, 13, 15 + round(3 * math.cos(ang)), 13 + round(3 * math.sin(ang))), "ink")
    c.fill(line(15, 13, 15, 10), "wood_dark")
    c.fill(rect(12, 20, 18, 26), "wood_dark")
    px = 15 + s * 2
    c.fill(line(15, 20, px, 24), "copper")
    c.fill(ell(px, 25, 1, 1), "glow")
    c.dots("sand", (9, 10), (21, 10), (9, 25), (21, 25))
    finish(c)
    if f == 0:
        c.dots("glow", (27, 5), (3, 6), (28, 9))
    return c


def gear_014(f):  # Lucidatore di Lenti: he polishes a large lens
    c = new()
    a = human(c, f, cx=10, L=4, T=7, body="bark", legs="wood")
    c.shade(ell(10, a["hy"] - 3, 4, 2), "tan")
    c.fill(rect(21, 24, 23, 28), "wood_dark")
    c.fill(rect(18, 28, 26, 29), "wood_dark")
    c.fill(ell(22, 16, 6, 7), "copper")
    c.fill(ell(22, 16, 5, 6), "mist")
    c.fill(ell(23, 17, 3, 4), "foam")
    c.dots("white", (20 + f, 12), (19 + f, 13), (19 + f, 14))
    arm(c, a["sh_f"], (16, a["ty"] + 2 + f % 2), "bark")
    c.fill(rect(17, a["ty"] + 1 + f % 2, 18, a["ty"] + 3 + f % 2), "white")
    return finish(c)


def gear_026(f):  # Costruttrice di Automi: a builder with her small automaton
    c = new()
    a = human(c, f, cx=10, body="tan", legs="wood")
    c.shade(ell(10, a["hy"] - 2, 4, 3), "rust")
    c.shade(ell(6, a["hy"] - 4, 2, 2), "rust")
    c.fill(rect(7, a["ty"] + 4, 13, a["waist"]), "wood")
    arm(c, a["sh_f"], (17, a["ty"] + 6), "tan")
    c.fill(line(18, a["ty"] + 6, 21, a["ty"] + 9), "stone")
    c.fill(rect(23, 14, 23, 16), "wood_dark")
    c.shade(rect(20, 22, 26, 27), "copper")
    c.shade(rect(21, 17, 25, 21), "copper")
    c.dots("glow" if f % 2 == 0 else "flame", (23, 19), (25, 19))
    c.fill(rect(20, 28, 22, 29) | rect(24, 28, 26, 29), "rust")
    finish(c)
    c.put(23, 13, "flame" if f % 2 else "glow")
    return c


def gear_t01(f):  # Automa: a small wind-up automaton
    c = new()
    b = BOB[f]
    c.fill(rect(11, 27, 13, 29) | rect(17, 27, 19, 29), "rust")
    c.fill(rect(7, 21 + b, 9, 21 + b), "stone")  # key
    c.fill(rect(4, 19 + b, 5, 23 + b) if f % 2 else rect(3, 20 + b, 6, 22 + b), "stone")
    limb(c, [(20, 20 + b), (23, 23 + b)], "copper")
    limb(c, [(10, 20 + b), (8, 24 + b)], "copper")
    c.shade(rect(10, 18 + b, 20, 26), "copper")
    c.shade(rect(11, 10 + b, 19, 17 + b), "copper")
    c.fill(rect(13, 12 + b, 19, 14 + b), "ink")
    c.dots("glow", (15, 13 + b), (18, 13 + b))
    c.fill(rect(15, 7 + b, 15, 9 + b), "wood_dark")
    c.dots("verd", (12, 24), (18, 20 + b))
    c.dots("sand", (11, 19 + b), (19, 25))
    finish(c)
    c.put(15, 6 + b, "flame" if f % 2 else "glow")
    return c


KEEPERS = {f"gear-{i:03d}": fn for i, fn in (
    (1, gear_001), (2, gear_002), (3, gear_003), (4, gear_004), (5, gear_005), (6, gear_006), (7, gear_007),
    (8, gear_008), (9, gear_009), (10, gear_010), (11, gear_011), (12, gear_012), (13, gear_013), (14, gear_014),
    (26, gear_026),
)}
KEEPERS["gear-t01"] = gear_t01
