# Installation guide

This guide explains how to install High Tides, play it and test all its features.
It has five parts:

1. [Play on your computer](#1-play-on-your-computer)
2. [Host the game on a Linux server](#2-host-the-game-on-a-linux-server)
3. [Public hosting with Docker](#3-public-hosting-with-docker)
4. [Feature checklist](#4-feature-checklist)
5. [Troubleshooting](#5-troubleshooting)

## 1. Play on your computer

### 1.1 Requirements

- **Node.js 22.13 or later.** The server uses the `node:sqlite` module. This module is available from Node.js 22.13.
- **pnpm 10.** Corepack is included in Node.js and installs the correct pnpm version.
- **Git.**

Check your Node.js version with `node -v`.

The project works on Windows, macOS and Linux.

### 1.2 Install

1. Clone the repository: `git clone https://github.com/fedeveloper/tcg.git`
2. Go into the folder: `cd tcg`
3. Enable pnpm: `corepack enable`
4. Install the dependencies: `pnpm install`

NOTE: if `corepack enable` fails because of missing permissions, prefix every pnpm command with `corepack`. Example: `corepack pnpm install`.

### 1.3 Play against the AI

1. Start the client: `pnpm dev`
2. Open the address that Vite shows. The default address is `http://localhost:5173/`.
3. In the menu, choose your deck, the opponent's deck and the difficulty.
4. Click **Play**.

The game uses the language of your browser: English or Italian. To change it, use the language selector in the menu.

You do not need the server to play against the AI. The AI runs in your browser.

### 1.4 Play online on your computer

Online play needs the PvP server.

1. Start the server in a second terminal: `pnpm start:server`
2. Check the server: open `http://localhost:8787/health`. The page shows `ok`, the number of open matches (`matches`) and the server memory (`rss`).
3. Open the game in a normal browser window.
4. Open the game in a private (incognito) window of the same browser.

NOTE: the two windows must have different accounts. The browser saves the guest account token. A private window gets a new account.

5. In both windows, click **Online**.
6. In the first window, click **Create a match**. The game shows a 6-character code.
7. In the second window, type the code and click **Join**.

### 1.5 Play from a phone in the same network

1. Start the client with `pnpm dev --host`.
2. Start the server with `HOST=0.0.0.0 pnpm start:server`.
3. Find the IP address of your computer (example: `192.168.1.20`).
4. On the phone, open `http://192.168.1.20:5173/`.

On Windows (PowerShell), set the variable in a different way: `$env:HOST="0.0.0.0"; pnpm start:server`.

### 1.6 Automatic checks

- Run all the CI checks: `pnpm check`
- Run the test with 100 PvP matches: `pnpm soak:pvp --games 100`
- Check the balance of the starter decks: `pnpm balance --games 20`
- Test a running server with 10 matches at the same time: `pnpm smoke --matches 10`

## 2. Host the game on a Linux server

This part installs the game on a Linux server (Debian, Ubuntu or a similar distribution).
The server serves the static client and runs the PvP server. Caddy is the web server.

The PvP server is light. A single-board computer with 1 GB of RAM can host it.
The same steps work on a normal x86-64 server: the server build is one JavaScript file that runs on any CPU.

ATTENTION: do not build the project on a server with little RAM (for example 1 GB). The build can fail or take a very long time. Build on your computer and copy the result. The deploy script in step 2.3 does this for you.

In this part, `user@your-server` is the SSH login of your server. Replace it with your own.

### 2.1 Prepare the server (one time only)

1. Install a 64-bit Linux distribution and enable SSH.
2. From your computer, connect to the server: `ssh user@your-server`
3. Update the system: `sudo apt update && sudo apt full-upgrade -y`
4. Add the Node.js 22 package source: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -`
5. Install Node.js, rsync and Caddy: `sudo apt install -y nodejs rsync caddy`
6. Check the version: `node -v`. The version must be 22.13 or later.
7. Create the service user: `sudo useradd --system --home /opt/tcg --shell /usr/sbin/nologin tcg`
8. Create the game folder and give it to your SSH user: `sudo mkdir -p /opt/tcg && sudo chown $USER /opt/tcg`

### 2.2 Install the service and Caddy (one time only)

Do these steps on your computer, in the `tcg` folder.

1. Copy the configuration files: `scp deploy/systemd/tcg-* deploy/caddy/Caddyfile.lan user@your-server:/tmp/`
2. Connect to the server: `ssh user@your-server`
3. Install the service and the backup: `sudo mv /tmp/tcg-server.service /tmp/tcg-backup.service /tmp/tcg-backup.timer /etc/systemd/system/`
4. Install the Caddy configuration: `sudo mv /tmp/Caddyfile.lan /etc/caddy/Caddyfile`
5. Enable the service: `sudo systemctl daemon-reload && sudo systemctl enable tcg-server`
6. Enable the daily backup: `sudo systemctl enable --now tcg-backup.timer`
7. Reload Caddy: `sudo systemctl reload caddy`

`Caddyfile.lan` serves the game in your local network over HTTP, without a domain.

For a public domain with HTTPS:

1. Use `deploy/caddy/Caddyfile` in place of `Caddyfile.lan`.
2. In that file, replace `tcg.example.org` with your domain. Caddy gets the HTTPS certificate.
3. In `/etc/systemd/system/tcg-server.service`, write your origin: `Environment=ALLOWED_ORIGIN=https://your-domain`.
4. Run `sudo systemctl daemon-reload`.

### 2.3 Deploy the game (at each update)

Run this command on your computer, in the `tcg` folder:

1. `deploy/deploy.sh user@your-server`

The script does these operations:

- builds the client with `pnpm build`;
- builds the server with `pnpm build:server` (one file: `dist/server/server.mjs`);
- copies the files to `/opt/tcg` on the server with `rsync`;
- restarts the `tcg-server` service. The server asks for your `sudo` password.

NOTE: the script needs Bash, `rsync` and `ssh` on your computer. On Windows, use WSL or Git Bash.

### 2.4 Check the server

1. Open `http://your-server/` in the browser of a device in the same network.
2. Open `http://your-server/health`. The page shows `ok`, the open matches and the server memory.
3. On the server, check the service status: `systemctl status tcg-server`
4. On the server, follow the server log: `journalctl -u tcg-server -f`
5. From your computer, play one automatic match on the server: `pnpm smoke --url ws://your-server/ws`
6. From your computer, test the load of 10 matches at the same time: `pnpm smoke --url ws://your-server/ws --matches 10`
7. Read the `health after` line. The `rss` value must stay below 200 MB.

`pnpm smoke` shows the finished matches, the failed matches and the server response time (median and p95).
On an x86-64 computer, 10 matches at the same time use about 105 MB, and the median response is about 8 ms.
A small ARM board has a slower CPU: a median response below 100 ms is a good result there.

NOTE: the `pnpm smoke` matches create test guest accounts in the database.

### 2.5 Data and backup

- The database is the file `/var/lib/tcg/tcg.sqlite`.
- The database contains the guest accounts, the matches and the replays.
- The `tcg-backup.timer` timer makes a copy every day at 04:00 in the folder `/var/lib/tcg/backups`. The timer keeps the last 14 copies.
- The backup works also while the server runs.
- To make a backup now, run: `sudo systemctl start tcg-backup.service`
- To list the copies, run: `sudo ls /var/lib/tcg/backups`

To restore a copy:

1. Stop the service: `sudo systemctl stop tcg-server`
2. Copy the backup over the database: `sudo cp /var/lib/tcg/backups/<file>.sqlite /var/lib/tcg/tcg.sqlite`
3. Delete the temporary files: `sudo rm -f /var/lib/tcg/tcg.sqlite-wal /var/lib/tcg/tcg.sqlite-shm`
4. Start the service: `sudo systemctl start tcg-server`

NOTE: the collection, the decks and the Expedition and Draft runs stay in the browser of each player, not on the server.

## 3. Public hosting with Docker

The Docker image is for a VPS or a container service. Part 2 does not use Docker.

1. Build the image from the `tcg` folder: `docker build -f deploy/docker/Dockerfile -t tcg-server .`
2. Start the server: `docker run -d --name tcg -p 8787:8787 -v tcg-data:/data -e ALLOWED_ORIGIN=https://your-domain tcg-server`
3. Check the status: `docker ps`. The STATUS column shows `healthy`.
4. To make a backup, run: `docker exec tcg node backup.mjs /data/tcg.sqlite /data/backups 14`

The image contains only the server. Put the static client (`packages/client/dist`) on a static host or a CDN, for example Cloudflare Pages.
If the server has a different domain from the client, build the client with `VITE_SERVER_URL=wss://your-server/ws pnpm build`.

## 4. Feature checklist

Use this list to test all the features of the game.

| Feature | How to test it | Expected result |
|---|---|---|
| Tutorial | Menu → **Tutorial** → lesson 1 | The lesson explains the goal. "Lesson complete!" appears at the end. |
| Match against the AI | Menu → choose the decks → **Play** | The match ends with a win, a loss or a draw. |
| Reward | Finish a match against the AI | A win gives 3 cards. A loss gives 10 Shards. |
| Collection | Menu → **Collection** | Create a card with Shards. Break an extra copy. |
| Decks | Menu → **Decks** → **New deck** | The deck is valid with 30 cards and at most 2 factions. |
| Expedition | Menu → **Expedition** | 6 stages, 2 lives, a 20-card deck. |
| Draft | Menu → **Draft** | 30 picks, then matches until 7 wins or 3 losses. |
| Match with a code | **Online** → **Create a match**, then **Join** from the other window | The match starts in both windows. |
| Quick match | **Online** → **Find an opponent** in two windows | The server pairs the two players. |
| Timer | In an online match, do nothing | After 120 seconds the server passes for you. After 3 timeouts in a row, you lose. |
| Reconnection | Reload the page during an online match → **Online** → **Resume** | The match continues from the same position. |
| Concede | **Concede** during an online match | The opponent wins. |
| Replay | **Online** → **Replays of finished matches** → **Watch** | The replay shows the match step by step. **Pause** stops the replay. |
| Language | Language selector (EN/IT) | All the texts change language. |
| Reduced animations | **Options** → "Reduce animations" | The animations become short. |
| Board | **Options** → **Board** → Automatic, Horizontal or Vertical | The board changes from the next match. |

## 5. Troubleshooting

| Problem | Probable cause | Solution |
|---|---|---|
| The Online screen shows "Not connected". | The server does not run. | Start `pnpm start:server`, or check `systemctl status tcg-server`. |
| `node:sqlite` does not exist. | Node.js is older than 22.13. | Update Node.js. |
| The server refuses connections from your domain. | `ALLOWED_ORIGIN` does not contain the domain. | Write the exact origin in the service, with `https://`. |
| "The server uses a new version. Reload the page." | The client and the server have different versions. | Run `deploy/deploy.sh` again and reload the page. |
| The two windows have the same player. | The windows share the token. | Use a private window or another browser. |
| The phone cannot open the game. | The client or the server listens only on `localhost`. | Use `pnpm dev --host` and `HOST=0.0.0.0`. Check the firewall of your computer. |
