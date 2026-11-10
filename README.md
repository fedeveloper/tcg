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
2. Gioca contro l'IA nel terminale: `pnpm play`
3. Scegli la lingua e i mazzi: `pnpm play --lang en --deck sprout --opponent forge`
4. Guarda una partita IA contro IA: `pnpm play --auto --seed 7`
5. Esegui tutti i controlli della CI: `pnpm check`

| Comando | Effetto |
|---|---|
| `pnpm typecheck` | Controlla i tipi TypeScript. |
| `pnpm test` | Esegue i test unitari e i test basati su proprietà. |
| `pnpm validate:cards` | Controlla i file delle carte. |
| `pnpm check:i18n` | Controlla che ogni testo esista in italiano e in inglese. |
| `pnpm sim --games 500` | Simula 500 partite e controlla le regole dopo ogni azione. |

I mazzi disponibili per `--deck` e `--opponent` sono `forge`, `sprout` e `forgeSprout`.

## Struttura

| Pacchetto | Contenuto |
|---|---|
| `packages/engine` | Motore delle regole: puro, deterministico, senza grafica. |
| `packages/cards` | Dati delle carte (JSON), schema Zod, validatore, mazzi base. |
| `packages/i18n` | Testi in italiano e inglese, testo delle regole generato dagli effetti. |
| `packages/ai` | IA facile (euristica) e giocatore casuale. |
| `packages/tools` | Interfaccia testuale, simulatore, strumenti di controllo. |

## Licenza

Tutti i diritti riservati.
