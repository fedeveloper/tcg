"""Makes tileable WebP textures for the interface kit (graphics plan, phase 2).

Usage: python3 assets/ui/build.py
Reads assets/ui/originals/<name>.png (1024 x 1024 from the local models), writes assets/ui/web/<name>.webp.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
CROP = 768  # the center of the original: the model darkens the borders
SIZE = 512
QUALITY = 78


def tileable(img: Image.Image) -> Image.Image:
    w, h = img.size
    box = ((w - CROP) // 2, (h - CROP) // 2, (w + CROP) // 2, (h + CROP) // 2)
    a = np.asarray(img.crop(box).convert("RGB"), dtype=np.float32)
    rolled = np.roll(a, (CROP // 2, CROP // 2), axis=(0, 1))
    # Weight of the original: 1 in the center, 0 on the borders. The rolled copy has continuous borders.
    t = np.abs(np.linspace(-1, 1, CROP))
    edge = np.clip((1 - t) / 0.5, 0, 1)
    wgt = np.minimum.outer(edge, edge)[..., None]
    out = a * wgt + rolled * (1 - wgt)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8)).resize((SIZE, SIZE), Image.LANCZOS)


def main() -> None:
    (ROOT / "web").mkdir(exist_ok=True)
    for src in sorted((ROOT / "originals").glob("*.png")):
        tileable(Image.open(src)).save(ROOT / "web" / f"{src.stem}.webp", "WEBP", quality=QUALITY, method=6)
        print(f"{src.stem}: {SIZE}x{SIZE}")


if __name__ == "__main__":
    main()
