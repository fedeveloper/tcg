# TCG nel browser

Gioco di carte collezionabili originale per il browser.
Meccaniche profonde, grafica in pixel art con animazioni fluide.

**Per installare e provare il gioco, leggi [docs/guida-installazione.md](docs/guida-installazione.md).**

Il piano di progetto è in [docs/piano-di-progetto.md](docs/piano-di-progetto.md).
Le scelte del motore delle regole sono in [docs/motore.md](docs/motore.md).
Le regole della pixel art sono in [docs/guida-di-stile.md](docs/guida-di-stile.md).
Le specifiche di animazione sono in [docs/animazioni.md](docs/animazioni.md).
Il server PvP e il deploy sul Raspberry Pi sono in [docs/server.md](docs/server.md).

## Requisiti

- Node.js 22
- pnpm 10 (`corepack enable` attiva la versione corretta)

## Comandi

1. Installa le dipendenze: `pnpm install`
2. Gioca nel browser: `pnpm dev`, poi apri l'indirizzo che Vite mostra.
3. Gioca online: avvia `pnpm server` in un secondo terminale, poi apri la schermata Online del client.
4. Gioca contro l'IA nel terminale: `pnpm play`
5. Scegli la lingua e i mazzi: `pnpm play --lang en --deck sprout --opponent forge`
6. Guarda una partita IA contro IA: `pnpm play --auto --seed 7`
7. Esegui tutti i controlli della CI: `pnpm check`

| Comando | Effetto |
|---|---|
| `pnpm typecheck` | Controlla i tipi TypeScript. |
| `pnpm test` | Esegue i test unitari e i test basati su proprietà. |
| `pnpm validate:cards` | Controlla i file delle carte. |
| `pnpm check:i18n` | Controlla che ogni testo esista in italiano e in inglese. |
| `pnpm build` | Crea il client statico in `packages/client/dist`. |
| `pnpm duel --a medium --b easy` | Confronta due livelli di IA. |
| `pnpm balance --games 20` | Gioca tutte le coppie di mazzi base e mostra le percentuali di vittoria. |
| `pnpm sim --games 500` | Simula 500 partite e controlla le regole dopo ogni azione. |
| `pnpm soak:pvp --games 100` | Gioca 100 partite PvP tramite il server e controlla la sincronizzazione. |
| `pnpm server` | Avvia il server PvP (porta 8787). |
| `pnpm build:server` | Crea il server in un solo file: `dist/server/server.mjs`. |

I mazzi disponibili per `--deck` e `--opponent` sono `forge`, `sprout`, `forgeSprout`, `abyss`, `gear` e `vesper`.

## Struttura

| Pacchetto | Contenuto |
|---|---|
| `packages/engine` | Motore delle regole: puro, deterministico, senza grafica. |
| `packages/cards` | Dati delle carte (JSON), schema Zod, validatore, mazzi base. |
| `packages/i18n` | Testi in italiano e inglese, testo delle regole generato dagli effetti. |
| `packages/ai` | IA facile (euristica), IA media (ricerca) e giocatore casuale. |
| `packages/meta` | Collezione, Frammenti, Spedizione e Draft. |
| `packages/protocol` | Messaggi tra il client e il server PvP (Zod). |
| `packages/server` | Server PvP: WebSocket, SQLite, replay. Vedi [docs/server.md](docs/server.md). |
| `packages/client` | Gioco nel browser: Svelte, PixiJS, GSAP, IA in un Web Worker. Vedi [docs/client.md](docs/client.md). |
| `packages/tools` | Interfaccia testuale, simulatore, strumenti di controllo. |

## Licenza

Tutti i diritti riservati.
