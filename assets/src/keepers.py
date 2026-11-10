"""Keeper sprites: 32x32 pixels, 4 idle frames, facing right.

Each function draws one frame `f` (0..3). The feet stand on y = 29.
The card illustrations reuse frame 0 of these sprites.
"""
from px import Canvas, ell, line, move, path, poly, rect

BOB = [0, 0, 1, 1]  # breathing: the upper body moves down by 1 pixel
SWAY = [0, 1, 0, -1]  # secondary motion: flames, kelp, cloth


# ---------------------------------------------------------------- helpers
def flame(c, cx, by, w, h, f, cols=("ember", "flame", "glow")):
    sw, hh = SWAY[f], h + SWAY[(f + 1) % 4]
    for i, col in enumerate(cols):
        k = 1 - i * 0.33
        ww, hk = max(w * k, 1), max(hh * k, 1)
        r = ww / 2
        m = ell(cx, by - r, r, r) | poly(
            [(round(cx - r), round(by - r)), (round(cx + sw * k), round(by - hk)), (round(cx + r), round(by - r))]
        )
        c.fill(m, col)


def sparks(c, pts, f, col="glow"):
    for i, (x, y) in enumerate(pts):
        if (i + f) % 2 == 0:
            c.put(x, y - (f + i) % 3, col)


def human(c, f, cx=14, L=5, T=9, R=4, skin="skin", body="rust", legs="soot", boots="ink", wide=0, eye=True):
    """Draws legs, torso and head. Returns the anchor points for arms and props."""
    b = BOB[f]
    top_leg = 30 - L
    for lx in (cx - 3 - wide, cx + 1 + wide):
        c.shade(rect(lx, top_leg, lx + 1, 28), legs if isinstance(legs, str) and legs in ("soot", "wood", "kelp", "iron", "slate", "dusk", "leaf", "bark", "verd_dark") else "soot")
        c.fill(rect(lx, 28, lx + 2, 29), boots)
    ty = top_leg - T + 1 + b
    c.shade(rect(cx - 4 - wide, ty, cx + 3 + wide, top_leg), body)
    hy = ty - R + 1
    c.shade(ell(cx, hy, R, R), skin)
    if eye:
        c.put(cx + 2, hy, "ink")
    return {"b": b, "ty": ty, "hy": hy, "sh_f": (cx + 3 + wide, ty + 2), "sh_b": (cx - 4 - wide, ty + 2), "waist": top_leg}


def arm(c, a, b, ramp="skin", hand="sand", t=2):
    c.shade(line(a[0], a[1], b[0], b[1], t), ramp, rim=False)
    c.fill(rect(b[0], b[1], b[0] + 1, b[1] + 1), hand)


def finish(c):
    c.outline("ink")
    return c


# ---------------------------------------------------------------- forge
def forge_001(f):  # Apprendista del Mantice: a small apprentice with bellows
    c = Canvas(32, 32)
    a = human(c, f, cx=11, L=4, T=7, R=4, body="tan", legs="soot")
    b = a["b"]
    c.fill(rect(7, a["ty"] + 3, 14, a["waist"]), "wood")  # apron
    c.shade(ell(11, a["hy"] - 2, 4, 2), "rust")  # cap
    c.fill(rect(7, a["hy"] - 1, 15, a["hy"] - 1), "soot")
    # bellows: the two boards close on frames 2 and 3
    sq = b
    by = a["ty"] + 4
    c.shade(poly([(15, by - 3 + sq), (23, by), (15, by + 1)]), "bark")
    c.shade(poly([(15, by + 2), (23, by + 1), (15, by + 6 - sq)]), "bark")
    c.fill(rect(16, by + 1, 21, by + 2 - 0), "soot")
    c.fill(rect(23, by, 27, by + 1), "copper")
    arm(c, a["sh_f"], (15, by - 3 + sq), "tan")
    finish(c)
    if f >= 2:
        c.dots("flame", (29, by), (30, by - 1))
        c.dots("glow", (29 + f - 2, by + 1))
    return c


def forge_002(f):  # Scintilla Errante: a living spark
    c = Canvas(32, 32)
    hop = [0, -1, -2, -1][f]
    c.dither(ell(15, 29, 5 - abs(hop), 1), "soot", 8)
    flame(c, 15, 27 + hop, 13, 19, f)
    y = 20 + hop
    c.dots("ink", (13, y), (17, y), (13, y + 1), (17, y + 1))
    c.dots("white", (14, y + 4), (15, y + 4), (16, y + 4))
    c.fill(line(8, y + 3, 5, y + 1 + SWAY[f]), "flame")
    c.fill(line(22, y + 3, 25, y + 1 - SWAY[f]), "flame")
    sparks(c, [(7, 12), (24, 9), (20, 5), (10, 6)], f)
    return c


def forge_003(f):  # Segugio di Rame: a copper hound
    c = Canvas(32, 32)
    b = BOB[f]
    for lx in (7, 10, 18, 21):
        c.shade(rect(lx, 23, lx + 1, 29), "rust" if lx in (7, 18) else "copper")
    c.shade(ell(14, 19 + b, 8, 4), "copper")  # body
    c.shade(rect(7, 16 + b, 20, 18 + b), "copper")
    c.shade(ell(23, 13 + b, 4, 4), "copper")  # head
    c.shade(rect(25, 14 + b, 29, 16 + b), "copper")  # muzzle
    c.fill(rect(29, 14 + b, 30, 14 + b), "ink")
    c.shade(poly([(20, 10 + b), (21, 5 + b), (23, 9 + b)]), "rust")  # ear
    c.put(25, 12 + b, "glow")
    c.fill(rect(26, 17 + b, 28, 17 + b), "soot")
    c.fill(path([(6, 17 + b), (3, 14 + b), (3, 11 + b + SWAY[f])], 2), "rust")  # tail
    c.dots("verd", (10, 17 + b), (11, 18 + b), (16, 21 + b), (15, 16 + b))  # verdigris stains
    c.dots("soot", (13, 20 + b), (18, 18 + b))  # rivets
    finish(c)
    c.put(4, 10 + b + SWAY[f], "flame")
    return c


