"""Builds the card illustrations for the client (graphics plan, section 6.4).

Input: the originals (1344 x 960 PNG from the local image models) in assets/art/originals/.
The originals stay out of git. Output: 3 WebP sizes in assets/art/web/{lg,md,sm}/<cardId>.webp.

Keepers also get a round medallion for the board (graphics plan, phase 5):
assets/art/web/medal/<cardId>.webp, cut around the point in assets/art/crops.json.

Usage: python3 assets/art/build.py [source folder]
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SIZES = {"lg": (768, 548), "md": (384, 274), "sm": (192, 137)}
QUALITY = {"lg": 80, "md": 82, "sm": 82}
MEDAL = 192
CROPS = json.loads((ROOT / "crops.json").read_text())


def medal(image: Image.Image, crop: dict) -> Image.Image:
    """A round cut of the image. crop: centre x and y (0..1 of the width and height), radius r (0..1 of the height)."""
    iw, ih = image.size
    r = min(crop["r"] * ih, iw / 2, ih / 2)
    cx = min(max(crop["x"] * iw, r), iw - r)
    cy = min(max(crop["y"] * ih, r), ih - r)
    out = image.crop((round(cx - r), round(cy - r), round(cx + r), round(cy + r))).resize((MEDAL, MEDAL), Image.Resampling.LANCZOS)
    # A smooth round mask: draw it 4 times larger, then reduce it.
    mask = Image.new("L", (MEDAL * 4, MEDAL * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, MEDAL * 4 - 1, MEDAL * 4 - 1), fill=255)
    out = out.convert("RGBA")
    out.putalpha(mask.resize((MEDAL, MEDAL), Image.Resampling.LANCZOS))
    return out


def build(src: Path) -> None:
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    if not files:
        sys.exit(f"No images in {src}")
    for size in [*SIZES, "medal"]:
        (ROOT / "web" / size).mkdir(parents=True, exist_ok=True)
    for path in files:
        image = Image.open(path).convert("RGB")
        for size, (w, h) in SIZES.items():
            # Crop to the 7:5 frame of the card, then resize.
            ratio = w / h
            iw, ih = image.size
            if iw / ih > ratio:
                cw = round(ih * ratio)
                box = ((iw - cw) // 2, 0, (iw - cw) // 2 + cw, ih)
            else:
                ch = round(iw / ratio)
                box = (0, (ih - ch) // 2, iw, (ih - ch) // 2 + ch)
            out = image.crop(box).resize((w, h), Image.Resampling.LANCZOS)
            out.save(ROOT / "web" / size / f"{path.stem}.webp", "WEBP", quality=QUALITY[size], method=6)
        if path.stem in CROPS:
            medal(image, CROPS[path.stem]).save(ROOT / "web" / "medal" / f"{path.stem}.webp", "WEBP", quality=85, method=6)
        print(f"{path.stem}: {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "originals")
