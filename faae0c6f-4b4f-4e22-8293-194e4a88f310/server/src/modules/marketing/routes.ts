/** Public and internal enquiry endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, parse } from "../../platform/http.js";
import { consume } from "../../platform/rateLimit.js";
import { AppError } from "../../platform/errors.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

const enquiryBody = z.object({
  name: z.string().min(2).max(120),
  company: z.string().max(160).nullable().optional(),
  email: z.string().email(),
  phone: z.string().max(40).nullable().optional(),
  subject: z.string().min(3).max(160),
  message: z.string().min(10).max(4000),
  type: z.enum(["general", "business", "supplier", "customer"]).default("general"),
});

/** Mounted at /api/public - no session required. */
export function publicEnquiryRoutes(db: Db): Router {
  const router = Router();

  router.post(
    "/enquiries",
    asyncHandler(async (req, res) => {
      const limit = consume(`enquiry:${req.ip ?? "unknown"}`, 5, 10 * 60 * 1000);
      if (!limit.allowed) {
        throw new AppError(429, "rate_limited", "Too many enquiries from this address. Please try again later.");
      }
      const input = parse(enquiryBody, req.body);
      res.status(201).json({ data: service.submit(db, { ...input, type: input.type ?? "general" }) });
    }),
  );

  return router;
}

export function enquiryAdminRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/enquiries",
    requireAuth,
    requirePermission("enquiries:manage"),
    asyncHandler(async (req, res) => {
      res.json({
        data: service.list(db, {
          status: typeof req.query.status === "string" ? req.query.status : undefined,
          type: typeof req.query.type === "string" ? req.query.type : undefined,
        }),
      });
    }),
  );

  router.patch(
    "/enquiries/:id",
    requireAuth,
    requirePermission("enquiries:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(z.object({ status: z.enum(["new", "in_review", "responded", "closed"]) }), req.body);
      res.json({ data: service.updateStatus(db, req.auth!, pathParam(req), input.status) });
    }),
  );

  return router;
}
