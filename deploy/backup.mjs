/**
 * Backup of the PvP database: a consistent copy with "VACUUM INTO", also while the server runs (WAL).
 * Keeps the newest KEEP copies and deletes the older ones.
 *
 * Usage: node deploy/backup.mjs <database> <backup folder> [keep=14]
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const [db, dir, keepArg] = process.argv.slice(2);
if (!db || !dir) {
  console.error("usage: node backup.mjs <database> <backup folder> [keep]");
  process.exit(2);
}
const keep = Number(keepArg ?? 14);
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = join(dir, `tcg-${stamp}.sqlite`);
const conn = new DatabaseSync(db, { readOnly: true });
conn.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
conn.close();
const old = readdirSync(dir)
  .filter((f) => /^tcg-.*\.sqlite$/.test(f))
  .sort()
  .reverse()
  .slice(keep);
for (const f of old) rmSync(join(dir, f));
console.log(`backup: ${target} (${old.length} old copies removed)`);
