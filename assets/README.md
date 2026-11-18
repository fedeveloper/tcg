# Art assets

This folder contains the painted art of High Tides.
The animation specification is in [docs/animations.md](../docs/animations.md).
The art style guide ([docs/guida-di-stile.md](../docs/guida-di-stile.md)) and the art plan ([docs/piano-grafica.md](../docs/piano-grafica.md)) are in Italian.

## Content

| Folder | Content |
|---|---|
| `art/` | Illustrations of the 154 cards: `web/lg`, `web/md`, `web/sm` and the Keeper medallions in `web/medal`. |
| `board/` | Horizontal sea, vertical sea and Beacons (lit, damaged, out). |
| `ui/` | Interface textures (wood, parchment, stone) and large images (title, backgrounds). |
| `animations/` | Timings and curves of the event animations (`animations.json`). |

## How the images are made

All images come from image models that run locally, never from external image services.
The PNG originals are in `*/originals/`. They are not in the repository (`.gitignore`).
Each folder has a `build.py` script that creates the `web/` files from the originals.

1. Put the originals in the correct `originals/` folder.
2. Run `pnpm assets`. The command runs the three `build.py` scripts.
3. Check the result in the game.

`pnpm art` runs only `assets/art/build.py`: illustrations and medallions.

NOTE: the scripts need Python 3. You need the originals only to change the art. The repository already contains the web images, so the game works without them.
