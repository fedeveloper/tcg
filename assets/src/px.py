"""Small pixel art toolkit used by every asset generator.

A Canvas stores palette colour names. Shapes are sets of (x, y) points.
All colours come from the fixed 32-colour palette in palette.py.
"""
from __future__ import annotations

import math
from PIL import Image, ImageDraw

from palette import PALETTE, RGB

BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]

# Colour ramps: (shadow, base, light).
RAMPS = {
    "iron": ("ink", "slate", "stone"),
    "steel": ("slate", "stone", "ash"),
    "soot": ("ink", "soot", "rust"),
    "rust": ("soot", "rust", "ember"),
    "ember": ("rust", "ember", "flame"),
    "flame": ("ember", "flame", "glow"),
    "glow": ("flame", "glow", "white"),
    "copper": ("rust", "copper", "sand"),
    "kelp": ("ink", "kelp_dark", "kelp"),
    "leaf": ("kelp_dark", "kelp", "moss"),
    "moss": ("kelp", "moss", "sprout"),
    "sprout": ("moss", "sprout", "white"),
    "coral": ("coral_dark", "coral", "sand"),
    "coral_dark": ("dusk", "coral_dark", "coral"),
    "verd": ("verd_dark", "verd", "verd_light"),
    "verd_dark": ("abyss", "verd_dark", "verd"),
    "wood": ("ink", "wood_dark", "wood"),
    "bark": ("wood_dark", "wood", "tan"),
    "tan": ("wood", "tan", "sand"),
    "skin": ("tan", "sand", "white"),
    "sand": ("tan", "sand", "white"),
    "sea": ("abyss", "deep", "sea"),
    "water": ("deep", "sea", "mist"),
    "mist": ("sea", "mist", "foam"),
    "foam": ("mist", "foam", "white"),
    "white": ("ash", "white", "white"),
    "dusk": ("ink", "dusk", "violet"),
    "violet": ("dusk", "violet", "lilac"),
    "stone": ("slate", "stone", "ash"),
    "lilac": ("violet", "lilac", "white"),
    "slate": ("ink", "slate", "stone"),
    "deep": ("ink", "abyss", "deep"),
}


