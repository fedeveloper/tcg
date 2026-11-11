/**
 * Entry point of the PvP server.
 * Usage: PORT=8787 DB_PATH=tcg.sqlite ALLOWED_ORIGIN=https://example.org node server.mjs
 */
import { configFromEnv } from "./config.ts";
import { startServer } from "./net.ts";

const config = configFromEnv();
const server = await startServer(config);
console.log(`tcg server on ${config.host}:${server.port}, database ${config.dbPath}, ${server.game.liveMatches} open matches restored`);

const stop = async () => {
  await server.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
