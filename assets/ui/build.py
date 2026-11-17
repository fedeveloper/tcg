"""Makes tileable WebP textures for the interface kit (graphics plan, phase 2).

Usage: python3 assets/ui/build.py
Reads assets/ui/originals/<name>.png (1024 x 1024 from the local models), writes assets/ui/web/<name>.webp.
Key art (graphics plan, phase 7) is not tiled: assets/ui/originals/key/<name>.png becomes
assets/ui/web/<name>.webp, 1600 pixels wide. titolo.png is the game anchor 3B (the lighthouse in the storm).
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
CROP = 768  # the center of the original: the model darkens the borders
SIZE = 512
QUALITY = 78
KEY_WIDTH = 1600


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
    for src in sorted((ROOT / "originals" / "key").glob("*.png")):
        img = Image.open(src).convert("RGB")
        w, h = img.size
        kw = min(KEY_WIDTH, w)
        img.resize((kw, round(h * kw / w)), Image.LANCZOS).save(ROOT / "web" / f"{src.stem}.webp", "WEBP", quality=80, method=6)
        print(f"{src.stem}: key art {KEY_WIDTH} wide")


if __name__ == "__main__":
    main()
