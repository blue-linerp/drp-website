// Local PostgreSQL for development and e2e tests, with no Docker or system install.
// Usage: npm run db:local   (keep it running; Ctrl+C to stop)
// Then:  DATABASE_URL=postgresql://drp:drp@localhost:5433/drp
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".local-db");
const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "drp",
  password: "drp",
  port,
  persistent: true,
  // Force UTF-8 regardless of the OS locale (Windows defaults to WIN1252).
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("drp");
console.log(`Local Postgres ready: postgresql://drp:drp@localhost:${port}/drp`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
