/** Invoice and payment endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, paginated, pagination, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

export function financeRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/invoices",
    requireAuth,
    requirePermission("finance:read"),
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
    "/invoices/summary",
    requireAuth,
    requirePermission("finance:read"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.summary(db, req.auth!) });
    }),
  );

  router.get(
    "/invoices/:id",
    requireAuth,
    requirePermission("finance:read"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.getInvoice(db, req.auth!, pathParam(req)) });
    }),
  );

  router.post(
    "/invoices/:id/payments",
    requireAuth,
    requirePermission("finance:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          amountKobo: z.number().int().positive(),
          method: z.enum(["bank_transfer", "cheque", "cash", "pos"]),
          receivedAt: z.string().optional(),
          notes: z.string().max(300).nullable().optional(),
        }),
        req.body,
      );
      res.status(201).json({ data: service.recordPayment(db, req.auth!, pathParam(req), input, req.ip) });
    }),
  );

  return router;
}
