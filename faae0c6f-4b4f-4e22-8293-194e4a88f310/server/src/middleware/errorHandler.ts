/** Central error handling: one response shape for every failure. */
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../platform/errors.js";
import { logger } from "../platform/logger.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "not_found", message: `Route ${req.method} ${req.path} does not exist` },
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "bad_request",
        message: "Validation failed",
        details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected error";

  // Translate database constraint violations into meaningful client errors.
  if (message.includes("UNIQUE constraint failed")) {
    res.status(409).json({
      error: { code: "conflict", message: "A record with these unique values already exists" },
    });
    return;
  }
  if (message.includes("FOREIGN KEY constraint failed")) {
    res.status(409).json({
      error: { code: "conflict", message: "This record is referenced by other data and cannot be changed" },
    });
    return;
  }
  if (message.includes("CHECK constraint failed")) {
    res.status(422).json({
      error: { code: "unprocessable", message: "The submitted values violate a business constraint" },
    });
    return;
  }

  logger.error("unhandled request error", {
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  res.status(500).json({
    error: { code: "internal_error", message: "Something went wrong while processing the request" },
  });
}
