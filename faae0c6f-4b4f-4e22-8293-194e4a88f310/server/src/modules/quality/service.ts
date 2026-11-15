/**
 * Quality assurance.
 *
 * A finished-goods inspection decides the fate of a production batch: passing
 * units are released to finished-goods inventory, failed units are recorded as
 * a rejection. Inspections can also be recorded independently for incoming
 * materials and safety audits.
 */
import type { Db } from "../../db/database.js";
import { nowIso, queryAll, queryOne, transaction } from "../../db/database.js";
import { badRequest, notFound, unprocessable } from "../../platform/errors.js";
import { notify, recordAudit } from "../../platform/audit.js";
import { nextReference } from "../../platform/references.js";
import { randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";
import { releaseFinishedGoods } from "../manufacturing/service.js";

export interface InspectionInput {
  productionOrderId?: string | null;
  inspectionType: "finished_goods" | "incoming_material" | "cylinder_certification" | "safety_audit";
  checkedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  result: "pass" | "fail" | "conditional";
  notes?: string | null;
}

export function list(
  db: Db,
  filter: { result?: string; inspectionType?: string; limit: number; offset: number },
) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filter.result) {
    conditions.push("qi.result = ?");
    params.push(filter.result);
  }
  if (filter.inspectionType) {
    conditions.push("qi.inspection_type = ?");
    params.push(filter.inspectionType);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = queryAll<{
    id: string;
    reference: string;
    inspection_type: string;
    checked_quantity: number;
    passed_quantity: number;
    failed_quantity: number;
    result: string;
    notes: string | null;
    inspected_at: string;
    inspector_name: string;
    production_reference: string | null;
    production_id: string | null;
    product_name: string | null;
  }>(
    db,
    `SELECT qi.id, qi.reference, qi.inspection_type, qi.checked_quantity, qi.passed_quantity,
            qi.failed_quantity, qi.result, qi.notes, qi.inspected_at,
            u.full_name AS inspector_name,
            po.reference AS production_reference, po.id AS production_id,
            p.name AS product_name
       FROM quality_inspections qi
       JOIN users u ON u.id = qi.inspector_id
       LEFT JOIN production_orders po ON po.id = qi.production_order_id
       LEFT JOIN products p ON p.id = po.product_id
       ${clause}
      ORDER BY qi.inspected_at DESC
      LIMIT ? OFFSET ?`,
    [...params, filter.limit, filter.offset],
  );
  const total = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM quality_inspections qi ${clause}`,
    params,
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      inspectionType: row.inspection_type,
      checkedQuantity: row.checked_quantity,
      passedQuantity: row.passed_quantity,
      failedQuantity: row.failed_quantity,
      result: row.result,
      notes: row.notes,
      inspectedAt: row.inspected_at,
      inspector: row.inspector_name,
      productionOrder: row.production_id
        ? { id: row.production_id, reference: row.production_reference, productName: row.product_name }
        : null,
    })),
    total: Number(total?.count ?? 0),
  };
}

export function create(db: Db, auth: AuthContext, input: InspectionInput, ip?: string) {
  if (input.checkedQuantity <= 0) throw unprocessable("Checked quantity must be greater than zero");
  if (input.passedQuantity < 0 || input.failedQuantity < 0) {
    throw unprocessable("Passed and failed quantities cannot be negative");
  }
  if (Math.abs(input.passedQuantity + input.failedQuantity - input.checkedQuantity) > 0.0005) {
    throw unprocessable("Passed plus failed quantity must equal the quantity checked");
  }
  if (input.result === "pass" && input.failedQuantity > 0) {
    throw badRequest("A passed inspection cannot include failed units; use a conditional result");
  }
  if (input.result === "fail" && input.passedQuantity > 0) {
    throw badRequest("A failed inspection cannot release units; record only the failed quantity");
  }

  return transaction(db, () => {
    let orderId: string | null = null;
    if (input.productionOrderId) {
      const order = queryOne<{ id: string; reference: string; status: string; planned_quantity: number }>(
        db,
        "SELECT id, reference, status, planned_quantity FROM production_orders WHERE id = ?",
        [input.productionOrderId],
      );
      if (!order) throw notFound("Production order not found");
      if (!["in_progress", "awaiting_quality"].includes(order.status)) {
        throw unprocessable("This production order is not awaiting a quality decision");
      }
      if (input.checkedQuantity > order.planned_quantity + 0.0005) {
        throw unprocessable(
          `Checked quantity exceeds the ${order.planned_quantity} planned for this batch`,
        );
      }
      orderId = order.id;
    }

    const id = randomId();
    const reference = nextReference(db, "QC", "QC");
    const now = nowIso();
    db.prepare(
      `INSERT INTO quality_inspections
         (id, reference, production_order_id, inspection_type, checked_quantity, passed_quantity, failed_quantity, result, notes, inspector_id, inspected_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      reference,
      orderId,
      input.inspectionType,
      input.checkedQuantity,
      input.passedQuantity,
      input.failedQuantity,
      input.result,
      input.notes?.trim() || null,
      auth.user.id,
      now,
      now,
    );

    if (orderId && input.inspectionType === "finished_goods") {
      releaseFinishedGoods(db, orderId, input.passedQuantity, input.failedQuantity, auth.user.id);
    }

    notify(db, {
      roleId: "production_supervisor",
      title: input.result === "fail" ? "Batch rejected by quality" : "Batch passed inspection",
      body: `${reference}: ${input.passedQuantity} passed, ${input.failedQuantity} failed.`,
      level: input.result === "fail" ? "critical" : "success",
      link: "/portal/manufacturing",
    });
    if (input.result !== "pass") {
      notify(db, {
        roleId: "operations_manager",
        title: "Quality exception recorded",
        body: `${reference} returned a ${input.result} result. Review the inspector's notes.`,
        level: "warning",
        link: "/portal/quality",
      });
    }

    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "quality.inspection_recorded",
      entityType: "quality_inspection",
      entityId: id,
      summary: `${reference} recorded as ${input.result} (${input.passedQuantity} passed / ${input.failedQuantity} rejected)`,
      metadata: { productionOrderId: orderId, inspectionType: input.inspectionType },
    }, ip);

    return { id, reference };
  });
}
