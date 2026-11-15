/**
 * Finance module: invoices are raised automatically when a delivery is
 * confirmed, and payments are recorded against them. Money is always integer
 * kobo, so no floating point rounding can leak into receivables.
 */
import type { Db } from "../../db/database.js";
import { execute, nowIso, queryAll, queryOne, transaction } from "../../db/database.js";
import { conflict, notFound, unprocessable } from "../../platform/errors.js";
import { notify, recordAudit } from "../../platform/audit.js";
import { nextReference } from "../../platform/references.js";
import { randomId } from "../../platform/security.js";
import type { AuthContext } from "../../middleware/authenticate.js";

interface InvoiceRow {
  id: string;
  reference: string;
  order_id: string;
  order_reference: string;
  customer_id: string;
  customer_name: string;
  amount_kobo: number;
  amount_paid_kobo: number;
  status: string;
  issued_at: string;
  due_date: string | null;
}

const SELECT = `
  SELECT i.*, o.reference AS order_reference, c.name AS customer_name
    FROM invoices i
    JOIN customer_orders o ON o.id = i.order_id
    JOIN parties c ON c.id = i.customer_id
`;

export function mapInvoice(row: InvoiceRow) {
  return {
    id: row.id,
    reference: row.reference,
    order: { id: row.order_id, reference: row.order_reference },
    customer: { id: row.customer_id, name: row.customer_name },
    amountKobo: row.amount_kobo,
    amountPaidKobo: row.amount_paid_kobo,
    outstandingKobo: row.amount_kobo - row.amount_paid_kobo,
    status: row.status,
    issuedAt: row.issued_at,
    dueDate: row.due_date,
    isOverdue:
      row.status !== "paid" && row.due_date !== null && new Date(row.due_date).getTime() < Date.now(),
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
  if (auth.scopedToParty) {
    conditions.push("i.customer_id = ?");
    params.push(auth.user.partyId ?? "__none__");
  }
  if (filter.status) {
    conditions.push("i.status = ?");
    params.push(filter.status);
  }
  if (filter.search) {
    conditions.push("(i.reference LIKE ? OR c.name LIKE ? OR o.reference LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = queryAll<InvoiceRow>(
    db,
    `${SELECT} ${clause} ORDER BY i.issued_at DESC LIMIT ? OFFSET ?`,
    [...params, page.limit, page.offset],
  );
  const total = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM invoices i
       JOIN customer_orders o ON o.id = i.order_id
       JOIN parties c ON c.id = i.customer_id ${clause}`,
    params,
  );
  return { items: rows.map(mapInvoice), total: Number(total?.count ?? 0) };
}

export function getInvoice(db: Db, auth: AuthContext, id: string) {
  const row = queryOne<InvoiceRow>(db, `${SELECT} WHERE i.id = ?`, [id]);
  if (!row) throw notFound("Invoice not found");
  if (auth.scopedToParty && row.customer_id !== auth.user.partyId) throw notFound("Invoice not found");
  const payments = queryAll<{
    id: string;
    reference: string;
    amount_kobo: number;
    method: string;
    received_at: string;
    notes: string | null;
    recorded_by_name: string;
  }>(
    db,
    `SELECT p.id, p.reference, p.amount_kobo, p.method, p.received_at, p.notes, u.full_name AS recorded_by_name
       FROM payments p JOIN users u ON u.id = p.recorded_by
      WHERE p.invoice_id = ? ORDER BY p.received_at DESC`,
    [id],
  );
  return {
    ...mapInvoice(row),
    payments: payments.map((payment) => ({
      id: payment.id,
      reference: payment.reference,
      amountKobo: payment.amount_kobo,
      method: payment.method,
      receivedAt: payment.received_at,
      notes: payment.notes,
      recordedBy: payment.recorded_by_name,
    })),
  };
}

/** Internal: raise the invoice for a delivered order (idempotent per order). */
export function issueInvoiceForOrder(db: Db, orderId: string, actorId: string): { id: string; reference: string } {
  const existing = queryOne<{ id: string; reference: string }>(
    db,
    "SELECT id, reference FROM invoices WHERE order_id = ? AND status != 'void'",
    [orderId],
  );
  if (existing) return existing;

  const order = queryOne<{ id: string; reference: string; customer_id: string; total_kobo: number }>(
    db,
    "SELECT id, reference, customer_id, total_kobo FROM customer_orders WHERE id = ?",
    [orderId],
  );
  if (!order) throw notFound("Order not found");
  if (order.total_kobo <= 0) throw unprocessable("An invoice cannot be raised for a zero value order");

  const id = randomId();
  const reference = nextReference(db, "INV", "INV");
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  execute(
    db,
    `INSERT INTO invoices (id, reference, order_id, customer_id, amount_kobo, amount_paid_kobo, status, issued_at, due_date, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 'issued', ?, ?, ?)`,
    [id, reference, orderId, order.customer_id, order.total_kobo, nowIso(), dueDate, nowIso()],
  );
  notify(db, {
    roleId: "finance_officer",
    title: "Invoice raised",
    body: `${reference} for ${order.reference} has been issued after delivery confirmed.`,
    level: "info",
    link: "/portal/finance",
  });
  recordAudit(db, { id: actorId, fullName: "Delivery confirmation" }, {
    action: "finance.invoice_issued",
    entityType: "invoice",
    entityId: id,
    summary: `Issued invoice ${reference} for ${order.reference}`,
    metadata: { amountKobo: order.total_kobo },
  });
  return { id, reference };
}

export function recordPayment(
  db: Db,
  auth: AuthContext,
  invoiceId: string,
  input: { amountKobo: number; method: "bank_transfer" | "cheque" | "cash" | "pos"; receivedAt?: string; notes?: string | null },
  ip?: string,
) {
  return transaction(db, () => {
    const invoice = queryOne<InvoiceRow>(db, `${SELECT} WHERE i.id = ?`, [invoiceId]);
    if (!invoice) throw notFound("Invoice not found");
    if (invoice.status === "paid") throw conflict("This invoice is already fully paid");
    const outstanding = invoice.amount_kobo - invoice.amount_paid_kobo;
    if (input.amountKobo <= 0) throw unprocessable("Payment amount must be greater than zero");
    if (input.amountKobo > outstanding) {
      throw unprocessable(
        `Payment exceeds the outstanding balance of ${(outstanding / 100).toLocaleString("en-NG", { style: "currency", currency: "NGN" })}`,
      );
    }

    const id = randomId();
    const reference = nextReference(db, "PMT", "PMT");
    execute(
      db,
      `INSERT INTO payments (id, reference, invoice_id, amount_kobo, method, received_at, notes, recorded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, reference, invoiceId, input.amountKobo, input.method, input.receivedAt ?? nowIso(), input.notes?.trim() || null, auth.user.id, nowIso()],
    );

    const paid = invoice.amount_paid_kobo + input.amountKobo;
    execute(db, "UPDATE invoices SET amount_paid_kobo = ?, status = ? WHERE id = ?", [
      paid,
      paid >= invoice.amount_kobo ? "paid" : "partially_paid",
      invoiceId,
    ]);

    recordAudit(db, { id: auth.user.id, fullName: auth.user.fullName }, {
      action: "finance.payment_recorded",
      entityType: "invoice",
      entityId: invoiceId,
      summary: `Recorded ${(input.amountKobo / 100).toLocaleString("en-NG")} NGN against ${invoice.reference}`,
      metadata: { reference, method: input.method },
    }, ip);

    return getInvoice(db, auth, invoiceId);
  });
}

