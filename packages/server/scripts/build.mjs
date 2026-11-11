/**
 * Bundles the PvP server into one JavaScript file: dist/server/server.mjs.
 * The Raspberry Pi gets only this file and the "ws" code inside it.
 * No compilation and no node_modules on the Pi (plan, section 6.7).
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const outfile = resolve(root, "dist/server/server.mjs");

await build({
  entryPoints: [resolve(root, "packages/server/src/main.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  minify: false,
  sourcemap: true,
  legalComments: "none",
  // ws has optional native helpers. The pure JavaScript code works without them.
  external: ["bufferutil", "utf-8-validate"],
  // Some CommonJS code (ws) calls require(): give the ESM bundle a require function.
  banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
  logLevel: "info",
});
console.log(`server bundle: ${outfile}`);
