/**
 * Manufacturing workflow
 *
 *   planned -> in_progress -> awaiting_quality -> completed
 *                           \-> rejected (quality failure)
 *
 * Starting an order consumes the bill-of-materials components from the plant
 * store. Output only enters finished-goods inventory when a quality inspector
 * passes the batch, which is why a failed batch leaves materials consumed but
 * no sellable stock.
 */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne, transaction } from "../../db/database.js";
import { conflict, notFound, unprocessable } from "../../platform/errors.js";
import { notify, recordAudit } from "../../platform/audit.js";
import { nextReference } from "../../platform/references.js";
import { randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";
import { postMovement, round3 } from "../inventory/service.js";

export type ProductionType = "cylinder_manufacture" | "lpg_filling";

export interface ProductionRow {
  id: string;
  reference: string;
  type: ProductionType;
  product_id: string;
  sku: string;
  product_name: string;
  unit: string;
  location_id: string;
  location_name: string;
  planned_quantity: number;
  produced_quantity: number;
  status: string;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by_name: string;
  created_at: string;
}

const SELECT = `
  SELECT po.*, p.sku, p.name AS product_name, p.unit, l.name AS location_name, u.full_name AS created_by_name
    FROM production_orders po
    JOIN products p ON p.id = po.product_id
    JOIN locations l ON l.id = po.location_id
    JOIN users u ON u.id = po.created_by
`;

export function mapOrder(row: ProductionRow) {
  return {
    id: row.id,
    reference: row.reference,
    type: row.type,
    product: { id: row.product_id, sku: row.sku, name: row.product_name, unit: row.unit },
    location: { id: row.location_id, name: row.location_name },
    plannedQuantity: row.planned_quantity,
    producedQuantity: row.produced_quantity,
    outstandingQuantity: round3(row.planned_quantity - row.produced_quantity),
    status: row.status,
    dueDate: row.due_date,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdBy: row.created_by_name,
    createdAt: row.created_at,
  };
}

export function list(db: Db, filter: { status?: string; type?: string }) {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter.status) {
    conditions.push("po.status = ?");
    params.push(filter.status);
  }
  if (filter.type) {
    conditions.push("po.type = ?");
    params.push(filter.type);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryAll<ProductionRow>(db, `${SELECT} ${clause} ORDER BY po.created_at DESC`, params).map(mapOrder);
}

export function get(db: Db, id: string) {
  const row = queryOne<ProductionRow>(db, `${SELECT} WHERE po.id = ?`, [id]);
  if (!row) throw notFound("Production order not found");
  const consumptions = queryAll<{
    component_product_id: string;
    quantity: number;
    sku: string;
    name: string;
    unit: string;
  }>(
    db,
    `SELECT c.component_product_id, c.quantity, p.sku, p.name, p.unit
       FROM production_consumptions c JOIN products p ON p.id = c.component_product_id
      WHERE c.production_order_id = ?`,
    [id],
  );
  const inspections = queryAll<{
    id: string;
    reference: string;
    result: string;
    checked_quantity: number;
    passed_quantity: number;
    failed_quantity: number;
    notes: string | null;
    inspected_at: string;
    inspector_name: string;
  }>(
    db,
    `SELECT qi.id, qi.reference, qi.result, qi.checked_quantity, qi.passed_quantity, qi.failed_quantity,
            qi.notes, qi.inspected_at, u.full_name AS inspector_name
       FROM quality_inspections qi JOIN users u ON u.id = qi.inspector_id
      WHERE qi.production_order_id = ? ORDER BY qi.inspected_at DESC`,
    [id],
  );
  return {
    ...mapOrder(row),
    consumptions: consumptions.map((line) => ({
      componentProductId: line.component_product_id,
      sku: line.sku,
      name: line.name,
      unit: line.unit,
      quantity: line.quantity,
    })),
    inspections: inspections.map((inspection) => ({
      id: inspection.id,
      reference: inspection.reference,
      result: inspection.result,
      checkedQuantity: inspection.checked_quantity,
      passedQuantity: inspection.passed_quantity,
      failedQuantity: inspection.failed_quantity,
      notes: inspection.notes,
      inspectedAt: inspection.inspected_at,
      inspector: inspection.inspector_name,
    })),
  };
}

export function billOfMaterials(db: Db) {
  const rows = queryAll<{
    product_id: string;
    sku: string;
    name: string;
    unit: string;
    component_sku: string;
    component_name: string;
    component_unit: string;
    quantity_per_unit: number;
  }>(
    db,
    `SELECT b.product_id, p.sku, p.name, p.unit,
            c.sku AS component_sku, c.name AS component_name, c.unit AS component_unit,
            b.quantity_per_unit
       FROM bill_of_materials b
       JOIN products p ON p.id = b.product_id
       JOIN products c ON c.id = b.component_product_id
      ORDER BY p.name, c.name`,
  );
  const grouped = new Map<string, { productId: string; sku: string; name: string; unit: string; components: { sku: string; name: string; unit: string; quantityPerUnit: number }[] }>();
  for (const row of rows) {
    const entry = grouped.get(row.product_id) ?? {
      productId: row.product_id,
      sku: row.sku,
      name: row.name,
      unit: row.unit,
      components: [],
    };
    entry.components.push({
      sku: row.component_sku,
      name: row.component_name,
      unit: row.component_unit,
      quantityPerUnit: row.quantity_per_unit,
    });
    grouped.set(row.product_id, entry);
  }
  return [...grouped.values()];
}

export interface CreateProductionInput {
  type: ProductionType;
  productId: string;
  locationId: string;
  plannedQuantity: number;
  dueDate?: string | null;
}

export function create(db: Db, auth: AuthContext, input: CreateProductionInput, ip?: string) {
  if (input.plannedQuantity <= 0) throw unprocessable("Planned quantity must be greater than zero");
  const product = queryOne<{ id: string; name: string; category: string }>(
    db,
    "SELECT id, name, category FROM products WHERE id = ?",
    [input.productId],
  );
  if (!product) throw unprocessable("Select a valid product to produce");
  if (input.type === "cylinder_manufacture" && product.category !== "cylinder") {
    throw unprocessable("Cylinder manufacturing orders must produce a cylinder product");
  }
  if (input.type === "lpg_filling" && product.category !== "lpg") {
    throw unprocessable("LPG filling orders must produce an LPG product");
  }
  const location = queryOne<{ type: string; name: string }>(
    db,
    "SELECT type, name FROM locations WHERE id = ?",
    [input.locationId],
  );
  if (!location) throw unprocessable("Select a valid production location");
  if (location.type !== "plant") {
    throw unprocessable("Production orders can only run at a plant location");
  }
  const bomCount = queryOne<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM bill_of_materials WHERE product_id = ?",
    [input.productId],
  );
  if (Number(bomCount?.count ?? 0) === 0) {
    throw unprocessable("This product has no bill of materials, so it cannot be produced");
  }

  const id = randomId();
  const reference = nextReference(db, "PRD", "PRD");
  transaction(db, () => {
    execute(
      db,
      `INSERT INTO production_orders
         (id, reference, type, product_id, location_id, planned_quantity, produced_quantity, status, due_date, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'planned', ?, ?, ?, ?)`,
      [id, reference, input.type, input.productId, input.locationId, input.plannedQuantity, input.dueDate ?? null, auth.user.id, nowIso(), nowIso()],
    );
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "manufacturing.order_created",
      entityType: "production_order",
      entityId: id,
      summary: `Created ${reference} to produce ${input.plannedQuantity} ${product.name}`,
    }, ip);
  });
  return { id, reference };
}

