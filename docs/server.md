# Server PvP

Questo documento descrive il server delle partite tra giocatori (fase 4 del piano).
Il codice è in `packages/server`. Il protocollo dei messaggi è in `packages/protocol`.

## Principi

- Il server è **autoritativo**. Il server esegue il motore delle regole e decide ogni risultato.
- Il client manda solo azioni. Il server controlla la forma (Zod) e la legalità (motore).
- Ogni giocatore riceve solo la sua **vista**: le carte nascoste dell'avversario arrivano come `hidden`.
- Il server non esegue l'IA. Le partite contro l'IA restano nel browser.

## Avvio

1. Avvia il server in sviluppo con `pnpm server`.
2. Avvia il client con `pnpm dev`.
3. Apri la schermata **Online** del client.

In sviluppo il client usa `ws://<host>:8787/ws`.
In produzione il client usa `wss://<host>/ws` sullo stesso dominio, dietro Caddy.
La variabile `VITE_SERVER_URL` cambia questo indirizzo al momento del build.

## Configurazione

Il server legge le variabili d'ambiente.

| Variabile | Valore predefinito | Significato |
|---|---|---|
| `PORT` | `8787` | Porta HTTP e WebSocket. |
| `HOST` | `127.0.0.1` | Indirizzo di ascolto. Caddy inoltra le connessioni da fuori. |
| `DB_PATH` | `tcg.sqlite` | File del database SQLite. |
| `ALLOWED_ORIGIN` | vuoto | Origini del browser consentite, separate da virgole. Vuoto: tutte le origini. |
| `TURN_SECONDS` | `120` | Tempo per una decisione, in secondi. |
| `MAX_TIMEOUTS` | `3` | Dopo questo numero di tempi scaduti di fila, il giocatore perde. |

## Database

Il server usa `node:sqlite`, il modulo SQLite incluso in Node.js 22.13 o successivo.
Questa scelta sostituisce `better-sqlite3` del piano: il server non ha dipendenze native.
Così il build per il Raspberry Pi non richiede binari ARM.
Node.js stampa un avviso `ExperimentalWarning`. L'unità systemd nasconde questo avviso.

Il database ha due tabelle:

- `players`: account ospite. Il database salva solo l'hash SHA-256 del token, non il token.
- `matches`: una riga per partita, con seed, mazzi, nomi, stato e lista delle azioni.

La lista delle azioni è anche il **replay**. Il motore è deterministico: seed, mazzi e azioni ricostruiscono la partita.
Dopo un riavvio, il server ricostruisce le partite aperte dalla lista delle azioni.

## Partite

- **Account ospite.** Il primo messaggio `hello` crea un account e restituisce un token. Il client salva il token nel browser.
- **Partita privata.** `createMatch` restituisce un codice di 6 caratteri. L'amico usa `joinMatch` con il codice.
- **Partita rapida.** `queue` mette il giocatore in coda. Il server unisce i primi due giocatori.
- **Posti.** Il server sceglie a caso chi gioca per primo.
- **Timer.** Ogni decisione ha un tempo limite (`TURN_SECONDS`). Quando il tempo scade, il server gioca "Passa" o tiene la mano iniziale.
- **Riconnessione.** Il client manda `resume` e riceve la vista attuale.
- **Numero di sequenza.** Ogni azione porta il numero `seq`. Il server rifiuta un'azione con una vista vecchia e manda la vista nuova.
- **Mazzi.** Il server controlla le regole del mazzo. La collezione resta nel browser, quindi il server non controlla il possesso delle carte.

## Sicurezza

- Messaggi più grandi di 16 KB chiudono la connessione.
- Ogni connessione può mandare al massimo 40 messaggi in 10 secondi.
- `ALLOWED_ORIGIN` blocca le pagine di altri domini.
- I nomi dei giocatori perdono i caratteri di controllo e i caratteri `<` e `>`.

## Build e deploy sul Raspberry Pi

ATTENZIONE: non compilare il progetto sul Raspberry Pi. Il Raspberry Pi ha solo 1 GB di RAM.

`pnpm build:server` crea un solo file JavaScript: `dist/server/server.mjs`.
Il file contiene il motore, le carte e la libreria `ws`. Il Raspberry Pi non ha bisogno di `node_modules`.

Prepara il Raspberry Pi una volta sola:

1. Installa Raspberry Pi OS Lite a 64 bit.
2. Installa Node.js 22.13 o successivo.
3. Installa Caddy.
4. Crea l'utente di sistema: `sudo useradd --system --home /opt/tcg tcg`.
5. Crea la cartella: `sudo mkdir -p /opt/tcg && sudo chown $USER /opt/tcg`.
6. Copia `deploy/systemd/tcg-server.service` in `/etc/systemd/system/`.
7. Scrivi il dominio in `ALLOWED_ORIGIN` nel file dell'unità.
8. Copia `deploy/caddy/Caddyfile` in `/etc/caddy/Caddyfile` e scrivi il nome del tuo host.
9. Esegui `sudo systemctl enable tcg-server` e `sudo systemctl reload caddy`.

Aggiorna il gioco dal computer di sviluppo:

1. Esegui `deploy/deploy.sh pi@raspberrypi.local`.

Lo script esegue il build del client e del server, copia i file con `rsync` e riavvia il servizio.

## Memoria

Un test misura la memoria del server con 10 partite attive. Il test fallisce sopra 200 MB.
L'unità systemd limita Node.js a 256 MB di heap e il servizio a 300 MB.

## Test di sincronizzazione

`pnpm soak:pvp --games 100` gioca 100 partite tramite il server. Il comando è il criterio di uscita della fase 4.
Ogni giocatore sceglie le azioni solo dalla sua vista, con l'IA facile.
Ogni quinta partita, un giocatore perde la connessione e riprende la partita.
Alla fine di ogni partita, il comando ricostruisce la partita dal replay e confronta ogni vista ricevuta.
Il comando fallisce quando il server rifiuta un'azione legale o quando una vista è diversa dal replay.
La CI esegue questo comando.
