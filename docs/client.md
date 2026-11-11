# Client nel browser

Il client è in `packages/client`. Il client mostra la partita e anima gli eventi del motore. Il client non calcola le regole.

## Flusso dei dati

1. Il giocatore sceglie una carta nella mano (Svelte), poi clicca un punto evidenziato del campo (PixiJS).
2. `selection.ts` riduce le azioni legali a una sola azione.
3. `GameSession` applica l'azione con il motore e riceve lo stato nuovo e gli eventi.
4. `BoardView.play()` anima gli eventi con una timeline GSAP, poi mostra lo stato esatto.
5. L'IA sceglie la sua azione in un Web Worker (`aiWorker.ts`). L'interfaccia non si blocca.

L'input resta bloccato durante le animazioni. Un clic sul campo accelera l'animazione in corso.

## File principali

| File | Contenuto |
|---|---|
| `src/game/session.ts` | Sequenza delle azioni del giocatore, dell'IA e delle animazioni. Nessun codice DOM. |
| `src/game/selection.ts` | Selezione con il clic: carta, poi slot, corsia o bersaglio. |
| `src/game/aiDriver.ts`, `src/game/aiWorker.ts` | IA nel Web Worker (browser) o nello stesso thread (test). |
| `src/render/layout.ts` | Geometria del campo 480 × 270, presa da `assets/sheets/board.json`. |
| `src/render/theme.ts` | Interfaccia `Theme` e tema provvisorio `ShapeTheme` (forme semplici). |
| `src/render/board.ts` | Campo PixiJS, stato visivo, animazioni per evento. |
| `src/ui/App.svelte`, `src/ui/Game.svelte` | Menu, mano, pulsanti, cronaca, schermata finale. |

## Tema grafico

Il campo usa il tema `SpriteTheme` (`src/render/spriteTheme.ts`). Il tema implementa l'interfaccia `Theme`.

- `loadArt()` carica gli spritesheet e i font di `assets/`. Vite copia i file nella build.
- `PixelFont` e `PixelText` disegnano il testo con i font Faro e Faro Mini.
- Il tema `ShapeTheme` resta come riserva. Il client lo usa se il caricamento degli sprite fallisce.
- La mano mostra carte complete in pixel art. Il componente `PixelCard.svelte` disegna illustrazione, cornice, nome, costo e statistiche su un canvas 64 × 88 (`pixelCanvas.ts`).
- Un Custode senza sprite usa lo sprite di riserva `keeper/unknown/idle`. Una carta senza illustrazione mostra un riquadro grigio.
- Il canvas mostra solo la parte alta della scena (`VIEW_HEIGHT` = 186 pixel). La mano è sotto il canvas.

Tre metodi di `Theme` sono opzionali: `fx` (scintille, sbuffi, colpi), `cardGhost` (illustrazione della carta giocata) e `dissolve` (dissolvenza a dithering).
`BoardView.animateEvent` applica i tempi di `assets/animations/animations.json`. Vedi [animazioni.md](animazioni.md).

L'opzione "Riduci le animazioni" è nell'intestazione della partita. Il client salva la scelta in `localStorage`.
Alla prima visita il client segue l'impostazione `prefers-reduced-motion` del sistema operativo.
Con l'opzione attiva, `BoardView` dimezza i tempi, disattiva la scossa, l'hit stop e lo squash and stretch, e genera 3 particelle su 10.

Il campo usa una scala intera (×1, ×2, ×3) e il filtro `nearest`, come chiede il piano (sezione 7.2).

## Tutorial

Il tutorial ha cinque lezioni. Ogni lezione introduce una regola.

1. Custodi e Fari.
2. Blocco e Gittata.
3. Brace e incantesimi.
4. Marea.
5. Catena e risposte.

- `packages/engine/src/scenario.ts` crea una posizione fissa con `newScenario`. La partita parte in Manovra, senza mulligan e senza mescolare.
- `packages/client/src/tutorial/lessons.ts` contiene le lezioni: scenario, avversario, obiettivo e round massimo.
- L'avversario del tutorial usa `ScriptedAiDriver`: passa, oppure segue uno script.
- I testi sono nelle chiavi `tutorial.*` dei file di lingua.
- `packages/client/test/tutorial.test.ts` controlla che ogni lezione si risolva con le mosse previste.

NOTA: tieni lo stato del gioco, le azioni e le lezioni in `$state.raw`. Il motore usa `structuredClone`, e questa funzione non copia i proxy di Svelte.
