/** Authorization middleware - every protected route declares its permission. */
import type { NextFunction, Request, Response } from "express";
import { forbidden } from "../platform/errors.js";

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      next(forbidden("Authentication required"));
      return;
    }
    const allowed = permissions.every((permission) => auth.permissions.has(permission));
    if (!allowed) {
      next(forbidden(`Missing permission: ${permissions.join(", ")}`));
      return;
    }
    next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      next(forbidden("Authentication required"));
      return;
    }
    if (!permissions.some((permission) => auth.permissions.has(permission))) {
      next(forbidden(`Requires one of: ${permissions.join(", ")}`));
      return;
    }
    next();
  };
}
