/**
 * Notifications are addressed either to a user or to a role. A role
 * notification is visible to every holder of that role, and each holder tracks
 * its own read state in `notification_reads`.
 */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne } from "../../db/database.js";
import { notFound } from "../../platform/errors.js";
import type { AuthContext } from "../../middleware/authenticate.js";

const VISIBLE = "(n.user_id = ? OR n.role_id = ?)";

export function list(db: Db, auth: AuthContext, limit = 50) {
  const userId = auth.user.id;
  const roleId = auth.user.roleId;
  const rows = queryAll<{
    id: string;
    title: string;
    body: string;
    level: string;
    link: string | null;
    created_at: string;
    read_at: string | null;
  }>(
    db,
    `SELECT n.id, n.title, n.body, n.level, n.link, n.created_at,
            COALESCE(nr.read_at, n.read_at) AS read_at
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE ${VISIBLE}
      ORDER BY n.created_at DESC
      LIMIT ?`,
    [userId, userId, roleId, limit],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    level: row.level,
    link: row.link,
    createdAt: row.created_at,
    read: row.read_at !== null,
    readAt: row.read_at,
  }));
}

export function unreadCount(db: Db, auth: AuthContext): number {
  const row = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE ${VISIBLE} AND COALESCE(nr.read_at, n.read_at) IS NULL`,
    [auth.user.id, auth.user.id, auth.user.roleId],
  );
  return Number(row?.count ?? 0);
}

export function markRead(db: Db, auth: AuthContext, id: string): void {
  const notification = queryOne<{ id: string }>(
    db,
    `SELECT n.id FROM notifications n WHERE n.id = ? AND ${VISIBLE}`,
    [id, auth.user.id, auth.user.roleId],
  );
  if (!notification) throw notFound("Notification not found");
  execute(
    db,
    `INSERT INTO notification_reads (notification_id, user_id, read_at) VALUES (?, ?, ?)
     ON CONFLICT (notification_id, user_id) DO UPDATE SET read_at = excluded.read_at`,
    [id, auth.user.id, nowIso()],
  );
}

export function markAllRead(db: Db, auth: AuthContext): number {
  const pending = queryAll<{ id: string }>(
    db,
    `SELECT n.id FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE ${VISIBLE} AND COALESCE(nr.read_at, n.read_at) IS NULL`,
    [auth.user.id, auth.user.id, auth.user.roleId],
  );
  for (const notification of pending) markRead(db, auth, notification.id);
  return pending.length;
}
