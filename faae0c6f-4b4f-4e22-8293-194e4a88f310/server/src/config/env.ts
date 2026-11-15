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
const isProduction = process.env.NODE_ENV === "production";
const databaseFileSetting = process.env.DATABASE_FILE ?? "./data/stockgap.db";

/*
 * Demo account switcher. Enabled by default outside production. In a hosted
 * environment (where NODE_ENV is "production") it must be switched on
 * explicitly with DEMO_ACCOUNTS=true, and should be switched off again once
 * testing is finished.
 */
const demoAccountsSetting = process.env.DEMO_ACCOUNTS?.trim().toLowerCase();
const demoAccountsEnabled =
  demoAccountsSetting === "true" || (demoAccountsSetting !== "false" && !isProduction);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  isTest,
  demoAccountsEnabled,
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

if (isProduction && demoAccountsEnabled) {
  console.warn(
    "DEMO_ACCOUNTS is enabled in production: the demo account list and its shared password are publicly readable.",
  );
}

if (env.isProduction && env.sessionSecret.startsWith("development-")) {
  throw new Error("SESSION_SECRET must be set to a strong random value in production");
}