def forge_004(f):  # Guardia dell'Incudine: a guard with a tower shield
    c = Canvas(32, 32)
    a = human(c, f, cx=12, body="iron", legs="soot", wide=1)
    b = a["b"]
    c.shade(ell(12, a["hy"] - 1, 5, 4), "steel")  # helmet
    c.fill(rect(9, a["hy"] + 1, 16, a["hy"] + 1), "ink")
    c.put(14, a["hy"] + 1, "flame")
    c.shade(rect(11, a["hy"] - 7, 12, a["hy"] - 5), "ember")  # crest
    sh = poly([(17, 11 + b), (26, 11 + b), (26, 24 + b), (21, 28 + b), (17, 24 + b)])
    c.shade(sh, "rust")
    c.shade(poly([(19, 13 + b), (24, 13 + b), (24, 23 + b), (21, 26 + b), (19, 23 + b)]), "ember")
    c.fill(rect(20, 16 + b, 23, 17 + b), "glow")  # anvil mark
    c.fill(rect(21, 18 + b, 22, 20 + b), "glow")
    c.fill(rect(20, 21 + b, 23, 21 + b), "glow")
    return finish(c)


def forge_005(f):  # Lanciabraci: throws a burning coal
    c = Canvas(32, 32)
    a = human(c, f, cx=13, body="rust", legs="soot")
    b = a["b"]
    c.fill(rect(9, a["hy"] - 4, 17, a["hy"] - 2), "soot")  # bandana
    c.fill(path([(9, a["hy"] - 3), (6, a["hy"] - 2 + SWAY[f])], 1), "soot")
    c.fill(rect(9, a["waist"] - 2, 16, a["waist"] - 1), "wood_dark")  # belt
    hand = (22, 6 + b + SWAY[f])
    arm(c, a["sh_f"], (21, hand[1] + 3), "rust")
    arm(c, a["sh_b"], (7, a["ty"] + 7), "rust")
    c.shade(rect(5, a["ty"] + 8, 9, a["ty"] + 11), "bark")  # pouch
    finish(c)
    flame(c, hand[0] + 1, hand[1] + 2, 6, 8, f)
    sparks(c, [(27, 8), (25, 3)], f)
    return c


def forge_006(f):  # Predone della Fornace: a hooded raider with a hot blade
    c = Canvas(32, 32)
    a = human(c, f, cx=13, body="soot", legs="soot", skin="tan")
    b = a["b"]
    c.shade(ell(12, a["hy"] - 1, 5, 5), "soot")  # hood
    c.fill(rect(13, a["hy"] - 1, 16, a["hy"] + 2), "tan")
    c.put(15, a["hy"], "glow")
    c.fill(rect(13, a["hy"] + 2, 16, a["hy"] + 3), "rust")  # scarf
    c.shade(poly([(9, a["ty"]), (5, a["waist"] + 2 + SWAY[f]), (9, a["waist"])]), "rust")  # cape
    arm(c, a["sh_f"], (21, a["ty"] + 5), "soot")
    blade = path([(22, a["ty"] + 4), (29, a["ty"] - 4)], 2)
    c.fill(blade, "flame")
    c.fill(move(path([(24, a["ty"] + 2), (29, a["ty"] - 4)], 1), 1, 0), "glow")
    c.fill(rect(20, a["ty"] + 4, 23, a["ty"] + 5), "wood_dark")
    finish(c)
    sparks(c, [(30, a["ty"] - 6), (27, a["ty"] - 7)], f)
    return c


def forge_007(f):  # Bruto di Scoria: a brute made of slag
    c = Canvas(32, 32)
    b = BOB[f]
    c.shade(rect(8, 23, 12, 29), "slate")
    c.shade(rect(18, 23, 22, 29), "slate")
    c.shade(ell(15, 16 + b, 9, 8), "slate")  # body
    c.shade(ell(6, 18 + b, 4, 6), "stone")  # arms
    c.shade(ell(25, 18 + b, 4, 6), "stone")
    c.shade(rect(4, 22 + b, 9, 26 + b), "slate")
    c.shade(rect(22, 22 + b, 27, 26 + b), "slate")
    c.shade(ell(16, 8 + b, 4, 3), "stone")  # head
    c.fill(rect(15, 8 + b, 19, 8 + b), "ink")
    c.dots("ember", (16, 8 + b), (18, 8 + b))
    crack = path([(11, 13 + b), (14, 16 + b), (13, 19 + b), (17, 21 + b), (19, 18 + b)], 1)
    c.fill(crack, "ember")
    c.dots("flame" if f % 2 else "glow", (14, 16 + b), (17, 21 + b))
    c.dots("ember", (6, 17 + b), (25, 16 + b), (24, 20 + b))
    finish(c)
    return c


