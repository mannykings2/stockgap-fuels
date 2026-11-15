/** Website enquiries: public submission, internal triage. */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne } from "../../db/database.js";
import { notFound } from "../../platform/errors.js";
import { recordAudit } from "../../platform/audit.js";
import { randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";

export function submit(
  db: Db,
  input: {
    name: string;
    company?: string | null;
    email: string;
    phone?: string | null;
    subject: string;
    message: string;
    type: "general" | "business" | "supplier" | "customer";
  },
) {
  const id = randomId();
  execute(
    db,
    `INSERT INTO enquiries (id, name, company, email, phone, subject, message, type, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    [
      id,
      input.name.trim(),
      input.company?.trim() || null,
      input.email.trim().toLowerCase(),
      input.phone?.trim() || null,
      input.subject.trim(),
      input.message.trim(),
      input.type,
      nowIso(),
    ],
  );
  return { id, message: "Your enquiry has been received. Our commercial team will respond shortly." };
}

export function list(db: Db, filter: { status?: string; type?: string }) {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter.status) {
    conditions.push("status = ?");
    params.push(filter.status);
  }
  if (filter.type) {
    conditions.push("type = ?");
    params.push(filter.type);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryAll<{
    id: string;
    name: string;
    company: string | null;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    type: string;
    status: string;
    created_at: string;
  }>(db, `SELECT * FROM enquiries ${clause} ORDER BY created_at DESC`, params).map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function updateStatus(
  db: Db,
  auth: AuthContext,
  id: string,
  status: "new" | "in_review" | "responded" | "closed",
) {
  const existing = queryOne<{ id: string }>(db, "SELECT id FROM enquiries WHERE id = ?", [id]);
  if (!existing) throw notFound("Enquiry not found");
  execute(db, "UPDATE enquiries SET status = ? WHERE id = ?", [status, id]);
  recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
    action: "marketing.enquiry_updated",
    entityType: "enquiry",
    entityId: id,
    summary: `Enquiry moved to ${status}`,
  });
  return { id, status };
}
