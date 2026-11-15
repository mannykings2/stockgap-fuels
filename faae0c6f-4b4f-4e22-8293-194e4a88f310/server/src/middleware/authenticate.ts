/**
 * Session authentication.
 *
 * Sessions are opaque random tokens in an HttpOnly cookie; only the SHA-256
 * hash is stored in the database, so a database leak does not expose live
 * sessions. Permissions are resolved from the role on every request, which
 * means revocation takes effect immediately.
 */
import type { NextFunction, Request, Response } from "express";
import type { Db } from "../db/database.js";
import { queryAll, queryOne } from "../db/database.js";
import { sha256 } from "../platform/security.js";
import { unauthorized } from "../platform/errors.js";

export const SESSION_COOKIE = "sg_session";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  roleId: string;
  roleName: string;
  roleLabel: string;
  partyId: string | null;
  partyName: string | null;
  partyType: string | null;
}

export interface AuthContext {
  sessionId: string;
  user: SessionUser;
  permissions: Set<string>;
  scopedToParty: boolean;
}

interface SessionRow {
  session_id: string;
  expires_at: string;
  user_id: string;
  email: string;
  full_name: string;
  job_title: string | null;
  role_id: string;
  role_name: string;
  role_label: string;
  party_id: string | null;
  party_name: string | null;
  party_type: string | null;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

export function loadSession(db: Db, token: string): AuthContext | undefined {
  const row = queryOne<SessionRow>(
    db,
    `SELECT s.id AS session_id, s.expires_at,
            u.id AS user_id, u.email, u.full_name, u.job_title,
            r.id AS role_id, r.name AS role_name, r.label AS role_label,
            p.id AS party_id, p.name AS party_name, p.type AS party_type
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN parties p ON p.id = u.party_id
      WHERE s.token_hash = ? AND u.status = 'active'`,
    [sha256(token)],
  );
  if (!row) return undefined;
  if (new Date(row.expires_at).getTime() <= Date.now()) return undefined;

  const permissions = new Set(
    queryAll<{ permission_code: string }>(
      db,
      "SELECT permission_code FROM role_permissions WHERE role_id = ?",
      [row.role_id],
    ).map((permission) => permission.permission_code),
  );

  const scopedToParty = queryOne<{ scoped: number }>(
    db,
    "SELECT CASE WHEN name IN ('distributor','retailer','supplier','customer','transporter') THEN 1 ELSE 0 END AS scoped FROM roles WHERE id = ?",
    [row.role_id],
  );

  return {
    sessionId: row.session_id,
    user: {
      id: row.user_id,
      email: row.email,
      fullName: row.full_name,
      jobTitle: row.job_title,
      roleId: row.role_id,
      roleName: row.role_name,
      roleLabel: row.role_label,
      partyId: row.party_id,
      partyName: row.party_name,
      partyType: row.party_type,
    },
    permissions,
    scopedToParty: Boolean(scopedToParty?.scoped),
  };
}

/** Attach the session when present. Never rejects; `requireAuth` does that. */
export function attachSession(db: Db) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) {
      const auth = loadSession(db, token);
      if (auth) req.auth = auth;
    }
    next();
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(unauthorized("Sign in to continue"));
    return;
  }
  next();
}

export function hasPermission(auth: AuthContext, permission: string): boolean {
  return auth.permissions.has(permission);
}
