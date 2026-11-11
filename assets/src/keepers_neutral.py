"""Neutral Keepers (sailors of the port) and the last Forge Keeper."""
from parts import BOB, SWAY, arm, ell, finish, flame, human, limb, line, new, path, poly, rect, sparks


def neutral_001(f):  # Mozzo del Porto: a ship's boy with a mop
    c = new()
    a = human(c, f, cx=11, L=4, T=7, body="white", legs="slate")
    b = a["b"]
    for y in (a["ty"] + 1, a["ty"] + 3, a["ty"] + 5):
        c.fill(rect(7, y, 14, y), "deep")
    c.shade(ell(11, a["hy"] - 3, 4, 1), "white")
    c.put(11, a["hy"] - 5, "coral")
    c.fill(rect(19, 6 + b, 19, 26), "wood")
    c.shade(rect(17, 27, 21, 29), "white")
    arm(c, a["sh_f"], (18, a["ty"] + 3), "skin")
    c.shade(rect(2, 25, 6, 29), "steel")
    c.fill(rect(2, 25, 6, 25), "sea")
    return finish(c)


def neutral_002(f):  # Marinaio Robusto: a wide sailor with crossed arms
    c = new()
    a = human(c, f, cx=14, T=10, body="white", legs="slate", wide=2)
    for y in range(a["ty"] + 1, a["waist"], 2):
        c.fill(rect(8, y, 19, y), "deep")
    c.shade(rect(10, a["hy"] - 5, 18, a["hy"] - 4), "white")
    c.fill(rect(10, a["hy"] - 3, 18, a["hy"] - 3), "deep")
    c.fill(rect(13, a["hy"] + 2, 17, a["hy"] + 3), "wood")
    c.shade(ell(6, a["ty"] + 4, 2, 3), "skin")
    c.shade(ell(21, a["ty"] + 4, 2, 3), "skin")
    c.shade(rect(8, a["ty"] + 4, 20, a["ty"] + 6), "skin")
    c.put(21, a["ty"] + 4, "deep")
    return finish(c)


def neutral_003(f):  # Pirata di Scogliera: a pirate with a raised cutlass
    c = new()
    a = human(c, f, cx=12, body="coral_dark", legs="slate")
    c.fill(rect(8, a["hy"] - 4, 16, a["hy"] - 2), "coral")
    c.fill(path([(8, a["hy"] - 3), (5, a["hy"] - 2 + SWAY[f])], 1), "coral")
    c.fill(line(11, a["hy"] - 2, 14, a["hy"]), "ink")
    c.fill(rect(8, a["waist"] - 1, 15, a["waist"] - 1), "sand")
    arm(c, a["sh_f"], (20, a["ty"] - 2), "coral_dark")
    c.fill(path([(21, a["ty"] - 3), (25, a["ty"] - 8), (28, a["ty"] - 9)], 2), "ash")
    c.fill(rect(19, a["ty"] - 2, 22, a["ty"] - 1), "sand")
    arm(c, a["sh_b"], (7, a["ty"] + 7), "coral_dark")
    return finish(c)


def neutral_004(f):  # Guardiano del Fuoco: a keeper with a torch
    c = new()
    a = human(c, f, cx=12, body="slate", legs="iron")
    b = a["b"]
    c.shade(poly([(8, a["ty"] + 2), (16, a["ty"] + 2), (18, 28), (6, 28)]), "slate")
    c.dots("sand", (12, a["ty"] + 4), (12, a["ty"] + 7), (12, a["ty"] + 10))
    c.shade(rect(8, a["hy"] - 5, 16, a["hy"] - 3), "stone")
    c.fill(rect(7, a["hy"] - 3, 18, a["hy"] - 3), "slate")
    c.fill(rect(22, 11 + b, 23, 25 + b), "wood")
    arm(c, a["sh_f"], (21, a["ty"] + 3), "slate")
    finish(c)
    flame(c, 23, 11 + b, 6, 9, f)
    sparks(c, [(27, 5), (20, 3)], f)
    return c


def neutral_005(f):  # Pilastro del Molo: a living pier post
    c = new()
    b = BOB[f]
    c.shade(ell(15, 28, 9, 2), "stone")
    c.shade(rect(10, 4, 20, 28), "bark")
    c.fill(ell(15, 4, 5, 1), "tan")
    for y in (9, 11, 13):
        c.fill(rect(9, y, 21, y), "sand")
        c.fill(rect(9, y + 1, 21, y + 1), "tan")
    c.fill(rect(12, 18 + b, 13, 19 + b) | rect(17, 18 + b, 18, 19 + b), "white")
    c.dots("ink", (13, 19 + b), (18, 19 + b))
    c.fill(rect(14, 22 + b, 17, 22 + b), "wood_dark")
    c.dots("ash", (11, 26), (13, 27), (18, 25), (19, 27), (12, 24))
    c.dots("kelp", (10, 27), (20, 26))
    c.fill(path([(21, 10), (24, 14), (24 + SWAY[f] % 2, 19)], 1), "sand")
    finish(c)
    c.dots("foam", (4, 28 + f % 2), (26, 29 - f % 2), (7, 29))
    return c


