/** HTTP helpers shared by every route module. */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { AppError, badRequest } from "./errors.js";

/** Wrap an async handler so rejected promises reach the error middleware. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/**
 * Read a route parameter as a string.
 * Express 5 types parameters as `string | string[]` (a repeated name can be an
 * array), so route modules use this instead of casting at every call site.
 */
export function pathParam(req: Request, name = "id"): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

/** Parse a body/query payload against a Zod schema, throwing a 400 on failure. */
export function parse<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw badRequest(
        "Validation failed",
        error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      );
    }
    throw error;
  }
}

export interface Pagination {
  page: number;
  pageSize: number;
  offset: number;
}

export function pagination(query: Request["query"], defaultSize = 20): Pagination {
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const pageSizeRaw = Number.parseInt(String(query.pageSize ?? defaultSize), 10) || defaultSize;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginated<T>(items: T[], total: number, page: Pagination) {
  return {
    items,
    meta: {
      total,
      page: page.page,
      pageSize: page.pageSize,
      totalPages: Math.max(1, Math.ceil(total / page.pageSize)),
    },
  };
}

export function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export function requireString(value: unknown, field: string): string {
  const parsed = readString(value);
  if (!parsed) throw badRequest(`${field} is required`);
  return parsed;
}

export function assertFound<T>(value: T | undefined, message: string): T {
  if (value === undefined || value === null) throw new AppError(404, "not_found", message);
  return value;
}
