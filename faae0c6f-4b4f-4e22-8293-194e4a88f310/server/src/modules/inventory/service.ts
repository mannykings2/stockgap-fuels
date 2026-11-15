/**
 * Inventory service.
 *
 * This is the only module allowed to move stock. Procurement, manufacturing,
 * sales and logistics call into it, so every quantity change is written to the
 * movement ledger and the on-hand balance in the same transaction.
 */
import { conflict, notFound, unprocessable } from "../../platform/errors.js";
import { transaction, type Db } from "../../db/database.js";
import { recordAudit, notify } from "../../platform/audit.js";
import type { AuthContext } from "../../middleware/authenticate.js";
import * as repo from "./repository.js";

export type MovementReason =
  | "opening_balance"
  | "goods_receipt"
  | "production_input"
  | "production_output"
  | "dispatch"
  | "adjustment"
  | "quality_rejection"
  | "transfer_in"
  | "transfer_out";

/** Round to 3dp: MT, litres and units are all stored at this precision. */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function availableOf(quantity: number, reserved: number): number {
  return round3(quantity - reserved);
}

export function stockList(db: Db, filter: repo.StockFilter) {
  const { rows, total } = repo.listStock(db, filter);
  return {
    items: rows.map((row) => ({
      id: row.id,
      location: { id: row.location_id, code: row.location_code, name: row.location_name, type: row.location_type },
      product: {
        id: row.product_id,
        sku: row.sku,
        name: row.product_name,
        category: row.category,
        unit: row.unit,
        unitPriceKobo: row.unit_price_kobo,
        reorderLevel: row.reorder_level,
      },
      quantity: round3(row.quantity),
      reserved: round3(row.reserved),
      available: availableOf(row.quantity, row.reserved),
      lowStock: availableOf(row.quantity, row.reserved) <= row.reorder_level,
      updatedAt: row.updated_at,
    })),
    total,
  };
}

export function movementList(
  db: Db,
  filter: { productId?: string; locationId?: string; reason?: string },
  page: { limit: number; offset: number },
) {
  const { rows, total } = repo.listMovements(db, { ...filter, ...page });
  return {
    items: rows.map((row) => ({
      id: row.id,
      direction: row.direction,
      quantity: round3(row.quantity),
      balanceAfter: round3(row.balance_after),
      reason: row.reason,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      note: row.note,
      product: { id: row.product_id, sku: row.sku, name: row.product_name, unit: row.unit },
      location: { id: row.location_id, name: row.location_name },
      createdBy: row.created_by_name,
      createdAt: row.created_at,
    })),
    total,
  };
}

export interface MovementInput {
  locationId: string;
  productId: string;
  quantity: number;
  direction: "in" | "out";
  reason: MovementReason;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  /** Actor id recorded on the movement row. */
  actorId?: string | null;
  /** Allow the balance to reach zero but never below it. */
  allowOverdrawReservation?: boolean;
}

/**
 * Apply a single stock movement. Callers must already be inside a
 * transaction when the movement is part of a larger workflow.
 */
export function postMovement(db: Db, input: MovementInput): number {
  if (input.quantity <= 0) throw unprocessable("Movement quantity must be greater than zero");
  repo.ensureRow(db, input.locationId, input.productId);
  const current = repo.findStockRow(db, input.locationId, input.productId);
  if (!current) throw notFound("Stock position not found");

  const delta = input.direction === "in" ? input.quantity : -input.quantity;
  const nextQuantity = round3(current.quantity + delta);
  if (nextQuantity < 0) {
    throw conflict(
      `Insufficient stock for ${current.product_name} at ${current.location_name}: ` +
        `${round3(current.quantity)} ${current.unit} on hand, ${round3(input.quantity)} requested`,
    );
  }
  if (input.direction === "out" && !input.allowOverdrawReservation) {
    const available = availableOf(current.quantity, current.reserved);
    if (input.quantity > available + 0.0005) {
      throw conflict(
        `Only ${available} ${current.unit} of ${current.product_name} is available at ${current.location_name} ` +
          `(${round3(current.reserved)} ${current.unit} is reserved for other orders)`,
      );
    }
  }

  repo.updateStock(db, input.locationId, input.productId, nextQuantity, current.reserved);
  repo.insertMovement(db, {
    locationId: input.locationId,
    productId: input.productId,
    direction: input.direction,
    quantity: round3(input.quantity),
    balanceAfter: nextQuantity,
    reason: input.reason,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    note: input.note,
    actorId: input.actorId,
  });

  if (nextQuantity <= current.reorder_level && input.direction === "out") {
    notify(db, {
      roleId: "warehouse_manager",
      title: "Stock at or below reorder level",
      body: `${current.product_name} at ${current.location_name} is down to ${nextQuantity} ${current.unit}.`,
      level: "warning",
      link: "/portal/inventory",
    });
  }
  return nextQuantity;
}

