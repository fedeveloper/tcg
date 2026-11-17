"""Builds the painted board assets (graphics plan, phase 3).

Usage: python3 assets/board/build.py
- mare-502.png -> web/sea.webp: the sea behind the lanes, 1344 x 496.
- mare-verticale-802.png -> web/sea-tall.webp: the sea of the vertical board (phase 8), 960 x 1344.
- faro-<state>-<seed>.png -> web/beacon-<lit|damaged|out>.webp: the Beacon cut out of its plain gray background.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
ORIG = ROOT / "originals"
WEB = ROOT / "web"
BEACONS = {"lit": "faro-acceso-512", "damaged": "faro-danneggiato-513", "out": "faro-spento-514"}
BEACON_H = 384  # 4 times the height of a Beacon in the scene (96 px at scale 1)


def cut_out(img: Image.Image, halo: bool) -> Image.Image:
    """Removes the plain background: pixels close to the color of the corners, connected to the border."""
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    corners = np.concatenate([a[:8, :8].reshape(-1, 3), a[:8, -8:].reshape(-1, 3), a[-8:, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    dist = np.linalg.norm(a - bg, axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    # The background is gray (low saturation) and near the corner color. The lamp glow is yellow: it stays out.
    maybe_bg = (dist < 34) & (sat < 22)
    # The soft halo of a lit lamp: warm, bright and not too saturated. The scene draws its own glow.
    lum = a.mean(axis=2)
    warm = a[..., 0] - a[..., 2]
    if halo:
        maybe_bg |= (lum > 165) & (lum < 243) & (warm > 12) & (sat < 85) & (a[..., 2] > 110)
    # Keep only background connected to the border (flood fill), so gray parts inside the tower stay.
    from collections import deque
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if maybe_bg[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if maybe_bg[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and maybe_bg[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = img.convert("RGBA")
    out.putalpha(alpha)
    return out.crop(out.getbbox())


def tall_sea() -> Image.Image:
    """The vertical sea with a softer golden path: the path runs under the middle lane and must not hide the keepers."""
    a = np.asarray(Image.open(ORIG / "mare-verticale-802.png").convert("RGB"), dtype=np.float32)
    warm = (a[..., 0] - a[..., 2]) / 255
    gold = np.clip((warm - 0.12) * 4, 0, 1)
    gold[:470] = 0  # Below the horizon only: the sky keeps its glow.
    soft = np.asarray(Image.fromarray(gold.astype(np.float32) * 255).convert("L").filter(ImageFilter.GaussianBlur(6)), dtype=np.float32) / 255
    water = np.array([38, 92, 96], dtype=np.float32)
    out = a * (1 - soft[..., None] * 0.55) + water * soft[..., None] * 0.55
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main() -> None:
    WEB.mkdir(exist_ok=True)
    Image.open(ORIG / "mare-502.png").convert("RGB").save(WEB / "sea.webp", "WEBP", quality=82, method=6)
    tall_sea().save(WEB / "sea-tall.webp", "WEBP", quality=80, method=6)
    print("sea: 1344x496")
    for state, name in BEACONS.items():
        b = cut_out(Image.open(ORIG / f"{name}.png"), halo=state == "lit")
        k = BEACON_H / b.height
        b = b.resize((round(b.width * k), BEACON_H), Image.LANCZOS)
        b.save(WEB / f"beacon-{state}.webp", "WEBP", quality=85, method=6)
        print(f"beacon-{state}: {b.width}x{b.height}")


if __name__ == "__main__":
    main()
