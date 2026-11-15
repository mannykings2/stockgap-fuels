/** Dashboard and report endpoints. */
import { Router } from "express";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

export function reportRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/dashboard",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({ data: service.dashboard(db, req.auth!) });
    }),
  );

  router.get(
    "/reports/operational",
    requireAuth,
    requirePermission("reports:read"),
    asyncHandler(async (_req, res) => {
      res.json({ data: service.operationalReport(db) });
    }),
  );

  router.get(
    "/reports/financial",
    requireAuth,
    requirePermission("reports:read"),
    asyncHandler(async (_req, res) => {
      res.json({ data: service.financialReport(db) });
    }),
  );

  return router;
}
