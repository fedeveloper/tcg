# Image of the PvP server for public hosting (plan, section 6.7). The Raspberry Pi does not use Docker.
# Build from the repository root:  docker build -f deploy/docker/Dockerfile -t tcg-server .
# Run:  docker run -d -p 8787:8787 -v tcg-data:/data -e ALLOWED_ORIGIN=https://example.org tcg-server

FROM node:22-slim AS build
WORKDIR /src
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build:server

FROM node:22-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DB_PATH=/data/tcg.sqlite \
    TURN_SECONDS=120
WORKDIR /app
COPY --from=build /src/dist/server/ ./
COPY --from=build /src/deploy/backup.mjs ./backup.mjs
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "--max-old-space-size=256", "--disable-warning=ExperimentalWarning", "server.mjs"]
