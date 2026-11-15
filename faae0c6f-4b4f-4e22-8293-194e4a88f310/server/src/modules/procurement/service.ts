/**
 * Procurement workflow
 *
 *   draft -> pending_approval -> approved -> partially_received -> received
 *                                     \-> cancelled
 *
 * Approving a purchase order is an internal control; receiving goods is the
 * step that changes inventory, and it posts one movement ledger row per
 * received line inside the same transaction as the receipt itself.
 */
import type { Db } from "../../db/database.js";
import { queryOne, transaction } from "../../db/database.js";
import { badRequest, conflict, forbidden, notFound, unprocessable } from "../../platform/errors.js";
import { notify, recordAudit } from "../../platform/audit.js";
import { nextReference } from "../../platform/references.js";
import { randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";
import { postMovement } from "../inventory/service.js";
import * as repo from "./repository.js";

export function list(
  db: Db,
  auth: AuthContext,
  filter: { status?: string; search?: string },
  page: { limit: number; offset: number },
) {
  // Suppliers only ever see purchase orders addressed to them.
  const supplierId =
    auth.user.partyType === "supplier" ? auth.user.partyId ?? "__none__" : undefined;
  const { rows, total } = repo.listPurchaseOrders(db, { ...filter, supplierId, ...page });
  return { items: rows.map(repo.mapPo), total };
}

export function get(db: Db, auth: AuthContext, id: string) {
  const row = repo.findPurchaseOrder(db, id);
  if (!row) throw notFound("Purchase order not found");
  if (auth.user.partyType === "supplier" && row.supplier_id !== auth.user.partyId) {
    throw forbidden("This purchase order belongs to another supplier");
  }
  return {
    ...repo.mapPo(row),
    lines: repo.findLines(db, id).map(repo.mapLine),
    receipts: repo.listReceipts(db, id).map((receipt) => ({
      id: receipt.id,
      reference: receipt.reference,
      receivedAt: receipt.received_at,
      notes: receipt.notes,
      receivedBy: receipt.received_by_name,
      totalQuantity: receipt.total_quantity ?? 0,
    })),
  };
}

export interface CreatePoInput {
  supplierId: string;
  locationId: string;
  expectedDate?: string | null;
  notes?: string | null;
  lines: { productId: string; quantity: number; unitPriceKobo: number }[];
}

export function create(db: Db, auth: AuthContext, input: CreatePoInput, ip?: string) {
  if (input.lines.length === 0) throw badRequest("Add at least one line to the purchase order");

  const supplier = queryOne<{ id: string; name: string; type: string; status: string }>(
    db,
    "SELECT id, name, type, status FROM parties WHERE id = ?",
    [input.supplierId],
  );
  if (!supplier || supplier.type !== "supplier") throw unprocessable("Select a registered supplier");
  if (supplier.status !== "active") throw unprocessable("This supplier is not active");
  const location = queryOne<{ id: string; name: string }>(db, "SELECT id, name FROM locations WHERE id = ?", [
    input.locationId,
  ]);
  if (!location) throw unprocessable("Select a valid delivery location");

  const seen = new Set<string>();
  let total = 0;
  for (const line of input.lines) {
    if (line.quantity <= 0) throw unprocessable("Line quantities must be greater than zero");
    if (seen.has(line.productId)) throw unprocessable("Each product may appear only once per purchase order");
    seen.add(line.productId);
    const product = queryOne<{ name: string }>(db, "SELECT name FROM products WHERE id = ?", [line.productId]);
    if (!product) throw unprocessable("A line references an unknown product");
    total += Math.round(line.quantity * line.unitPriceKobo);
  }

  const id = randomId();
  const reference = nextReference(db, "PO", "PO");
  transaction(db, () => {
    repo.insertPurchaseOrder(db, {
      id,
      reference,
      supplierId: input.supplierId,
      locationId: input.locationId,
      expectedDate: input.expectedDate ?? null,
      notes: input.notes?.trim() || null,
      requestedBy: auth.user.id,
      totalKobo: total,
    });
    for (const line of input.lines) repo.insertLine(db, id, line);
    recordAudit(
      db,
      { id: auth.user.id, fullName: auth.user.fullName },
      {
        action: "procurement.po_created",
        entityType: "purchase_order",
        entityId: id,
        summary: `Drafted purchase order ${reference} for ${supplier.name}`,
        metadata: { totalKobo: total, lines: input.lines.length },
      },
      ip,
    );
  });
  return { id, reference };
}

function requireStatus(current: string, allowed: string[], message: string): void {
  if (!allowed.includes(current)) throw conflict(message);
}

export function submit(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const po = repo.findPurchaseOrder(db, id);
    if (!po) throw notFound("Purchase order not found");
    if (po.requested_by !== auth.user.id && !auth.permissions.has("procurement:approve")) {
      throw forbidden("Only the originating officer or an approver can submit this order");
    }
    requireStatus(po.status, ["draft"], "Only draft purchase orders can be submitted for approval");
    repo.updateStatus(db, id, "pending_approval");
    notify(db, {
      roleId: "operations_manager",
      title: "Purchase order awaiting approval",
      body: `${po.reference} from ${po.supplier_name} for ${po.location_name} needs approval.`,
      level: "info",
      link: "/portal/procurement",
    });
    notify(db, {
      roleId: "executive",
      title: "Purchase order awaiting approval",
      body: `${po.reference} from ${po.supplier_name} is pending executive review.`,
      level: "info",
      link: "/portal/procurement",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "procurement.po_submitted",
      entityType: "purchase_order",
      entityId: id,
      summary: `Submitted ${po.reference} for approval`,
    }, ip);
    return get(db, auth, id);
  });
}

