"""Beacon sprites: 32x48 pixels, 3 states, 4 frames each. The Beacon faces right."""
from px import Canvas, ell, line, path, poly, rect

STATES = ("lit", "damaged", "out")


def beacon(state, f):
    c = Canvas(32, 48)
    lit, dmg, out = state == "lit", state == "damaged", state == "out"
    # rock
    c.shade(ell(16, 43, 13, 4), "stone")
    c.shade(ell(8, 41, 5, 3), "slate")
    c.dots("moss", (6, 40), (7, 41), (24, 42), (20, 45))
    # tower
    tower = poly([(10, 42), (12, 17), (20, 17), (22, 42)])
    c.shade(tower, ("stone", "ash", "foam") if out else ("ash", "foam", "white"))
    band = "slate" if out else "coral_dark"
    for y in (22, 31):
        c.fill({(x, yy) for x, yy in tower if y <= yy <= y + 3}, band)
        c.fill({(x, yy) for x, yy in tower if yy == y and x < 15}, "dusk" if out else "coral")
    c.fill(rect(15, 37, 17, 42), "wood_dark")
    c.fill(rect(15, 26, 16, 28), "abyss" if out else "glow")
    # gallery, lamp room and roof
    c.shade(rect(9, 15, 23, 16), "slate")
    c.fill(rect(12, 9, 20, 14), "slate")
    lamp = {"lit": ["glow", "glow", "white", "glow"], "damaged": ["flame", "ember", "flame", "rust"], "out": ["abyss"] * 4}[state][f]
    c.fill(rect(13, 10, 19, 13), lamp)
    if lit:
        c.fill(rect(15, 11, 17, 12), "white")
    if dmg and f != 3:
        c.fill(rect(16, 11, 16, 12), "glow")
    c.fill(rect(12, 9, 12, 14) | rect(16, 9, 16, 9) | rect(20, 9, 20, 14), "slate")
    roof = poly([(11, 8), (16, 3), (21, 8)])
    c.shade(roof, "rust" if not out else "soot")
    c.fill(rect(16, 0, 16, 2), "slate")
    if dmg or out:
        c.fill(path([(13, 19), (15, 23), (14, 27), (17, 30)], 1), "ink")
        c.fill(path([(19, 33), (17, 36), (19, 39)], 1), "ink")
        c.fill(poly([(18, 3), (21, 5), (21, 8)]), None)
    if out:
        c.fill(rect(20, 17, 21, 20), None)
        c.fill(rect(17, 9, 20, 11), None)
        c.dots("slate", (24, 40), (26, 42))
    c.outline("ink")
    c.fill(rect(4, 46, 27, 46), "mist")
    c.fill(rect(4 + f % 2 * 2, 47, 9 + f % 2 * 2, 47) | rect(18 - f % 2 * 2, 47, 25 - f % 2 * 2, 47), "foam")
    # light
    if lit:
        reach = [10, 12, 14, 12][f]
        for d in (1, -1):
            for i in range(5, reach):
                for dy in range(-(i // 4), i // 4 + 1):
                    x, y = 16 + d * i, 11 + dy
                    if (x + y + f) % 2 == 0 and c.get(x, y) is None:
                        c.put(x, y, "glow")
        c.dots("white", (16, 6 - f % 2))
    if dmg:
        for i, (x, y) in enumerate(((10, 10), (22, 12), (16, 6))):
            if (i + f) % 2 == 0:
                c.put(x, y, "flame")
    if out:
        for i in range(3):
            y = 6 - i * 3 - f % 2
            x = 17 + [0, 1, 0, -1][(f + i) % 4]
            if y >= 0:
                c.dots("stone", (x, y), (x + 1, y))
                c.put(x, y - 1, "slate") if y >= 1 else None
    return c
