/** Inventory SQL. All stock changes go through the service layer. */
import { execute, nowIso, queryAll, queryOne, type Db } from "../../db/database.js";
import { randomId } from "../../platform/security.js";

export interface StockRow {
  id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  location_type: string;
  product_id: string;
  sku: string;
  product_name: string;
  category: string;
  unit: string;
  quantity: number;
  reserved: number;
  reorder_level: number;
  unit_price_kobo: number;
  updated_at: string;
}

export interface MovementRow {
  id: string;
  direction: "in" | "out";
  quantity: number;
  balance_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
  created_by_name: string | null;
  product_id: string;
  sku: string;
  product_name: string;
  unit: string;
  location_id: string;
  location_name: string;
}

export interface StockFilter {
  locationId?: string;
  productId?: string;
  category?: string;
  search?: string;
  lowStock?: boolean;
  limit?: number;
  offset?: number;
}

function stockWhere(filter: StockFilter): { clause: string; params: (string | number)[] } {
  const conditions: string[] = ["l.is_active = 1"];
  const params: (string | number)[] = [];
  if (filter.locationId) {
    conditions.push("i.location_id = ?");
    params.push(filter.locationId);
  }
  if (filter.productId) {
    conditions.push("i.product_id = ?");
    params.push(filter.productId);
  }
  if (filter.category) {
    conditions.push("p.category = ?");
    params.push(filter.category);
  }
  if (filter.search) {
    conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR l.name LIKE ?)");
    const like = `%${filter.search}%`;
    params.push(like, like, like);
  }
  if (filter.lowStock) {
    conditions.push("(i.quantity - i.reserved) <= p.reorder_level");
  }
  return { clause: `WHERE ${conditions.join(" AND ")}`, params };
}

export function listStock(db: Db, filter: StockFilter): { rows: StockRow[]; total: number } {
  const { clause, params } = stockWhere(filter);
  const rows = queryAll<StockRow>(
    db,
    `SELECT i.id, i.location_id, l.code AS location_code, l.name AS location_name, l.type AS location_type,
            i.product_id, p.sku, p.name AS product_name, p.category, p.unit,
            i.quantity, i.reserved, p.reorder_level, p.unit_price_kobo, i.updated_at
       FROM inventory i
       JOIN locations l ON l.id = i.location_id
       JOIN products p ON p.id = i.product_id
       ${clause}
      ORDER BY p.category, p.name, l.name
      LIMIT ? OFFSET ?`,
    [...params, filter.limit ?? 100, filter.offset ?? 0],
  );
  const total = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM inventory i
       JOIN locations l ON l.id = i.location_id
       JOIN products p ON p.id = i.product_id
       ${clause}`,
    params,
  );
  return { rows, total: Number(total?.count ?? 0) };
}

export function findStockRow(db: Db, locationId: string, productId: string): StockRow | undefined {
  return queryOne<StockRow>(
    db,
    `SELECT i.id, i.location_id, l.code AS location_code, l.name AS location_name, l.type AS location_type,
            i.product_id, p.sku, p.name AS product_name, p.category, p.unit,
            i.quantity, i.reserved, p.reorder_level, p.unit_price_kobo, i.updated_at
       FROM inventory i
       JOIN locations l ON l.id = i.location_id
       JOIN products p ON p.id = i.product_id
      WHERE i.location_id = ? AND i.product_id = ?`,
    [locationId, productId],
  );
}

export function ensureRow(db: Db, locationId: string, productId: string): void {
  execute(
    db,
    `INSERT INTO inventory (id, location_id, product_id, quantity, reserved, updated_at)
     VALUES (?, ?, ?, 0, 0, ?)
     ON CONFLICT (location_id, product_id) DO NOTHING`,
    [randomId(), locationId, productId, nowIso()],
  );
}

export function updateStock(db: Db, locationId: string, productId: string, quantity: number, reserved: number): void {
  execute(
    db,
    "UPDATE inventory SET quantity = ?, reserved = ?, updated_at = ? WHERE location_id = ? AND product_id = ?",
    [quantity, reserved, nowIso(), locationId, productId],
  );
}

export function insertMovement(
  db: Db,
  input: {
    locationId: string;
    productId: string;
    direction: "in" | "out";
    quantity: number;
    balanceAfter: number;
    reason: string;
    referenceType?: string | null;
    referenceId?: string | null;
    note?: string | null;
    actorId?: string | null;
  },
): void {
  execute(
    db,
    `INSERT INTO inventory_movements
       (id, location_id, product_id, direction, quantity, balance_after, reason, reference_type, reference_id, note, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomId(),
      input.locationId,
      input.productId,
      input.direction,
      input.quantity,
      input.balanceAfter,
      input.reason,
      input.referenceType ?? null,
      input.referenceId ?? null,
      input.note ?? null,
      input.actorId ?? null,
      nowIso(),
    ],
  );
}

export function listMovements(
  db: Db,
  filter: { productId?: string; locationId?: string; reason?: string; limit: number; offset: number },
): { rows: MovementRow[]; total: number } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filter.productId) {
    conditions.push("m.product_id = ?");
    params.push(filter.productId);
  }
  if (filter.locationId) {
    conditions.push("m.location_id = ?");
    params.push(filter.locationId);
  }
  if (filter.reason) {
    conditions.push("m.reason = ?");
    params.push(filter.reason);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = queryAll<MovementRow>(
    db,
    `SELECT m.*, p.sku, p.name AS product_name, p.unit, l.name AS location_name, u.full_name AS created_by_name
       FROM inventory_movements m
       JOIN products p ON p.id = m.product_id
       JOIN locations l ON l.id = m.location_id
       LEFT JOIN users u ON u.id = m.created_by
       ${clause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, filter.limit, filter.offset],
  );
  const total = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM inventory_movements m ${clause}`,
    params,
  );
  return { rows, total: Number(total?.count ?? 0) };
}
