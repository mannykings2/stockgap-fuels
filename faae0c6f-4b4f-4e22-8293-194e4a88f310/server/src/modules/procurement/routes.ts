/** Purchase order and goods receipt endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, paginated, pagination, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

export function procurementRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/purchase-orders",
    requireAuth,
    requirePermission("procurement:read"),
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
    "/purchase-orders/:id",
    requireAuth,
    requirePermission("procurement:read"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.get(db, req.auth!, pathParam(req)) });
    }),
  );

  router.post(
    "/purchase-orders",
    requireAuth,
    requirePermission("procurement:create"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          supplierId: z.string().min(1),
          locationId: z.string().min(1),
          expectedDate: z.string().nullable().optional(),
          notes: z.string().max(500).nullable().optional(),
          lines: z
            .array(
              z.object({
                productId: z.string().min(1),
                quantity: z.number().positive(),
                unitPriceKobo: z.number().int().min(0),
              }),
            )
            .min(1, "Add at least one line"),
        }),
        req.body,
      );
      const result = service.create(db, req.auth!, input, req.ip);
      res.status(201).json({ data: result });
    }),
  );

  router.post(
    "/purchase-orders/:id/submit",
    requireAuth,
    requirePermission("procurement:create"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.submit(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  router.post(
    "/purchase-orders/:id/approve",
    requireAuth,
    requirePermission("procurement:approve"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.approve(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  router.post(
    "/purchase-orders/:id/cancel",
    requireAuth,
    requirePermission("procurement:create"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.cancel(db, req.auth!, pathParam(req), req.ip) });
    }),
  );

  router.post(
    "/purchase-orders/:id/receipts",
    requireAuth,
    requirePermission("procurement:receive"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          notes: z.string().max(500).nullable().optional(),
          lines: z
            .array(z.object({ lineId: z.string().min(1), quantity: z.number().min(0) }))
            .min(1, "Provide the quantities received"),
        }),
        req.body,
      );
      res.status(201).json({ data: service.receive(db, req.auth!, pathParam(req), input, req.ip) });
    }),
  );

  return router;
}
