# Guida: installare e provare il gioco

Questa guida spiega come installare "Fari Sommersi" e come provare tutte le funzioni.
La guida ha tre parti:

1. Il gioco sul tuo computer (sviluppo e prova veloce).
2. Il gioco sul Raspberry Pi 3B o sul ThinkPad T480 (hosting di test).
3. La lista delle prove da fare.

## 1. Il gioco sul tuo computer

### 1.1 Requisiti

- **Node.js 22.13 o successivo.** Il server usa il modulo `node:sqlite`, disponibile da Node.js 22.13.
- **pnpm 10.** Corepack, incluso in Node.js, installa la versione corretta.
- **Git.**

Controlla la versione di Node.js con `node -v`.

### 1.2 Installazione

1. Scarica il codice: `git clone https://github.com/fedeveloper/tcg.git`
2. Entra nella cartella: `cd tcg`
3. Attiva pnpm: `corepack enable`
4. Installa le dipendenze: `pnpm install`

### 1.3 Gioca contro l'IA

1. Avvia il client: `pnpm dev`
2. Apri l'indirizzo che Vite mostra, per esempio `http://localhost:5173/`.
3. Nel menu, scegli il tuo mazzo, il mazzo dell'avversario e la difficoltà.
4. Premi **Gioca**.

### 1.4 Gioca online sul tuo computer

Il gioco online ha bisogno del server PvP.

1. Avvia il server in un secondo terminale: `pnpm server`
2. Controlla il server: apri `http://localhost:8787/health`. La pagina mostra `ok` e il numero di partite aperte.
3. Apri il gioco in una finestra normale del browser.
4. Apri il gioco in una finestra privata (anonima) dello stesso browser.

NOTA: le due finestre devono avere account diversi. Il browser salva il token dell'account ospite. Una finestra privata ha un account nuovo.

5. In entrambe le finestre, premi **Online**.
6. Nella prima finestra, premi **Crea una partita**. Il gioco mostra un codice di 6 caratteri.
7. Nella seconda finestra, scrivi il codice e premi **Entra**.

### 1.5 Gioca dal telefono nella stessa rete

1. Avvia il client con `pnpm dev --host`.
2. Avvia il server con `HOST=0.0.0.0 pnpm server`.
3. Cerca l'indirizzo IP del computer (esempio: `192.168.1.20`).
4. Sul telefono, apri `http://192.168.1.20:5173/`.

### 1.6 Controlli automatici

- Esegui tutti i controlli della CI: `pnpm check`
- Esegui il test di 100 partite PvP: `pnpm soak:pvp --games 100`
- Controlla il bilanciamento dei mazzi: `pnpm balance --games 20`

## 2. Il gioco sul Raspberry Pi 3B o sul ThinkPad T480

Il Raspberry Pi serve il client statico e il server PvP. Caddy fa da server web.
Il ThinkPad usa gli stessi passi. Il ThinkPad ha più RAM e una CPU x86-64, ma il server è lo stesso file.

ATTENZIONE: non compilare il progetto sul Raspberry Pi. Il Raspberry Pi ha solo 1 GB di RAM. Compila sul tuo computer e copia il risultato.

### 2.1 Prepara il Raspberry Pi (una volta sola)

1. Installa **Raspberry Pi OS Lite a 64 bit** con Raspberry Pi Imager.
2. Nel Raspberry Pi Imager, attiva SSH e scegli il nome utente (esempio: `pi`).
3. Dal tuo computer, entra nel Raspberry Pi: `ssh pi@raspberrypi.local`
4. Aggiorna il sistema: `sudo apt update && sudo apt full-upgrade -y`
5. Installa Node.js 22: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -`
6. Completa l'installazione: `sudo apt install -y nodejs rsync caddy`
7. Controlla la versione: `node -v`. La versione deve essere 22.13 o successiva.
8. Crea l'utente del servizio: `sudo useradd --system --home /opt/tcg --shell /usr/sbin/nologin tcg`
9. Crea la cartella del gioco: `sudo mkdir -p /opt/tcg && sudo chown pi /opt/tcg`

Sul ThinkPad con Linux (Debian o Ubuntu), esegui i passi da 4 a 9 nello stesso modo.

### 2.2 Installa il servizio e Caddy (una volta sola)

Esegui questi passi sul tuo computer, nella cartella `tcg`.

1. Copia i file di configurazione: `scp deploy/systemd/tcg-server.service deploy/caddy/Caddyfile.lan pi@raspberrypi.local:/tmp/`
2. Entra nel Raspberry Pi: `ssh pi@raspberrypi.local`
3. Installa il servizio: `sudo mv /tmp/tcg-server.service /etc/systemd/system/`
4. Installa la configurazione di Caddy: `sudo mv /tmp/Caddyfile.lan /etc/caddy/Caddyfile`
5. Attiva il servizio: `sudo systemctl daemon-reload && sudo systemctl enable tcg-server`
6. Ricarica Caddy: `sudo systemctl reload caddy`

`Caddyfile.lan` serve il gioco nella rete locale con HTTP, senza dominio.
Per un dominio pubblico con HTTPS, usa `deploy/caddy/Caddyfile` e scrivi il nome del tuo dominio.
Con un dominio, scrivi anche l'origine nel servizio: `Environment=ALLOWED_ORIGIN=https://tuo-dominio`.

