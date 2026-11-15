/**
 * Sales order workflow
 *
 *   draft -> pending_approval -> approved -> allocated -> dispatched -> delivered
 *                                                   \-> cancelled
 *
 * Allocation reserves stock (so two orders cannot promise the same litres),
 * dispatch removes it from the ledger, and delivery confirmation raises the
 * invoice in the finance module.
 */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryOne, transaction } from "../../db/database.js";
import { conflict, forbidden, notFound, unprocessable } from "../../platform/errors.js";
import { notify, recordAudit } from "../../platform/audit.js";
import { nextReference } from "../../platform/references.js";
import { randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";
import { consumeReserved, postMovement, releaseStock, reserveStock, round3 } from "../inventory/service.js";
import * as repo from "./repository.js";

export function list(
  db: Db,
  auth: AuthContext,
  filter: { status?: string; search?: string },
  page: { limit: number; offset: number },
) {
  const customerId = auth.scopedToParty ? auth.user.partyId ?? "__none__" : undefined;
  const { rows, total } = repo.listOrders(db, { ...filter, customerId, ...page });
  return { items: rows.map(repo.mapOrder), total };
}

export function get(db: Db, auth: AuthContext, id: string) {
  const row = repo.findOrder(db, id);
  if (!row) throw notFound("Customer order not found");
  if (auth.scopedToParty && auth.user.partyId !== row.customer_id) {
    throw forbidden("This order belongs to another customer");
  }
  return {
    ...repo.mapOrder(row),
    lines: repo.findLines(db, id).map(repo.mapLine),
    shipments: repo.shipmentsForOrder(db, id).map((shipment) => ({
      id: shipment.id,
      reference: shipment.reference,
      status: shipment.status,
      vehiclePlate: shipment.vehicle_plate,
      driverName: shipment.driver_name,
      destination: shipment.destination,
      transporter: shipment.transporter_name,
      dispatchedAt: shipment.dispatched_at,
      deliveredAt: shipment.delivered_at,
    })),
    invoices: repo.invoicesForOrder(db, id).map((invoice) => ({
      id: invoice.id,
      reference: invoice.reference,
      amountKobo: invoice.amount_kobo,
      amountPaidKobo: invoice.amount_paid_kobo,
      status: invoice.status,
      issuedAt: invoice.issued_at,
      dueDate: invoice.due_date,
    })),
  };
}

export interface CreateOrderInput {
  customerId?: string;
  locationId: string;
  requestedDeliveryDate?: string | null;
  deliveryAddress?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  lines: { productId: string; quantity: number; unitPriceKobo?: number }[];
}

export function create(db: Db, auth: AuthContext, input: CreateOrderInput, ip?: string) {
  if (input.lines.length === 0) throw unprocessable("Add at least one product to the order");

  const customerId = auth.scopedToParty ? auth.user.partyId : input.customerId;
  if (!customerId) throw unprocessable("Select the customer placing the order");
  if (auth.scopedToParty && input.customerId && input.customerId !== customerId) {
    throw forbidden("You can only place orders for your own organisation");
  }
  const customer = queryOne<{ id: string; name: string; type: string; status: string }>(
    db,
    "SELECT id, name, type, status FROM parties WHERE id = ?",
    [customerId],
  );
  if (!customer || !["distributor", "retailer", "customer"].includes(customer.type)) {
    throw unprocessable("Orders must be placed by a customer, distributor or retailer");
  }
  if (customer.status !== "active") throw unprocessable("This customer account is not active");

  const location = queryOne<{ id: string; name: string; type: string }>(
    db,
    "SELECT id, name, type FROM locations WHERE id = ?",
    [input.locationId],
  );
  if (!location) throw unprocessable("Select a valid supply location");

  const channel =
    customer.type === "distributor" ? "distributor" : customer.type === "retailer" ? "retailer" : "consumer";

  const seen = new Set<string>();
  let total = 0;
  const resolved: { productId: string; quantity: number; unitPriceKobo: number }[] = [];
  for (const line of input.lines) {
    if (line.quantity <= 0) throw unprocessable("Line quantities must be greater than zero");
    if (seen.has(line.productId)) throw unprocessable("Each product may appear only once per order");
    seen.add(line.productId);
    const product = queryOne<{ id: string; name: string; unit_price_kobo: number; status: string }>(
      db,
      "SELECT id, name, unit_price_kobo, status FROM products WHERE id = ?",
      [line.productId],
    );
    if (!product) throw unprocessable("A line references an unknown product");
    if (product.status !== "active") throw unprocessable(`${product.name} is discontinued`);
    const unitPrice = line.unitPriceKobo ?? product.unit_price_kobo;
    total += Math.round(line.quantity * unitPrice);
    resolved.push({ productId: line.productId, quantity: round3(line.quantity), unitPriceKobo: unitPrice });
  }

  const id = randomId();
  const reference = nextReference(db, "SO", "SO");
  transaction(db, () => {
    repo.insertOrder(db, {
      id,
      reference,
      customerId,
      locationId: input.locationId,
      channel,
      totalKobo: total,
      requestedDeliveryDate: input.requestedDeliveryDate ?? null,
      deliveryAddress: input.deliveryAddress?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      notes: input.notes?.trim() || null,
      createdBy: auth.user.id,
    });
    for (const line of resolved) repo.insertLine(db, id, line);
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "orders.created",
      entityType: "customer_order",
      entityId: id,
      summary: `Raised order ${reference} for ${customer.name}`,
      metadata: { totalKobo: total, lines: resolved.length },
    }, ip);
  });
  return { id, reference };
}

