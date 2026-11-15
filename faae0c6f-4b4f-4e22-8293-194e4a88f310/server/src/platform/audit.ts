/** Append-only audit trail and notification fan-out used by services. */
import { execute, nowIso, type Db } from "../db/database.js";
import { randomId } from "./security.js";

export interface AuditActor {
  id: string;
  fullName: string;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

export function recordAudit(
  db: Db,
  actor: AuditActor,
  entry: AuditEntry,
  ip?: string,
): void {
  execute(
    db,
    `INSERT INTO audit_logs (id, actor_id, actor_name, action, entity_type, entity_id, summary, metadata, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomId(),
      actor.id,
      actor.fullName,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.summary,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      ip ?? null,
      nowIso(),
    ],
  );
}

export interface NotificationInput {
  userId?: string | null;
  roleId?: string | null;
  title: string;
  body: string;
  level?: "info" | "success" | "warning" | "critical";
  link?: string | null;
}

/**
 * Notifications are addressed to a user or, more commonly, to every holder of a
 * role (e.g. "all finance officers"). Reads resolve both in one query.
 */
export function notify(db: Db, input: NotificationInput): void {
  execute(
    db,
    `INSERT INTO notifications (id, user_id, role_id, title, body, level, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomId(),
      input.userId ?? null,
      input.roleId ?? null,
      input.title,
      input.body,
      input.level ?? "info",
      input.link ?? null,
      nowIso(),
    ],
  );
}
