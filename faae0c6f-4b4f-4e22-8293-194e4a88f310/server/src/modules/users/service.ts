/** User accounts, role assignment and permission grants. */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne, transaction } from "../../db/database.js";
import { conflict, forbidden, notFound, unprocessable } from "../../platform/errors.js";
import { recordAudit } from "../../platform/audit.js";
import { hashPassword, randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";
import { PERMISSIONS } from "../../config/rbac.js";

export function listUsers(db: Db) {
  return queryAll<{
    id: string;
    email: string;
    full_name: string;
    job_title: string | null;
    status: string;
    last_login_at: string | null;
    created_at: string;
    role_id: string;
    role_label: string;
    party_name: string | null;
  }>(
    db,
    `SELECT u.id, u.email, u.full_name, u.job_title, u.status, u.last_login_at, u.created_at,
            r.id AS role_id, r.label AS role_label, p.name AS party_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN parties p ON p.id = u.party_id
      ORDER BY u.full_name`,
  ).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    jobTitle: row.job_title,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    role: { id: row.role_id, label: row.role_label },
    party: row.party_name,
  }));
}

export function listRoles(db: Db) {
  const roles = queryAll<{ id: string; name: string; label: string; description: string; is_system: number }>(
    db,
    "SELECT id, name, label, description, is_system FROM roles ORDER BY label",
  );
  const grants = queryAll<{ role_id: string; permission_code: string }>(
    db,
    "SELECT role_id, permission_code FROM role_permissions",
  );
  const counts = new Map<string, number>();
  for (const grant of grants) counts.set(grant.role_id, (counts.get(grant.role_id) ?? 0) + 1);
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    label: role.label,
    description: role.description,
    isSystem: role.is_system === 1,
    permissionCount: counts.get(role.id) ?? 0,
    permissions: grants.filter((grant) => grant.role_id === role.id).map((grant) => grant.permission_code),
  }));
}

export function listPermissions() {
  return PERMISSIONS;
}

export function createUser(
  db: Db,
  auth: AuthContext,
  input: {
    email: string;
    fullName: string;
    password: string;
    roleId: string;
    partyId?: string | null;
    jobTitle?: string | null;
    phone?: string | null;
  },
  ip?: string,
): string {
  const role = queryOne<{ id: string; name: string }>(db, "SELECT id, name FROM roles WHERE id = ?", [input.roleId]);
  if (!role) throw unprocessable("Select a valid role");
  const partyScoped = ["distributor", "retailer", "supplier", "customer", "transporter"].includes(role.name);
  if (partyScoped && !input.partyId) {
    throw unprocessable("This role must be linked to a business partner record");
  }
  if (input.partyId) {
    const party = queryOne<{ id: string }>(db, "SELECT id FROM parties WHERE id = ?", [input.partyId]);
    if (!party) throw unprocessable("Select a valid business partner");
  }
  const existing = queryOne<{ id: string }>(db, "SELECT id FROM users WHERE lower(email) = ?", [
    input.email.trim().toLowerCase(),
  ]);
  if (existing) throw conflict("A user with that email address already exists");

  const id = randomId();
  execute(
    db,
    `INSERT INTO users (id, email, full_name, password_hash, role_id, party_id, phone, job_title, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)`,
    [
      id,
      input.email.trim().toLowerCase(),
      input.fullName.trim(),
      hashPassword(input.password),
      input.roleId,
      partyScoped ? input.partyId ?? null : input.partyId || null,
      input.phone?.trim() || null,
      input.jobTitle?.trim() || null,
      nowIso(),
      nowIso(),
    ],
  );
  recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
    action: "users.created",
    entityType: "user",
    entityId: id,
    summary: `Created user ${input.email} with role ${role.name}`,
  }, ip);
  return id;
}

export function updateUser(
  db: Db,
  auth: AuthContext,
  id: string,
  input: {
    fullName?: string;
    jobTitle?: string | null;
    phone?: string | null;
    roleId?: string;
    status?: "active" | "suspended";
    partyId?: string | null;
    password?: string;
  },
  ip?: string,
) {
  return transaction(db, () => {
    const user = queryOne<{ id: string; email: string; role_id: string }>(
      db,
      "SELECT id, email, role_id FROM users WHERE id = ?",
      [id],
    );
    if (!user) throw notFound("User not found");
    if (id === auth.user.id && input.status === "suspended") {
      throw forbidden("You cannot suspend your own account");
    }
    if (id === auth.user.id && input.roleId && input.roleId !== user.role_id) {
      throw forbidden("You cannot change your own role");
    }
    if (input.roleId) {
      const role = queryOne<{ id: string }>(db, "SELECT id FROM roles WHERE id = ?", [input.roleId]);
      if (!role) throw unprocessable("Select a valid role");
    }
    execute(
      db,
      `UPDATE users SET full_name = COALESCE(?, full_name), job_title = ?, phone = ?, role_id = COALESCE(?, role_id),
              status = COALESCE(?, status), party_id = ?, password_hash = COALESCE(?, password_hash), updated_at = ?
        WHERE id = ?`,
      [
        input.fullName?.trim() || null,
        input.jobTitle?.trim() || null,
        input.phone?.trim() || null,
        input.roleId ?? null,
        input.status ?? null,
        input.partyId ?? null,
        input.password ? hashPassword(input.password) : null,
        nowIso(),
        id,
      ],
    );
    if (input.status === "suspended" || input.password) {
      execute(db, "DELETE FROM sessions WHERE user_id = ?", [id]);
    }
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "users.updated",
      entityType: "user",
      entityId: id,
      summary: `Updated user ${user.email}`,
      metadata: { roles: Boolean(input.roleId), passwordReset: Boolean(input.password), status: input.status },
    }, ip);
    return { id };
  });
}

export function setRolePermissions(
  db: Db,
  auth: AuthContext,
  roleId: string,
  permissions: string[],
  ip?: string,
) {
  return transaction(db, () => {
    const role = queryOne<{ id: string; name: string; label: string }>(
      db,
      "SELECT id, name, label FROM roles WHERE id = ?",
      [roleId],
    );
    if (!role) throw notFound("Role not found");
    if (role.name === "admin") throw forbidden("The administrator role always retains full access");

    const valid = new Set(PERMISSIONS.map((permission) => permission.code));
    const unknown = permissions.filter((permission) => !valid.has(permission));
    if (unknown.length) throw unprocessable(`Unknown permissions: ${unknown.join(", ")}`);

    execute(db, "DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
    for (const permission of new Set(permissions)) {
      execute(db, "INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)", [roleId, permission]);
    }
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "roles.permissions_updated",
      entityType: "role",
      entityId: roleId,
      summary: `Updated permissions for ${role.label}`,
      metadata: { permissions: permissions.length },
    }, ip);
    return { id: roleId, permissions: [...new Set(permissions)] };
  });
}

export function listPartyOptions(db: Db) {
  return queryAll<{ id: string; name: string; type: string }>(
    db,
    "SELECT id, name, type FROM parties ORDER BY type, name",
  );
}