def forge_008(f):  # Segnalatore di Razzi: holds a signal rocket
    c = Canvas(32, 32)
    a = human(c, f, cx=13, body="copper", legs="soot")
    b = a["b"]
    c.shade(rect(8, a["hy"] - 5, 18, a["hy"] - 3), "bark")  # hat
    c.shade(rect(10, a["hy"] - 8, 16, a["hy"] - 5), "bark")
    c.fill(rect(10, a["hy"] - 5, 16, a["hy"] - 5), "ember")
    c.fill(rect(9, a["ty"] + 1, 10, a["waist"]), "soot")  # strap
    top = 4 + b
    arm(c, a["sh_f"], (20, top + 12), "copper")
    c.shade(rect(20, top + 3, 22, top + 12), "stone")  # rocket tube
    c.shade(poly([(19, top + 3), (21, top - 1), (23, top + 3)]), "ember")
    c.fill(rect(20, top + 8, 22, top + 8), "ember")
    arm(c, a["sh_b"], (8, a["ty"] + 7), "copper")
    finish(c)
    flame(c, 21, top + 17, 3, 4 + (f % 2), f, cols=("flame", "glow"))
    sparks(c, [(24, top + 16), (18, top + 18), (25, top + 1)], f)
    return c


def forge_009(f):  # Fabbro Rompimarea: a big smith with a long hammer
    c = Canvas(32, 32)
    a = human(c, f, cx=13, L=5, T=10, R=4, body="tan", legs="soot", wide=1)
    b = a["b"]
    c.fill(rect(9, a["ty"] + 3, 17, a["waist"]), "wood")  # leather apron
    c.fill(rect(9, a["ty"], 10, a["ty"] + 3), "wood")
    c.fill(rect(16, a["ty"], 17, a["ty"] + 3), "wood")
    c.shade(ell(13, a["hy"] + 3, 4, 3), "rust")  # beard
    c.fill(rect(9, a["hy"] - 4, 17, a["hy"] - 3), "soot")  # headband
    c.put(15, a["hy"], "ink")
    hx = 23
    c.shade(rect(hx, 6 + b, hx + 1, 29), "bark")  # handle
    c.shade(rect(hx - 4, 3 + b, hx + 5, 9 + b), "steel")  # head
    c.fill(rect(hx - 4, 5 + b, hx - 3, 7 + b), "verd")
    c.fill(rect(hx + 4, 4 + b, hx + 5, 8 + b), "mist")
    arm(c, a["sh_f"], (hx - 1, a["ty"] + 6), "skin")
    arm(c, a["sh_b"], (7, a["ty"] + 8), "skin")
    finish(c)
    c.dots("foam", (hx + 7, 10 + b - SWAY[f]), (hx - 6, 11 + b + SWAY[f]))
    return c


def forge_010(f):  # Arciere dei Rivetti: a crossbow that fires rivets
    c = Canvas(32, 32)
    a = human(c, f, cx=11, body="rust", legs="soot")
    b = a["b"]
    c.shade(ell(11, a["hy"] - 2, 4, 3), "copper")  # cap
    c.fill(rect(12, a["hy"] - 1, 16, a["hy"]), "verd_dark")  # goggles
    c.put(14, a["hy"], "glow")
    c.shade(rect(4, a["ty"] + 1, 7, a["ty"] + 8), "bark")  # quiver
    c.dots("ash", (4, a["ty"]), (6, a["ty"] - 1), (5, a["ty"] - 1))
    y = a["ty"] + 4
    c.shade(rect(15, y, 26, y + 1), "bark")  # stock
    c.fill(path([(24, y - 5), (26, y), (24, y + 6)], 2), "stone")  # bow
    c.fill(line(24, y - 5, 18, y), "ash")
    c.fill(line(24, y + 6, 18, y + 1), "ash")
    c.fill(rect(26, y, 29, y), "glow")
    arm(c, a["sh_f"], (17, y + 1), "rust")
    return finish(c)


def forge_011(f):  # Campione della Fonderia: heavy armour and a great sword
    c = Canvas(32, 32)
    a = human(c, f, cx=13, L=5, T=10, R=4, body="ember", legs="iron", wide=1, eye=False)
    b = a["b"]
    c.shade(ell(13, a["hy"], 4, 4), "steel")  # helmet
    c.fill(rect(13, a["hy"], 17, a["hy"]), "ink")
    c.put(15, a["hy"], "glow")
    c.shade(path([(12, a["hy"] - 4), (11, a["hy"] - 7), (8 + SWAY[f], a["hy"] - 8)], 2), "ember", rim=False)  # plume
    c.shade(ell(8, a["ty"] + 1, 3, 2), "steel")  # shoulders
    c.shade(ell(18, a["ty"] + 1, 3, 2), "steel")
    c.fill(rect(9, a["waist"] - 2, 17, a["waist"] - 1), "glow")
    c.fill(rect(12, a["ty"] + 3, 14, a["ty"] + 5), "glow")
    c.shade(poly([(8, a["ty"] + 2), (4, a["waist"] + 4 + SWAY[f]), (8, a["waist"] + 1)]), "rust")  # cape
    sx = 24
    c.shade(rect(sx, 2 + b, sx + 2, 22 + b), "steel")  # blade
    c.fill(rect(sx + 1, 3 + b, sx + 1, 21 + b), "white")
    c.fill(rect(sx - 2, 22 + b, sx + 4, 23 + b), "copper")
    c.fill(rect(sx, 24 + b, sx + 2, 27 + b), "wood_dark")
    c.fill(poly([(sx, 2 + b), (sx + 1, 0 + b), (sx + 2, 2 + b)]), "ash")
    arm(c, a["sh_f"], (sx - 1, 24 + b), "steel", hand="rust")
    finish(c)
    c.dots("glow", (sx + 1, 6 + b + f), (sx + 1, 7 + b + f))
    return c


