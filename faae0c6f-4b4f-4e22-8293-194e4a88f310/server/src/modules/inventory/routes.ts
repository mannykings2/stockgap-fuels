/** Inventory and stock movement endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, paginated, pagination, parse } from "../../platform/http.js";
import { requirePermission } from "../../middleware/authorize.js";
import { requireAuth } from "../../middleware/authenticate.js";
import * as service from "./service.js";

export function inventoryRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/inventory/stock",
    requireAuth,
    requirePermission("inventory:read"),
    asyncHandler(async (req, res) => {
      const page = pagination(req.query, 50);
      const { items, total } = service.stockList(db, {
        locationId: typeof req.query.locationId === "string" ? req.query.locationId : undefined,
        productId: typeof req.query.productId === "string" ? req.query.productId : undefined,
        category: typeof req.query.category === "string" ? req.query.category : undefined,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        lowStock: req.query.lowStock === "true",
        limit: page.pageSize,
        offset: page.offset,
      });
      res.json({ data: paginated(items, total, page) });
    }),
  );

  router.get(
    "/inventory/movements",
    requireAuth,
    requirePermission("inventory:read"),
    asyncHandler(async (req, res) => {
      const page = pagination(req.query, 30);
      const { items, total } = service.movementList(
        db,
        {
          productId: typeof req.query.productId === "string" ? req.query.productId : undefined,
          locationId: typeof req.query.locationId === "string" ? req.query.locationId : undefined,
          reason: typeof req.query.reason === "string" ? req.query.reason : undefined,
        },
        { limit: page.pageSize, offset: page.offset },
      );
      res.json({ data: paginated(items, total, page) });
    }),
  );

  router.post(
    "/inventory/adjustments",
    requireAuth,
    requirePermission("inventory:adjust"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          locationId: z.string().min(1),
          productId: z.string().min(1),
          countedQuantity: z.number().min(0),
          note: z.string().min(3, "Explain the reason for the adjustment").max(500),
        }),
        req.body,
      );
      const result = service.adjustStock(db, req.auth!, input, req.ip);
      res.status(201).json({ data: result });
    }),
  );

  return router;
}
