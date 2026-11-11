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

## Modalità e profilo

Il menu offre la Sfida libera, la Spedizione, il Draft, la Collezione, i Mazzi e il Tutorial.

- `packages/meta` contiene la logica senza interfaccia: collezione, Frammenti, ricompense, Spedizione e Draft. I test sono in `packages/meta/test`.
- `src/meta/profileStore.svelte.ts` salva il profilo nella memoria del browser (`localStorage`, chiave `tcg.profile`). Prima della fase 4 non c'è un server: il profilo resta su un solo browser.
- La collezione iniziale contiene le carte dei mazzi base. Una vittoria in Sfida libera dà 3 carte, una sconfitta 10 Frammenti.
- Un doppione oltre il limite del mazzo si rompe in Frammenti. I Frammenti creano carte (costo per rarità in `packages/meta/src/collection.ts`).
- Spedizione: un mazzo di 20 carte di una fazione, 6 avversari, 2 vite, una carta nuova dopo ogni vittoria.
- Draft: due fazioni, 30 scelte di 1 carta su 3, poi partite fino a 7 vittorie o 3 sconfitte.
- Uscire da una partita di una corsa conta come una sconfitta.

NOTA: le nuove carte senza illustrazione mostrano un riquadro vuoto. Il thread di grafica disegna le illustrazioni.

## Modalità Online

La schermata **Online** gioca contro altri giocatori tramite il server PvP (vedi [server.md](server.md)).

- `src/online/connection.ts`: la connessione WebSocket. Salva il token dell'account ospite nel browser e si riconnette da sola.
- `src/online/remoteSession.ts`: la sessione di una partita online. Il server manda una vista dopo ogni azione; la sessione anima le viste in ordine.
- `src/ui/Online.svelte`: partita rapida, partita con un codice e lista delle partite in corso.

Game.svelte usa l'interfaccia `PlaySession`. `GameSession` esegue il motore nel browser; `RemoteSession` riceve le viste dal server.
Il giocatore locale è `me`. Online, `me` può essere il posto 1: la plancia mostra sempre il giocatore locale a sinistra.
Il client calcola le azioni legali solo per l'interfaccia. Il server controlla di nuovo ogni azione.
- `src/online/replaySession.ts`: il replay di una partita online finita. Il client ricostruisce la partita da seed, mazzi e azioni, e la mostra dal posto del giocatore: le carte nascoste restano nascoste. Il pulsante "Pausa" ferma il replay.

## Accessibilità (sezione 7.4 del piano)

- **Tastiera.** Tab sposta il fuoco tra le carte e i pulsanti. Invio sceglie. P passa o conferma il mulligan. Esc annulla la scelta o chiude la scheda.
- **Scelte della plancia.** Durante una scelta, la sezione "Scegli dove" mostra le stesse caselle, corsie e bersagli evidenziati sulla plancia, come pulsanti.
- **Elenco del campo.** La sezione "Campo" elenca i Custodi dei due giocatori con posizione, Attacco e Tenuta. Il pulsante "Azioni" apre lo spostamento e le abilità di un Custode.
- **Scheda della carta.** Il clic destro o il tasto I su una carta apre la carta a schermo intero, con le parole chiave spiegate, il testo completo e il testo di colore.
- **Test.** `pnpm e2e` esegue i test end-to-end con Playwright, anche il flusso con la sola tastiera.

## Telefono in verticale (sezione 7.5 del piano)

- Sotto 700 px di larghezza e in verticale, la mano resta in basso come un ventaglio.
- La riga del giocatore resta sopra la mano, con il pulsante principale sempre visibile.
- Le carte della mano sono piccole. Il testo delle regole appare solo nella scheda della carta.
- La plancia resta orizzontale e si adatta alla larghezza. Una plancia verticale richiede nuova grafica.
- Un test e2e controlla il layout su un telefono di 412 × 915 px: mano su una riga, pulsante visibile, nessuno scorrimento orizzontale.

## Prestazioni (sezione 7.5 del piano)

- L'obiettivo è 60 fotogrammi al secondo su un telefono di fascia media del 2022.
- `PixelCard` disegna una carta solo quando la carta cambia. Una cache tiene le carte già disegnate (al massimo 300).
- Prima di questa cache, ogni aggiornamento dello stato ridisegnava tutte le carte della mano, con circa 10 canvas per carta.
- `PERF=1 pnpm e2e perf` misura una partita su un telefono con la CPU rallentata 4 volte. Il test fallisce sotto 50 fps.
- Il test non è nella CI, perché il risultato dipende dalla macchina.

| Misura (CPU 4× più lenta, 412 × 915) | Prima | Dopo |
|---|---|---|
| Fotogrammi al secondo | 57,7 | 58,8 |
| Fotogramma p99 | 49,9 ms | 33,3 ms |
| Task lunghi (oltre 50 ms) | 13 | 3 |
