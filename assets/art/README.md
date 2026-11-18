# Painted illustrations

This folder contains the HD card illustrations.

- `originals/`: the 1344 × 960 originals from the local image models. Git ignores this folder.
- `meta/<cardId>.json`: model, seed, references and prompt of each illustration.
- `web/{lg,md,sm}/<cardId>.webp`: the versions for the game (768, 384 and 192 px wide, 7:5 ratio).

To create the web versions:

1. Copy the originals to `assets/art/originals/`.
2. Run `pnpm art`.
