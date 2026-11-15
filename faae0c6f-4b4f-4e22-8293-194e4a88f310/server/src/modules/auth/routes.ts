/** Authentication endpoints. */
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/database.js";
import { asyncHandler, pathParam, parse } from "../../platform/http.js";
import { AppError } from "../../platform/errors.js";
import { requireAuth } from "../../middleware/authenticate.js";
import { SESSION_COOKIE } from "../../middleware/authenticate.js";
import { consume, reset as resetLimit } from "../../platform/rateLimit.js";
import { env } from "../../config/env.js";
import * as auth from "./service.js";

const credentials = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

const newPassword = z
  .string()
  .min(10, "Use at least 10 characters")
  .regex(/[A-Z]/, "Include an upper case letter")
  .regex(/[a-z]/, "Include a lower case letter")
  .regex(/[0-9]/, "Include a number");

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProduction,
  path: "/",
  maxAge: env.sessionTtlHours * 60 * 60 * 1000,
};

export function authRoutes(db: Db): Router {
  const router = Router();

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const input = parse(credentials, req.body);
      const key = `login:${input.email.toLowerCase()}:${req.ip ?? "unknown"}`;
      const limit = consume(key, 12, 5 * 60 * 1000);
      if (!limit.allowed) {
        throw new AppError(429, "rate_limited", "Too many sign-in attempts. Try again shortly.", {
          retryAfterSeconds: limit.retryAfterSeconds,
        });
      }
      const result = auth.login(db, {
        email: input.email,
        password: input.password,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      resetLimit(key);
      res.cookie(SESSION_COOKIE, result.token, cookieOptions);
      res.json({
        data: {
          user: result.user,
          permissions: result.permissions,
          scopedToParty: result.scopedToParty,
          expiresAt: result.expiresAt,
        },
      });
    }),
  );

  router.post(
    "/logout",
    asyncHandler(async (req, res) => {
      if (req.auth) auth.logout(db, req.auth, req.ip);
      res.clearCookie(SESSION_COOKIE, { path: "/" });
      res.json({ data: { message: "Signed out" } });
    }),
  );

  router.get(
    "/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({ data: auth.profileFor(req.auth!) });
    }),
  );

  router.post(
    "/forgot-password",
    asyncHandler(async (req, res) => {
      const input = parse(z.object({ email: z.string().email() }), req.body);
      const result = auth.requestPasswordReset(db, input.email);
      res.json({ data: result });
    }),
  );

  router.post(
    "/reset-password",
    asyncHandler(async (req, res) => {
      const input = parse(z.object({ token: z.string().min(10), password: newPassword }), req.body);
      auth.resetPassword(db, input.token, input.password);
      res.json({ data: { message: "Password updated. Sign in with your new password." } });
    }),
  );

  router.post(
    "/change-password",
    requireAuth,
    asyncHandler(async (req, res) => {
      const input = parse(
        z.object({ currentPassword: z.string().min(1), newPassword }),
        req.body,
      );
      auth.changePassword(db, req.auth!.user.id, input.currentPassword, input.newPassword);
      res.json({ data: { message: "Password changed" } });
    }),
  );

  router.get("/demo-accounts", (_req, res) => {
    res.json({ data: auth.demoAccounts() });
  });

  return router;
}
