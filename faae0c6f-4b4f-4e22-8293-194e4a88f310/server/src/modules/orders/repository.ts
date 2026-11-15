/** Customer order SQL shared by sales, logistics and finance. */
import { execute, nowIso, queryAll, queryOne, type Db } from "../../db/database.js";
import { randomId } from "../../platform/security.js";

export interface OrderRow {
  id: string;
  reference: string;
  customer_id: string;
  customer_name: string;
  customer_type: string;
  location_id: string;
  location_name: string;
  status: string;
  channel: string;
  total_kobo: number;
  requested_delivery_date: string | null;
  delivery_address: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_by: string;
  created_by_name: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  line_count: number;
}

export interface OrderLineRow {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  unit: string;
  category: string;
  quantity: number;
  allocated_quantity: number;
  unit_price_kobo: number;
}

const SELECT = `
  SELECT o.*, c.name AS customer_name, c.type AS customer_type, l.name AS location_name,
         u.full_name AS created_by_name,
         (SELECT COUNT(*) FROM customer_order_lines ol WHERE ol.customer_order_id = o.id) AS line_count
    FROM customer_orders o
    JOIN parties c ON c.id = o.customer_id
    JOIN locations l ON l.id = o.location_id
    JOIN users u ON u.id = o.created_by
`;

export function mapOrder(row: OrderRow) {
  return {
    id: row.id,
    reference: row.reference,
    customer: { id: row.customer_id, name: row.customer_name, type: row.customer_type },
    location: { id: row.location_id, name: row.location_name },
    status: row.status,
    channel: row.channel,
    totalKobo: row.total_kobo,
    requestedDeliveryDate: row.requested_delivery_date,
    deliveryAddress: row.delivery_address,
    contactPhone: row.contact_phone,
    notes: row.notes,
    createdBy: { id: row.created_by, name: row.created_by_name },
    approvedAt: row.approved_at,
    lineCount: Number(row.line_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listOrders(
  db: Db,
  filter: { status?: string; customerId?: string; search?: string; limit: number; offset: number },
): { rows: OrderRow[]; total: number } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filter.status) {
    conditions.push("o.status = ?");
    params.push(filter.status);
  }
  if (filter.customerId) {
    conditions.push("o.customer_id = ?");
    params.push(filter.customerId);
  }
  if (filter.search) {
    conditions.push("(o.reference LIKE ? OR c.name LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = queryAll<OrderRow>(
    db,
    `${SELECT} ${clause} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, filter.limit, filter.offset],
  );
  const total = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM customer_orders o JOIN parties c ON c.id = o.customer_id ${clause}`,
    params,
  );
  return { rows, total: Number(total?.count ?? 0) };
}

export function findOrder(db: Db, id: string): OrderRow | undefined {
  return queryOne<OrderRow>(db, `${SELECT} WHERE o.id = ?`, [id]);
}

export function findLines(db: Db, orderId: string): OrderLineRow[] {
  return queryAll<OrderLineRow>(
    db,
    `SELECT ol.*, p.sku, p.name AS product_name, p.unit, p.category
       FROM customer_order_lines ol JOIN products p ON p.id = ol.product_id
      WHERE ol.customer_order_id = ? ORDER BY p.name`,
    [orderId],
  );
}

export function mapLine(row: OrderLineRow) {
  return {
    id: row.id,
    product: { id: row.product_id, sku: row.sku, name: row.product_name, unit: row.unit, category: row.category },
    quantity: row.quantity,
    allocatedQuantity: row.allocated_quantity,
    unitPriceKobo: row.unit_price_kobo,
    lineTotalKobo: Math.round(row.quantity * row.unit_price_kobo),
  };
}

export function insertOrder(
  db: Db,
  input: {
    id: string;
    reference: string;
    customerId: string;
    locationId: string;
    channel: string;
    totalKobo: number;
    requestedDeliveryDate: string | null;
    deliveryAddress: string | null;
    contactPhone: string | null;
    notes: string | null;
    createdBy: string;
  },
): void {
  const now = nowIso();
  execute(
    db,
    `INSERT INTO customer_orders
       (id, reference, customer_id, location_id, status, channel, total_kobo, requested_delivery_date,
        delivery_address, contact_phone, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id, input.reference, input.customerId, input.locationId, input.channel, input.totalKobo,
      input.requestedDeliveryDate, input.deliveryAddress, input.contactPhone, input.notes, input.createdBy, now, now,
    ],
  );
}

export function insertLine(
  db: Db,
  orderId: string,
  line: { productId: string; quantity: number; unitPriceKobo: number },
): void {
  execute(
    db,
    `INSERT INTO customer_order_lines (id, customer_order_id, product_id, quantity, allocated_quantity, unit_price_kobo)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [randomId(), orderId, line.productId, line.quantity, line.unitPriceKobo],
  );
}

export function updateStatus(db: Db, id: string, status: string, approvedBy?: string): void {
  execute(
    db,
    `UPDATE customer_orders
        SET status = ?, approved_by = COALESCE(?, approved_by),
            approved_at = CASE WHEN ? = 'approved' AND approved_at IS NULL THEN ? ELSE approved_at END,
            updated_at = ?
      WHERE id = ?`,
    [status, approvedBy ?? null, status, nowIso(), nowIso(), id],
  );
}

export function setAllocated(db: Db, lineId: string, quantity: number): void {
  execute(db, "UPDATE customer_order_lines SET allocated_quantity = ? WHERE id = ?", [quantity, lineId]);
}

export function shipmentsForOrder(db: Db, orderId: string) {
  return queryAll<{
    id: string;
    reference: string;
    status: string;
    vehicle_plate: string | null;
    driver_name: string | null;
    destination: string;
    dispatched_at: string | null;
    delivered_at: string | null;
    transporter_name: string | null;
  }>(
    db,
    `SELECT s.id, s.reference, s.status, s.vehicle_plate, s.driver_name, s.destination,
            s.dispatched_at, s.delivered_at, p.name AS transporter_name
       FROM shipments s LEFT JOIN parties p ON p.id = s.transporter_id
      WHERE s.order_id = ? ORDER BY s.created_at DESC`,
    [orderId],
  );
}

export function invoicesForOrder(db: Db, orderId: string) {
  return queryAll<{
    id: string;
    reference: string;
    amount_kobo: number;
    amount_paid_kobo: number;
    status: string;
    issued_at: string;
    due_date: string | null;
  }>(
    db,
    `SELECT id, reference, amount_kobo, amount_paid_kobo, status, issued_at, due_date
       FROM invoices WHERE order_id = ? ORDER BY created_at DESC`,
    [orderId],
  );
}
