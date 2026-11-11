"""Card frames, card back, icons, badges and interface pieces."""
from px import Canvas, ell, from_rows, line, path, poly, rect

FRAME_W, FRAME_H = 64, 88
ART = (4, 4, 56, 40)  # x, y, width, height of the illustration window

FACTION_RAMP = {
    "forge": ("soot", "rust", "ember", "flame"),
    "sprout": ("kelp_dark", "kelp", "moss", "sprout"),
    "neutral": ("slate", "stone", "ash", "sand"),
    "abyss": ("abyss", "deep", "sea", "foam"),
    "gear": ("wood_dark", "wood", "copper", "sand"),
    "vesper": ("ink", "dusk", "violet", "lilac"),
}


def icon(rows, colours):
    """Builds a small Canvas from text rows. `colours` maps a character to a palette name."""
    c = Canvas(max(len(r) for r in rows), len(rows))
    for ch, col in colours.items():
        c.fill(from_rows(rows, key=ch), col)
    return c


# ---------------------------------------------------------------- icons
FACTION_ICONS = {
    # Fucina: a flame inside a triangle
    "forge": icon(
        ["....#....", "....#....", "...#o#...", "...#o#...", "..#ooo#..", "..#o+o#..", ".#oo+oo#.", ".#o+++o#.", "#########"],
        {"#": "rust", "o": "ember", "+": "glow"},
    ),
    # Germoglio: a sprout inside a circle
    "sprout": icon(
        ["..#####..", ".#oo.oo#.", "#o++o++o#", "#oo+o+oo#", "#ooo+ooo#", "#ooo+ooo#", "#ooo+ooo#", ".#ooooo#.", "..#####.."],
        {"#": "kelp_dark", "o": "kelp", "+": "sprout", ".": None},
    ),
    # Abisso: a drop (reserved for a future set)
    "abyss": icon(
        ["....#....", "...#o#...", "...#o#...", "..#ooo#..", ".#o+ooo#.", ".#+oooo#.", ".#ooooo#.", "..#ooo#..", "...###..."],
        {"#": "abyss", "o": "sea", "+": "foam"},
    ),
    # Ingranaggio: a cog inside a square (reserved)
    "gear": icon(
        ["#########", "#o.o#o.o#", "#.ooooo.#", "#oo+++oo#", "##o+.+o##", "#oo+++oo#", "#.ooooo.#", "#o.o#o.o#", "#########"],
        {"#": "wood_dark", "o": "copper", "+": "sand", ".": "wood_dark"},
    ),
    # Vespro: a crescent inside a diamond (reserved)
    "vesper": icon(
        ["....#....", "...#o#...", "..#o++#..", ".#o++oo#.", "#oo+oooo#", ".#o++oo#.", "..#o++#..", "...#o#...", "....#...."],
        {"#": "dusk", "o": "violet", "+": "white"},
    ),
    # Neutrale: a four-point star
    "neutral": icon(
        ["....#....", "....#....", "...#o#...", "..#o+o#..", "##o+++o##", "..#o+o#..", "...#o#...", "....#....", "....#...."],
        {"#": "slate", "o": "ash", "+": "white"},
    ),
}

STAT_ICONS = {
    "attack": icon(["......#", ".....##", "....##.", "#..##..", ".###...", ".##....", "#..#..."], {"#": "white"}),
    "hold": icon(["#######", "#o###o#", "#o###o#", "#o###o#", ".#o#o#.", "..###..", "...#..."], {"#": "white", "o": "mist"}),
    "ember": icon(["...#...", "..##...", "..###..", ".##o##.", "##ooo##", "##o+o##", ".#####."], {"#": "ember", "o": "flame", "+": "glow"}),
    "light": icon(["...#...", ".#...#.", "..###..", "#.#+#.#", "..###..", ".#...#.", "...#..."], {"#": "glow", "+": "white"}),
    "tide": icon([".......", "..##...", ".#..#..", "#....#.", "......#", ".##....", "#..##.#"], {"#": "foam"}),
    "deck": icon(["..#####", "..#ooo#", ".####o#", ".#oo#o#", "####o##", "#oo###.", "####..."], {"#": "ink", "o": "sand"}),
}

