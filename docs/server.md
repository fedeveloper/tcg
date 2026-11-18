# PvP server

This document describes the server for matches between players.
The code is in `packages/server`. The message protocol is in `packages/protocol`.
For installation steps, read the [installation guide](installation.md).

## Principles

- The server is **authoritative**. The server runs the rules engine and decides every result.
- The client sends only actions. The server checks their shape (Zod) and their legality (engine).
- Each player receives only their own **view**: the hidden cards of the opponent arrive as `hidden`.
- The server does not run the AI. Matches against the AI stay in the browser.

## Start

1. Start the server in development with `pnpm start:server`.
2. Start the client with `pnpm dev`.
3. Open the **Online** screen of the client.

In development, the client uses `ws://<host>:8787/ws`.
In production, the client uses `wss://<host>/ws` on the same domain, behind Caddy.
The `VITE_SERVER_URL` variable changes this address at build time.

## Configuration

The server reads these environment variables.

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8787` | HTTP and WebSocket port. |
| `HOST` | `127.0.0.1` | Listen address. Caddy forwards the connections from outside. |
| `DB_PATH` | `tcg.sqlite` | SQLite database file. |
| `ALLOWED_ORIGIN` | empty | Allowed browser origins, separated by commas. Empty: all origins. |
| `TURN_SECONDS` | `120` | Time for one decision, in seconds. |
| `MAX_TIMEOUTS` | `3` | After this number of timeouts in a row, the player loses. |

## Database

The server uses `node:sqlite`, the SQLite module included in Node.js 22.13 or later.
The server has no native dependencies, so the build needs no platform-specific binaries (for example for ARM).
Node.js prints an `ExperimentalWarning`. The systemd unit hides this warning.

The database has two tables:

- `players`: guest accounts. The database saves only the SHA-256 hash of the token, not the token.
- `matches`: one row for each match, with seed, decks, names, status and list of actions.

The list of actions is also the **replay**. The engine is deterministic: seed, decks and actions rebuild the match.
After a restart, the server rebuilds the open matches from their lists of actions.

## Matches

- **Guest account.** The first `hello` message creates an account and returns a token. The client saves the token in the browser.
- **Private match.** `createMatch` returns a 6-character code. The friend sends `joinMatch` with the code.
- **Quick match.** `queue` puts the player in a queue. The server pairs the first two players.
- **Seats.** The server chooses at random who plays first.
- **Timer.** Each decision has a time limit (`TURN_SECONDS`). When the time runs out, the server plays "Pass" or keeps the starting hand.
- **Reconnection.** The client sends `resume` and receives the current view.
- **Sequence number.** Each action carries a `seq` number. The server refuses an action made on an old view and sends the new view.
- **Decks.** The server checks the deck rules. The collection stays in the browser, so the server does not check card ownership.

## Security

- A message larger than 16 KB closes the connection.
- Each connection can send at most 40 messages in 10 seconds.
- `ALLOWED_ORIGIN` blocks pages from other domains.
- Player names lose control characters and the characters `<` and `>`.

## Build and deploy

ATTENTION: do not build the project on a server with little RAM. Build on your computer and copy the result.

`pnpm build:server` creates one JavaScript file: `dist/server/server.mjs`.
The file contains the engine, the cards and the `ws` library. The server machine does not need `node_modules`.

`deploy/deploy.sh user@your-server` builds the client and the server, copies the files with `rsync` and restarts the service.
The [installation guide](installation.md#2-host-the-game-on-a-linux-server) gives all the steps.

## Memory

A test measures the server memory with 10 active matches. The test fails above 200 MB.
The systemd unit limits the Node.js heap to 256 MB and the service to 300 MB.

## Synchronization test

`pnpm soak:pvp --games 100` plays 100 matches through the server.
Each player chooses actions only from their own view, with the easy AI.
In every fifth match, one player loses the connection and resumes the match.
At the end of each match, the command rebuilds the match from the replay and compares every view that the players received.
The command fails when the server refuses a legal action, or when a view is different from the replay.
The CI runs this command.

## Test of an installed server

`pnpm smoke --url ws://<host>/ws --matches 10` plays complete matches on the installed server, through WebSocket.
The command shows the finished matches, the response time (median and p95) and the server memory before and after.
Each player waits 260 ms between two actions, because the server accepts at most 40 messages in 10 s.
`GET /health` answers with `ok`, the open matches, the memory (RSS) and the uptime.

## Backup

`deploy/backup.mjs` copies the database with `VACUUM INTO`. The copy is consistent also while the server runs.
The systemd timer `tcg-backup.timer` makes the copy every day and keeps the last 14 copies.

## Docker

`deploy/docker/Dockerfile` creates the server image for public hosting.
The image contains only the server bundle and the backup script. The database is in the `/data` volume.