export function start(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const order = queryOne<ProductionRow>(db, `${SELECT} WHERE po.id = ?`, [id]);
    if (!order) throw notFound("Production order not found");
    if (order.status !== "planned") throw conflict("Only planned production orders can be started");

    const bom = queryAll<{ component_product_id: string; quantity_per_unit: number; name: string; unit: string }>(
      db,
      `SELECT b.component_product_id, b.quantity_per_unit, p.name, p.unit
         FROM bill_of_materials b JOIN products p ON p.id = b.component_product_id
        WHERE b.product_id = ?`,
      [order.product_id],
    );

    for (const component of bom) {
      const required = round3(component.quantity_per_unit * order.planned_quantity);
      postMovement(db, {
        locationId: order.location_id,
        productId: component.component_product_id,
        quantity: required,
        direction: "out",
        reason: "production_input",
        referenceType: "production_order",
        referenceId: id,
        note: `Consumed for ${order.reference}`,
        actorId: auth.user.id,
      });
      execute(
        db,
        `INSERT INTO production_consumptions (id, production_order_id, component_product_id, quantity, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [randomId(), id, component.component_product_id, required, nowIso()],
      );
    }

    execute(db, "UPDATE production_orders SET status = 'in_progress', started_at = ?, updated_at = ? WHERE id = ?", [
      nowIso(),
      nowIso(),
      id,
    ]);
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "manufacturing.order_started",
      entityType: "production_order",
      entityId: id,
      summary: `Started ${order.reference} at ${order.location_name}`,
      metadata: { components: bom.length },
    }, ip);
    return get(db, id);
  });
}

export function submitForQuality(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const order = queryOne<ProductionRow>(db, `${SELECT} WHERE po.id = ?`, [id]);
    if (!order) throw notFound("Production order not found");
    if (order.status !== "in_progress") throw conflict("Only orders in progress can be sent for inspection");
    execute(db, "UPDATE production_orders SET status = 'awaiting_quality', updated_at = ? WHERE id = ?", [
      nowIso(),
      id,
    ]);
    notify(db, {
      roleId: "quality_inspector",
      title: "Batch awaiting inspection",
      body: `${order.reference} (${order.product_name}) is ready for quality inspection.`,
      level: "info",
      link: "/portal/quality",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "manufacturing.submitted_for_quality",
      entityType: "production_order",
      entityId: id,
      summary: `Submitted ${order.reference} for quality inspection`,
    }, ip);
    return get(db, id);
  });
}

export function cancel(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const order = queryOne<ProductionRow>(db, `${SELECT} WHERE po.id = ?`, [id]);
    if (!order) throw notFound("Production order not found");
    if (order.status !== "planned") {
      throw conflict("Materials have already been consumed; this order can only be rejected through quality inspection");
    }
    execute(db, "UPDATE production_orders SET status = 'cancelled', updated_at = ? WHERE id = ?", [nowIso(), id]);
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "manufacturing.order_cancelled",
      entityType: "production_order",
      entityId: id,
      summary: `Cancelled ${order.reference}`,
    }, ip);
    return get(db, id);
  });
}

/**
 * Called by the quality module inside its transaction when an inspection
 * passes: the accepted quantity enters finished-goods inventory.
 */
export function releaseFinishedGoods(
  db: Db,
  orderId: string,
  passedQuantity: number,
  failedQuantity: number,
  actorId: string,
): void {
  const order = queryOne<ProductionRow>(db, `${SELECT} WHERE po.id = ?`, [orderId]);
  if (!order) throw notFound("Production order not found");
  if (order.status !== "awaiting_quality" && order.status !== "in_progress") {
    throw conflict("This production order is not awaiting a quality decision");
  }
  if (passedQuantity > 0) {
    postMovement(db, {
      locationId: order.location_id,
      productId: order.product_id,
      quantity: passedQuantity,
      direction: "in",
      reason: "production_output",
      referenceType: "production_order",
      referenceId: orderId,
      note: `Quality-passed output for ${order.reference}`,
      actorId,
    });
  }
  if (failedQuantity > 0) {
    // Rejected units never become finished goods; record the loss for traceability.
    execute(
      db,
      `INSERT INTO inventory_movements (id, location_id, product_id, direction, quantity, balance_after, reason, reference_type, reference_id, note, created_by, created_at)
       VALUES (?, ?, ?, 'out', ?, ?, 'quality_rejection', 'production_order', ?, ?, ?, ?)`,
      [randomId(), order.location_id, order.product_id, failedQuantity, order.produced_quantity, orderId,
       `Rejected ${failedQuantity} ${order.unit} at inspection`, actorId, nowIso()],
    );
  }
  execute(
    db,
    "UPDATE production_orders SET status = ?, produced_quantity = ?, completed_at = ?, updated_at = ? WHERE id = ?",
    [passedQuantity > 0 ? "completed" : "rejected", passedQuantity, nowIso(), nowIso(), orderId],
  );
}
