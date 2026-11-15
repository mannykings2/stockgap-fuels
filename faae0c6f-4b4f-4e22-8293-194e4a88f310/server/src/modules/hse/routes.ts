/** HSE incident endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

export function hseRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/incidents",
    requireAuth,
    requirePermission("hse:read"),
    asyncHandler(async (req, res) => {
      res.json({
        data: {
          incidents: service.list(db, {
            status: typeof req.query.status === "string" ? req.query.status : undefined,
            severity: typeof req.query.severity === "string" ? req.query.severity : undefined,
          }),
          summary: service.summary(db),
        },
      });
    }),
  );

  router.post(
    "/incidents",
    requireAuth,
    requirePermission("hse:report"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          locationId: z.string().min(1),
          category: z.enum(["near_miss", "first_aid", "equipment_failure", "spill", "fire", "vehicle", "security", "other"]),
          severity: z.enum(["low", "medium", "high", "critical"]),
          description: z.string().min(10).max(1000),
          occurredAt: z.string().optional(),
        }),
        req.body,
      );
      res.status(201).json({ data: service.report(db, req.auth!, input, req.ip) });
    }),
  );

  router.patch(
    "/incidents/:id",
    requireAuth,
    requirePermission("hse:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          status: z.enum(["open", "investigating", "closed"]),
          correctiveAction: z.string().max(1000).nullable().optional(),
        }),
        req.body,
      );
      res.json({ data: service.update(db, req.auth!, pathParam(req), input, req.ip) });
    }),
  );

  return router;
}