export function approve(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const po = repo.findPurchaseOrder(db, id);
    if (!po) throw notFound("Purchase order not found");
    if (po.requested_by === auth.user.id && auth.user.roleId !== "admin") {
      throw forbidden("Purchase orders must be approved by someone other than the requester");
    }
    requireStatus(po.status, ["pending_approval"], "Only purchase orders awaiting approval can be approved");
    repo.updateStatus(db, id, "approved", auth.user.id);
    notify(db, {
      userId: po.requested_by,
      title: "Purchase order approved",
      body: `${po.reference} was approved by ${auth.user.fullName}. You can now receive goods against it.`,
      level: "success",
      link: "/portal/procurement",
    });
    notify(db, {
      roleId: "warehouse_manager",
      title: "Approved order awaiting delivery",
      body: `${po.reference} from ${po.supplier_name} is approved for delivery to ${po.location_name}.`,
      level: "info",
      link: "/portal/procurement",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "procurement.po_approved",
      entityType: "purchase_order",
      entityId: id,
      summary: `Approved ${po.reference} (${po.supplier_name})`,
    }, ip);
    return get(db, auth, id);
  });
}

export function cancel(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const po = repo.findPurchaseOrder(db, id);
    if (!po) throw notFound("Purchase order not found");
    requireStatus(
      po.status,
      ["draft", "pending_approval", "approved"],
      "Goods have already been received against this order and it cannot be cancelled",
    );
    repo.updateStatus(db, id, "cancelled");
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "procurement.po_cancelled",
      entityType: "purchase_order",
      entityId: id,
      summary: `Cancelled ${po.reference}`,
    }, ip);
    return get(db, auth, id);
  });
}

export interface ReceiveInput {
  notes?: string | null;
  lines: { lineId: string; quantity: number }[];
}

export function receive(db: Db, auth: AuthContext, id: string, input: ReceiveInput, ip?: string) {
  return transaction(db, () => {
    const po = repo.findPurchaseOrder(db, id);
    if (!po) throw notFound("Purchase order not found");
    requireStatus(
      po.status,
      ["approved", "partially_received"],
      "Only approved purchase orders can receive goods",
    );

    const lines = repo.findLines(db, id);
    const byId = new Map(lines.map((line) => [line.id, line]));
    const receiptLines = input.lines.filter((line) => line.quantity > 0);
    if (receiptLines.length === 0) throw badRequest("Enter the quantity received for at least one line");

    for (const receiptLine of receiptLines) {
      const line = byId.get(receiptLine.lineId);
      if (!line) throw unprocessable("A receipt line does not belong to this purchase order");
      const remaining = line.quantity - line.received_quantity;
      if (receiptLine.quantity > remaining + 0.0005) {
        throw unprocessable(
          `Cannot receive ${receiptLine.quantity} ${line.unit} of ${line.product_name}; only ${remaining} ${line.unit} remains outstanding`,
        );
      }
    }

    const receiptId = randomId();
    const receiptReference = nextReference(db, "GRN", "GRN");
    repo.insertReceipt(db, {
      id: receiptId,
      reference: receiptReference,
      purchaseOrderId: id,
      locationId: po.location_id,
      receivedBy: auth.user.id,
      notes: input.notes?.trim() || null,
    });

    for (const receiptLine of receiptLines) {
      const line = byId.get(receiptLine.lineId);
      if (!line) continue;
      repo.insertReceiptLine(db, {
        receiptId,
        purchaseOrderLineId: line.id,
        productId: line.product_id,
        quantity: receiptLine.quantity,
      });
      repo.incrementReceived(db, line.id, receiptLine.quantity);
      postMovement(db, {
        locationId: po.location_id,
        productId: line.product_id,
        quantity: receiptLine.quantity,
        direction: "in",
        reason: "goods_receipt",
        referenceType: "goods_receipt",
        referenceId: receiptId,
        note: `Received against ${po.reference}`,
        actorId: auth.user.id,
      });
    }

    const refreshed = repo.findLines(db, id);
    const fullyReceived = refreshed.every((line) => line.received_quantity + 0.0005 >= line.quantity);
    repo.updateStatus(db, id, fullyReceived ? "received" : "partially_received");

    notify(db, {
      roleId: "procurement_officer",
      title: "Goods received",
      body: `${receiptReference} booked against ${po.reference}. Inventory has been updated at ${po.location_name}.`,
      level: "success",
      link: "/portal/procurement",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "procurement.goods_received",
      entityType: "purchase_order",
      entityId: id,
      summary: `Received ${receiptReference} against ${po.reference}`,
      metadata: { receiptId, lines: receiptLines.length },
    }, ip);

    return { ...get(db, auth, id), receipt: { id: receiptId, reference: receiptReference } };
  });
}
