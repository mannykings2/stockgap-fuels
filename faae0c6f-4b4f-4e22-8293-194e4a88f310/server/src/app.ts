/** Express application factory. */
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Db } from "./db/database.js";
import { queryOne } from "./db/database.js";
import { env } from "./config/env.js";
import { logger } from "./platform/logger.js";
import { attachSession } from "./middleware/authenticate.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRoutes } from "./routes/index.js";
import { publicEnquiryRoutes } from "./modules/marketing/routes.js";

function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
}

function cors(origin: string | undefined, res: Response): boolean {
  if (!origin) return false;
  if (!env.corsOrigins.includes(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
  res.setHeader("Vary", "Origin");
  return true;
}

export function createApp(db: Db) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");

  app.use(securityHeaders);
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    const startedAt = Date.now();
    res.on("finish", () => {
      logger.debug("request", {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - startedAt,
        requestId: req.requestId,
      });
    });
    next();
  });

  app.use(express.json({ limit: "1mb" }));

  // CORS for the Vite dev origin only; same-origin traffic is unaffected.
  app.use((req, res, next) => {
    const allowed = cors(req.headers.origin, res);
    if (req.method === "OPTIONS") {
      res.status(allowed || !req.headers.origin ? 204 : 403).end();
      return;
    }
    next();
  });

  // CSRF defence: reject cross-site state changes even when a cookie is present.
  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      next();
      return;
    }
    const origin = req.headers.origin;
    if (origin) {
      const host = req.headers.host ?? "";
      const sameHost = origin.replace(/^https?:\/\//, "") === host;
      if (!sameHost && !env.corsOrigins.includes(origin)) {
        res.status(403).json({ error: { code: "forbidden", message: "Cross-site request blocked" } });
        return;
      }
    }
    next();
  });

  app.use(attachSession(db));

  app.get("/api/health", (_req, res) => {
    const row = queryOne<{ ok: number }>(db, "SELECT 1 AS ok");
    res.json({ data: { status: "ok", database: row?.ok === 1 ? "up" : "down", time: new Date().toISOString() } });
  });

  app.use("/api/public", publicEnquiryRoutes(db));
  app.use("/api", apiRoutes(db));

  // Serve the built frontend when it exists (production single-service deploy).
  const indexHtml = path.join(env.webDist, "index.html");
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(env.webDist, { index: false, maxAge: "1h" }));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        next();
        return;
      }
      // Root-relative send avoids absolute-path resolution quirks on Windows hosts.
      res.sendFile("index.html", { root: env.webDist }, (error) => {
        if (error) next(error);
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