export function submit(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const order = repo.findOrder(db, id);
    if (!order) throw notFound("Order not found");
    if (auth.scopedToParty && order.customer_id !== auth.user.partyId) throw forbidden("Not your order");
    if (order.status !== "draft") throw conflict("Only draft orders can be submitted");
    repo.updateStatus(db, id, "pending_approval");
    notify(db, {
      roleId: "operations_manager",
      title: "Order awaiting approval",
      body: `${order.reference} from ${order.customer_name} (${order.channel}) is ready for review.`,
      level: "info",
      link: "/portal/orders",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "orders.submitted",
      entityType: "customer_order",
      entityId: id,
      summary: `Submitted ${order.reference} for approval`,
    }, ip);
    return get(db, auth, id);
  });
}

export function approve(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const order = repo.findOrder(db, id);
    if (!order) throw notFound("Order not found");
    if (order.created_by === auth.user.id && auth.user.roleId !== "admin") {
      throw forbidden("Orders must be approved by someone other than the officer who raised them");
    }
    if (order.status !== "pending_approval") throw conflict("Only orders awaiting approval can be approved");
    repo.updateStatus(db, id, "approved", auth.user.id);
    notify(db, {
      roleId: "warehouse_manager",
      title: "Approved order ready to allocate",
      body: `${order.reference} for ${order.customer_name} can now be allocated from ${order.location_name}.`,
      level: "info",
      link: "/portal/orders",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "orders.approved",
      entityType: "customer_order",
      entityId: id,
      summary: `Approved ${order.reference}`,
    }, ip);
    return get(db, auth, id);
  });
}

export function allocate(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const order = repo.findOrder(db, id);
    if (!order) throw notFound("Order not found");
    if (order.status !== "approved") throw conflict("Only approved orders can be allocated");
    const lines = repo.findLines(db, id);

    // Reserve every line first; a failure throws and rolls the whole allocation back.
    for (const line of lines) {
      reserveStock(db, order.location_id, line.product_id, line.quantity);
      repo.setAllocated(db, line.id, line.quantity);
    }
    repo.updateStatus(db, id, "allocated");
    notify(db, {
      roleId: "logistics_officer",
      title: "Order allocated and ready for dispatch",
      body: `${order.reference} has stock reserved at ${order.location_name}.`,
      level: "success",
      link: "/portal/logistics",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "orders.allocated",
      entityType: "customer_order",
      entityId: id,
      summary: `Allocated stock for ${order.reference}`,
      metadata: { lines: lines.length },
    }, ip);
    return get(db, auth, id);
  });
}

