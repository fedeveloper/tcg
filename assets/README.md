# Asset grafici

Questa cartella contiene la pixel art di Fari Sommersi.
Le regole di stile sono in [docs/guida-di-stile.md](../docs/guida-di-stile.md).
Le specifiche di animazione sono in [docs/animazioni.md](../docs/animazioni.md).

## Contenuto

| Cartella | Contenuto |
|---|---|
| `src/` | Sorgenti. Script Python che disegnano ogni asset. |
| `sheets/` | Spritesheet PNG e file JSON nel formato di PixiJS. |
| `fonts/` | Font Faro e Faro Mini nel formato BMFont (`.fnt` + `.png`). |
| `palette/` | Palette "Fari 32" (`.gpl`, `.json`, `.png`). |
| `animations/` | Tempi e curve delle animazioni degli eventi (`animations.json`). |
| `preview/` | Anteprime ingrandite. Il gioco non usa questi file. |

## Sorgenti

I sorgenti sono codice, non file Aseprite.
Ogni asset nasce da forme semplici e da una rampa di 3 toni.
Questo metodo mantiene lo stile uguale su tutti gli asset.
Il file `palette/fari-32.gpl` permette di ritoccare un PNG in Aseprite.

| File | Contenuto |
|---|---|
| `palette.py` | I 32 colori e i colori delle fazioni |
| `px.py` | Strumenti di disegno: forme, rampe, dithering, contorno |
| `keepers.py` | 30 Custodi di Fucina e Germoglio, 4 fotogrammi di riposo ciascuno |
| `keepers_abyss.py`, `keepers_gear.py`, `keepers_vesper.py`, `keepers_neutral.py` | 62 Custodi delle altre fazioni |
| `parts.py` | Parti comuni dei Custodi: lanterna, ruota dentata, spettro |
| `cards.py` | Sfondi e scene di Fucina e Germoglio (56 × 40) |
| `scenes_set.py` | Sfondi e scene di Abisso, Ingranaggio, Vespro e carte neutrali |
| `roster.py` | Elenco completo: 92 Custodi e 154 illustrazioni |
| `preview-cards.json` | Nomi e numeri per le anteprime delle carte che i dati non contengono ancora |
| `ui.py` | Cornici delle carte, retro, icone, indicatore della Marea, effetti |
| `beacon.py` | Faro: acceso, danneggiato, spento |
| `board.py` | Tabellone 480 × 270 e coordinate |
| `font.py` | Glifi dei 2 font |
| `build.py` | Genera tutti i file |

## Come generare gli asset

1. Installa Python 3.10 o successivo.
2. Installa Pillow: `pip install -r assets/src/requirements.txt`
3. Esegui: `pnpm assets`

Il risultato è deterministico. Lo stesso sorgente produce sempre gli stessi file.

## Come caricare gli asset in PixiJS v8

```ts
import { Assets, AnimatedSprite, TextureSource } from "pixi.js";

TextureSource.defaultOptions.scaleMode = "nearest";

const keepers = await Assets.load("sheets/keepers.json");
const sprite = new AnimatedSprite(keepers.animations["keeper/forge-003/idle"]);
sprite.animationSpeed = 1000 / 180 / 60; // 180 ms per frame
sprite.anchor.set(0.5, 30 / 32);          // the feet
sprite.play();

await Assets.load("fonts/faro.fnt");      // then: new BitmapText({ text, style: { fontFamily: "Faro" } })
const layout = await Assets.load("sheets/board.json");
```
