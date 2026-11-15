/** Authentication service: sessions, password recovery and password change. */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne, transaction } from "../../db/database.js";
import { badRequest, forbidden, notFound, unauthorized, AppError } from "../../platform/errors.js";
import { recordAudit } from "../../platform/audit.js";
import {
  hashPassword,
  randomId,
  randomToken,
  sha256,
  verifyPassword,
} from "../../platform/security.js";
import { env } from "../../config/env.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../../config/demo.js";
import type { AuthContext, SessionUser } from "../../middleware/authenticate.js";

const SESSION_TTL_MS = env.sessionTtlHours * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  job_title: string | null;
  status: string;
  role_id: string;
  role_name: string;
  role_label: string;
  party_id: string | null;
  party_name: string | null;
  party_type: string | null;
}

const USER_SELECT = `
  SELECT u.id, u.email, u.full_name, u.password_hash, u.job_title, u.status,
         r.id AS role_id, r.name AS role_name, r.label AS role_label,
         p.id AS party_id, p.name AS party_name, p.type AS party_type
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN parties p ON p.id = u.party_id
`;

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    jobTitle: row.job_title,
    roleId: row.role_id,
    roleName: row.role_name,
    roleLabel: row.role_label,
    partyId: row.party_id,
    partyName: row.party_name,
    partyType: row.party_type,
  };
}

export function permissionsOf(db: Db, roleId: string): string[] {
  return queryAll<{ permission_code: string }>(
    db,
    "SELECT permission_code FROM role_permissions WHERE role_id = ? ORDER BY permission_code",
    [roleId],
  ).map((row) => row.permission_code);
}

export function profileFor(auth: AuthContext) {
  return {
    user: auth.user,
    permissions: [...auth.permissions].sort(),
    scopedToParty: auth.scopedToParty,
  };
}

export interface LoginInput {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  user: SessionUser;
  permissions: string[];
  scopedToParty: boolean;
}

export function login(db: Db, input: LoginInput): LoginResult {
  const email = input.email.trim().toLowerCase();
  const row = queryOne<UserRow>(db, `${USER_SELECT} WHERE lower(u.email) = ?`, [email]);

  if (!row || !verifyPassword(input.password, row.password_hash)) {
    if (row) {
      recordAudit(
        db,
        { id: row.id, fullName: row.full_name },
        { action: "auth.login_failed", entityType: "user", entityId: row.id, summary: "Failed sign-in attempt" },
        input.ip,
      );
    }
    throw unauthorized("Incorrect email address or password");
  }
  if (row.status !== "active") {
    throw forbidden("This account has been suspended. Contact the platform administrator.");
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  transaction(db, () => {
    execute(
      db,
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomId(), row.id, sha256(token), expiresAt, input.ip ?? null, input.userAgent ?? null, nowIso()],
    );
    execute(db, "UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?", [nowIso(), nowIso(), row.id]);
    execute(db, "DELETE FROM sessions WHERE expires_at <= ?", [nowIso()]);
    recordAudit(
      db,
      { id: row.id, fullName: row.full_name },
      { action: "auth.login", entityType: "user", entityId: row.id, summary: `${row.role_label} signed in` },
      input.ip,
    );
  });

  const scoped = queryOne<{ scoped: number }>(
    db,
    "SELECT CASE WHEN name IN ('distributor','retailer','supplier','customer','transporter') THEN 1 ELSE 0 END AS scoped FROM roles WHERE id = ?",
    [row.role_id],
  );

  return {
    token,
    expiresAt,
    user: toSessionUser(row),
    permissions: permissionsOf(db, row.role_id),
    scopedToParty: Boolean(scoped?.scoped),
  };
}

export function logout(db: Db, auth: AuthContext, ip?: string): void {
  transaction(db, () => {
    execute(db, "DELETE FROM sessions WHERE id = ?", [auth.sessionId]);
    recordAudit(
      db,
      { id: auth.user.id, fullName: auth.user.fullName },
      { action: "auth.logout", entityType: "user", entityId: auth.user.id, summary: "Signed out" },
      ip,
    );
  });
}

export interface ForgotPasswordResult {
  message: string;
  /** Only present outside production so the demo can be completed. */
  resetToken?: string;
  expiresAt?: string;
}

export function requestPasswordReset(db: Db, email: string): ForgotPasswordResult {
  const generic: ForgotPasswordResult = {
    message: "If an account exists for that address, a password reset link has been issued.",
  };
  const row = queryOne<UserRow>(db, `${USER_SELECT} WHERE lower(u.email) = ?`, [email.trim().toLowerCase()]);
  if (!row) return generic;

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
  transaction(db, () => {
    execute(db, "DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL", [row.id]);
    execute(
      db,
      "INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
      [randomId(), row.id, sha256(token), expiresAt, nowIso()],
    );
    recordAudit(db, { id: row.id, fullName: row.full_name }, {
      action: "auth.password_reset_requested",
      entityType: "user",
      entityId: row.id,
      summary: "Password reset requested",
    });
  });

  if (env.isProduction) return generic;
  return { ...generic, resetToken: token, expiresAt };
}

export function resetPassword(db: Db, token: string, newPassword: string): void {
  const record = queryOne<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    db,
    "SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?",
    [sha256(token)],
  );
  if (!record) throw badRequest("This reset link is invalid");
  if (record.used_at) throw badRequest("This reset link has already been used");
  if (new Date(record.expires_at).getTime() <= Date.now()) throw badRequest("This reset link has expired");

  transaction(db, () => {
    execute(db, "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?", [
      hashPassword(newPassword),
      nowIso(),
      record.user_id,
    ]);
    execute(db, "UPDATE password_resets SET used_at = ? WHERE id = ?", [nowIso(), record.id]);
    execute(db, "DELETE FROM sessions WHERE user_id = ?", [record.user_id]);
    recordAudit(db, { id: record.user_id, fullName: "Account owner" }, {
      action: "auth.password_reset",
      entityType: "user",
      entityId: record.user_id,
      summary: "Password reset completed",
    });
  });
}

export function changePassword(
  db: Db,
  userId: string,
  currentPassword: string,
  newPassword: string,
): void {
  const row = queryOne<{ password_hash: string; full_name: string }>(
    db,
    "SELECT password_hash, full_name FROM users WHERE id = ?",
    [userId],
  );
  if (!row) throw notFound("User not found");
  if (!verifyPassword(currentPassword, row.password_hash)) {
    throw new AppError(400, "bad_request", "The current password is incorrect");
  }
  execute(db, "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?", [
    hashPassword(newPassword),
    nowIso(),
    userId,
  ]);
  recordAudit(db, { id: userId, fullName: row.full_name }, {
    action: "auth.password_changed",
    entityType: "user",
    entityId: userId,
    summary: "Password changed from the portal",
  });
}

/**
 * Demo account switcher data. Served when DEMO_ACCOUNTS is enabled — on by
 * default outside production, opt-in in a deployed environment.
 */
export function demoAccounts() {
  if (!env.demoAccountsEnabled) return [];
  return DEMO_ACCOUNTS.map((account) => ({
    email: account.email,
    fullName: account.fullName,
    roleLabel: account.roleLabel,
    jobTitle: account.jobTitle,
    password: DEMO_PASSWORD,
  }));
}
