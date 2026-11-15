/**
 * Database access layer.
 *
 * The platform uses SQLite through Node's built-in `node:sqlite` driver so the
 * prototype runs with no external services. All SQL is standard relational SQL
 * and the schema maps directly onto PostgreSQL; only this file and the
 * repository modules would change during a Postgres migration.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../platform/logger.js";

export type Db = DatabaseSync;
export type Param = string | number | bigint | null | Uint8Array;

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

/** Open a connection with the pragmas the app relies on (FKs + WAL). */
export function openDatabase(file: string): Db {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  if (file !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  return db;
}

/** Run every `.sql` migration that has not been applied yet, in filename order. */
export function migrate(db: Db): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
  const applied = new Set(
    db.prepare("SELECT name FROM _migrations").all().map((row) => String((row as { name: string }).name)),
  );
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
      db.exec("COMMIT");
      ran.push(file);
      logger.info("migration applied", { file });
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return ran;
}

/**
 * Run `fn` inside a database transaction. Nested calls join the outer
 * transaction, so a service can safely call another service.
 */
export function transaction<T>(db: Db, fn: () => T): T {
  if (db.isTransaction) return fn();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function queryAll<T>(db: Db, sql: string, params: Param[] = []): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function queryOne<T>(db: Db, sql: string, params: Param[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function execute(db: Db, sql: string, params: Param[] = []): { changes: number; lastInsertRowid: number } {
  const result = db.prepare(sql).run(...params);
  return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Read/write a value in the key-value settings table. */
export function getSetting(db: Db, key: string): string | undefined {
  const row = queryOne<{ value: string }>(db, "SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value;
}

export function setSetting(db: Db, key: string, value: string): void {
  execute(
    db,
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, nowIso()],
  );
}