def neutral_006(f):  # Capitano Veterano: an old captain with a saber
    c = new()
    a = human(c, f, cx=13, L=6, T=10, body="sea", legs="slate", wide=1)
    t = a["ty"]
    c.shade(poly([(8, t + 2), (18, t + 2), (19, 27), (7, 27)]), "sea")
    c.fill(rect(13, t + 2, 13, 26), "sand")
    c.dots("glow", (15, t + 4), (15, t + 7), (15, t + 10), (8, t + 1), (18, t + 1))
    c.shade(poly([(6, a["hy"] - 2), (13, a["hy"] - 7), (20, a["hy"] - 2)]), "slate")
    c.fill(rect(7, a["hy"] - 2, 19, a["hy"] - 2), "sand")
    c.fill(rect(12, a["hy"] + 2, 17, a["hy"] + 4), "white")
    arm(c, a["sh_f"], (22, t + 7), "sea")
    c.fill(line(23, t + 8, 27, 28), "ash")
    c.fill(rect(21, t + 8, 24, t + 8), "glow")
    return finish(c)


def neutral_007(f):  # Cartografa Errante: a mapmaker with an open map
    c = new()
    a = human(c, f, cx=11, body="tan", legs="wood")
    t = a["ty"]
    c.fill(line(4, t - 2, 8, t + 8, 2), "wood")
    c.shade(ell(10, a["hy"] - 2, 5, 3), "rust")
    c.fill(rect(6, a["hy"], 7, t + 4), "rust")
    c.fill(rect(8, t + 1, 14, t + 1), "verd")
    c.shade(rect(17, t + 1, 26, t + 8), "sand")
    c.fill(rect(17, t + 1, 17, t + 8) | rect(26, t + 1, 26, t + 8), "tan")
    c.fill(path([(19, t + 6), (21, t + 3), (24, t + 5)], 1), "coral")
    c.put(24, t + 3, "deep")
    arm(c, a["sh_f"], (17, t + 5), "tan")
    return finish(c)


def neutral_008(f):  # Arpioniere: a harpooner ready to throw
    c = new()
    a = human(c, f, cx=12, L=6, T=10, body="stone", legs="slate", wide=1)
    y = a["ty"] + 1
    c.shade(ell(12, a["hy"] - 3, 4, 2), "sea")
    c.fill(rect(12, a["hy"] + 2, 16, a["hy"] + 4), "wood")
    c.shade(ell(6, a["waist"], 2, 3), "tan")
    c.put(6, a["waist"], "wood")
    c.fill(rect(4, y, 27, y), "wood")
    c.fill(poly([(26, y - 2), (30, y), (26, y + 2)]), "ash")
    arm(c, a["sh_f"], (19, y + 1), "stone")
    arm(c, a["sh_b"], (6, y + 1), "stone")
    return finish(c)


def neutral_009(f):  # Ammiraglio Corsaro: a corsair admiral with a great hat
    c = new()
    a = human(c, f, cx=13, L=6, T=11, body="coral_dark", legs="slate", wide=2)
    t = a["ty"]
    c.shade(poly([(6, t + 2), (20, t + 2), (22, 27), (5, 27)]), "coral_dark")
    c.fill(rect(13, t + 2, 14, 26), "glow")
    c.shade(rect(9, a["hy"] - 8, 17, a["hy"] - 5), "slate")
    c.shade(ell(13, a["hy"] - 4, 8, 1), "slate")
    c.fill(path([(17, a["hy"] - 7), (22, a["hy"] - 9), (25, a["hy"] - 7 + SWAY[f])], 2), "white")
    c.fill(rect(12, a["hy"] + 2, 17, a["hy"] + 5), "ink")
    arm(c, a["sh_f"], (24, t + 3), "coral_dark")
    c.fill(line(25, t + 2, 28, t - 7, 2), "ash")
    c.fill(rect(23, t + 3, 27, t + 3), "glow")
    arm(c, a["sh_b"], (3, t + 6), "coral_dark")
    c.fill(rect(1, t + 5, 3, t + 6), "wood_dark")
    return finish(c)


