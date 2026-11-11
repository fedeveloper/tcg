#!/usr/bin/env bash
# Builds the client and the server, then copies them to the Raspberry Pi with rsync.
# Usage: deploy/deploy.sh pi@raspberrypi.local
# The Pi needs /opt/tcg owned by your SSH user, and the tcg-server systemd unit.
set -euo pipefail
target="${1:?usage: deploy/deploy.sh user@host}"
cd "$(dirname "$0")/.."

pnpm build
pnpm build:server

rsync -az --delete packages/client/dist/ "$target:/opt/tcg/client/"
rsync -az --delete dist/server/ "$target:/opt/tcg/server/"
rsync -az deploy/backup.mjs "$target:/opt/tcg/server/backup.mjs"
ssh -t "$target" "sudo systemctl restart tcg-server && systemctl --no-pager --lines=3 status tcg-server"
