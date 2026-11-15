import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Alert, Badge, Button, Card, CardHeader, KeyValue, PageHeader, StatCard, Tabs } from "@/components/ui/primitives";
import { DataTable, Pagination, TableToolbar } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, Textarea, useFieldId } from "@/components/ui/form";
import { dateOnly, dateTime, money, moneyFromInput, statusMeta, titleCase } from "@/lib/format";
import type { FinanceSummary, Invoice, InvoiceDetail, Page } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "issued", label: "Issued" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
];

export function Finance() {
  const { has } = useAuth();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const summary = useApi<FinanceSummary>(["finance-summary"], "/invoices/summary");
  const list = useApi<Page<Invoice>>(
    ["invoices", status, search, page],
    `/invoices${qs({ status, search, page, pageSize: 20 })}`,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Invoices raised from delivered orders, payments received and outstanding exposure by customer."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Invoiced" value={money(summary.data?.invoicedKobo ?? 0, { compact: true })} hint="All issued invoices" />
        <StatCard label="Collected" value={money(summary.data?.collectedKobo ?? 0, { compact: true })} tone="success" />
        <StatCard label="Outstanding" value={money(summary.data?.outstandingKobo ?? 0, { compact: true })} tone="warning" />
        <StatCard
          label="Overdue"
          value={money(summary.data?.overdueKobo ?? 0, { compact: true })}
          tone={(summary.data?.overdueKobo ?? 0) > 0 ? "critical" : "success"}
        />
      </div>

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs tabs={TABS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
        </div>
        <TableToolbar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} placeholder="Search invoice or customer" />
        <DataTable
          rows={list.data?.items ?? []}
          keyFor={(row) => row.id}
          loading={list.isLoading}
          emptyTitle="No invoices match this filter"
          columns={[
            {
              key: "reference",
              header: "Invoice",
              render: (row) => (
                <button type="button" onClick={() => setDetailId(row.id)} className="font-medium text-brand hover:underline">
                  {row.reference}
                </button>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              render: (row) => (
                <div>
                  <p className="text-ink">{row.customer.name}</p>
                  <p className="text-[11px] text-muted">{row.order.reference}</p>
                </div>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              render: (row) => <span className="tabular-nums">{money(row.amountKobo)}</span>,
            },
            {
              key: "paid",
              header: "Paid",
              align: "right",
              render: (row) => <span className="tabular-nums text-muted">{money(row.amountPaidKobo)}</span>,
            },
            {
              key: "outstanding",
              header: "Outstanding",
              align: "right",
              render: (row) => (
                <span className={`tabular-nums font-medium ${row.outstandingKobo > 0 ? "text-warn" : "text-ok"}`}>
                  {money(row.outstandingKobo)}
                </span>
              ),
            },
            {
              key: "due",
              header: "Due",
              render: (row) => (
                <span className={row.isOverdue ? "text-danger" : "text-muted"}>
                  {dateOnly(row.dueDate)}
                  {row.isOverdue ? " · overdue" : ""}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Badge>,
            },
          ]}
        />
        {list.data ? <Pagination meta={list.data.meta} onPage={setPage} /> : null}
      </Card>

      {summary.data && summary.data.byStatus.length > 0 ? (
        <Card>
          <CardHeader title="Exposure by invoice status" />
          <ul className="divide-y divide-line">
            {summary.data.byStatus.map((entry) => (
              <li key={entry.status} className="flex items-center justify-between px-5 py-2.5 text-[12px]">
                <span className="text-ink-soft">
                  {titleCase(entry.status)} <span className="text-muted">({entry.count})</span>
                </span>
                <span className="tabular-nums text-muted">{money(entry.outstandingKobo)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {detailId ? (
        <InvoiceDetailModal
          id={detailId}
          canRecord={has("finance:manage")}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            void list.refetch();
            void summary.refetch();
          }}
        />
      ) : null}
    </div>
  );
}

function InvoiceDetailModal({
  id,
  canRecord,
  onClose,
  onChanged,
}: {
  id: string;
  canRecord: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useApi<InvoiceDetail>(["invoice", id], `/invoices/${id}`);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amountField = useFieldId("amount");
  const methodField = useFieldId("method");
  const notesField = useFieldId("payment-notes");

  const pay = useMutation({
    mutationFn: () =>
      api.post(`/invoices/${id}/payments`, {
        amountKobo: moneyFromInput(amount),
        method,
        notes: notes || null,
      }),
    onSuccess: () => {
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      onChanged();
      setOpen(false);
      setAmount("");
      setNotes("");
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not record the payment."),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={data?.reference ?? "Invoice"}
      description={data ? `${data.customer.name} · order ${data.order.reference}` : undefined}
      size="lg"
      footer={
        data && canRecord && data.outstandingKobo > 0 ? (
          <div className="flex justify-end">
            <Button icon={<Plus className="size-4" />} onClick={() => setOpen((current) => !current)}>
              Record payment
            </Button>
          </div>
        ) : null
      }
    >
      {isLoading || !data ? (
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <KeyValue label="Status">
              <Badge tone={statusMeta(data.status).tone}>{statusMeta(data.status).label}</Badge>
            </KeyValue>
            <KeyValue label="Issued">{dateOnly(data.issuedAt)}</KeyValue>
            <KeyValue label="Due">{dateOnly(data.dueDate)}</KeyValue>
            <KeyValue label="Amount">{money(data.amountKobo)}</KeyValue>
            <KeyValue label="Paid">{money(data.amountPaidKobo)}</KeyValue>
            <KeyValue label="Outstanding">
              <span className={data.outstandingKobo > 0 ? "text-warn" : "text-ok"}>{money(data.outstandingKobo)}</span>
            </KeyValue>
          </dl>

          {open ? (
            <div className="rounded-[12px] border border-line bg-surface-2/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Amount received (₦)" required htmlFor={amountField}>
                  <Input id={amountField} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
                </Field>
                <Field label="Method" required htmlFor={methodField}>
                  <Select id={methodField} value={method} onChange={(event) => setMethod(event.target.value)}>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="pos">POS</option>
                    <option value="cash">Cash</option>
                  </Select>
                </Field>
                <Field label="Notes" htmlFor={notesField} className="sm:col-span-2">
                  <Textarea id={notesField} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
                </Field>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <FormError message={error} />
                <Button
                  size="sm"
                  icon={<Banknote className="size-3.5" />}
                  loading={pay.isPending}
                  onClick={() => pay.mutate()}
                >
                  Post payment
                </Button>
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Payments</p>
            {data.payments.length === 0 ? (
              <p className="mt-2 text-[12px] text-muted">No payments recorded against this invoice.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line rounded-[10px] border border-line">
                {data.payments.map((payment) => (
                  <li key={payment.id} className="flex items-start justify-between gap-3 px-3 py-2 text-[12px]">
                    <div>
                      <p className="font-medium text-ink">{money(payment.amountKobo)}</p>
                      <p className="text-muted">
                        {titleCase(payment.method)} · {dateTime(payment.receivedAt)} · {payment.recordedBy}
                      </p>
                      {payment.notes ? <p className="text-muted">{payment.notes}</p> : null}
                    </div>
                    <span className="text-[10px] text-muted">{payment.reference}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {data.isOverdue ? <Alert tone="warning">This invoice is past its due date and remains in receivables.</Alert> : null}
        </div>
      )}
    </Modal>
  );
}