def neutral_010(f):  # Kraken Antico: the ancient kraken fills the whole sprite
    c = new()
    b = BOB[f]
    s = SWAY[f]
    for i, (x0, x1) in enumerate(((11, 7), (14, 13), (17, 19), (20, 25))):
        limb(c, [(x0, 18 + b), (x1, 24), (x1 + (s if i % 2 else -s), 29)], "coral_dark", 3)
    limb(c, [(8, 14 + b), (3, 11 + b), (2, 5 + b + s)], "coral_dark", 3)
    limb(c, [(23, 14 + b), (28, 11 + b), (29, 5 + b - s)], "coral_dark", 3)
    c.shade(ell(15, 11 + b, 9, 9), "coral_dark")
    c.dither(ell(12, 5 + b, 5, 3), "coral", 6)
    c.fill(rect(10, 13 + b, 12, 15 + b) | rect(18, 13 + b, 20, 15 + b), "glow")
    c.fill(rect(11, 13 + b, 11, 15 + b) | rect(19, 13 + b, 19, 15 + b), "ink")
    c.dots("sand", (3, 9 + b), (28, 9 + b), (7, 26), (25, 26), (13, 25), (19, 25))
    return finish(c)


def neutral_019(f):  # Nuotatrice delle Correnti: a swimmer in the current
    c = new()
    a = human(c, f, cx=13, body="sea", legs="slate")
    c.shade(ell(13, a["hy"] - 2, 4, 3), "coral")
    c.fill(rect(13, a["hy"] - 1, 17, a["hy"] - 1), "ink")
    c.put(16, a["hy"] - 1, "mist")
    arm(c, a["sh_f"], (20, a["ty"] - 3), "skin")
    arm(c, a["sh_b"], (7, a["ty"] + 6), "skin")
    finish(c)
    c.fill(path([(4, 27), (8, 25 + f % 2), (14, 27), (20, 25 + (f + 1) % 2), (26, 27)], 1), "sea")
    c.fill(path([(6, 29), (12, 28), (22, 29)], 1), "mist")
    c.dots("foam", (8, 24 + f % 2), (20, 24 + (f + 1) % 2), (27, 25))
    return c


def neutral_020(f):  # Mercante di Carbone: a coal merchant with a sack
    c = new()
    a = human(c, f, cx=15, body="stone", legs="slate")
    t = a["ty"]
    c.shade(ell(8, t + 2, 4, 6), "tan")
    c.fill(rect(6, t - 4, 10, t - 3), "ink")
    c.dots("slate", (7, t - 4), (9, t - 3))
    c.shade(rect(11, a["hy"] - 5, 19, a["hy"] - 4), "slate")
    c.put(16, a["hy"] + 2, "slate")
    arm(c, a["sh_f"], (23, t + 4), "stone")
    c.fill(rect(23, t + 2, 25, t + 3), "ink")
    c.shade(rect(22, 24, 28, 29), "bark")
    c.fill(rect(22, 23, 28, 23), "ink")
    finish(c)
    if f % 2:
        c.dots("ember", (24, 23), (27, 23), (24, t + 2))
    return c


def forge_026(f):  # Cavaliere della Vampa: a knight with a plume of fire
    c = new()
    a = human(c, f, cx=12, L=6, T=10, body="rust", legs="soot", wide=1, eye=False)
    b = a["b"]
    c.shade(poly([(7, a["ty"] + 1), (3, a["waist"] + 3 + SWAY[f]), (7, a["waist"] + 2)]), "ember")
    c.shade(ell(12, a["hy"] - 1, 5, 5), "ember")
    c.fill(rect(11, a["hy"], 16, a["hy"]), "ink")
    c.put(14, a["hy"], "glow")
    c.fill(rect(10, a["ty"] + 4, 14, a["ty"] + 7), "flame")
    c.put(12, a["ty"] + 5, "glow")
    c.fill(line(18, a["ty"] + 9, 27, 8 + b, 2), "soot")
    arm(c, a["sh_f"], (20, a["ty"] + 6), "rust")
    finish(c)
    flame(c, 12, a["hy"] - 5, 5, 7, f)
    flame(c, 28, 9 + b, 5, 7, f)
    sparks(c, [(24, 3), (30, 12)], f)
    return c


KEEPERS = {f"neutral-{i:03d}": fn for i, fn in (
    (1, neutral_001), (2, neutral_002), (3, neutral_003), (4, neutral_004), (5, neutral_005), (6, neutral_006),
    (7, neutral_007), (8, neutral_008), (9, neutral_009), (10, neutral_010), (19, neutral_019), (20, neutral_020),
)}
KEEPERS["forge-026"] = forge_026
