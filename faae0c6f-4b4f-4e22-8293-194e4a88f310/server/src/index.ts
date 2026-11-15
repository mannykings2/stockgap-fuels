/** HTTP server bootstrap: migrate, listen, shut down cleanly. */
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { migrate, openDatabase, queryOne } from "./db/database.js";
import { logger } from "./platform/logger.js";

const db = openDatabase(env.databaseFile);
const applied = migrate(db);
if (applied.length > 0) logger.info("database migrated", { migrations: applied });

const users = queryOne<{ count: number }>(db, "SELECT COUNT(*) AS count FROM users");
if (Number(users?.count ?? 0) === 0) {
  logger.warn("database has no users; run `npm run db:seed` to load the demonstration data");
}

const app = createApp(db);
const server = app.listen(env.port, () => {
  logger.info("API listening", { port: env.port, environment: env.nodeEnv, database: env.databaseFile });
});

function shutdown(signal: string): void {
  logger.info("shutting down", { signal });
  server.close(() => {
    try {
      db.close();
    } catch {
      // already closed
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