KEYWORD_ICONS = {
    "rooted": icon(["...#...", "...#...", "..###..", ".#.#.#.", "#..#..#", "..#.#..", ".#...#."], {"#": "sprout"}),
    "reach": icon(["....###", ".....##", "....#.#", "...#...", "..#....", ".#.....", "#......"], {"#": "sand"}),
    "overrun": icon(["#..#...", ".#..#..", "..#..#.", "...#..#", "..#..#.", ".#..#..", "#..#..."], {"#": "flame"}),
    "echo": icon(["..###..", ".#...#.", "#..#..#", "#.#.#.#", "#..#..#", ".#...#.", "..###.."], {"#": "lilac"}),
    "wear": icon(["#######", ".#...#.", "..#o#..", "...#...", "..#.#..", ".#ooo#.", "#######"], {"#": "ash", "o": "sand"}),
    "anchor": icon(["..###..", "..#.#..", "..###..", "...#...", "#..#..#", "#..#..#", ".#####."], {"#": "mist"}),
    "surge": icon(["...##..", "..##...", ".##....", "######.", "...##..", "..##...", ".##...."], {"#": "glow"}),
}

RARITY_GEMS = {
    "common": icon([".###.", "#o++#", "#ooo#", "#ooo#", ".###."], {"#": "slate", "o": "ash", "+": "white"}),
    "uncommon": icon(["..#..", ".#+#.", "#o+o#", ".#o#.", "..#.."], {"#": "verd_dark", "o": "verd", "+": "verd_light"}),
    "rare": icon(["..#..", ".#+#.", "#o+o#", ".#o#.", "..#.."], {"#": "rust", "o": "flame", "+": "glow"}),
    "legendary": icon(["#.#.#", "#+#+#", "#o+o#", ".#o#.", "..#.."], {"#": "dusk", "o": "violet", "+": "lilac"}),
}


# ---------------------------------------------------------------- card frame
def rounded(w, h, r=2):
    m = rect(0, 0, w - 1, h - 1)
    for i in range(r):
        for j in range(r - i):
            m -= {(i, j), (w - 1 - i, j), (i, h - 1 - j), (w - 1 - i, h - 1 - j)}
    return m


def cost_gem(c, cx=7, cy=7):
    c.fill(ell(cx, cy, 6, 6), "ink")
    c.shade(ell(cx, cy, 5, 5), ("rust", "ember", "flame"))
    c.fill(ell(cx, cy, 3, 3), "soot")


def badge_attack(c, cx, cy):
    m = poly([(cx, cy - 6), (cx + 6, cy), (cx, cy + 6), (cx - 6, cy)])
    c.fill(m | {(x + dx, y + dy) for x, y in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))}, "ink")
    c.shade(m, ("soot", "coral_dark", "coral"))
    c.fill(poly([(cx, cy - 3), (cx + 3, cy), (cx, cy + 3), (cx - 3, cy)]), "soot")


def badge_hold(c, cx, cy):
    m = poly([(cx - 5, cy - 5), (cx + 5, cy - 5), (cx + 5, cy + 1), (cx, cy + 6), (cx - 5, cy + 1)])
    c.fill(m | {(x + dx, y + dy) for x, y in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))}, "ink")
    c.shade(m, ("abyss", "sea", "mist"))
    c.fill(poly([(cx - 3, cy - 3), (cx + 3, cy - 3), (cx + 3, cy), (cx, cy + 3), (cx - 3, cy)]), "abyss")


