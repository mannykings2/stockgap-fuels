/** Product catalogue endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

const productBody = z.object({
  sku: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  category: z.enum(["lpg", "petroleum", "cylinder", "component"]),
  unit: z.enum(["MT", "L", "UNIT", "KG"]),
  packSize: z.string().max(60).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  reorderLevel: z.number().min(0),
  unitPriceKobo: z.number().int().min(0),
});

export function catalogueRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/products",
    requireAuth,
    requirePermission("products:read"),
    asyncHandler(async (req, res) => {
      res.json({
        data: service.listProducts(db, {
          search: typeof req.query.search === "string" ? req.query.search : undefined,
          category: typeof req.query.category === "string" ? req.query.category : undefined,
          status: typeof req.query.status === "string" ? req.query.status : undefined,
        }),
      });
    }),
  );

  router.get(
    "/products/:id",
    requireAuth,
    requirePermission("products:read"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.getProduct(db, pathParam(req)) });
    }),
  );

  router.post(
    "/products",
    requireAuth,
    requirePermission("products:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(productBody, req.body);
      const id = service.createProduct(db, req.auth!, input, req.ip);
      res.status(201).json({ data: { id } });
    }),
  );

  router.put(
    "/products/:id",
    requireAuth,
    requirePermission("products:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(productBody, req.body);
      service.updateProduct(db, req.auth!, pathParam(req), input, req.ip);
      res.json({ data: { id: pathParam(req) } });
    }),
  );

  router.put(
    "/products/:id/bom",
    requireAuth,
    requirePermission("products:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          lines: z.array(
            z.object({ componentProductId: z.string().min(1), quantityPerUnit: z.number().positive() }),
          ),
        }),
        req.body,
      );
      service.setBillOfMaterials(db, req.auth!, pathParam(req), input.lines, req.ip);
      res.json({ data: { ok: true } });
    }),
  );

  return router;
}
