/**
 * Service-level tests for the rules the platform is built to enforce.
 *
 * Each test builds an isolated in-memory database, seeds the demonstration
 * data and then drives the services the HTTP layer calls. Anything that would
 * be catastrophic in production (approving your own purchase order, allocating
 * unapproved stock, releasing un-inspected cylinders) has a test here.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { migrate, openDatabase, queryAll, queryOne, type Db } from "../src/db/database.js";
import { seed } from "../src/db/seed.js";
import { DEMO_PASSWORD } from "../src/config/demo.js";
import * as authService from "../src/modules/auth/service.js";
import * as procurement from "../src/modules/procurement/service.js";
import * as orders from "../src/modules/orders/service.js";
import * as logistics from "../src/modules/logistics/service.js";
import * as manufacturing from "../src/modules/manufacturing/service.js";
import * as quality from "../src/modules/quality/service.js";
import * as inventory from "../src/modules/inventory/service.js";
import * as finance from "../src/modules/finance/service.js";
import type { AuthContext } from "../src/middleware/authenticate.js";

let db: Db;

function authAs(email: string): AuthContext {
  const result = authService.login(db, { email, password: DEMO_PASSWORD });
  return {
    sessionId: "test-session",
    user: result.user,
    permissions: new Set(result.permissions),
    scopedToParty: result.scopedToParty,
  };
}

function id(sql: string, params: (string | number)[] = []): string {
  const row = queryOne<{ id: string }>(db, sql, params);
  assert.ok(row, `no row for ${sql}`);
  return row.id;
}

function stockAt(productId: string, locationId: string): { quantity: number; reserved: number } {
  const { items } = inventory.stockList(db, { productId, locationId, limit: 10, offset: 0 });
  const line = items[0];
  if (!line) return { quantity: 0, reserved: 0 };
  return { quantity: line.quantity, reserved: line.reserved };
}

beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db);
  seed(db);
});

describe("purchase orders", () => {
  it("prevents a requester from approving their own order and posts stock on receipt", () => {
    const buyer = authAs("procurement@stockgap.demo");
    const approver = authAs("operations@stockgap.demo");
    const supplierId = id("SELECT id FROM parties WHERE type = 'supplier' ORDER BY code LIMIT 1");
    const plantId = id("SELECT id FROM locations WHERE code = 'PH-PLANT'");
    const steelId = id("SELECT id FROM products WHERE sku = 'RAW-STEEL'");

    const created = procurement.create(
      db,
      buyer,
      {
        supplierId,
        locationId: plantId,
        expectedDate: null,
        notes: null,
        lines: [{ productId: steelId, quantity: 100, unitPriceKobo: 120_000 }],
      },
      "127.0.0.1",
    );
    procurement.submit(db, buyer, created.id, "127.0.0.1");

    assert.throws(() => procurement.approve(db, buyer, created.id, "127.0.0.1"), /approve/i);
    procurement.approve(db, approver, created.id, "127.0.0.1");

    const before = stockAt(steelId, plantId).quantity;
    const detail = procurement.get(db, approver, created.id);
    const line = detail.lines[0];
    assert.ok(line);

    procurement.receive(
      db,
      authAs("warehouse@stockgap.demo"),
      created.id,
      { notes: "Test receipt", lines: [{ lineId: line.id, quantity: 100 }] },
      "127.0.0.1",
    );

    assert.equal(stockAt(steelId, plantId).quantity, before + 100);
    assert.equal(procurement.get(db, approver, created.id).status, "received");
  });

  it("refuses a receipt larger than the outstanding quantity", () => {
    const buyer = authAs("procurement@stockgap.demo");
    const approver = authAs("operations@stockgap.demo");
    const created = procurement.create(
      db,
      buyer,
      {
        supplierId: id("SELECT id FROM parties WHERE type = 'supplier' LIMIT 1"),
        locationId: id("SELECT id FROM locations WHERE code = 'PH-PLANT'"),
        expectedDate: null,
        notes: null,
        lines: [{ productId: id("SELECT id FROM products WHERE sku = 'RAW-VALVE'"), quantity: 10, unitPriceKobo: 240_000 }],
      },
      "127.0.0.1",
    );
    procurement.submit(db, buyer, created.id, "127.0.0.1");
    procurement.approve(db, approver, created.id, "127.0.0.1");

    const line = procurement.get(db, approver, created.id).lines[0];
    assert.ok(line);
    assert.throws(
      () =>
        procurement.receive(
          db,
          authAs("warehouse@stockgap.demo"),
          created.id,
          { notes: null, lines: [{ lineId: line.id, quantity: 11 }] },
          "127.0.0.1",
        ),
      /exceed|outstanding|quantity/i,
    );
  });
});

describe("sales orders", () => {
  it("blocks allocation before approval and reserves stock once approved", () => {
    const distributor = authAs("distributor@stockgap.demo");
    const operations = authAs("operations@stockgap.demo");
    const terminalId = id("SELECT id FROM locations WHERE code = 'PH-TERM'");
    const agoId = id("SELECT id FROM products WHERE sku = 'AGO'");

    const created = orders.create(
      db,
      distributor,
      {
        locationId: terminalId,
        requestedDeliveryDate: null,
        deliveryAddress: null,
        contactPhone: null,
        notes: null,
        lines: [{ productId: agoId, quantity: 5_000 }],
      },
      "127.0.0.1",
    );
    assert.equal(orders.get(db, distributor, created.id).status, "draft");

    orders.submit(db, distributor, created.id, "127.0.0.1");
    assert.throws(() => orders.allocate(db, operations, created.id, "127.0.0.1"), /approved/i);

    const before = stockAt(agoId, terminalId);
    orders.approve(db, operations, created.id, "127.0.0.1");
    orders.allocate(db, operations, created.id, "127.0.0.1");

    const after = stockAt(agoId, terminalId);
    assert.equal(after.quantity, before.quantity, "allocation does not move stock");
    assert.equal(after.reserved, before.reserved + 5_000, "allocation reserves stock");

    orders.cancel(db, operations, created.id, "127.0.0.1");
    assert.equal(stockAt(agoId, terminalId).reserved, before.reserved, "cancelling releases the reservation");
  });

  it("scopes order visibility to the distributor's own organisation", () => {
    const distributor = authAs("distributor@stockgap.demo");
    const list = orders.list(db, distributor, {}, { limit: 100, offset: 0 });
    assert.ok(list.items.length > 0);
    assert.ok(
      list.items.every((order) => order.customer.id === distributor.user.partyId),
      "distributor sees only its own orders",
    );
  });

  it("raises an invoice only when a delivery is confirmed", () => {
    const distributor = authAs("distributor@stockgap.demo");
    const operations = authAs("operations@stockgap.demo");
    const logisticsAuth = authAs("logistics@stockgap.demo");
    const terminalId = id("SELECT id FROM locations WHERE code = 'PH-TERM'");
    const agoId = id("SELECT id FROM products WHERE sku = 'AGO'");

    const created = orders.create(
      db,
      distributor,
      {
        locationId: terminalId,
        requestedDeliveryDate: null,
        deliveryAddress: null,
        contactPhone: null,
        notes: null,
        lines: [{ productId: agoId, quantity: 2_000 }],
      },
      "127.0.0.1",
    );
    orders.submit(db, distributor, created.id, "127.0.0.1");
    orders.approve(db, operations, created.id, "127.0.0.1");
    orders.allocate(db, operations, created.id, "127.0.0.1");

    const invoicesBefore = finance.list(db, authAs("finance@stockgap.demo"), {}, { limit: 100, offset: 0 }).total;
    const dispatched = orders.dispatch(db, logisticsAuth, created.id, {}, "127.0.0.1");
    assert.equal(dispatched.status, "dispatched");
    assert.equal(
      finance.list(db, authAs("finance@stockgap.demo"), {}, { limit: 100, offset: 0 }).total,
      invoicesBefore,
      "dispatch alone does not invoice",
    );

    const shipmentId = id("SELECT id FROM shipments WHERE order_id = ?", [created.id]);
    logistics.confirmDelivery(db, logisticsAuth, shipmentId, {}, "127.0.0.1");
    assert.equal(orders.get(db, operations, created.id).status, "delivered");

    const shipment = queryOne<{ status: string }>(db, "SELECT status FROM shipments WHERE id = ?", [shipmentId]);
    assert.equal(shipment?.status, "delivered");
    assert.equal(
      finance.list(db, authAs("finance@stockgap.demo"), {}, { limit: 100, offset: 0 }).total,
      invoicesBefore + 1,
      "delivery confirmation raises exactly one invoice",
    );
  });
});

describe("production and quality", () => {
  it("consumes components on start and releases only inspected output", () => {
    const supervisor = authAs("production@stockgap.demo");
    const inspector = authAs("quality@stockgap.demo");
    const plantId = id("SELECT id FROM locations WHERE code = 'PH-PLANT'");

    const bom = manufacturing.billOfMaterials(db);
    const entry = bom.find((item) => item.components.length > 0);
    assert.ok(entry, "seed data includes a bill of materials");
    const category = queryOne<{ category: string }>(db, "SELECT category FROM products WHERE id = ?", [entry.productId]);
    const type = category?.category === "lpg" ? "lpg_filling" : "cylinder_manufacture";

    const started = manufacturing.create(
      db,
      supervisor,
      { type, productId: entry.productId, locationId: plantId, plannedQuantity: 5, dueDate: null },
      "127.0.0.1",
    );
    manufacturing.start(db, supervisor, started.id, "127.0.0.1");

    for (const component of entry.components) {
      const componentId = id("SELECT id FROM products WHERE sku = ?", [component.sku]);
      const consumption = queryOne<{ quantity: number }>(
        db,
        "SELECT quantity FROM production_consumptions WHERE production_order_id = ? AND component_product_id = ?",
        [started.id, componentId],
      );
      assert.ok(consumption, `component ${component.sku} was consumed`);
      assert.equal(consumption.quantity, component.quantityPerUnit * 5);
    }

    const before = stockAt(entry.productId, plantId).quantity;
    manufacturing.submitForQuality(db, supervisor, started.id, "127.0.0.1");

    quality.create(
      db,
      inspector,
      {
        productionOrderId: started.id,
        inspectionType: "finished_goods",
        checkedQuantity: 5,
        passedQuantity: 4,
        failedQuantity: 1,
        result: "conditional",
        notes: "One unit failed the leak test",
      },
      "127.0.0.1",
    );

    const completed = manufacturing.get(db, started.id);
    assert.equal(completed.status, "completed");
    assert.equal(completed.producedQuantity, 4, "only passed units are released");
    assert.equal(stockAt(entry.productId, plantId).quantity, before + 4);
  });
});

describe("role-based access", () => {
  it("keeps audit logs and finance out of reach of an operational role", () => {
    const buyer = authAs("procurement@stockgap.demo");
    assert.equal(buyer.permissions.has("audit:read"), false);
    assert.equal(buyer.permissions.has("finance:manage"), false);
    assert.equal(buyer.permissions.has("procurement:create"), true);
  });

  it("gives a distributor ordering rights but no enterprise-wide modules", () => {
    const distributor = authAs("distributor@stockgap.demo");
    assert.equal(distributor.scopedToParty, true);
    assert.equal(distributor.permissions.has("orders:create"), true);
    assert.equal(distributor.permissions.has("orders:approve"), false);
    assert.equal(distributor.permissions.has("procurement:read"), false);
  });

  it("rejects invalid credentials and records the attempt", () => {
    assert.throws(() => authService.login(db, { email: "admin@stockgap.demo", password: "wrong-password" }));
    const audit = queryAll<{ action: string }>(db, "SELECT action FROM audit_logs WHERE action = 'auth.login_failed'");
    assert.ok(audit.length >= 1);
  });
});