def card_frame(faction, keeper):
    dark, mid, light, _accent = FACTION_RAMP[faction]
    c = Canvas(FRAME_W, FRAME_H)
    body = rounded(FRAME_W, FRAME_H, 2)
    c.fill(body, "ink")
    inner = rect(1, 1, 62, 86) - {(1, 1), (62, 1), (1, 86), (62, 86)}
    c.fill(inner, mid)
    c.fill(rect(2, 1, 61, 1) | rect(1, 2, 1, 85), light)
    c.fill(rect(2, 86, 61, 86) | rect(62, 2, 62, 85), dark)
    ax, ay, aw, ah = ART
    c.fill(rect(ax - 1, ay - 1, ax + aw, ay + ah), "ink")
    c.fill(rect(ax, ay, ax + aw - 1, ay + ah - 1), None)  # transparent window
    # name plate: two lines of Faro Mini, 58 pixels wide
    c.fill(rect(2, 46, 61, 62), "ink")
    c.fill(rect(3, 47, 60, 61), "sand")
    c.fill(rect(3, 47, 60, 47), "white")
    c.fill(rect(3, 61, 60, 61), "tan")
    # text box
    c.fill(rect(2, 64, 61, 85), "ink")
    c.fill(rect(3, 65, 60, 84), "white")
    c.fill(rect(3, 84, 60, 84), "sand")
    cost_gem(c)
    if keeper:
        badge_attack(c, 8, 80)
        badge_hold(c, 55, 80)
    c.blit(FACTION_ICONS[faction], 28, 75)
    return c


