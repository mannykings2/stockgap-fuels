/** Audit trail (read only). */
import { Router } from "express";
import type { Db } from "../../db/database.js";
import { queryAll, queryOne, type Param } from "../../db/database.js";
import { asyncHandler, pathParam, paginated, pagination } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export function auditRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/audit-logs",
    requireAuth,
    requirePermission("audit:read"),
    asyncHandler(async (req, res) => {
      const page = pagination(req.query, 30);
      const conditions: string[] = [];
      const params: Param[] = [];
      if (typeof req.query.entityType === "string" && req.query.entityType) {
        conditions.push("entity_type = ?");
        params.push(req.query.entityType);
      }
      if (typeof req.query.search === "string" && req.query.search) {
        conditions.push("(summary LIKE ? OR actor_name LIKE ? OR action LIKE ?)");
        const like = `%${req.query.search}%`;
        params.push(like, like, like);
      }
      const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const rows = queryAll<{
        id: string;
        actor_name: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        summary: string;
        metadata: string | null;
        created_at: string;
      }>(
        db,
        `SELECT * FROM audit_logs ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, page.pageSize, page.offset],
      );
      const total = queryOne<{ count: number }>(db, `SELECT COUNT(*) AS count FROM audit_logs ${clause}`, params);
      res.json({
        data: paginated(
          rows.map((row) => ({
            id: row.id,
            actor: row.actor_name,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            summary: row.summary,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
            createdAt: row.created_at,
          })),
          Number(total?.count ?? 0),
          page,
        ),
      });
    }),
  );

  return router;
}