# ---------------------------------------------------------------- shapes
def rect(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def ell(cx, cy, rx, ry):
    pts = set()
    for y in range(int(math.floor(cy - ry)), int(math.ceil(cy + ry)) + 1):
        for x in range(int(math.floor(cx - rx)), int(math.ceil(cx + rx)) + 1):
            if ((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2 <= 1.0:
                pts.add((x, y))
    return pts


def poly(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    x0, y0 = min(xs), min(ys)
    im = Image.new("1", (max(xs) - x0 + 1, max(ys) - y0 + 1), 0)
    ImageDraw.Draw(im).polygon([(x - x0, y - y0) for x, y in points], fill=1, outline=1)
    px = im.load()
    return {(x + x0, y + y0) for x in range(im.width) for y in range(im.height) if px[x, y]}


def line(x0, y0, x1, y1, t=1):
    pts = set()
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        x = round(x0 + (x1 - x0) * i / n)
        y = round(y0 + (y1 - y0) * i / n)
        if t <= 1:
            pts.add((x, y))
        elif t == 2:
            pts |= {(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)}
        else:
            pts |= ell(x, y, (t - 1) / 2, (t - 1) / 2)
    return pts


def path(points, t=1):
    pts = set()
    for a, b in zip(points, points[1:]):
        pts |= line(a[0], a[1], b[0], b[1], t)
    return pts


def move(mask, dx, dy):
    return {(x + dx, y + dy) for x, y in mask}


def from_rows(rows, x0=0, y0=0, key="#"):
    """Builds a mask from text rows. Every `key` character is one pixel."""
    return {(x0 + x, y0 + y) for y, row in enumerate(rows) for x, ch in enumerate(row) if ch in key}


# ---------------------------------------------------------------- canvas
class Canvas:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h
        self.p = [[bg] * w for _ in range(h)]

    def inside(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def get(self, x, y):
        return self.p[y][x] if self.inside(x, y) else None

    def put(self, x, y, col):
        if self.inside(x, y):
            self.p[y][x] = col

    def fill(self, mask, col):
        assert col is None or col in PALETTE, col
        for x, y in mask:
            self.put(x, y, col)
        return self

    def dots(self, col, *pts):
        return self.fill(set(pts), col)

    def shade(self, mask, ramp, rim=True):
        """Fills a shape with a 3-tone ramp. The light comes from the top left."""
        dark, mid, light = RAMPS[ramp] if isinstance(ramp, str) else ramp
        for x, y in mask:
            col = mid
            lit = (x, y - 1) not in mask or ((x - 1, y) not in mask and (x - 1, y - 1) not in mask)
            shadow = (x, y + 1) not in mask or (x + 1, y) not in mask
            if shadow and rim:
                col = dark
            if lit and not ((x, y + 1) not in mask and (x, y - 1) not in mask):
                col = light if not (shadow and (x + 1, y) not in mask) else mid
            self.put(x, y, col)
        return self

    def dither(self, mask, col, level, phase=0):
        """Draws `col` on a part of the mask. `level` runs from 0 (nothing) to 16 (all)."""
        for x, y in mask:
            if BAYER4[(y + phase) % 4][(x + phase) % 4] < level:
                self.put(x, y, col)
        return self

    def vgrad(self, mask, cols, y0=None, y1=None):
        """Vertical gradient with ordered dithering between the colours in `cols`."""
        ys = [y for _, y in mask]
        y0 = min(ys) if y0 is None else y0
        y1 = max(ys) if y1 is None else y1
        span = max(y1 - y0, 1)
        n = len(cols) - 1
        for x, y in mask:
            t = min(max((y - y0) / span, 0), 1) * n
            i = min(int(t), n - 1) if n else 0
            frac = t - i
            thr = (BAYER4[y % 4][x % 4] + 0.5) / 16
            self.put(x, y, cols[i + 1] if n and frac > thr else cols[i])
        return self

    def solid(self):
        return {(x, y) for y in range(self.h) for x in range(self.w) if self.p[y][x] is not None}

    def outline(self, col="ink", diag=False):
        """Adds a 1 pixel outline around the opaque pixels."""
        body = self.solid()
        near = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        if diag:
            near += [(1, 1), (-1, 1), (1, -1), (-1, -1)]
        edge = set()
        for x, y in body:
            for dx, dy in near:
                q = (x + dx, y + dy)
                if q not in body and self.inside(*q):
                    edge.add(q)
        return self.fill(edge, col)

    def blit(self, other, ox=0, oy=0, flip=False):
        for y in range(other.h):
            for x in range(other.w):
                col = other.p[y][other.w - 1 - x if flip else x]
                if col is not None:
                    self.put(ox + x, oy + y, col)
        return self

    def swap(self, mapping):
        for row in self.p:
            for x, col in enumerate(row):
                if col in mapping:
                    row[x] = mapping[col]
        return self

    def copy(self):
        c = Canvas(self.w, self.h)
        c.p = [row[:] for row in self.p]
        return c

    def image(self):
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        px = im.load()
        for y in range(self.h):
            for x in range(self.w):
                col = self.p[y][x]
                if col is not None:
                    px[x, y] = RGB[col] + (255,)
        return im


def sheet(canvases, cols, pad=0):
    """Packs canvases of the same size in a grid. Returns the image and the cell rectangles."""
    w, h = canvases[0].w, canvases[0].h
    rows = (len(canvases) + cols - 1) // cols
    im = Image.new("RGBA", (cols * (w + pad), rows * (h + pad)), (0, 0, 0, 0))
    rects = []
    for i, c in enumerate(canvases):
        x, y = (i % cols) * (w + pad), (i // cols) * (h + pad)
        im.paste(c.image(), (x, y))
        rects.append((x, y, w, h))
    return im, rects
