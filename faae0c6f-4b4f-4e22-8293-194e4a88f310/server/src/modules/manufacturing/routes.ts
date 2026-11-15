/** Production order endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

export function manufacturingRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/production-orders",
    requireAuth,
    requirePermission("manufacturing:read"),
    asyncHandler(async (req, res) => {
      res.json({
        data: service.list(db, {
          status: typeof req.query.status === "string" ? req.query.status : undefined,
          type: typeof req.query.type === "string" ? req.query.type : undefined,
        }),
      });
    }),
  );

  router.get(
    "/bill-of-materials",
    requireAuth,
    requirePermission("manufacturing:read"),
    asyncHandler(async (_req, res) => {
      res.json({ data: service.billOfMaterials(db) });
    }),
  );

  router.get(
    "/production-orders/:id",
    requireAuth,
    requirePermission("manufacturing:read"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.get(db, pathParam(req)) });
    }),
  );

  router.post(
    "/production-orders",
    requireAuth,
    requirePermission("manufacturing:create"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          type: z.enum(["cylinder_manufacture", "lpg_filling"]),
          productId: z.string().min(1),
          locationId: z.string().min(1),
          plannedQuantity: z.number().positive(),
          dueDate: z.string().nullable().optional(),
        }),
        req.body,
      );
      res.status(201).json({ data: service.create(db, req.auth!, input, req.ip) });
    }),
  );

  router.post(
    "/production-orders/:id/start",
    requireAuth,
    requirePermission("manufacturing:operate"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.start(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  router.post(
    "/production-orders/:id/submit-for-quality",
    requireAuth,
    requirePermission("manufacturing:operate"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.submitForQuality(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  router.post(
    "/production-orders/:id/cancel",
    requireAuth,
    requirePermission("manufacturing:operate"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.cancel(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  return router;
}
