"""The board background (480x270) and its layout.

The scene is a side view. The player is on the left, the opponent is on the right.
Each lane is a horizontal row: Beacon, Back, Front, Site, Front, Back, Beacon.
"""
from px import Canvas, ell, poly, rect
from ui import slot_marker

W, H = 480, 270
CELL = 48
FIELD_X, FIELD_Y = 72, 30
COLUMNS = ["beacon0", "back0", "front0", "site", "front1", "back1", "beacon1"]
LANES = ["A", "B", "C"]
HAND_Y = 178


def layout():
    cols = {name: FIELD_X + i * CELL for i, name in enumerate(COLUMNS)}
    lanes = {lane: FIELD_Y + i * CELL for i, lane in enumerate(LANES)}
    return {
        "size": {"width": W, "height": H},
        "cell": {"width": CELL, "height": CELL},
        "columns": cols,
        "lanes": lanes,
        "keeperAnchor": {"dx": CELL // 2, "dy": 43, "note": "bottom centre of the 32x32 sprite, relative to the cell"},
        "beaconAnchor": {"dx": 8, "dy": -2, "note": "top left of the 32x48 sprite, relative to the cell"},
        "siteAnchor": {"dx": CELL // 2, "dy": 30, "note": "centre of the site token, relative to the cell"},
        "tideGauge": {"x": 170, "y": 4, "cell": 12, "firstCellX": 174, "markerY": 0},
        "hand": {"x": 96, "y": HAND_Y + 2, "width": 288, "cardWidth": 64, "cardHeight": 88},
        "hud": {
            "player": {"ember": {"x": 8, "y": 8}, "deck": {"x": 8, "y": 192}, "name": {"x": 22, "y": 8}},
            "opponent": {"ember": {"x": 465, "y": 8}, "deck": {"x": 440, "y": 192}, "name": {"x": 458, "y": 8, "align": "right"}},
            "pass": {"x": 404, "y": 232, "width": 64, "height": 20},
        },
        "mirror": "Flip the sprites of player 1 (the opponent) on the x axis.",
    }


def board():
    c = Canvas(W, H)
    # sky behind the top bar
    c.vgrad(rect(0, 0, W - 1, FIELD_Y - 5), ["ink", "abyss", "dusk", "coral_dark"], 0, FIELD_Y + 6)
    for i in range(46):
        x, y = (i * 97 + 13) % W, (i * 31 + 5) % 20
        c.put(x, y, "foam" if i % 3 else "lilac")
    # far islands on the horizon
    for x, w, h in ((30, 40, 5), (120, 26, 3), (330, 34, 4), (430, 44, 6)):
        c.fill(poly([(x, FIELD_Y - 5), (x + w // 3, FIELD_Y - 5 - h), (x + w * 2 // 3, FIELD_Y - 4 - h), (x + w, FIELD_Y - 5)]), "abyss")
    # sea
    sea = rect(0, FIELD_Y - 4, W - 1, HAND_Y - 1)
    c.vgrad(sea, ["sea", "deep", "deep", "abyss"], FIELD_Y - 4, HAND_Y + 30)
    c.fill(rect(0, FIELD_Y - 4, W - 1, FIELD_Y - 4), "mist")
    for i, y in enumerate(range(FIELD_Y, HAND_Y - 2, 4)):
        for x in range(-((i * 23) % 37), W, 37):
            c.fill(rect(x, y, x + 4 + (i % 3), y) & sea, "sea" if y > FIELD_Y + 40 else "mist")
    lay = layout()
    for lane, y in lay["lanes"].items():
        # a soft current line under every lane
        c.dither(rect(FIELD_X - 8, y + CELL - 2, FIELD_X + 7 * CELL + 7, y + CELL - 1), "sea", 6)
        for name, x in lay["columns"].items():
            if name.startswith("beacon"):
                continue
            kind = "site" if name == "site" else name[:-1]
            c.blit(slot_marker(kind), x + 2, y + 32)
    # the central channel of the Sites
    cx = lay["columns"]["site"]
    c.dither(rect(cx + 2, FIELD_Y, cx + CELL - 3, HAND_Y - 6), "abyss", 3)
    # hand area: a dark wooden pier
    c.fill(rect(0, HAND_Y, W - 1, H - 1), "wood_dark")
    c.fill(rect(0, HAND_Y, W - 1, HAND_Y), "ink")
    c.fill(rect(0, HAND_Y + 1, W - 1, HAND_Y + 1), "wood")
    c.fill(rect(0, HAND_Y + 2, W - 1, HAND_Y + 3), "wood_dark")
    for y in range(HAND_Y + 4, H, 12):
        c.fill(rect(0, y + 11, W - 1, y + 11), "ink")
        for x in range((y * 7) % 60, W, 60):
            c.fill(rect(x, y, x, y + 10), "ink")
            c.put(x + 2, y + 2, "wood")
            c.put(x - 2, y + 2, "wood")
    for x in (20, 60, 420, 460):  # mooring posts
        c.shade(rect(x - 3, HAND_Y - 8, x + 3, HAND_Y + 2), "bark")
        c.fill(rect(x - 3, HAND_Y - 8, x + 3, HAND_Y - 8), "tan")
        c.fill(rect(x - 4, HAND_Y - 9, x + 4, HAND_Y - 9), "ink")
    return c
