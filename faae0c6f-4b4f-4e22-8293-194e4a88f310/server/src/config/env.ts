/**
 * Typed environment configuration.
 *
 * Values come from the process environment (loaded from the repository root
 * `.env` by the npm scripts). Nothing else in the server reads process.env,
 * which keeps configuration in one testable place.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const isTest = process.env.NODE_ENV === "test";
const databaseFileSetting = process.env.DATABASE_FILE ?? "./data/stockgap.db";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest,
  // Some process managers inject PORT=0; fall back to the documented default.
  port: int(process.env.PORT, 4000) > 0 ? int(process.env.PORT, 4000) : 4000,
  databaseFile:
    databaseFileSetting === ":memory:"
      ? ":memory:"
      : path.resolve(serverRoot, databaseFileSetting),
  sessionSecret: process.env.SESSION_SECRET ?? "development-session-secret-do-not-use-in-production",
  sessionTtlHours: int(process.env.SESSION_TTL_HOURS, 12),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  webDist: path.resolve(serverRoot, "../web/dist"),
} as const;

if (env.isProduction && env.sessionSecret.startsWith("development-")) {
  throw new Error("SESSION_SECRET must be set to a strong random value in production");
}
