/** User and role administration endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, parse } from "../../platform/http.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import * as service from "./service.js";

const passwordRule = z
  .string()
  .min(10, "Use at least 10 characters")
  .regex(/[A-Z]/, "Include an upper case letter")
  .regex(/[a-z]/, "Include a lower case letter")
  .regex(/[0-9]/, "Include a number");

export function userRoutes(db: Db): Router {
  const router = Router();

  router.get(
    "/users",
    requireAuth,
    requirePermission("users:read"),
    asyncHandler(async (_req, res) => {
      res.json({ data: service.listUsers(db) });
    }),
  );

  router.post(
    "/users",
    requireAuth,
    requirePermission("users:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          email: z.string().email(),
          fullName: z.string().min(2).max(120),
          password: passwordRule,
          roleId: z.string().min(1),
          partyId: z.string().nullable().optional(),
          jobTitle: z.string().max(120).nullable().optional(),
          phone: z.string().max(40).nullable().optional(),
        }),
        req.body,
      );
      res.status(201).json({ data: { id: service.createUser(db, req.auth!, input, req.ip) } });
    }),
  );

  router.patch(
    "/users/:id",
    requireAuth,
    requirePermission("users:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({
          fullName: z.string().min(2).max(120).optional(),
          jobTitle: z.string().max(120).nullable().optional(),
          phone: z.string().max(40).nullable().optional(),
          roleId: z.string().optional(),
          status: z.enum(["active", "suspended"]).optional(),
          partyId: z.string().nullable().optional(),
          password: passwordRule.optional(),
        }),
        req.body,
      );
      res.json({ data: service.updateUser(db, req.auth!, pathParam(req), input, req.ip) });
    }),
  );

  router.get(
    "/roles",
    requireAuth,
    requirePermission("users:read"),
    asyncHandler(async (_req, res) => {
      res.json({ data: service.listRoles(db) });
    }),
  );

  router.get(
    "/permissions",
    requireAuth,
    requirePermission("users:read"),
    asyncHandler(async (_req, res) => {
      res.json({ data: service.listPermissions() });
    }),
  );

  router.put(
    "/roles/:id/permissions",
    requireAuth,
    requirePermission("roles:manage"),
    asyncHandler(async (req, res) => {
      const input = parse(z.object({ permissions: z.array(z.string()) }), req.body);
      res.json({ data: service.setRolePermissions(db, req.auth!, pathParam(req), input.permissions, req.ip) });
    }),
  );

  return router;
}
