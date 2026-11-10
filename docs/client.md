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

## Punto di aggancio per la pixel art

1. Scrivi una classe che implementa `Theme` con gli sprite di `assets/sheets`.
2. Sostituisci `new ShapeTheme(scale)` in `src/ui/Game.svelte` con la nuova classe.
3. Cambia i tempi delle animazioni in `BoardView.animateEvent` secondo `assets/animations/animations.json`.

Il campo usa una scala intera (×1, ×2, ×3) e il filtro `nearest`, come chiede il piano (sezione 7.2).
