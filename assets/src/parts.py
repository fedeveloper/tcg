"""Shared parts for the Keeper sprites of the later factions."""
import math

from keepers import BOB, SWAY, arm, finish, flame, human, kelp, sparks  # noqa: F401
from px import RAMPS, Canvas, ell, line, move, path, poly, rect  # noqa: F401


def new():
    return Canvas(32, 32)


def limb(c, pts, ramp, t=2):
    """A bent arm, leg or tentacle."""
    if t == 1:
        c.fill(path(pts, 1), RAMPS[ramp][1])
    else:
        c.shade(path(pts, t), ramp, rim=False)


def lantern(c, x, y, lit="glow", metal="copper", core="white"):
    c.fill(rect(x - 2, y, x + 2, y + 5), lit)
    c.fill(rect(x - 2, y, x + 2, y) | rect(x - 2, y + 5, x + 2, y + 5), metal)
    c.fill(rect(x, y + 1, x, y + 4), core)
    c.fill(rect(x - 1, y - 1, x + 1, y - 1), metal)


def glints(c, x, y, f, col="glow", r=4):
    """Light points around a lamp. Draw them after the outline."""
    pts = [(x - r, y + 2), (x + r, y + 3), (x, y + r + 4)] if f % 2 == 0 else [(x - r, y + 3), (x + r, y + 2)]
    c.fill(set(pts), col)


def cog(c, cx, cy, r, f=0, ramp="copper", hub="wood_dark", teeth=8):
    """A gear wheel. It turns by one tooth in 4 frames, so the loop has no jump."""
    for i in range(teeth):
        a = (i + f / 4) * 2 * math.pi / teeth
        x0, y0 = cx + (r - 1) * math.cos(a), cy + (r - 1) * math.sin(a)
        x1, y1 = cx + (r + 1) * math.cos(a), cy + (r + 1) * math.sin(a)
        c.fill(line(round(x0), round(y0), round(x1), round(y1), 2 if r >= 5 else 1), RAMPS[ramp][1])
    c.shade(ell(cx, cy, r - 0.5, r - 0.5), ramp)
    if r >= 3:
        c.fill(ell(cx, cy, r / 3, r / 3), hub)
    else:
        c.put(cx, cy, hub)


def ghost(c, cx, top, w, bottom, f, ramp):
    """A round head on a body with a wavy hem."""
    h = w // 2
    body = ell(cx, top + w / 2, w / 2, w / 2) | rect(cx - h, top + h, cx + h, bottom - 3)
    for x in range(cx - h, cx + h + 1):
        depth = bottom - 2 + [0, 1, 2, 1][(x + f) % 4]
        body |= {(x, y) for y in range(bottom - 3, depth + 1)}
    c.shade(body, ramp)
    return body


def fade(c, y0, level=5):
    """Removes a part of the pixels below y0. The shape melts into the mist."""
    c.dither(rect(0, y0, c.w - 1, c.h - 1), None, level)


def puff(c, x, y, f, col="ash"):
    c.dither(ell(x + SWAY[f], y - f, 2 + f // 2, 1 + f // 2), col, 10 - f * 2)
