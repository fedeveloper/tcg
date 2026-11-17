"""Builds the card illustrations for the client (graphics plan, section 6.4).

Input: the originals (1344 x 960 PNG from the local image models) in assets/art/originals/.
The originals stay out of git. Output: 3 WebP sizes in assets/art/web/{lg,md,sm}/<cardId>.webp.

Usage: python3 assets/art/build.py [source folder]
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
SIZES = {"lg": (768, 548), "md": (384, 274), "sm": (192, 137)}
QUALITY = {"lg": 80, "md": 82, "sm": 82}


def build(src: Path) -> None:
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    if not files:
        sys.exit(f"No images in {src}")
    for size in SIZES:
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
        print(f"{path.stem}: {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "originals")
