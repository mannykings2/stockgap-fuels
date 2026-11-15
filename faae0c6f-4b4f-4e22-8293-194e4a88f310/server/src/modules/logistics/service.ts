/**
 * Logistics: shipments are created at dispatch. Delivery confirmation is the
 * final step of the chain - it marks the order delivered and triggers the
 * invoice, all inside one transaction.
 */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne, transaction } from "../../db/database.js";
import { conflict, forbidden, notFound, unprocessable } from "../../platform/errors.js";
import { notify, recordAudit } from "../../platform/audit.js";
import type { AuthContext } from "../../middleware/authenticate.js";
import { markDelivered } from "../orders/service.js";
import { issueInvoiceForOrder } from "../finance/service.js";

interface ShipmentRow {
  id: string;
  reference: string;
  order_id: string;
  order_reference: string;
  customer_name: string;
  location_name: string;
  transporter_id: string | null;
  transporter_name: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  destination: string;
  status: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT = `
  SELECT s.*, o.reference AS order_reference, c.name AS customer_name, l.name AS location_name,
         t.name AS transporter_name
    FROM shipments s
    JOIN customer_orders o ON o.id = s.order_id
    JOIN parties c ON c.id = o.customer_id
    JOIN locations l ON l.id = o.location_id
    LEFT JOIN parties t ON t.id = s.transporter_id
`;

export function mapShipment(row: ShipmentRow) {
  return {
    id: row.id,
    reference: row.reference,
    order: { id: row.order_id, reference: row.order_reference },
    customer: row.customer_name,
    location: row.location_name,
    transporter: row.transporter_id ? { id: row.transporter_id, name: row.transporter_name } : null,
    vehiclePlate: row.vehicle_plate,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    destination: row.destination,
    status: row.status,
    dispatchedAt: row.dispatched_at,
    deliveredAt: row.delivered_at,
    deliveryNotes: row.delivery_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function list(
  db: Db,
  auth: AuthContext,
  filter: { status?: string; search?: string },
  page: { limit: number; offset: number },
) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (auth.user.partyType === "transporter") {
    conditions.push("s.transporter_id = ?");
    params.push(auth.user.partyId ?? "__none__");
  }
  if (filter.status) {
    conditions.push("s.status = ?");
    params.push(filter.status);
  }
  if (filter.search) {
    conditions.push("(s.reference LIKE ? OR s.destination LIKE ? OR o.reference LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = queryAll<ShipmentRow>(db, `${SELECT} ${clause} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`, [
    ...params,
    page.limit,
    page.offset,
  ]);
  const total = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM shipments s
       JOIN customer_orders o ON o.id = s.order_id ${clause}`,
    params,
  );
  return { items: rows.map(mapShipment), total: Number(total?.count ?? 0) };
}

export function get(db: Db, auth: AuthContext, id: string) {
  const row = queryOne<ShipmentRow>(db, `${SELECT} WHERE s.id = ?`, [id]);
  if (!row) throw notFound("Shipment not found");
  if (auth.user.partyType === "transporter" && row.transporter_id !== auth.user.partyId) {
    throw forbidden("This shipment is assigned to another transporter");
  }
  const lines = queryAll<{ sku: string; name: string; unit: string; quantity: number }>(
    db,
    `SELECT p.sku, p.name, p.unit, ol.quantity
       FROM customer_order_lines ol JOIN products p ON p.id = ol.product_id
      WHERE ol.customer_order_id = ? ORDER BY p.name`,
    [row.order_id],
  );
  return {
    ...mapShipment(row),
    cargo: lines.map((line) => ({ sku: line.sku, name: line.name, unit: line.unit, quantity: line.quantity })),
  };
}

export function assign(
  db: Db,
  auth: AuthContext,
  id: string,
  input: { transporterId?: string | null; vehiclePlate?: string | null; driverName?: string | null; driverPhone?: string | null },
  ip?: string,
) {
  return transaction(db, () => {
    const row = queryOne<ShipmentRow>(db, `${SELECT} WHERE s.id = ?`, [id]);
    if (!row) throw notFound("Shipment not found");
    if (["delivered", "failed"].includes(row.status)) {
      throw conflict("A completed shipment cannot be reassigned");
    }
    if (input.transporterId) {
      const transporter = queryOne<{ id: string; type: string; status: string }>(
        db,
        "SELECT id, type, status FROM parties WHERE id = ?",
        [input.transporterId],
      );
      if (!transporter || transporter.type !== "transporter") throw unprocessable("Select a registered transporter");
      if (transporter.status !== "active") throw unprocessable("This transporter is not active");
    }
    execute(
      db,
      `UPDATE shipments SET transporter_id = COALESCE(?, transporter_id), vehicle_plate = COALESCE(?, vehicle_plate),
              driver_name = COALESCE(?, driver_name), driver_phone = COALESCE(?, driver_phone), updated_at = ?
        WHERE id = ?`,
      [input.transporterId ?? null, input.vehiclePlate ?? null, input.driverName ?? null, input.driverPhone ?? null, nowIso(), id],
    );
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "logistics.shipment_updated",
      entityType: "shipment",
      entityId: id,
      summary: `Updated transport details for ${row.reference}`,
    }, ip);
    return get(db, auth, id);
  });
}

export function markFailed(db: Db, auth: AuthContext, id: string, note: string, ip?: string) {
  return transaction(db, () => {
    const row = queryOne<ShipmentRow>(db, `${SELECT} WHERE s.id = ?`, [id]);
    if (!row) throw notFound("Shipment not found");
    if (row.status === "delivered") throw conflict("This shipment has already been delivered");
    if (note.trim().length < 5) throw unprocessable("Describe why the delivery failed");
    execute(
      db,
      "UPDATE shipments SET status = 'failed', delivery_notes = ?, updated_at = ? WHERE id = ?",
      [note.trim(), nowIso(), id],
    );
    notify(db, {
      roleId: "operations_manager",
      title: "Delivery exception",
      body: `${row.reference} to ${row.destination} failed: ${note.trim()}`,
      level: "critical",
      link: "/portal/logistics",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "logistics.delivery_failed",
      entityType: "shipment",
      entityId: id,
      summary: `Reported failed delivery for ${row.reference}`,
      metadata: { note: note.trim() },
    }, ip);
    return get(db, auth, id);
  });
}

export function confirmDelivery(
  db: Db,
  auth: AuthContext,
  id: string,
  input: { notes?: string | null },
  ip?: string,
) {
  return transaction(db, () => {
    const row = queryOne<ShipmentRow>(db, `${SELECT} WHERE s.id = ?`, [id]);
    if (!row) throw notFound("Shipment not found");
    if (row.status === "delivered") throw conflict("This shipment has already been confirmed");
    if (row.status === "failed") throw conflict("Failed shipments cannot be confirmed without a redelivery");
    if (auth.user.partyType === "transporter" && row.transporter_id !== auth.user.partyId) {
      throw forbidden("This shipment is assigned to another transporter");
    }

    execute(
      db,
      `UPDATE shipments SET status = 'delivered', delivered_at = ?, delivery_notes = ?, confirmed_by = ?, updated_at = ?
        WHERE id = ?`,
      [nowIso(), input.notes?.trim() || null, auth.user.id, nowIso(), id],
    );
    markDelivered(db, row.order_id);
    const invoice = issueInvoiceForOrder(db, row.order_id, auth.user.id);

    notify(db, {
      roleId: "logistics_officer",
      title: "Delivery confirmed",
      body: `${row.reference} was delivered to ${row.destination}.`,
      level: "success",
      link: "/portal/logistics",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "logistics.delivery_confirmed",
      entityType: "shipment",
      entityId: id,
      summary: `Confirmed delivery of ${row.reference}; invoice ${invoice.reference} raised`,
      metadata: { orderId: row.order_id, invoiceId: invoice.id },
    }, ip);

    return { ...get(db, auth, id), invoice };
  });
}
