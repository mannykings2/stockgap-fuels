/** Human readable, sequential business references (PO-2026-0001). */
import { execute, nowIso, queryOne, type Db } from "../db/database.js";
import { transaction } from "../db/database.js";

export function nextReference(db: Db, key: string, prefix: string): string {
  return transaction(db, () => {
    const year = new Date().getUTCFullYear();
    const scopedKey = `${key}:${year}`;
    execute(
      db,
      `INSERT INTO sequences (key, value) VALUES (?, 1)
       ON CONFLICT (key) DO UPDATE SET value = value + 1`,
      [scopedKey],
    );
    const row = queryOne<{ value: number }>(db, "SELECT value FROM sequences WHERE key = ?", [scopedKey]);
    const sequence = String(row?.value ?? 1).padStart(4, "0");
    return `SG-${prefix}-${year}-${sequence}`;
  });
}

/** Seed-time variant that lets the seed script control the counter. */
export function primeReference(db: Db, key: string, value: number): void {
  execute(
    db,
    `INSERT INTO sequences (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [`${key}:${new Date().getUTCFullYear()}`, value],
  );
  void nowIso;
}