/** Reserve stock for an approved order without removing it from the balance. */
export function reserveStock(db: Db, locationId: string, productId: string, quantity: number): void {
  repo.ensureRow(db, locationId, productId);
  const current = repo.findStockRow(db, locationId, productId);
  if (!current) throw notFound("Stock position not found");
  const available = availableOf(current.quantity, current.reserved);
  if (quantity > available + 0.0005) {
    throw conflict(
      `Only ${available} ${current.unit} of ${current.product_name} is available at ${current.location_name}`,
    );
  }
  repo.updateStock(db, locationId, productId, current.quantity, round3(current.reserved + quantity));
}

export function releaseStock(db: Db, locationId: string, productId: string, quantity: number): void {
  const current = repo.findStockRow(db, locationId, productId);
  if (!current) return;
  const nextReserved = Math.max(0, round3(current.reserved - quantity));
  repo.updateStock(db, locationId, productId, current.quantity, nextReserved);
}

/** Remove reserved stock when goods physically leave the site. */
export function consumeReserved(db: Db, locationId: string, productId: string, quantity: number): void {
  const current = repo.findStockRow(db, locationId, productId);
  if (!current) throw notFound("Stock position not found");
  const nextReserved = Math.max(0, round3(current.reserved - quantity));
  repo.updateStock(db, locationId, productId, current.quantity, nextReserved);
}

/** Physical count / dip correction, expressed as the counted balance. */
export function adjustStock(
  db: Db,
  auth: AuthContext,
  input: { locationId: string; productId: string; countedQuantity: number; note: string },
  ip?: string,
) {
  if (input.countedQuantity < 0) throw unprocessable("Counted quantity cannot be negative");
  if (!input.note.trim()) throw unprocessable("A reason is required for a stock adjustment");

  return transaction(db, () => {
    repo.ensureRow(db, input.locationId, input.productId);
    const current = repo.findStockRow(db, input.locationId, input.productId);
    if (!current) throw notFound("Stock position not found");
    const delta = round3(input.countedQuantity - current.quantity);
    if (delta === 0) throw unprocessable("The counted quantity matches the system balance; nothing to adjust");
    if (input.countedQuantity < current.reserved) {
      throw unprocessable(
        `Counted quantity is below the ${round3(current.reserved)} ${current.unit} reserved for open orders`,
      );
    }

    postMovement(db, {
      locationId: input.locationId,
      productId: input.productId,
      quantity: Math.abs(delta),
      direction: delta > 0 ? "in" : "out",
      reason: "adjustment",
      referenceType: "stock_adjustment",
      note: input.note,
      actorId: auth.user.id,
      allowOverdrawReservation: true,
    });

    recordAudit(
      db,
      { id: auth.user.id, fullName: auth.user.fullName },
      {
        action: "inventory.adjusted",
        entityType: "inventory",
        entityId: `${input.locationId}:${input.productId}`,
        summary: `Adjusted ${current.product_name} at ${current.location_name} from ${round3(current.quantity)} to ${round3(input.countedQuantity)} ${current.unit}`,
        metadata: { delta, note: input.note },
      },
      ip,
    );

    const updated = repo.findStockRow(db, input.locationId, input.productId);
    return { quantity: round3(updated?.quantity ?? 0), delta };
  });
}