def forge_012(f):  # Fabbro delle Scintille: strikes sparks from an anvil
    c = Canvas(32, 32)
    a = human(c, f, cx=10, body="tan", legs="soot")
    b = a["b"]
    c.fill(rect(6, a["ty"] + 3, 13, a["waist"]), "rust")  # apron
    c.fill(rect(6, a["hy"] - 4, 14, a["hy"] - 3), "ember")
    c.shade(rect(19, 22, 29, 24), "iron")  # anvil
    c.shade(rect(22, 24, 26, 27), "iron")
    c.shade(rect(20, 27, 28, 29), "iron")
    c.fill(rect(27, 21, 31, 22), "slate")
    up = f in (0, 3)
    hy = a["ty"] - 4 if up else a["ty"] + 5
    hx = 17 if up else 21
    arm(c, a["sh_f"], (hx - 1, hy + 3), "skin")
    c.shade(rect(hx, hy, hx + 1, hy + 5), "bark")
    c.shade(rect(hx - 2, hy - 2, hx + 4, hy + 1), "steel")
    c.fill(rect(22, 21, 26, 21), "flame")  # hot metal
    finish(c)
    if not up:
        c.dots("glow", (24, 19), (27, 17 - f), (21, 16 - f), (29, 19), (19, 18))
        c.dots("flame", (25, 15 - f), (30, 16), (18, 14))
    return c


