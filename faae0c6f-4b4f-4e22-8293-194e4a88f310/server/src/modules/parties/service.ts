/**
 * Business parties: suppliers, distributors, retailers, customers and
 * transporters share one table because ordering, shipments and invoices all
 * reference a single counterparty identity.
 */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne } from "../../db/database.js";
import { conflict, forbidden, notFound } from "../../platform/errors.js";
import { recordAudit } from "../../platform/audit.js";
import { randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";

export const PARTY_TYPES = ["supplier", "distributor", "retailer", "customer", "transporter"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

interface PartyRow {
  id: string;
  code: string;
  name: string;
  type: PartyType;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  tin: string | null;
  status: "active" | "on_hold" | "inactive";
  credit_limit_kobo: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  open_orders?: number | null;
  outstanding_kobo?: number | null;
}

function toParty(row: PartyRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    tin: row.tin,
    status: row.status,
    creditLimitKobo: row.credit_limit_kobo,
    notes: row.notes,
    openOrders: Number(row.open_orders ?? 0),
    outstandingKobo: Number(row.outstanding_kobo ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listParties(
  db: Db,
  auth: AuthContext,
  filter: { type?: string; search?: string; status?: string },
) {
  if (!auth.permissions.has("customers:read") && !auth.permissions.has("suppliers:read")) {
    throw forbidden("You do not have permission to view business partners");
  }
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter.type) {
    conditions.push("p.type = ?");
    params.push(filter.type);
  }
  if (filter.search) {
    conditions.push("(p.name LIKE ? OR p.code LIKE ? OR p.email LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
  }
  if (filter.status) {
    conditions.push("p.status = ?");
    params.push(filter.status);
  }
  // Party-scoped users only ever see their own organisation.
  if (auth.scopedToParty && auth.user.partyId) {
    conditions.push("p.id = ?");
    params.push(auth.user.partyId);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = queryAll<PartyRow>(
    db,
    `SELECT p.*,
            (SELECT COUNT(*) FROM customer_orders o WHERE o.customer_id = p.id AND o.status NOT IN ('delivered','cancelled')) AS open_orders,
            (SELECT COALESCE(SUM(i.amount_kobo - i.amount_paid_kobo), 0) FROM invoices i WHERE i.customer_id = p.id AND i.status != 'paid') AS outstanding_kobo
       FROM parties p
       ${clause}
      ORDER BY p.type, p.name`,
    params,
  );
  return rows.map(toParty);
}

export function getParty(db: Db, auth: AuthContext, id: string) {
  if (auth.scopedToParty && auth.user.partyId !== id) {
    throw forbidden("You can only view your own organisation");
  }
  const row = queryOne<PartyRow>(db, "SELECT * FROM parties WHERE id = ?", [id]);
  if (!row) throw notFound("Business partner not found");

  const orders = queryAll<{ id: string; reference: string; status: string; total_kobo: number; created_at: string }>(
    db,
    "SELECT id, reference, status, total_kobo, created_at FROM customer_orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10",
    [id],
  );
  const purchaseOrders = queryAll<{ id: string; reference: string; status: string; total_kobo: number; created_at: string }>(
    db,
    "SELECT id, reference, status, total_kobo, created_at FROM purchase_orders WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 10",
    [id],
  );
  return {
    ...toParty(row),
    recentOrders: orders.map((order) => ({
      id: order.id,
      reference: order.reference,
      status: order.status,
      totalKobo: order.total_kobo,
      createdAt: order.created_at,
    })),
    recentPurchaseOrders: purchaseOrders.map((order) => ({
      id: order.id,
      reference: order.reference,
      status: order.status,
      totalKobo: order.total_kobo,
      createdAt: order.created_at,
    })),
  };
}

export interface PartyInput {
  name: string;
  type: PartyType;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  tin?: string | null;
  status?: "active" | "on_hold" | "inactive";
  creditLimitKobo?: number;
  notes?: string | null;
}

export function createParty(db: Db, auth: AuthContext, input: PartyInput, ip?: string): string {
  const id = randomId();
  const now = nowIso();
  const count = queryOne<{ count: number }>(db, "SELECT COUNT(*) AS count FROM parties");
  const code = `PTY-${String(Number(count?.count ?? 0) + 1).padStart(4, "0")}`;
  const existing = queryOne<{ id: string }>(db, "SELECT id FROM parties WHERE name = ? AND type = ?", [
    input.name.trim(),
    input.type,
  ]);
  if (existing) throw conflict("A business partner with that name and type already exists");

  execute(
    db,
    `INSERT INTO parties (id, code, name, type, contact_name, email, phone, address, city, state, tin, status, credit_limit_kobo, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      input.name.trim(),
      input.type,
      input.contactName?.trim() || null,
      input.email?.trim().toLowerCase() || null,
      input.phone?.trim() || null,
      input.address?.trim() || null,
      input.city?.trim() || null,
      input.state?.trim() || null,
      input.tin?.trim() || null,
      input.status ?? "active",
      input.creditLimitKobo ?? 0,
      input.notes?.trim() || null,
      now,
      now,
    ],
  );
  recordAudit(
    db,
    { id: auth.user.id, fullName: auth.user.fullName },
    { action: "parties.created", entityType: "party", entityId: id, summary: `Created ${input.type} ${input.name}`, metadata: { code } },
    ip,
  );
  return id;
}

export function updateParty(db: Db, auth: AuthContext, id: string, input: PartyInput, ip?: string): void {
  const existing = queryOne<{ id: string }>(db, "SELECT id FROM parties WHERE id = ?", [id]);
  if (!existing) throw notFound("Business partner not found");
  execute(
    db,
    `UPDATE parties SET name = ?, type = ?, contact_name = ?, email = ?, phone = ?, address = ?, city = ?,
            state = ?, tin = ?, status = ?, credit_limit_kobo = ?, notes = ?, updated_at = ? WHERE id = ?`,
    [
      input.name.trim(),
      input.type,
      input.contactName?.trim() || null,
      input.email?.trim().toLowerCase() || null,
      input.phone?.trim() || null,
      input.address?.trim() || null,
      input.city?.trim() || null,
      input.state?.trim() || null,
      input.tin?.trim() || null,
      input.status ?? "active",
      input.creditLimitKobo ?? 0,
      input.notes?.trim() || null,
      nowIso(),
      id,
    ],
  );
  recordAudit(
    db,
    { id: auth.user.id, fullName: auth.user.fullName },
    { action: "parties.updated", entityType: "party", entityId: id, summary: `Updated ${input.type} ${input.name}` },
    ip,
  );
}
