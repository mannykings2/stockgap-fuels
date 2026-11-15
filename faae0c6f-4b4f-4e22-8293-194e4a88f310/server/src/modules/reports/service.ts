/**
 * Role-aware dashboard and reporting.
 *
 * Every card is derived from the same tables the operational modules write to,
 * and each block is gated by the caller's permissions, so a finance officer
 * does not receive stock detail and a customer only sees their own demand.
 */
import type { Db } from "../../db/database.js";
import { nowIso, queryAll, queryOne, type Param } from "../../db/database.js";
import type { AuthContext } from "../../middleware/authenticate.js";

function scalar(db: Db, sql: string, params: Param[] = [], column = "value"): number {
  const row = queryOne<Record<string, number | null>>(db, sql, params);
  return Number(row?.[column] ?? 0);
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function lastMonths(count: number): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    months.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_LABELS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`,
    });
  }
  return months;
}

export function stockByCategory(db: Db) {
  return queryAll<{ category: string; quantity: number; value_kobo: number }>(
    db,
    `SELECT p.category, SUM(i.quantity) AS quantity, SUM(i.quantity * p.unit_price_kobo) AS value_kobo
       FROM inventory i JOIN products p ON p.id = i.product_id
      GROUP BY p.category ORDER BY p.category`,
  ).map((row) => ({
    category: row.category,
    quantity: Math.round(row.quantity * 1000) / 1000,
    valueKobo: Math.round(row.value_kobo ?? 0),
  }));
}

export function stockByLocation(db: Db) {
  return queryAll<{ location: string; type: string; quantity: number; value_kobo: number }>(
    db,
    `SELECT l.name AS location, l.type, SUM(i.quantity) AS quantity,
            SUM(i.quantity * p.unit_price_kobo) AS value_kobo
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN locations l ON l.id = i.location_id
      GROUP BY l.id ORDER BY value_kobo DESC`,
  ).map((row) => ({
    location: row.location,
    type: row.type,
    quantity: Math.round(row.quantity * 1000) / 1000,
    valueKobo: Math.round(row.value_kobo ?? 0),
  }));
}

export function lowStockItems(db: Db, limit = 8) {
  return queryAll<{
    product: string;
    sku: string;
    location: string;
    unit: string;
    available: number;
    reorder_level: number;
  }>(
    db,
    `SELECT p.name AS product, p.sku, l.name AS location, p.unit,
            (i.quantity - i.reserved) AS available, p.reorder_level
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN locations l ON l.id = i.location_id
      WHERE (i.quantity - i.reserved) <= p.reorder_level
      ORDER BY (i.quantity - i.reserved) / CASE WHEN p.reorder_level > 0 THEN p.reorder_level ELSE 1 END
      LIMIT ?`,
    [limit],
  ).map((row) => ({
    product: row.product,
    sku: row.sku,
    location: row.location,
    unit: row.unit,
    available: row.available,
    reorderLevel: row.reorder_level,
  }));
}

export function orderPipeline(db: Db) {
  const rows = queryAll<{ status: string; count: number; total: number | null }>(
    db,
    "SELECT status, COUNT(*) AS count, SUM(total_kobo) AS total FROM customer_orders GROUP BY status",
  );
  const statuses = ["draft", "pending_approval", "approved", "allocated", "dispatched", "delivered", "cancelled"];
  return statuses.map((status) => {
    const row = rows.find((entry) => entry.status === status);
    return { status, count: row?.count ?? 0, valueKobo: row?.total ?? 0 };
  });
}

export function salesTrend(db: Db, months = 6) {
  const range = lastMonths(months);
  const rows = queryAll<{ month: string; invoiced: number | null; collected: number | null }>(
    db,
    `SELECT substr(issued_at, 1, 7) AS month, SUM(amount_kobo) AS invoiced, SUM(amount_paid_kobo) AS collected
       FROM invoices GROUP BY month`,
  );
  return range.map((entry) => {
    const row = rows.find((item) => item.month === entry.key);
    return {
      month: entry.label,
      invoicedKobo: Math.round(row?.invoiced ?? 0),
      collectedKobo: Math.round(row?.collected ?? 0),
    };
  });
}

export function procurementTrend(db: Db, months = 6) {
  const range = lastMonths(months);
  const rows = queryAll<{ month: string; total: number | null; orders: number }>(
    db,
    `SELECT substr(created_at, 1, 7) AS month, SUM(total_kobo) AS total, COUNT(*) AS orders
       FROM purchase_orders WHERE status NOT IN ('draft','cancelled') GROUP BY month`,
  );
  return range.map((entry) => {
    const row = rows.find((item) => item.month === entry.key);
    return { month: entry.label, spendKobo: Math.round(row?.total ?? 0), orders: row?.orders ?? 0 };
  });
}

export function productionTrend(db: Db, months = 6) {
  const range = lastMonths(months);
  const rows = queryAll<{ month: string; quantity: number | null; batches: number }>(
    db,
    `SELECT substr(completed_at, 1, 7) AS month, SUM(produced_quantity) AS quantity, COUNT(*) AS batches
       FROM production_orders WHERE status = 'completed' GROUP BY month`,
  );
  return range.map((entry) => {
    const row = rows.find((item) => item.month === entry.key);
    return { month: entry.label, quantity: Math.round(Number(row?.quantity ?? 0) * 1000) / 1000, batches: row?.batches ?? 0 };
  });
}

export function receivablesAging(db: Db) {
  const invoices = queryAll<{ due_date: string | null; issued_at: string; outstanding: number }>(
    db,
    `SELECT due_date, issued_at, (amount_kobo - amount_paid_kobo) AS outstanding
       FROM invoices WHERE status != 'paid'`,
  );
  const buckets = [
    { bucket: "Current", min: -Infinity, max: 0, amountKobo: 0, count: 0 },
    { bucket: "1-30 days", min: 1, max: 30, amountKobo: 0, count: 0 },
    { bucket: "31-60 days", min: 31, max: 60, amountKobo: 0, count: 0 },
    { bucket: "60+ days", min: 61, max: Infinity, amountKobo: 0, count: 0 },
  ];
  const today = Date.now();
  for (const invoice of invoices) {
    const due = invoice.due_date ? new Date(invoice.due_date).getTime() : new Date(invoice.issued_at).getTime();
    const days = Math.floor((today - due) / (24 * 60 * 60 * 1000));
    const bucket = buckets.find((entry) => days >= entry.min && days <= entry.max) ?? buckets[0]!;
    bucket.amountKobo += invoice.outstanding;
    bucket.count += 1;
  }
  return buckets.map(({ bucket, amountKobo, count }) => ({ bucket, amountKobo, count }));
}

export function topCustomers(db: Db, limit = 5) {
  return queryAll<{ name: string; invoiced: number; collected: number }>(
    db,
    `SELECT c.name, SUM(i.amount_kobo) AS invoiced, SUM(i.amount_paid_kobo) AS collected
       FROM invoices i JOIN parties c ON c.id = i.customer_id
      GROUP BY c.id ORDER BY invoiced DESC LIMIT ?`,
    [limit],
  ).map((row) => ({ name: row.name, invoicedKobo: row.invoiced, collectedKobo: row.collected }));
}

export function hseSummary(db: Db) {
  const bySeverity = queryAll<{ severity: string; count: number }>(
    db,
    "SELECT severity, COUNT(*) AS count FROM hse_incidents WHERE status != 'closed' GROUP BY severity",
  );
  const total = scalar(db, "SELECT COUNT(*) AS value FROM hse_incidents");
  const closed = scalar(db, "SELECT COUNT(*) AS value FROM hse_incidents WHERE status = 'closed'");
  return { bySeverity, total, closed };
}

export interface Kpi {
  key: string;
  label: string;
  value: number;
  format: "number" | "currency" | "quantity";
  hint?: string;
  link?: string;
  tone?: "default" | "warning" | "critical" | "success";
}

export function dashboard(db: Db, auth: AuthContext) {
  const can = (permission: string) => auth.permissions.has(permission);
  const scoped = auth.scopedToParty && auth.user.partyId;
  const kpis: Kpi[] = [];

  if (scoped) {
    const openOrders = scalar(
      db,
      "SELECT COUNT(*) AS value FROM customer_orders WHERE customer_id = ? AND status NOT IN ('delivered','cancelled')",
      [auth.user.partyId],
    );
    const outstanding = scalar(
      db,
      "SELECT COALESCE(SUM(amount_kobo - amount_paid_kobo), 0) AS value FROM invoices WHERE customer_id = ? AND status != 'paid'",
      [auth.user.partyId],
    );
    const inTransit = scalar(
      db,
      "SELECT COUNT(*) AS value FROM shipments s JOIN customer_orders o ON o.id = s.order_id WHERE o.customer_id = ? AND s.status = 'in_transit'",
      [auth.user.partyId],
    );
    kpis.push(
      { key: "open_orders", label: "Open orders", value: openOrders, format: "number", link: "/portal/orders" },
      { key: "outstanding", label: "Outstanding invoices", value: outstanding, format: "currency", link: "/portal/finance" },
      { key: "in_transit", label: "In transit", value: inTransit, format: "number", link: "/portal/orders" },
    );
  } else {
    if (can("inventory:read")) {
      const stockValue = scalar(
        db,
        "SELECT COALESCE(SUM(i.quantity * p.unit_price_kobo), 0) AS value FROM inventory i JOIN products p ON p.id = i.product_id",
      );
      const lowStock = scalar(
        db,
        "SELECT COUNT(*) AS value FROM inventory i JOIN products p ON p.id = i.product_id WHERE (i.quantity - i.reserved) <= p.reorder_level",
      );
      kpis.push(
        { key: "stock_value", label: "Inventory value", value: stockValue, format: "currency", hint: "On-hand at cost", link: "/portal/inventory" },
        { key: "low_stock", label: "Below reorder level", value: lowStock, format: "number", tone: lowStock > 0 ? "warning" : "success", link: "/portal/inventory" },
      );
    }
    if (can("orders:read")) {
      const openOrders = scalar(
        db,
        "SELECT COUNT(*) AS value FROM customer_orders WHERE status IN ('pending_approval','approved','allocated','dispatched')",
      );
      const awaitingApproval = scalar(
        db,
        "SELECT COUNT(*) AS value FROM customer_orders WHERE status = 'pending_approval'",
      );
      kpis.push(
        { key: "open_orders", label: "Orders in progress", value: openOrders, format: "number", link: "/portal/orders" },
        { key: "order_approvals", label: "Awaiting approval", value: awaitingApproval, format: "number", tone: awaitingApproval > 0 ? "warning" : "default", link: "/portal/orders" },
      );
    }
    if (can("procurement:read")) {
      const pending = scalar(db, "SELECT COUNT(*) AS value FROM purchase_orders WHERE status = 'pending_approval'");
      const awaitingReceipt = scalar(
        db,
        "SELECT COUNT(*) AS value FROM purchase_orders WHERE status IN ('approved','partially_received')",
      );
      kpis.push(
        { key: "po_pending", label: "POs awaiting approval", value: pending, format: "number", tone: pending > 0 ? "warning" : "default", link: "/portal/procurement" },
        { key: "po_receipt", label: "Awaiting delivery", value: awaitingReceipt, format: "number", link: "/portal/procurement" },
      );
    }
    if (can("manufacturing:read")) {
      const inProgress = scalar(db, "SELECT COUNT(*) AS value FROM production_orders WHERE status = 'in_progress'");
      const awaitingQuality = scalar(
        db,
        "SELECT COUNT(*) AS value FROM production_orders WHERE status = 'awaiting_quality'",
      );
      kpis.push(
        { key: "production_active", label: "Production in progress", value: inProgress, format: "number", link: "/portal/manufacturing" },
        { key: "quality_queue", label: "Awaiting inspection", value: awaitingQuality, format: "number", tone: awaitingQuality > 0 ? "warning" : "default", link: "/portal/quality" },
      );
    }
    if (can("logistics:read")) {
      const inTransit = scalar(db, "SELECT COUNT(*) AS value FROM shipments WHERE status = 'in_transit'");
      kpis.push({ key: "in_transit", label: "Shipments in transit", value: inTransit, format: "number", link: "/portal/logistics" });
    }
    if (can("finance:read")) {
      const outstanding = scalar(
        db,
        "SELECT COALESCE(SUM(amount_kobo - amount_paid_kobo), 0) AS value FROM invoices WHERE status != 'paid'",
      );
      const overdue = scalar(
        db,
        "SELECT COALESCE(SUM(amount_kobo - amount_paid_kobo), 0) AS value FROM invoices WHERE status != 'paid' AND due_date < ?",
        [nowIso()],
      );
      kpis.push(
        { key: "receivables", label: "Receivables", value: outstanding, format: "currency", link: "/portal/finance" },
        { key: "overdue", label: "Overdue", value: overdue, format: "currency", tone: overdue > 0 ? "critical" : "success", link: "/portal/finance" },
      );
    }
    if (can("hse:read")) {
      const open = scalar(db, "SELECT COUNT(*) AS value FROM hse_incidents WHERE status != 'closed'");
      kpis.push({ key: "hse_open", label: "Open HSE incidents", value: open, format: "number", tone: open > 0 ? "warning" : "success", link: "/portal/hse" });
    }
    if (can("users:read")) {
      const activeUsers = scalar(db, "SELECT COUNT(*) AS value FROM users WHERE status = 'active'");
      kpis.push({ key: "active_users", label: "Active users", value: activeUsers, format: "number", link: "/portal/users" });
    }
  }

  const alerts: { tone: "info" | "warning" | "critical" | "success"; title: string; detail: string; link: string }[] = [];
  if (!scoped) {
    if (can("inventory:read")) {
      const lowStock = lowStockItems(db, 3);
      if (lowStock.length > 0) {
        alerts.push({
          tone: "warning",
          title: `${lowStock.length} stock position${lowStock.length === 1 ? "" : "s"} below reorder level`,
          detail: lowStock.map((item) => `${item.product} at ${item.location} (${item.available} ${item.unit})`).join(" · "),
          link: "/portal/inventory",
        });
      }
    }
    if (can("quality:read")) {
      const pending = scalar(db, "SELECT COUNT(*) AS value FROM production_orders WHERE status = 'awaiting_quality'");
      if (pending > 0) {
        alerts.push({
          tone: "info",
          title: `${pending} batch${pending === 1 ? "" : "es"} awaiting quality inspection`,
          detail: "Finished goods cannot be released until an inspector records a result.",
          link: "/portal/quality",
        });
      }
    }
    if (can("hse:read")) {
      const critical = scalar(
        db,
        "SELECT COUNT(*) AS value FROM hse_incidents WHERE status != 'closed' AND severity IN ('high','critical')",
      );
      if (critical > 0) {
        alerts.push({
          tone: "critical",
          title: `${critical} high severity HSE incident${critical === 1 ? "" : "s"} open`,
          detail: "Open incidents remain visible until a corrective action is recorded.",
          link: "/portal/hse",
        });
      }
    }
  }

  const recentOrders = can("orders:read")
    ? queryAll<{
        id: string;
        reference: string;
        customer_name: string;
        status: string;
        total_kobo: number;
        created_at: string;
      }>(
        db,
        `SELECT o.id, o.reference, c.name AS customer_name, o.status, o.total_kobo, o.created_at
           FROM customer_orders o JOIN parties c ON c.id = o.customer_id
          ${scoped ? "WHERE o.customer_id = ?" : ""}
          ORDER BY o.created_at DESC LIMIT 5`,
        scoped ? [auth.user.partyId ?? "__none__"] : [],
      ).map((row) => ({
        id: row.id,
        reference: row.reference,
        customer: row.customer_name,
        status: row.status,
        totalKobo: row.total_kobo,
        createdAt: row.created_at,
      }))
    : [];

  const canSeeFinance = can("finance:read");
  const canSeeStock = can("inventory:read");

  return {
    role: { id: auth.user.roleId, label: auth.user.roleLabel },
    user: { fullName: auth.user.fullName, jobTitle: auth.user.jobTitle, partyName: auth.user.partyName },
    kpis,
    alerts,
    recentOrders,
    pipeline: !scoped && can("orders:read") ? orderPipeline(db) : [],
    lowStock: !scoped && canSeeStock ? lowStockItems(db, 5) : [],
    charts: {
      salesTrend: canSeeFinance ? salesTrend(db) : [],
      stockByCategory: canSeeStock ? stockByCategory(db) : [],
      production: can("manufacturing:read") ? productionTrend(db) : [],
    },
  };
}

export function operationalReport(db: Db) {
  return {
    stockByCategory: stockByCategory(db),
    stockByLocation: stockByLocation(db),
    lowStock: lowStockItems(db, 20),
    orderPipeline: orderPipeline(db),
    production: productionTrend(db),
    procurement: procurementTrend(db),
    hse: hseSummary(db),
    generatedAt: nowIso(),
  };
}

export function financialReport(db: Db) {
  return {
    salesTrend: salesTrend(db),
    topCustomers: topCustomers(db),
    receivablesAging: receivablesAging(db),
    invoiceStatus: queryAll<{ status: string; count: number; total: number }>(
      db,
      "SELECT status, COUNT(*) AS count, SUM(amount_kobo - amount_paid_kobo) AS total FROM invoices GROUP BY status",
    ).map((row) => ({ status: row.status, count: row.count, outstandingKobo: row.total })),
    collectedThisMonthKobo: scalar(
      db,
      "SELECT COALESCE(SUM(amount_kobo), 0) AS value FROM payments WHERE substr(received_at, 1, 7) = ?",
      [nowIso().slice(0, 7)],
    ),
    generatedAt: nowIso(),
  };
}
