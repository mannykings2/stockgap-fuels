/** Shipment and delivery endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, paginated, pagination, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

export function logisticsRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/shipments",
    requireAuth,
    requirePermission("logistics:read"),
    asyncHandler(async (req, res) => {
      const page = pagination(req.query, 20);
      const { items, total } = service.list(
        db,
        req.auth!,
        {
          status: typeof req.query.status === "string" ? req.query.status : undefined,
          search: typeof req.query.search === "string" ? req.query.search : undefined,
        },
        { limit: page.pageSize, offset: page.offset },
      );
      res.json({ data: paginated(items, total, page) });
    }),
  );

  router.get(
    "/shipments/:id",
    requireAuth,
    requirePermission("logistics:read"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.get(db, req.auth!, pathParam(req)) });
    }),
  );

  router.patch(
    "/shipments/:id",
    requireAuth,
    requirePermission("logistics:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          transporterId: z.string().nullable().optional(),
          vehiclePlate: z.string().max(20).nullable().optional(),
          driverName: z.string().max(120).nullable().optional(),
          driverPhone: z.string().max(40).nullable().optional(),
        }),
        req.body,
      );
      res.json({ data: service.assign(db, req.auth!, pathParam(req), input, req.ip) });
    }),
  );

  router.post(
    "/shipments/:id/fail",
    requireAuth,
    requirePermission("logistics:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(z.object({ note: z.string().min(5).max(500) }), req.body);
      res.json({ data: service.markFailed(db, req.auth!, pathParam(req), input.note, req.ip) });
    }),
  );

  router.post(
    "/shipments/:id/confirm-delivery",
    requireAuth,
    requirePermission("deliveries:confirm"),
    asyncHandler(async (req, res) => {
      const input = parse(z.object({ notes: z.string().max(500).nullable().optional() }), req.body ?? {});
      res.json({ data: service.confirmDelivery(db, req.auth!, pathParam(req), input, req.ip) });
    }),
  );

  return router;
}
