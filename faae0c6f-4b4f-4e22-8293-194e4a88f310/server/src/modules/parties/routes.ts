/** Supplier, customer, channel partner and transporter endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requireAnyPermission, requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

const partyBody = z.object({
  name: z.string().min(2).max(160),
  type: z.enum(service.PARTY_TYPES),
  contactName: z.string().max(120).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(240).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  state: z.string().max(80).nullable().optional(),
  tin: z.string().max(40).nullable().optional(),
  status: z.enum(["active", "on_hold", "inactive"]).optional(),
  creditLimitKobo: z.number().int().min(0).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export function partyRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/parties",
    requireAuth,
    requireAnyPermission("customers:read", "suppliers:read"),
    asyncHandler(async (req, res) => {
      res.json({
        data: service.listParties(db, req.auth!, {
          type: typeof req.query.type === "string" ? req.query.type : undefined,
          search: typeof req.query.search === "string" ? req.query.search : undefined,
          status: typeof req.query.status === "string" ? req.query.status : undefined,
        }),
      });
    }),
  );

  router.get(
    "/parties/:id",
    requireAuth,
    requireAnyPermission("customers:read", "suppliers:read"),
    asyncHandler(async (req, res) => {
      res.json({ data: service.getParty(db, req.auth!, pathParam(req)) });
    }),
  );

  router.post(
    "/parties",
    requireAuth,
    requireAnyPermission("customers:manage", "suppliers:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(partyBody, req.body);
      const id = service.createParty(db, req.auth!, { ...input, email: input.email || null }, req.ip);
      res.status(201).json({ data: { id } });
    }),
  );

  router.put(
    "/parties/:id",
    requireAuth,
    requireAnyPermission("customers:manage", "suppliers:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(partyBody, req.body);
      service.updateParty(db, req.auth!, pathParam(req), { ...input, email: input.email || null }, req.ip);
      res.json({ data: { id: pathParam(req) } });
    }),
  );

  return router;
}