export function summary(db: Db, auth: AuthContext) {
  const scoped = auth.scopedToParty ? "WHERE i.customer_id = ?" : "";
  const params = auth.scopedToParty ? [auth.user.partyId ?? "__none__"] : [];
  const row = queryOne<{
    invoiced: number | null;
    collected: number | null;
    outstanding: number | null;
    overdue: number | null;
  }>(
    db,
    `SELECT SUM(i.amount_kobo) AS invoiced,
            SUM(i.amount_paid_kobo) AS collected,
            SUM(i.amount_kobo - i.amount_paid_kobo) AS outstanding,
            SUM(CASE WHEN i.status != 'paid' AND i.due_date < ? THEN i.amount_kobo - i.amount_paid_kobo ELSE 0 END) AS overdue
       FROM invoices i ${scoped}`,
    [nowIso(), ...params],
  );
  const byStatus = queryAll<{ status: string; count: number; total: number }>(
    db,
    `SELECT i.status, COUNT(*) AS count, SUM(i.amount_kobo - i.amount_paid_kobo) AS total
       FROM invoices i ${scoped} GROUP BY i.status`,
    params,
  );
  return {
    invoicedKobo: Number(row?.invoiced ?? 0),
    collectedKobo: Number(row?.collected ?? 0),
    outstandingKobo: Number(row?.outstanding ?? 0),
    overdueKobo: Number(row?.overdue ?? 0),
    byStatus: byStatus.map((entry) => ({ status: entry.status, count: entry.count, outstandingKobo: entry.total })),
  };
}