export interface DispatchInput {
  transporterId?: string | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  destination?: string | null;
}

export function dispatch(db: Db, auth: AuthContext, id: string, input: DispatchInput, ip?: string) {
  return transaction(db, () => {
    const order = repo.findOrder(db, id);
    if (!order) throw notFound("Order not found");
    if (order.status !== "allocated") throw conflict("Only allocated orders can be dispatched");

    if (input.transporterId) {
      const transporter = queryOne<{ id: string; type: string; status: string }>(
        db,
        "SELECT id, type, status FROM parties WHERE id = ?",
        [input.transporterId],
      );
      if (!transporter || transporter.type !== "transporter") throw unprocessable("Select a registered transporter");
      if (transporter.status !== "active") throw unprocessable("This transporter is not active");
    }

    const lines = repo.findLines(db, id);
    for (const line of lines) {
      consumeReserved(db, order.location_id, line.product_id, line.quantity);
      postMovement(db, {
        locationId: order.location_id,
        productId: line.product_id,
        quantity: line.quantity,
        direction: "out",
        reason: "dispatch",
        referenceType: "customer_order",
        referenceId: id,
        note: `Dispatched on ${order.reference}`,
        actorId: auth.user.id,
        allowOverdrawReservation: true,
      });
    }

    const shipmentId = randomId();
    const shipmentReference = nextReference(db, "SHP", "SHP");
    const destination =
      input.destination?.trim() || order.delivery_address || `${order.customer_name}`;
    execute(
      db,
      `INSERT INTO shipments
         (id, reference, order_id, transporter_id, vehicle_plate, driver_name, driver_phone, destination, status,
          dispatched_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_transit', ?, ?, ?, ?)`,
      [
        shipmentId, shipmentReference, id, input.transporterId ?? null, input.vehiclePlate?.trim() || null,
        input.driverName?.trim() || null, input.driverPhone?.trim() || null, destination,
        nowIso(), auth.user.id, nowIso(), nowIso(),
      ],
    );
    repo.updateStatus(db, id, "dispatched");

    notify(db, {
      userId: order.created_by,
      title: "Order dispatched",
      body: `${order.reference} left ${order.location_name} on ${shipmentReference}.`,
      level: "info",
      link: `/portal/orders/${id}`,
    });
    notify(db, {
      roleId: "logistics_officer",
      title: "Shipment in transit",
      body: `${shipmentReference} is carrying ${order.reference} to ${destination}.`,
      level: "info",
      link: "/portal/logistics",
    });
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "orders.dispatched",
      entityType: "customer_order",
      entityId: id,
      summary: `Dispatched ${order.reference} as ${shipmentReference}`,
      metadata: { shipmentId, destination },
    }, ip);

    return { ...get(db, auth, id), shipment: { id: shipmentId, reference: shipmentReference } };
  });
}

export function cancel(db: Db, auth: AuthContext, id: string, ip?: string) {
  return transaction(db, () => {
    const order = repo.findOrder(db, id);
    if (!order) throw notFound("Order not found");
    if (auth.scopedToParty && order.customer_id !== auth.user.partyId) throw forbidden("Not your order");
    if (!["draft", "pending_approval", "approved", "allocated"].includes(order.status)) {
      throw conflict("Dispatched orders cannot be cancelled");
    }
    if (order.status === "allocated") {
      for (const line of repo.findLines(db, id)) {
        releaseStock(db, order.location_id, line.product_id, line.quantity);
        repo.setAllocated(db, line.id, 0);
      }
    }
    repo.updateStatus(db, id, "cancelled");
    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "orders.cancelled",
      entityType: "customer_order",
      entityId: id,
      summary: `Cancelled ${order.reference}`,
    }, ip);
    return get(db, auth, id);
  });
}

/** Called by logistics inside its delivery transaction. */
export function markDelivered(db: Db, orderId: string): void {
  execute(db, "UPDATE customer_orders SET status = 'delivered', updated_at = ? WHERE id = ?", [nowIso(), orderId]);
}
