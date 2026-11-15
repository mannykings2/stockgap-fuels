/** HSE incident reporting and investigation. */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne, transaction } from "../../db/database.js";
import { conflict, notFound, unprocessable } from "../../platform/errors.js";
import { notify, recordAudit } from "../../platform/audit.js";
import { nextReference } from "../../platform/references.js";
import { randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";

const CATEGORIES = ["near_miss", "first_aid", "equipment_failure", "spill", "fire", "vehicle", "security", "other"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export function list(db: Db, filter: { status?: string; severity?: string }) {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter.status) {
    conditions.push("h.status = ?");
    params.push(filter.status);
  }
  if (filter.severity) {
    conditions.push("h.severity = ?");
    params.push(filter.severity);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryAll<{
    id: string;
    reference: string;
    category: string;
    severity: string;
    status: string;
    description: string;
    corrective_action: string | null;
    occurred_at: string;
    closed_at: string | null;
    location_name: string;
    reported_by_name: string;
    created_at: string;
  }>(
    db,
    `SELECT h.*, l.name AS location_name, u.full_name AS reported_by_name
       FROM hse_incidents h
       JOIN locations l ON l.id = h.location_id
       JOIN users u ON u.id = h.reported_by
       ${clause}
      ORDER BY CASE h.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
               h.occurred_at DESC`,
    params,
  ).map((row) => ({
    id: row.id,
    reference: row.reference,
    category: row.category,
    severity: row.severity,
    status: row.status,
    description: row.description,
    correctiveAction: row.corrective_action,
    occurredAt: row.occurred_at,
    closedAt: row.closed_at,
    location: row.location_name,
    reportedBy: row.reported_by_name,
    createdAt: row.created_at,
  }));
}

export function report(
  db: Db,
  auth: AuthContext,
  input: { locationId: string; category: string; severity: string; description: string; occurredAt?: string },
  ip?: string,
) {
  if (!CATEGORIES.includes(input.category as (typeof CATEGORIES)[number])) {
    throw unprocessable("Unknown incident category");
  }
  if (!SEVERITIES.includes(input.severity as (typeof SEVERITIES)[number])) {
    throw unprocessable("Unknown incident severity");
  }
  const location = queryOne<{ id: string }>(db, "SELECT id FROM locations WHERE id = ?", [input.locationId]);
  if (!location) throw unprocessable("Select the location where the incident occurred");
  if (input.description.trim().length < 10) {
    throw unprocessable("Describe what happened in at least 10 characters");
  }

  return transaction(db, () => {
    const id = randomId();
    const reference = nextReference(db, "HSE", "HSE");
    execute(
      db,
      `INSERT INTO hse_incidents
         (id, reference, location_id, category, severity, description, occurred_at, reported_by, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [id, reference, input.locationId, input.category, input.severity, input.description.trim(),
       input.occurredAt ?? nowIso(), auth.user.id, nowIso(), nowIso()],
    );
    notify(db, {
      roleId: "hse_officer",
      title: `${input.severity.toUpperCase()} HSE incident reported`,
      body: `${reference}: ${input.description.trim().slice(0, 120)}`,
      level: input.severity === "critical" || input.severity === "high" ? "critical" : "warning",
      link: "/portal/hse",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "hse.incident_reported",
      entityType: "hse_incident",
      entityId: id,
      summary: `Reported ${input.severity} ${input.category} incident (${reference})`,
    }, ip);
    return { id, reference };
  });
}

export function update(
  db: Db,
  auth: AuthContext,
  id: string,
  input: { status: "open" | "investigating" | "closed"; correctiveAction?: string | null },
  ip?: string,
) {
  return transaction(db, () => {
    const incident = queryOne<{ id: string; reference: string; status: string }>(
      db,
      "SELECT id, reference, status FROM hse_incidents WHERE id = ?",
      [id],
    );
    if (!incident) throw notFound("Incident not found");
    if (incident.status === "closed" && input.status !== "closed") {
      throw conflict("A closed incident cannot be reopened");
    }
    if (input.status === "closed" && !input.correctiveAction?.trim()) {
      throw unprocessable("Record the corrective action before closing the incident");
    }
    execute(
      db,
      `UPDATE hse_incidents SET status = ?, corrective_action = COALESCE(?, corrective_action),
              closed_at = CASE WHEN ? = 'closed' THEN ? ELSE closed_at END, updated_at = ?
        WHERE id = ?`,
      [input.status, input.correctiveAction?.trim() || null, input.status, nowIso(), nowIso(), id],
    );
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "hse.incident_updated",
      entityType: "hse_incident",
      entityId: id,
      summary: `Set ${incident.reference} to ${input.status}`,
    }, ip);
    return { id, status: input.status };
  });
}

export function summary(db: Db) {
  const byStatus = queryAll<{ status: string; count: number }>(
    db,
    "SELECT status, COUNT(*) AS count FROM hse_incidents GROUP BY status",
  );
  const bySeverity = queryAll<{ severity: string; count: number }>(
    db,
    "SELECT severity, COUNT(*) AS count FROM hse_incidents WHERE status != 'closed' GROUP BY severity",
  );
  const month = nowIso().slice(0, 7);
  const monthCount = queryOne<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM hse_incidents WHERE substr(occurred_at, 1, 7) = ?",
    [month],
  );
  return {
    open: byStatus.find((entry) => entry.status === "open")?.count ?? 0,
    investigating: byStatus.find((entry) => entry.status === "investigating")?.count ?? 0,
    closed: byStatus.find((entry) => entry.status === "closed")?.count ?? 0,
    bySeverity,
    thisMonth: Number(monthCount?.count ?? 0),
  };
}
