# TCG nel browser

Gioco di carte collezionabili originale per il browser.
Meccaniche profonde, grafica in pixel art con animazioni fluide.

Il piano di progetto è in [docs/piano-di-progetto.md](docs/piano-di-progetto.md).
Le scelte del motore delle regole sono in [docs/motore.md](docs/motore.md).

## Requisiti

- Node.js 22
- pnpm 10 (`corepack enable` attiva la versione corretta)

## Comandi

1. Installa le dipendenze: `pnpm install`
2. Gioca nel browser: `pnpm dev`, poi apri l'indirizzo che Vite mostra.
3. Gioca contro l'IA nel terminale: `pnpm play`
4. Scegli la lingua e i mazzi: `pnpm play --lang en --deck sprout --opponent forge`
5. Guarda una partita IA contro IA: `pnpm play --auto --seed 7`
6. Esegui tutti i controlli della CI: `pnpm check`

| Comando | Effetto |
|---|---|
| `pnpm typecheck` | Controlla i tipi TypeScript. |
| `pnpm test` | Esegue i test unitari e i test basati su proprietà. |
| `pnpm validate:cards` | Controlla i file delle carte. |
| `pnpm check:i18n` | Controlla che ogni testo esista in italiano e in inglese. |
| `pnpm build` | Crea il client statico in `packages/client/dist`. |
| `pnpm duel --a medium --b easy` | Confronta due livelli di IA. |
| `pnpm sim --games 500` | Simula 500 partite e controlla le regole dopo ogni azione. |

I mazzi disponibili per `--deck` e `--opponent` sono `forge`, `sprout` e `forgeSprout`.

## Struttura

| Pacchetto | Contenuto |
|---|---|
| `packages/engine` | Motore delle regole: puro, deterministico, senza grafica. |
| `packages/cards` | Dati delle carte (JSON), schema Zod, validatore, mazzi base. |
| `packages/i18n` | Testi in italiano e inglese, testo delle regole generato dagli effetti. |
| `packages/ai` | IA facile (euristica) e giocatore casuale. |
| `packages/client` | Gioco nel browser: Svelte, PixiJS, GSAP, IA in un Web Worker. Vedi [docs/client.md](docs/client.md). |
| `packages/tools` | Interfaccia testuale, simulatore, strumenti di controllo. |

## Licenza

Tutti i diritti riservati.
