/** Customer order endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, paginated, pagination, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

export function orderRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/orders",
    requireAuth,
    requirePermission("orders:read"),
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
    "/orders/:id",
    requireAuth,
    requirePermission("orders:read"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.get(db, req.auth!, pathParam(req)) });
    }),
  );

  router.post(
    "/orders",
    requireAuth,
    requirePermission("orders:create"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          customerId: z.string().min(1).optional(),
          locationId: z.string().min(1),
          requestedDeliveryDate: z.string().nullable().optional(),
          deliveryAddress: z.string().max(240).nullable().optional(),
          contactPhone: z.string().max(40).nullable().optional(),
          notes: z.string().max(500).nullable().optional(),
          lines: z
            .array(
              z.object({
                productId: z.string().min(1),
                quantity: z.number().positive(),
                unitPriceKobo: z.number().int().min(0).optional(),
              }),
            )
            .min(1, "Add at least one product"),
        }),
        req.body,
      );
      res.status(201).json({ data: service.create(db, req.auth!, input, req.ip) });
    }),
  );

  router.post(
    "/orders/:id/submit",
    requireAuth,
    requirePermission("orders:create"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.submit(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  router.post(
    "/orders/:id/approve",
    requireAuth,
    requirePermission("orders:approve"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.approve(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  router.post(
    "/orders/:id/allocate",
    requireAuth,
    requirePermission("orders:approve"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.allocate(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  router.post(
    "/orders/:id/dispatch",
    requireAuth,
    requirePermission("orders:dispatch"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          transporterId: z.string().nullable().optional(),
          vehiclePlate: z.string().max(20).nullable().optional(),
          driverName: z.string().max(120).nullable().optional(),
          driverPhone: z.string().max(40).nullable().optional(),
          destination: z.string().max(240).nullable().optional(),
        }),
        req.body ?? {},
      );
      res.json({ data: service.dispatch(db, req.auth!, pathParam(req), input, req.ip) });
    }),
  );

  router.post(
    "/orders/:id/cancel",
    requireAuth,
    requirePermission("orders:create"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.cancel(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  return router;
}
