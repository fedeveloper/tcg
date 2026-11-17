# Asset grafici

Questa cartella contiene la grafica dipinta di High Tides.
Le regole di stile sono in [docs/guida-di-stile.md](../docs/guida-di-stile.md).
Il piano della grafica è in [docs/piano-grafica.md](../docs/piano-grafica.md).
Le specifiche di animazione sono in [docs/animazioni.md](../docs/animazioni.md).

## Contenuto

| Cartella | Contenuto |
|---|---|
| `art/` | Illustrazioni delle 154 carte: `web/lg`, `web/md`, `web/sm` e i medaglioni dei Custodi in `web/medal`. |
| `board/` | Mare orizzontale, mare verticale e Fari (acceso, danneggiato, spento). |
| `ui/` | Texture dell'interfaccia (legno, pergamena, pietra) e immagini grandi (titolo, sfondi). |
| `animations/` | Tempi e curve delle animazioni degli eventi (`animations.json`). |

## Come nascono le immagini

Le immagini nascono dai modelli locali sul PC di Federico (local-image-mcp), mai da servizi esterni.
Gli originali PNG stanno in `*/originals/` e non sono nel repository (`.gitignore`).
Ogni cartella ha uno script `build.py` che produce i file `web/` dagli originali.

1. Metti gli originali nella cartella `originals/` giusta.
2. Esegui `pnpm assets`. Il comando esegue i tre script `build.py`.
3. Controlla il risultato nel gioco.

`pnpm art` esegue solo `assets/art/build.py`: illustrazioni e medaglioni.
