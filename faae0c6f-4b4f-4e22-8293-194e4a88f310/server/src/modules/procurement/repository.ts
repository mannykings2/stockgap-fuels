/** Purchase order SQL. */
import { execute, nowIso, queryAll, queryOne, type Db } from "../../db/database.js";
import { randomId } from "../../platform/security.js";

export interface PoRow {
  id: string;
  reference: string;
  supplier_id: string;
  supplier_name: string;
  location_id: string;
  location_name: string;
  status: string;
  currency: string;
  total_kobo: number;
  expected_date: string | null;
  notes: string | null;
  requested_by: string;
  requested_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  line_count: number;
}

export interface PoLineRow {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  unit: string;
  quantity: number;
  received_quantity: number;
  unit_price_kobo: number;
}

const SELECT = `
  SELECT po.*, s.name AS supplier_name, l.name AS location_name,
         u.full_name AS requested_by_name, a.full_name AS approved_by_name,
         (SELECT COUNT(*) FROM purchase_order_lines pol WHERE pol.purchase_order_id = po.id) AS line_count
    FROM purchase_orders po
    JOIN parties s ON s.id = po.supplier_id
    JOIN locations l ON l.id = po.location_id
    JOIN users u ON u.id = po.requested_by
    LEFT JOIN users a ON a.id = po.approved_by
`;

export function mapPo(row: PoRow) {
  return {
    id: row.id,
    reference: row.reference,
    supplier: { id: row.supplier_id, name: row.supplier_name },
    location: { id: row.location_id, name: row.location_name },
    status: row.status,
    currency: row.currency,
    totalKobo: row.total_kobo,
    expectedDate: row.expected_date,
    notes: row.notes,
    requestedBy: { id: row.requested_by, name: row.requested_by_name },
    approvedBy: row.approved_by ? { id: row.approved_by, name: row.approved_by_name } : null,
    approvedAt: row.approved_at,
    lineCount: Number(row.line_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listPurchaseOrders(
  db: Db,
  filter: { status?: string; supplierId?: string; search?: string; limit: number; offset: number },
): { rows: PoRow[]; total: number } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filter.status) {
    conditions.push("po.status = ?");
    params.push(filter.status);
  }
  if (filter.supplierId) {
    conditions.push("po.supplier_id = ?");
    params.push(filter.supplierId);
  }
  if (filter.search) {
    conditions.push("(po.reference LIKE ? OR s.name LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = queryAll<PoRow>(
    db,
    `${SELECT} ${clause} ORDER BY po.created_at DESC LIMIT ? OFFSET ?`,
    [...params, filter.limit, filter.offset],
  );
  const total = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM purchase_orders po JOIN parties s ON s.id = po.supplier_id ${clause}`,
    params,
  );
  return { rows, total: Number(total?.count ?? 0) };
}

export function findPurchaseOrder(db: Db, id: string): PoRow | undefined {
  return queryOne<PoRow>(db, `${SELECT} WHERE po.id = ?`, [id]);
}

export function findLines(db: Db, purchaseOrderId: string): PoLineRow[] {
  return queryAll<PoLineRow>(
    db,
    `SELECT pol.*, p.sku, p.name AS product_name, p.unit
       FROM purchase_order_lines pol
       JOIN products p ON p.id = pol.product_id
      WHERE pol.purchase_order_id = ?
      ORDER BY p.name`,
    [purchaseOrderId],
  );
}

export function mapLine(row: PoLineRow) {
  return {
    id: row.id,
    product: { id: row.product_id, sku: row.sku, name: row.product_name, unit: row.unit },
    quantity: row.quantity,
    receivedQuantity: row.received_quantity,
    unitPriceKobo: row.unit_price_kobo,
    lineTotalKobo: Math.round(row.quantity * row.unit_price_kobo),
  };
}

export function insertPurchaseOrder(
  db: Db,
  input: {
    id: string;
    reference: string;
    supplierId: string;
    locationId: string;
    expectedDate: string | null;
    notes: string | null;
    requestedBy: string;
    totalKobo: number;
  },
): void {
  const now = nowIso();
  execute(
    db,
    `INSERT INTO purchase_orders
       (id, reference, supplier_id, location_id, status, currency, total_kobo, expected_date, notes, requested_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', 'NGN', ?, ?, ?, ?, ?, ?)`,
    [input.id, input.reference, input.supplierId, input.locationId, input.totalKobo, input.expectedDate, input.notes, input.requestedBy, now, now],
  );
}

export function insertLine(
  db: Db,
  purchaseOrderId: string,
  line: { productId: string; quantity: number; unitPriceKobo: number },
): void {
  execute(
    db,
    "INSERT INTO purchase_order_lines (id, purchase_order_id, product_id, quantity, unit_price_kobo) VALUES (?, ?, ?, ?, ?)",
    [randomId(), purchaseOrderId, line.productId, line.quantity, line.unitPriceKobo],
  );
}

export function updateStatus(
  db: Db,
  id: string,
  status: string,
  approvedBy?: string | null,
): void {
  execute(
    db,
    `UPDATE purchase_orders SET status = ?, approved_by = COALESCE(?, approved_by),
            approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END, updated_at = ?
      WHERE id = ?`,
    [status, approvedBy ?? null, status, nowIso(), nowIso(), id],
  );
}

export function listReceipts(db: Db, purchaseOrderId: string) {
  return queryAll<{
    id: string;
    reference: string;
    received_at: string;
    notes: string | null;
    received_by_name: string;
    total_quantity: number | null;
  }>(
    db,
    `SELECT gr.id, gr.reference, gr.received_at, gr.notes, u.full_name AS received_by_name,
            (SELECT SUM(qty.quantity) FROM goods_receipt_lines qty WHERE qty.goods_receipt_id = gr.id) AS total_quantity
       FROM goods_receipts gr
       JOIN users u ON u.id = gr.received_by
      WHERE gr.purchase_order_id = ?
      ORDER BY gr.received_at DESC`,
    [purchaseOrderId],
  );
}

export function insertReceipt(
  db: Db,
  input: { id: string; reference: string; purchaseOrderId: string; locationId: string; receivedBy: string; notes: string | null },
): void {
  execute(
    db,
    `INSERT INTO goods_receipts (id, reference, purchase_order_id, location_id, received_by, received_at, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.id, input.reference, input.purchaseOrderId, input.locationId, input.receivedBy, nowIso(), input.notes, nowIso()],
  );
}

export function insertReceiptLine(
  db: Db,
  input: { receiptId: string; purchaseOrderLineId: string; productId: string; quantity: number },
): void {
  execute(
    db,
    `INSERT INTO goods_receipt_lines (id, goods_receipt_id, purchase_order_line_id, product_id, quantity)
     VALUES (?, ?, ?, ?, ?)`,
    [randomId(), input.receiptId, input.purchaseOrderLineId, input.productId, input.quantity],
  );
}

export function incrementReceived(db: Db, lineId: string, quantity: number): void {
  execute(db, "UPDATE purchase_order_lines SET received_quantity = received_quantity + ? WHERE id = ?", [
    quantity,
    lineId,
  ]);
}