### 2.3 Copia il gioco (a ogni aggiornamento)

Esegui questo comando sul tuo computer, nella cartella `tcg`:

1. `deploy/deploy.sh pi@raspberrypi.local`

Lo script fa queste operazioni:

- crea il client con `pnpm build`;
- crea il server con `pnpm build:server` (un solo file: `dist/server/server.mjs`);
- copia i file nel Raspberry Pi con `rsync`;
- riavvia il servizio `tcg-server`. Il Raspberry Pi chiede la password di `sudo`.

### 2.4 Controlla il Raspberry Pi

1. Apri `http://raspberrypi.local/` dal browser di un dispositivo nella stessa rete.
2. Apri `http://raspberrypi.local/health`. La pagina mostra `ok`.
3. Controlla lo stato del servizio: `systemctl status tcg-server`
4. Leggi i messaggi del server: `journalctl -u tcg-server -f`
5. Controlla la memoria: `free -h`. Il server deve usare meno di 200 MB con 10 partite.

Se `raspberrypi.local` non funziona, usa l'indirizzo IP del Raspberry Pi.

### 2.5 Dati e backup

- Il database è il file `/var/lib/tcg/tcg.sqlite`.
- Il database contiene gli account ospite, le partite e i replay.
- Per un backup, ferma il servizio e copia il file: `sudo systemctl stop tcg-server && sudo cp /var/lib/tcg/tcg.sqlite ~/backup.sqlite && sudo systemctl start tcg-server`

NOTA: la collezione, i mazzi e le corse di Spedizione e Draft restano nel browser di ogni giocatore, non sul server.

## 3. Prove da fare

Usa questa lista per provare tutte le funzioni del gioco.

| Funzione | Come provarla | Risultato atteso |
|---|---|---|
| Tutorial | Menu → **Tutorial** → lezione 1 | La lezione spiega l'obiettivo. "Lezione completata" appare alla fine. |
| Partita contro l'IA | Menu → scegli i mazzi → **Gioca** | La partita finisce con una vittoria, una sconfitta o un pareggio. |
| Ricompensa | Finisci una partita contro l'IA | Una vittoria dà 3 carte. Una sconfitta dà 10 Frammenti. |
| Collezione | Menu → **Collezione** | Crea una carta con i Frammenti. Rompi un doppione. |
| Mazzi | Menu → **Mazzi** → **Nuovo mazzo** | Il mazzo è valido con 30 carte, al massimo 2 fazioni. |
| Spedizione | Menu → **Spedizione** | 6 tappe, 2 vite, mazzo di 20 carte. |
| Draft | Menu → **Draft** | 30 scelte, poi partite fino a 7 vittorie o 3 sconfitte. |
| Partita con codice | **Online** → **Crea una partita**, poi **Entra** dall'altra finestra | La partita inizia in entrambe le finestre. |
| Partita rapida | **Online** → **Cerca un avversario** in due finestre | Il server unisce i due giocatori. |
| Timer | In una partita online, non agire | Dopo 120 secondi il server passa per te. Dopo 3 tempi scaduti di fila, perdi. |
| Riconnessione | Ricarica la pagina durante una partita online → **Online** → **Riprendi** | La partita riprende dalla stessa posizione. |
| Abbandona | **Abbandona** durante una partita online | L'avversario vince. |
| Replay | **Online** → **Replay delle partite finite** → **Guarda** | Il replay mostra la partita passo per passo. **Pausa** ferma il replay. |
| Lingua | Selettore IT/EN | Tutti i testi cambiano lingua. |
| Animazioni ridotte | Casella "Riduci le animazioni" | Le animazioni diventano brevi. |

## 4. Problemi comuni

| Problema | Causa probabile | Soluzione |
|---|---|---|
| La schermata Online mostra "Non connesso". | Il server non è attivo. | Avvia `pnpm server`, oppure controlla `systemctl status tcg-server`. |
| `node:sqlite` non esiste. | Node.js è più vecchio di 22.13. | Aggiorna Node.js. |
| Il server rifiuta la connessione dal dominio. | `ALLOWED_ORIGIN` non contiene il dominio. | Scrivi l'origine esatta nel servizio, con `https://`. |
| "Il server usa una versione nuova". | Il client e il server hanno versioni diverse. | Esegui di nuovo `deploy/deploy.sh` e ricarica la pagina. |
| Le due finestre hanno lo stesso giocatore. | Le finestre condividono il token. | Usa una finestra privata o un altro browser. |