def card_back():
    c = Canvas(FRAME_W, FRAME_H)
    c.fill(rounded(FRAME_W, FRAME_H, 2), "ink")
    inner = rect(1, 1, 62, 86) - {(1, 1), (62, 1), (1, 86), (62, 86)}
    c.fill(inner, "verd_dark")
    c.fill(rect(2, 1, 61, 1) | rect(1, 2, 1, 85), "verd")
    c.fill(rect(3, 3, 60, 84), "ink")
    field = rect(4, 4, 59, 83)
    c.vgrad(field, ["abyss", "deep", "sea"], 4, 83)
    for i, y in enumerate(range(58, 83, 4)):
        for x in range(4 - (i * 5) % 9, 60, 9):
            c.fill(rect(x, y, x + 3, y) & field, "mist")
    c.fill(poly([(18, 70), (24, 62), (40, 62), (46, 70)]), "slate")
    tower = poly([(27, 62), (29, 30), (35, 30), (37, 62)])
    c.shade(tower, ("ash", "foam", "white"))
    for y in (38, 48, 58):
        c.fill({(x, yy) for x, yy in tower if y <= yy <= y + 2}, "coral_dark")
    c.fill(rect(27, 28, 37, 29), "slate")
    c.fill(rect(29, 22, 35, 27), "glow")
    c.fill(rect(31, 23, 33, 26), "white")
    c.fill(poly([(28, 21), (32, 16), (36, 21)]), "rust")
    for d in (1, -1):
        for i in range(5, 24):
            for dy in range(-(i // 6), i // 6 + 1):
                x, y = 32 + d * i, 24 + dy
                if (x + y) % 2 == 0 and (x, y) in field:
                    c.put(x, y, "glow")
    c.dots("foam", (10, 10), (52, 12), (14, 40), (50, 44), (8, 26), (55, 30), (20, 8), (44, 7))
    for x, y in ((6, 6), (57, 6), (6, 81), (57, 81)):
        c.fill({(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)}, "verd_light")
    return c


# ---------------------------------------------------------------- interface pieces
def panel(pressed=False):
    """A 16x16 nine-slice panel. The border is 4 pixels on every side."""
    c = Canvas(16, 16)
    c.fill(rounded(16, 16, 2), "ink")
    c.fill(rect(1, 1, 14, 14) - {(1, 1), (14, 1), (1, 14), (14, 14)}, "verd_dark" if not pressed else "abyss")
    if not pressed:
        c.fill(rect(2, 1, 13, 1) | rect(1, 2, 1, 13), "verd")
        c.fill(rect(2, 14, 13, 14), "abyss")
    else:
        c.fill(rect(2, 1, 13, 1), "ink")
    return c


def slot_marker(kind):
    """A 44x14 ground marker under a slot. kind: front, back, site."""
    c = Canvas(44, 14)
    if kind == "site":
        c.shade(poly([(22, 1), (40, 7), (22, 12), (4, 7)]), "bark")
        c.fill(poly([(22, 3), (34, 7), (22, 10), (10, 7)]), "wood_dark")
        c.outline("ink")
        return c
    r = 20 if kind == "front" else 17
    c.shade(ell(22, 6, r, 5), "stone" if kind == "front" else "slate")
    c.outline("ink")
    c.fill(rect(22 - r + 4, 12, 22 + r - 4, 12), "mist")
    c.dots("moss" if kind == "front" else "kelp", (8, 6), (9, 7), (33, 4), (30, 9))
    return c


def tide_gauge():
    """The Tide track: 11 cells of 12 pixels. Cell 0 is the left end (tide -5)."""
    w, h = 11 * 12 + 8, 18
    c = Canvas(w, h)
    c.fill(rounded(w, h, 3), "ink")
    c.fill(rect(1, 1, w - 2, h - 2) - {(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)}, "verd_dark")
    c.fill(rect(2, 1, w - 3, 1), "verd")
    c.fill(rect(3, 3, w - 4, h - 4), "ink")
    for i in range(11):
        x0 = 4 + i * 12
        t = i - 5
        cell = rect(x0, 4, x0 + 11, h - 5)
        level = abs(t)
        c.fill(cell, "abyss" if t == 0 else "deep")
        # the water rises towards the two ends
        c.fill(rect(x0, h - 5 - level, x0 + 11, h - 5), "sea")
        c.fill(rect(x0, h - 5 - level, x0 + 11, h - 5 - level), "mist" if level >= 2 else "sea")
        if i:
            c.fill(rect(x0, 4, x0, 5), "stone")
        if level >= 2:  # threshold of Alta Marea and Riflusso
            c.put(x0 + 6, 5, "foam")
    cx = 4 + 5 * 12 + 6
    c.fill(rect(cx - 1, 4, cx, 6), "glow")
    return c


def tide_marker(f=0):
    """An 11x13 buoy that marks the current Tide. 4 frames."""
    c = Canvas(11, 13)
    b = [0, 0, 1, 1][f]
    c.shade(ell(5, 7 + b, 3, 3), ("rust", "ember", "flame"))
    c.fill(rect(2, 7 + b, 8, 7 + b), "white")
    c.fill(rect(5, 1 + b, 5, 3 + b), "wood")
    c.outline("ink")
    c.put(5, 1 + b, "glow" if f % 2 == 0 else "white")
    return c


def wave_tile(f):
    """A 16x6 tile of wave crests. 4 frames. Tile it along x."""
    c = Canvas(16, 6)
    for x in range(16):
        k = (x + f * 4) % 16
        y = [3, 2, 1, 1, 2, 3, 4, 4, 3, 2, 1, 1, 2, 3, 4, 4][k]
        c.put(x, y, "foam" if k % 8 in (2, 3) else "mist")
        for yy in range(y + 1, 6):
            c.put(x, yy, "sea")
    return c


def fx_spark(f):
    c = Canvas(7, 7)
    shapes = [
        ["...#...", "...#...", "...#...", "###+###", "...#...", "...#...", "...#..."],
        ["#.....#", ".#...#.", "..#.#..", "...+...", "..#.#..", ".#...#.", "#.....#"],
        [".......", "...#...", ".......", ".#.+.#.", ".......", "...#...", "......."],
        [".......", ".......", ".......", "...#...", ".......", ".......", "......."],
    ]
    c.fill(from_rows(shapes[f], key="#"), "glow")
    c.fill(from_rows(shapes[f], key="+"), "white")
    return c


def fx_hit(f):
    c = Canvas(16, 16)
    r = [3, 5, 7, 7][f]
    ring = ell(7.5, 7.5, r, r) - ell(7.5, 7.5, r - (2 if f < 2 else 1), r - (2 if f < 2 else 1))
    if f == 3:
        ring = {p for p in ring if (p[0] + p[1]) % 2 == 0}
    c.fill(ring, "white" if f == 0 else "glow")
    if f == 0:
        c.fill(ell(7.5, 7.5, 2, 2), "white")
    return c


def fx_puff(f):
    c = Canvas(12, 12)
    r = [2, 3, 4, 5][f]
    m = ell(5.5, 6 - f, r, r - 0.5)
    c.fill(m, "foam" if f < 2 else "mist")
    if f >= 2:
        c.fill({p for p in m if (p[0] + p[1]) % (2 if f == 2 else 3) == 0}, None)
    return c
