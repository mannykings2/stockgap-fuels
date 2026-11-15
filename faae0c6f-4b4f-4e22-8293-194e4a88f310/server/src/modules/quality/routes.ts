/** Quality inspection endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, paginated, pagination, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

export function qualityRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/inspections",
    requireAuth,
    requirePermission("quality:read"),
    asyncHandler(async (req, res) => {
      const page = pagination(req.query, 20);
      const { items, total } = service.list(
        db,
        {
          result: typeof req.query.result === "string" ? req.query.result : undefined,
          inspectionType: typeof req.query.inspectionType === "string" ? req.query.inspectionType : undefined,
          limit: page.pageSize,
          offset: page.offset,
        },
      );
      res.json({ data: paginated(items, total, page) });
    }),
  );

  router.post(
    "/inspections",
    requireAuth,
    requirePermission("quality:inspect"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          productionOrderId: z.string().min(1).nullable().optional(),
          inspectionType: z.enum(["finished_goods", "incoming_material", "cylinder_certification", "safety_audit"]),
          checkedQuantity: z.number().min(0),
          passedQuantity: z.number().min(0),
          failedQuantity: z.number().min(0),
          result: z.enum(["pass", "fail", "conditional"]),
          notes: z.string().max(500).nullable().optional(),
        }),
        req.body,
      );
      res.status(201).json({ data: service.create(db, req.auth!, input, req.ip) });
    }),
  );

  return router;
}