def forge_013(f):  # Colosso Fuso: a giant of molten metal
    c = Canvas(32, 32)
    b = BOB[f]
    c.shade(rect(7, 22, 13, 29), "rust")
    c.shade(rect(18, 22, 24, 29), "rust")
    c.shade(ell(15, 14 + b, 10, 9), "rust")
    c.shade(ell(4, 15 + b, 4, 7), "soot")
    c.shade(ell(27, 15 + b, 4, 7), "soot")
    c.shade(rect(2, 20 + b, 7, 25 + b), "rust")
    c.shade(rect(25, 20 + b, 30, 25 + b), "rust")
    c.shade(ell(15, 5 + b, 5, 4), "soot")  # head
    c.fill(rect(13, 5 + b, 19, 6 + b), "glow")
    c.dots("ink", (15, 5 + b), (16, 5 + b))
    core = ell(15, 15 + b, 5, 5)
    c.fill(core, "ember")
    c.fill(ell(15, 15 + b, 3, 3), "flame")
    c.fill(ell(15, 15 + b, 1.5 + (f % 2) * 0.6, 1.5 + (f % 2) * 0.6), "glow")
    c.fill(path([(9, 9 + b), (11, 12 + b)], 1), "ember")
    c.fill(path([(21, 9 + b), (20, 12 + b)], 1), "ember")
    c.fill(path([(4, 12 + b), (5, 18 + b)], 1), "ember")
    c.fill(path([(27, 12 + b), (26, 18 + b)], 1), "ember")
    finish(c)
    drip = [0, 2, 4, 6][f]
    c.dots("flame", (3, 26 + b + drip // 2), (28, 25 + b + (drip + 2) % 5))
    c.dots("glow", (15, 0 + b - SWAY[f] % 2), (11, 1 + SWAY[f]))
    return c


def forge_014(f):  # Madre delle Fornaci: a robed matriarch with a crown of fire
    c = Canvas(32, 32)
    b = BOB[f]
    robe = poly([(11, 12 + b), (20, 12 + b), (25, 29), (6, 29)])
    c.shade(robe, "rust")
    c.shade(poly([(13, 14 + b), (18, 14 + b), (20, 29), (11, 29)]), "ember")
    c.fill(rect(6, 28, 25, 29), "soot")
    for x in (8, 12, 16, 20, 24):
        c.put(x, 28, "glow")
    c.shade(ell(15, 9 + b, 4, 4), "skin")
    c.fill(ell(13, 8 + b, 3, 4) - ell(16, 10 + b, 3, 3), "soot")  # hair
    c.dots("ink", (16, 9 + b), (18, 9 + b))
    c.fill(rect(11, 5 + b, 19, 5 + b), "glow")  # crown band
    c.shade(line(10, 14 + b, 5, 19 + b, 2), "rust")  # arms open
    c.shade(line(21, 14 + b, 26, 19 + b, 2), "rust")
    c.fill(rect(4, 19 + b, 5, 20 + b), "sand")
    c.fill(rect(26, 19 + b, 27, 20 + b), "sand")
    c.fill(rect(14, 16 + b, 16, 18 + b), "glow")
    c.put(15, 17 + b, "white")
    finish(c)
    for i, x in enumerate((11, 15, 19)):
        flame(c, x, 5 + b, 3, 4 + (i == 1) * 2, (f + i) % 4, cols=("flame", "glow"))
    flame(c, 4, 18 + b, 4, 5, (f + 1) % 4)
    flame(c, 27, 18 + b, 4, 5, (f + 3) % 4)
    return c


# ---------------------------------------------------------------- sprout
def kelp(c, x, y0, y1, f, ramp="leaf", ph=0, t=2):
    """A vertical kelp strand that sways."""
    pts = set()
    for y in range(y0, y1 + 1):
        k = (y1 - y) / max(y1 - y0, 1)
        dx = round(SWAY[(f + ph + (y // 3)) % 4] * k)
        pts |= {(x + dx + i, y) for i in range(t)}
    c.shade(pts, ramp, rim=False)
    return pts


def sprout_001(f):  # Germoglio di Corallo: a small coral creature
    c = Canvas(32, 32)
    b = BOB[f]
    c.shade(ell(15, 24 + b, 6, 5), "coral")
    c.fill(rect(11, 28, 13, 29), "coral_dark")
    c.fill(rect(17, 28, 19, 29), "coral_dark")
    s = SWAY[f]
    for pts in (
        [(12, 20 + b), (10, 15 + b), (8 + s, 11 + b)],
        [(10, 15 + b), (12 + s, 12 + b)],
        [(15, 19 + b), (15, 13 + b), (15 + s, 8 + b)],
        [(15, 13 + b), (18 + s, 10 + b)],
        [(18, 20 + b), (21, 15 + b), (23 + s, 12 + b)],
    ):
        c.shade(path(pts, 2), "coral", rim=False)
    c.dots("ink", (13, 24 + b), (17, 24 + b))
    c.dots("white", (13, 23 + b), (17, 23 + b))
    c.fill(rect(14, 26 + b, 16, 26 + b), "coral_dark")
    finish(c)
    c.dots("sprout", (8 + s, 10 + b), (15 + s, 7 + b), (23 + s, 11 + b), (18 + s, 9 + b), (12 + s, 11 + b))
    return c


def sprout_002(f):  # Tessitrice d'Alghe: weaves a kelp thread
    c = Canvas(32, 32)
    a = human(c, f, cx=12, body="verd", legs="verd_dark", skin="skin", boots="kelp_dark")
    b = a["b"]
    c.shade(poly([(8, a["waist"] - 2), (16, a["waist"] - 2), (18, 28), (6, 28)]), "verd")  # skirt
    kelp(c, 7, a["hy"] - 4, a["waist"] + 2, f, "leaf", 0, 3)  # long hair
    c.shade(ell(12, a["hy"] - 3, 4, 2), "leaf")
    c.put(10, a["hy"] - 4, "coral")
    arm(c, a["sh_f"], (19, a["ty"] + 2), "skin")
    arm(c, (a["sh_f"][0], a["ty"] + 4), (20, a["ty"] + 8), "skin")
    finish(c)
    th = path([(21, a["ty"] + 2), (25 + SWAY[f], a["ty"] + 5), (21, a["ty"] + 8)], 1)
    c.fill(th, "sprout")
    c.fill(path([(25 + SWAY[f], a["ty"] + 5), (27, a["ty"] + 12), (26 + SWAY[f], 27)], 1), "moss")
    return c


def sprout_003(f):  # Sentinella della Scogliera: a stone sentinel with a spear
    c = Canvas(32, 32)
    b = BOB[f]
    c.shade(rect(8, 24, 12, 29), "stone")
    c.shade(rect(16, 24, 20, 29), "stone")
    c.shade(poly([(7, 12 + b), (21, 12 + b), (22, 25), (6, 25)]), "stone")
    c.shade(ell(14, 9 + b, 5, 4), "stone")
    c.fill(rect(13, 9 + b, 18, 9 + b), "ink")
    c.dots("sprout", (15, 9 + b), (17, 9 + b))
    c.shade(ell(9, 6 + b, 4, 2), "moss")  # moss on the head
    c.shade(ell(8, 13 + b, 3, 2), "moss")
    c.dots("moss", (10, 18 + b), (11, 19 + b), (18, 22), (8, 27), (17, 27))
    c.dots("coral", (19, 15 + b), (12, 22))
    sx = 25
    c.shade(rect(sx, 5 + b, sx + 1, 29), "bark")
    c.shade(poly([(sx - 2, 6 + b), (sx, 0 + b), (sx + 1, 0 + b), (sx + 3, 6 + b)]), "verd")
    c.shade(rect(20, 15 + b, sx + 1, 18 + b), "stone")
    return finish(c)


def sprout_004(f):  # Custode delle Pozze: carries a jar of clear water
    c = Canvas(32, 32)
    a = human(c, f, cx=12, body="verd", legs="verd_dark", boots="kelp_dark")
    b = a["b"]
    c.shade(ell(12, a["hy"] - 3, 6, 2), "sand")  # wide hat
    c.shade(ell(12, a["hy"] - 5, 3, 2), "sand")
    c.fill(rect(8, a["waist"] - 2, 15, a["waist"] - 1), "sprout")
    jy = a["ty"] + 1
    c.shade(ell(22, jy + 6, 4, 5), "tan")  # jar
    c.shade(rect(20, jy, 24, jy + 1), "tan")
    c.fill(rect(20, jy + 4, 24, jy + 5), "verd_dark")
    arm(c, a["sh_f"], (18, jy + 6), "skin")
    finish(c)
    c.fill(rect(21, jy - 1, 23, jy - 1), "mist")
    c.dots("foam", (22, jy - 3 - f % 2), (20 + f, jy - 4), (24, jy - 2 - (f + 1) % 2))
    return c


def sprout_005(f):  # Arciere delle Spore: a mushroom archer
    c = Canvas(32, 32)
    a = human(c, f, cx=11, body="moss", legs="kelp", boots="kelp_dark")
    b = a["b"]
    cap = ell(11, a["hy"] - 3, 7, 4) - rect(0, a["hy"] - 1, 31, 31)
    c.shade(cap, "coral")
    c.dots("white", (8, a["hy"] - 5), (12, a["hy"] - 6), (15, a["hy"] - 4), (6, a["hy"] - 3))
    y = a["ty"] + 3
    bow = path([(20, y - 8), (24, y - 4), (25, y), (24, y + 4), (20, y + 8)], 1)
    c.fill(bow | move(bow, 1, 0), "wood")
    c.fill(line(20, y - 8, 20, y + 8), "foam")
    c.fill(rect(15, y, 27, y), "tan")
    c.fill(rect(27, y - 1, 28, y + 1), "sprout")
    arm(c, a["sh_f"], (19, y), "moss")
    c.shade(rect(4, a["ty"] + 1, 6, a["ty"] + 7), "bark")
    c.dots("sprout", (4, a["ty"]), (6, a["ty"] - 1))
    finish(c)
    c.dots("sprout", (30, y - 2 - f % 2), (29, y + 3 - (f + 1) % 2))
    return c


def sprout_006(f):  # Muro di Cirripedi: a wall of barnacles
    c = Canvas(32, 32)
    wall = poly([(5, 29), (6, 10), (11, 6), (20, 5), (25, 9), (27, 29)])
    c.shade(wall, "stone")
    spots = [(9, 13, 3), (16, 10, 3), (22, 15, 3), (11, 21, 4), (19, 22, 3), (24, 25, 2), (8, 27, 2), (15, 16, 2)]
    for i, (x, y, r) in enumerate(spots):
        c.shade(ell(x, y, r, r), "sand")
        open_ = (f + i) % 4 in (1, 2)
        c.fill(ell(x, y, r - 1.6, r - 1.6) if r > 2 else {(x, y)}, "ink" if not open_ else "verd_dark")
        if open_ and r > 2:
            c.put(x, y, "coral")
    c.dots("moss", (7, 18), (13, 26), (21, 28), (25, 20), (18, 7))
    c.dots("ink", (13, 13), (19, 13))  # two small eyes in the rock
    c.dots("sprout", (13, 12), (19, 12))
    finish(c)
    kelp(c, 4, 22, 29, f, "leaf", 1, 1)
    kelp(c, 28, 20, 29, f, "leaf", 2, 1)
    return c


def sprout_007(f):  # Custode dei Semi: sows glowing seeds
    c = Canvas(32, 32)
    a = human(c, f, cx=12, body="leaf", legs="bark", boots="wood_dark")
    b = a["b"]
    c.shade(ell(12, a["hy"] - 2, 5, 3), "bark")  # hood
    c.fill(rect(8, a["hy"] + 2, 9, a["hy"] + 5), "wood")
    c.shade(ell(7, a["ty"] + 8, 3, 4), "tan")  # seed bag
    c.fill(line(8, a["ty"] + 1, 14, a["ty"] + 6), "wood_dark")
    hand = (21, a["ty"] + 3 - SWAY[f] % 2)
    arm(c, a["sh_f"], hand, "leaf")
    finish(c)
    c.put(13, a["hy"] - 6, "sprout")
    c.put(12, a["hy"] - 7, "sprout")
    for i, (x, y) in enumerate([(24, 14), (26, 18), (23, 22), (27, 25)]):
        c.put(x, y + (f + i) % 4, "sprout" if i % 2 else "glow")
    c.fill(path([(22, 29), (22, 27), (23 + SWAY[f] // 1, 26)], 1), "moss")
    c.fill(path([(27, 29), (27, 28)], 1), "moss")
    return c


def sprout_008(f):  # Tartaruga Muschiata: an old turtle with moss on the shell
    c = Canvas(32, 32)
    b = BOB[f]
    for lx in (7, 20):
        c.shade(rect(lx, 24, lx + 3, 29), "moss")
    shell = ell(14, 19 + b, 10, 7) - rect(0, 24 + b, 31, 31)
    c.shade(shell, "bark")
    c.fill(rect(4, 23 + b, 24, 24 + b), "tan")
    c.fill(path([(9, 14 + b), (10, 22 + b)], 1), "wood_dark")
    c.fill(path([(14, 12 + b), (14, 22 + b)], 1), "wood_dark")
    c.fill(path([(19, 14 + b), (18, 22 + b)], 1), "wood_dark")
    c.shade(ell(10, 13 + b, 5, 2), "moss")
    c.dots("sprout", (8, 12 + b), (12, 12 + b))
    hx = 26 + (0 if f < 2 else 1)
    c.shade(ell(hx, 19 + b, 3, 3), "moss")
    c.shade(rect(22, 20 + b, hx, 22 + b), "moss")
    c.put(hx + 1, 18 + b, "ink")
    c.fill(rect(hx, 21 + b, hx + 2, 21 + b), "kelp")
    finish(c)
    c.fill(path([(15, 11 + b), (15, 8 + b), (16 + SWAY[f], 6 + b)], 1), "moss")
    c.put(17 + SWAY[f], 5 + b, "coral")
    return c


def sprout_009(f):  # Danzatrice d'Anemoni: a dancer with an anemone skirt
    c = Canvas(32, 32)
    s = SWAY[f]
    a = human(c, f, cx=14, T=7, L=6, body="coral", legs="coral_dark", boots="coral_dark")
    b = a["b"]
    for i, x in enumerate(range(7, 23, 3)):
        end = (x + (x - 14) // 3 + s * (1 if i % 2 else -1), a["waist"] + 5)
        c.shade(path([(min(max(x, 10), 18), a["waist"] - 1), end], 2), "coral", rim=False)
        c.put(end[0], end[1] + 1, "sand")
    c.shade(ell(14, a["hy"] - 3, 4, 2), "coral_dark")  # hair bun
    c.shade(ell(11, a["hy"] - 5, 2, 2), "coral_dark")
    arm(c, a["sh_f"], (23, a["ty"] - 3 + s), "skin")
    arm(c, a["sh_b"], (5, a["ty"] + 5 - s), "skin")
    finish(c)
    c.dots("sprout", (25, a["ty"] - 5 + s), (3, a["ty"] + 7 - s))
    c.dots("foam", (26 - f, 20 + f), (4 + f, 14 - f))
    return c


def sprout_010(f):  # Anziano delle Radici: an old tree being
    c = Canvas(32, 32)
    b = BOB[f]
    c.shade(poly([(10, 12 + b), (20, 12 + b), (22, 29), (8, 29)]), "bark")
    for pts in ([(9, 27), (5, 29), (2, 29)], [(21, 27), (26, 29), (29, 29)], [(13, 28), (12, 30)], [(18, 28), (19, 30)]):
        c.shade(path(pts, 2), "bark", rim=False)
    crown = ell(15, 7 + b, 9, 5) | ell(8, 10 + b, 4, 3) | ell(22, 10 + b, 4, 3)
    c.shade(crown, "leaf")
    c.dither(ell(13, 6 + b, 5, 3), "moss", 8, f)
    c.dots("ink", (13, 16 + b), (18, 16 + b))
    c.dots("sprout", (13, 15 + b), (18, 15 + b))
    c.shade(poly([(12, 19 + b), (19, 19 + b), (17, 26 + b), (15, 27 + b), (13, 25 + b)]), "sprout")  # beard of lichen
    c.fill(path([(11, 14 + b), (14, 13 + b)], 1), "wood_dark")
    c.fill(path([(17, 13 + b), (20, 14 + b)], 1), "wood_dark")
    c.shade(path([(21, 17 + b), (26, 14 + b), (27, 10 + b)], 2), "bark", rim=False)  # arm with staff
    finish(c)
    c.dots("sprout", (27, 8 + b + SWAY[f] % 2), (28, 9 + b))
    c.dots("coral", (9, 5 + b), (20, 4 + b), (24, 9 + b))
    return c


def sprout_011(f):  # Grande Madre delle Alghe: a tall kelp matriarch
    c = Canvas(32, 32)
    b = BOB[f]
    for i, x in enumerate((5, 9, 13, 18, 22, 26)):
        kelp(c, x, 11 + b + int(abs(i - 2.5) * 2), 29, f, "leaf" if i % 2 else "kelp", i, 3)
    c.shade(poly([(11, 13 + b), (20, 13 + b), (23, 29), (8, 29)]), "leaf")
    c.shade(ell(15, 9 + b, 5, 5), "moss")
    c.dots("ink", (13, 9 + b), (17, 9 + b))
    c.dots("glow", (13, 8 + b), (17, 8 + b))
    c.fill(rect(14, 12 + b, 16, 12 + b), "kelp_dark")
    c.fill(rect(10, 4 + b, 20, 5 + b), "coral")  # coral crown
    for x in (10, 13, 15, 17, 20):
        c.fill(rect(x, 2 + b - (x == 15), x, 4 + b), "coral")
    c.dots("sprout", (12, 17 + b), (18, 20 + b), (14, 24), (17, 27), (11, 26))
    c.shade(path([(10, 15 + b), (4, 12 + b + SWAY[f])], 2), "moss", rim=False)
    c.shade(path([(21, 15 + b), (27, 12 + b - SWAY[f])], 2), "moss", rim=False)
    finish(c)
    c.dots("glow", (3, 10 + b + SWAY[f]), (28, 10 + b - SWAY[f]))
    return c


def sprout_012(f):  # Golem di Corallo: a heavy coral golem
    c = Canvas(32, 32)
    b = BOB[f]
    c.shade(rect(8, 23, 13, 29), "coral_dark")
    c.shade(rect(18, 23, 23, 29), "coral_dark")
    c.shade(ell(15, 16 + b, 8, 8), "coral")
    c.shade(ell(5, 17 + b, 4, 6), "coral")
    c.shade(ell(26, 17 + b, 4, 6), "coral")
    c.shade(ell(15, 7 + b, 4, 3), "coral")
    for pts in ([(11, 6 + b), (9, 2 + b)], [(15, 4 + b), (15, 0 + b)], [(19, 6 + b), (22, 2 + b)], [(4, 11 + b), (2, 7 + b)], [(27, 11 + b), (29, 7 + b)]):
        c.shade(path(pts, 2), "coral", rim=False)
    c.fill(rect(13, 7 + b, 18, 7 + b), "ink")
    c.dots("verd_light", (14, 7 + b), (17, 7 + b))
    holes = [(12, 14), (17, 12), (19, 18), (13, 20), (5, 17), (26, 19), (15, 16)]
    for i, (x, y) in enumerate(holes):
        c.put(x, y + b, "coral_dark")
    core = "verd_light" if f % 2 else "verd"
    c.fill(ell(15, 17 + b, 2, 2), "verd_dark")
    c.fill(ell(15, 17 + b, 1, 1), core)
    return finish(c)


def sprout_013(f):  # Pastore di Salsedine: a shepherd with a crook and a small wave
    c = Canvas(32, 32)
    a = human(c, f, cx=11, body="mist", legs="verd_dark", boots="kelp_dark")
    b = a["b"]
    c.shade(poly([(6, a["ty"]), (16, a["ty"]), (17, a["waist"] + 3), (5, a["waist"] + 3)]), "mist")  # cloak
    c.shade(ell(11, a["hy"] - 2, 5, 3), "verd")  # hood
    c.fill(rect(7, a["hy"] - 1, 8, a["hy"] + 3), "verd")
    sx = 20
    c.shade(rect(sx, 6 + b, sx + 1, 29), "bark")
    c.fill(path([(sx, 6 + b), (sx + 1, 3 + b), (sx + 4, 3 + b), (sx + 5, 6 + b), (sx + 4, 8 + b)], 2), "wood")
    arm(c, a["sh_f"], (sx - 1, a["ty"] + 4), "mist")
    finish(c)
    wx = 24 + (f % 2)
    c.fill(ell(wx + 2, 27, 4, 2), "sea")
    c.fill(path([(wx, 26), (wx + 2, 24), (wx + 4, 25)], 1), "foam")
    c.dots("ink", (wx + 2, 27))
    c.dots("foam", (wx + 5, 23 - f % 2), (sx + 5, 9 + b + f % 2))
    return c


def sprout_014(f):  # Polipo Lanterna: an octopus that holds a lantern
    c = Canvas(32, 32)
    b = BOB[f]
    s = SWAY[f]
    for i, x in enumerate((6, 10, 14, 18, 22)):
        end = (x + (i - 2) * 2 + s * (1 if i % 2 else -1), 29)
        c.shade(path([(8 + i * 3, 20 + b), (x + (i - 2), 25), end], 2), "violet", rim=False)
        c.put(end[0], 29, "lilac")
    c.shade(ell(14, 13 + b, 8, 8), "violet")
    c.dither(ell(11, 9 + b, 4, 3), "lilac", 6)
    c.dots("ink", (12, 16 + b), (18, 16 + b), (12, 17 + b), (18, 17 + b))
    c.dots("white", (12, 15 + b), (18, 15 + b))
    c.shade(path([(21, 15 + b), (25, 12 + b), (26, 9 + b)], 2), "violet", rim=False)  # raised arm
    lx, ly = 26, 10 + b + abs(s)
    c.fill(rect(lx - 2, ly, lx + 2, ly + 5), "glow")
    c.fill(rect(lx - 2, ly, lx + 2, ly), "copper")
    c.fill(rect(lx - 2, ly + 5, lx + 2, ly + 5), "copper")
    c.fill(rect(lx, ly + 1, lx, ly + 4), "white")
    c.fill(rect(lx - 1, ly - 2, lx + 1, ly - 2), "copper")
    finish(c)
    if f % 2 == 0:
        c.dots("glow", (lx - 4, ly + 2), (lx + 4, ly + 3), (lx, ly + 8))
    else:
        c.dots("flame", (lx - 4, ly + 3), (lx + 4, ly + 2), (lx + 1, ly + 8))
    return c


def sprout_015(f):  # Granchio Spinoso: a spiny crab
    c = Canvas(32, 32)
    b = BOB[f]
    s = SWAY[f]
    for i, x in enumerate((7, 10, 20, 23)):
        side = -1 if x < 15 else 1
        c.fill(path([(x, 24 + b), (x + side * 2, 26), (x + side * 3, 29)], 1), "coral_dark")
        c.fill(path([(x + 1, 24 + b), (x + 1 + side * 2, 26), (x + 1 + side * 3, 29)], 1), "coral")
    c.shade(ell(15, 21 + b, 9, 5), "coral")
    for x in (8, 11, 15, 19, 22):
        c.shade(poly([(x - 1, 17 + b), (x, 13 + b + abs(x - 15) // 3), (x + 1, 17 + b)]), "coral_dark")
    c.fill(rect(12, 16 + b, 12, 18 + b), "coral")
    c.fill(rect(18, 16 + b, 18, 18 + b), "coral")
    c.dots("ink", (12, 15 + b), (18, 15 + b))
    c.fill(rect(13, 23 + b, 17, 23 + b), "coral_dark")
    for side, x in ((-1, 5), (1, 25)):
        y = 14 + b + (s if side > 0 else -s)
        c.shade(path([(15 + side * 8, 20 + b), (x, y + 4)], 2), "coral", rim=False)
        c.shade(ell(x, y, 3, 3), "coral")
        c.fill(poly([(x - 1, y - 1), (x + side * 0, y - 4), (x + 1, y)]), None)
        c.put(x, y - 2, None)
    return finish(c)


def sprout_t01(f):  # Germoglino: a tiny sprout token
    c = Canvas(32, 32)
    b = BOB[f]
    s = SWAY[f]
    c.shade(ell(15, 25 + b, 4, 4), "moss")
    c.fill(rect(12, 28, 13, 29), "kelp")
    c.fill(rect(17, 28, 18, 29), "kelp")
    c.dots("ink", (14, 25 + b), (17, 25 + b))
    c.put(15, 27 + b, "kelp")
    c.fill(path([(15, 21 + b), (15, 17 + b)], 1), "moss")
    c.shade(ell(12 + s, 15 + b, 3, 2), "sprout")
    c.shade(ell(18 + s, 14 + b, 3, 2), "sprout")
    return finish(c)


KEEPERS = {
    "forge-001": forge_001, "forge-002": forge_002, "forge-003": forge_003, "forge-004": forge_004,
    "forge-005": forge_005, "forge-006": forge_006, "forge-007": forge_007, "forge-008": forge_008,
    "forge-009": forge_009, "forge-010": forge_010, "forge-011": forge_011, "forge-012": forge_012,
    "forge-013": forge_013, "forge-014": forge_014,
    "sprout-001": sprout_001, "sprout-002": sprout_002, "sprout-003": sprout_003, "sprout-004": sprout_004,
    "sprout-005": sprout_005, "sprout-006": sprout_006, "sprout-007": sprout_007, "sprout-008": sprout_008,
    "sprout-009": sprout_009, "sprout-010": sprout_010, "sprout-011": sprout_011, "sprout-012": sprout_012,
    "sprout-013": sprout_013, "sprout-014": sprout_014, "sprout-015": sprout_015, "sprout-t01": sprout_t01,
}
