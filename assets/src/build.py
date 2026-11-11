"""Builds every asset of Fari Sommersi.

Run:  python3 assets/src/build.py
Output: assets/sheets (PNG + PixiJS JSON), assets/fonts, assets/palette, assets/preview.
The build is deterministic. The CI can compare the output with the committed files.
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import board as board_mod  # noqa: E402
import font as font_mod  # noqa: E402
import ui  # noqa: E402
from beacon import STATES, beacon  # noqa: E402
from keepers import unknown_keeper  # noqa: E402
from roster import CARD_IDS, KEEPERS, illustration  # noqa: E402
from palette import COLOURS, FACTION_COLOURS, RGB  # noqa: E402
from px import Canvas  # noqa: E402

IDLE_MS = 180  # one idle frame lasts 180 ms (about 5.5 frames per second)


def out(*parts):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def pack(name, items, cols, animations=None, extra=None):
    """Packs (frame name, Canvas) pairs in one sheet. Writes PNG and PixiJS JSON."""
    row_h, x, y, placed = 0, 0, 0, []
    max_w = max(c.w for _, c in items) * cols
    for fname, c in items:
        if x + c.w > max_w:
            x, y, row_h = 0, y + row_h, 0
        placed.append((fname, c, x, y))
        x += c.w
        row_h = max(row_h, c.h)
    width, height = max(px + c.w for _, c, px, _ in placed), y + row_h
    im = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    frames = {}
    for fname, c, px, py in placed:
        im.paste(c.image(), (px, py))
        frames[fname] = {
            "frame": {"x": px, "y": py, "w": c.w, "h": c.h},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": c.w, "h": c.h},
            "sourceSize": {"w": c.w, "h": c.h},
        }
    im.save(out("sheets", f"{name}.png"))
    data = {
        "frames": frames,
        "meta": {"app": "fari-sommersi/assets/src/build.py", "image": f"{name}.png", "format": "RGBA8888",
                 "size": {"w": width, "h": height}, "scale": "1"},
    }
    if animations:
        data["animations"] = animations
    if extra:
        data["meta"].update(extra)
    with open(out("sheets", f"{name}.json"), "w") as fh:
        json.dump(data, fh, indent=1)
        fh.write("\n")
    return im


def build_palette():
    sw = 16
    im = Image.new("RGB", (8 * sw, 4 * sw))
    for i, (name, hexa, _) in enumerate(COLOURS):
        im.paste(RGB[name], ((i % 8) * sw, (i // 8) * sw, (i % 8 + 1) * sw, (i // 8 + 1) * sw))
    im.save(out("palette", "fari-32.png"))
    with open(out("palette", "fari-32.gpl"), "w") as fh:
        fh.write("GIMP Palette\nName: Fari 32\nColumns: 8\n#\n")
        for name, _, _ in COLOURS:
            r, g, b = RGB[name]
            fh.write(f"{r:3d} {g:3d} {b:3d}\t{name}\n")
    with open(out("palette", "fari-32.json"), "w") as fh:
        json.dump({"name": "Fari 32", "colours": [{"name": n, "hex": h, "group": g} for n, h, g in COLOURS],
                   "factions": FACTION_COLOURS}, fh, indent=1)
        fh.write("\n")


def build_keepers():
    items, anims = [], {}
    for kid, fn in KEEPERS.items():
        names = [f"keeper/{kid}/idle/{f}" for f in range(4)]
        items += [(n, fn(f)) for f, n in enumerate(names)]
        anims[f"keeper/{kid}/idle"] = names
    # A fallback sprite for a Keeper that has no art yet.
    names = [f"keeper/unknown/idle/{f}" for f in range(4)]
    items += [(n, unknown_keeper(f)) for f, n in enumerate(names)]
    anims["keeper/unknown/idle"] = names
    pack("keepers", items, 8, anims, {"frameDurationMs": IDLE_MS})


def build_cards():
    arts = {cid: illustration(cid) for cid in CARD_IDS}
    pack("card-art", [(f"art/{cid}", c) for cid, c in arts.items()], 8)
    frames = [(f"frame/{fac}/{'keeper' if k else 'spell'}", ui.card_frame(fac, k))
              for fac in ("forge", "sprout", "neutral", "abyss", "gear", "vesper") for k in (True, False)]
    frames.append(("frame/back", ui.card_back()))
    pack("card-frames", frames, 7, extra={"artWindow": dict(zip("xywh", ui.ART))})
    return arts


def build_ui():
    items = [(f"faction/{k}", c) for k, c in ui.FACTION_ICONS.items()]
    items += [(f"stat/{k}", c) for k, c in ui.STAT_ICONS.items()]
    items += [(f"keyword/{k}", c) for k, c in ui.KEYWORD_ICONS.items()]
    items += [(f"rarity/{k}", c) for k, c in ui.RARITY_GEMS.items()]
    items += [("panel/normal", ui.panel()), ("panel/pressed", ui.panel(True))]
    items += [(f"slot/{k}", ui.slot_marker(k)) for k in ("front", "back", "site")]
    items += [("tide/gauge", ui.tide_gauge())]
    anims = {}
    for key, fn in (("tide/marker", ui.tide_marker), ("tide/wave", ui.wave_tile), ("fx/spark", ui.fx_spark),
                    ("fx/hit", ui.fx_hit), ("fx/puff", ui.fx_puff)):
        names = [f"{key}/{f}" for f in range(4)]
        items += [(n, fn(f)) for f, n in enumerate(names)]
        anims[key] = names
    pack("ui", items, 6, anims, {"nineSlice": {"panel": {"left": 4, "top": 4, "right": 4, "bottom": 4}}})


def build_beacon():
    items, anims = [], {}
    for st in STATES:
        names = [f"beacon/{st}/{f}" for f in range(4)]
        items += [(n, beacon(st, f)) for f, n in enumerate(names)]
        anims[f"beacon/{st}"] = names
    pack("beacon", items, 4, anims, {"frameDurationMs": IDLE_MS})


def build_board():
    b = board_mod.board()
    b.image().save(out("sheets", "board.png"))
    with open(out("sheets", "board.json"), "w") as fh:
        json.dump(board_mod.layout(), fh, indent=1)
        fh.write("\n")
    return b


def build_fonts():
    for font, name, file in ((font_mod.MINI, "Faro Mini", "faro-mini"), (font_mod.FARO, "Faro", "faro")):
        im, fnt = font_mod.atlas(font, name, f"{file}.png")
        im.save(out("fonts", f"{file}.png"))
        with open(out("fonts", f"{file}.fnt"), "w") as fh:
            fh.write(fnt)


def load_names():
    path = os.path.join(os.path.dirname(ROOT), "packages", "i18n", "locales", "it", "cards.json")
    with open(path) as fh:
        return {k: v["name"] for k, v in json.load(fh).items()}


def full_card(cid, arts, names, keeper, stats=None):
    """A complete card for the previews. The game client draws the text at run time."""
    c = Canvas(ui.FRAME_W, ui.FRAME_H)
    c.blit(arts[cid], ui.ART[0], ui.ART[1])
    c.blit(ui.card_frame(cid.split("-")[0], keeper))
    lines = font_mod.wrap(font_mod.MINI, names[cid], 54)[:2]
    y = 48 + (4 if len(lines) == 1 else 0)
    for ln in lines:
        w = font_mod.measure(font_mod.MINI, ln)
        font_mod.draw_text(c, font_mod.MINI, ln, 32 - w // 2, y - 2, "ink")
        y += 7
    cost, atk, hold = stats or (1, 1, 1)
    font_mod.draw_text(c, font_mod.MINI, str(cost), 6, 3, "glow")
    if keeper:
        font_mod.draw_text(c, font_mod.MINI, str(atk), 7, 76, "white")
        font_mod.draw_text(c, font_mod.MINI, str(hold), 54, 76, "white")
    return c


def build_previews(arts, b):
    names = load_names()
    data = {}
    data_dir = os.path.join(os.path.dirname(ROOT), "packages", "cards", "data")
    for file in sorted(os.listdir(data_dir)):
        if file.endswith(".json"):
            with open(os.path.join(data_dir, file)) as fh:
                d = json.load(fh)
                for card in d if isinstance(d, list) else d["cards"]:
                    data[card["id"]] = card
    stats = lambda cid: (data[cid]["cost"], data[cid].get("attack", 0), data[cid].get("hold", 0))  # noqa: E731
    # 1. every card
    cols = 14
    sheet = Canvas(cols * 66 + 2, -(-len(CARD_IDS) // cols) * 90 + 2, "ink")
    for i, cid in enumerate(CARD_IDS):
        sheet.blit(full_card(cid, arts, names, cid in KEEPERS, stats(cid)), 2 + (i % cols) * 66, 2 + (i // cols) * 90)
    im = sheet.image()
    im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(out("preview", "cards.png"))
    # 2. a mock game scene
    lay = board_mod.layout()
    s = b.copy()
    for lane in lay["lanes"].values():
        s.blit(beacon("lit", 0), lay["columns"]["beacon0"] + 8, lane - 2)
    s.blit(beacon("damaged", 0), lay["columns"]["beacon1"] + 8, lay["lanes"]["A"] - 2, flip=True)
    s.blit(beacon("lit", 0), lay["columns"]["beacon1"] + 8, lay["lanes"]["B"] - 2, flip=True)
    s.blit(beacon("out", 0), lay["columns"]["beacon1"] + 8, lay["lanes"]["C"] - 2, flip=True)
    placed = [("forge-004", "front0", "A"), ("forge-010", "back0", "A"), ("forge-013", "front0", "B"),
              ("forge-003", "front0", "C"), ("forge-014", "back0", "B"), ("sprout-003", "front1", "A"),
              ("sprout-008", "front1", "B"), ("sprout-005", "back1", "B"), ("sprout-015", "front1", "C"),
              ("sprout-011", "back1", "C")]
    for kid, col, lane in placed:
        s.blit(KEEPERS[kid](0), lay["columns"][col] + 8, lay["lanes"][lane] + 11, flip=col.endswith("1"))
    tg = lay["tideGauge"]
    s.blit(ui.tide_gauge(), tg["x"], tg["y"])
    s.blit(ui.tide_marker(0), tg["firstCellX"] + 7 * 12 + 1, tg["markerY"])
    hand = ["forge-001", "forge-016", "forge-009", "forge-022", "forge-024"]
    for i, cid in enumerate(hand):
        s.blit(full_card(cid, arts, names, cid in KEEPERS, stats(cid)), lay["hand"]["x"] - 20 + i * 66, lay["hand"]["y"] - (12 if i == 2 else 0))
    s.blit(ui.STAT_ICONS["ember"], 8, 8)
    font_mod.draw_text(s, font_mod.FARO, "3/5", 18, 4, "glow")
    w = font_mod.measure(font_mod.FARO, "Avversario")
    font_mod.draw_text(s, font_mod.FARO, "Avversario", 472 - w, 4, "foam")
    im = s.image()
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(out("preview", "mockup.png"))
    # 3. keepers, beacons and fonts
    rows = -(-len(KEEPERS) // 16)
    k = Canvas(16 * 32, rows * 32 + 52, "sea")
    for i, kid in enumerate(KEEPERS):
        k.blit(KEEPERS[kid](0), (i % 16) * 32, (i // 16) * 32)
    for i, st in enumerate(STATES):
        for f in range(4):
            k.blit(beacon(st, f), (i * 4 + f) * 34 + 4, rows * 32 + 2)
    im = k.image()
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(out("preview", "keepers-beacons.png"))
    t = Canvas(250, 96, "abyss")
    y = 3
    for fnt, col in ((font_mod.FARO, "white"), (font_mod.MINI, "foam")):
        for text in ("ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789", "abcdefghijklmnopqrstuvwxyz .,:;!?'\"-+/()%",
                     "àèéìòù ÀÈÉÌÒÙ áíóú âêîôû äëïöü ñç «»", "Perché il Faro è già più giù? Città, virtù."):
            font_mod.draw_text(t, fnt, text, 3, y, col)
            y += font_mod.line_height(fnt) + 1
        y += 3
    im = t.image()
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(out("preview", "fonts.png"))


def main():
    build_palette()
    build_keepers()
    arts = build_cards()
    build_ui()
    build_beacon()
    b = build_board()
    build_fonts()
    build_previews(arts, b)
    print("Assets built in", ROOT)


if __name__ == "__main__":
    main()
