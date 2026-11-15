import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck, Plus, Send, Trash2, XCircle } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi, useReference } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Alert, Badge, Button, Card, KeyValue, PageHeader, Tabs } from "@/components/ui/primitives";
import { DataTable, Pagination, TableToolbar } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, Textarea, useFieldId } from "@/components/ui/form";
import { dateOnly, dateTime, money, moneyFromInput, quantity, statusMeta } from "@/lib/format";
import type { Page, PurchaseOrder, PurchaseOrderDetail } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "partially_received", label: "Partially received" },
  { value: "received", label: "Received" },
];

interface LineDraft {
  productId: string;
  quantity: string;
  unitPrice: string;
}

const emptyLine = (): LineDraft => ({ productId: "", quantity: "", unitPrice: "" });

export function Procurement() {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const list = useApi<Page<PurchaseOrder>>(
    ["purchase-orders", status, search, page],
    `/purchase-orders${qs({ status, search, page, pageSize: 20 })}`,
  );
  const reference = useReference();

  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const supplierField = useFieldId("supplier");
  const locationField = useFieldId("location");
  const dateField = useFieldId("date");
  const notesField = useFieldId("notes");

  const products = reference.data?.products ?? [];
  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const value = Number.parseFloat(line.quantity || "0");
        return sum + (Number.isFinite(value) ? value : 0) * moneyFromInput(line.unitPrice);
      }, 0),
    [lines],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["purchase-order"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/purchase-orders", {
        supplierId,
        locationId,
        expectedDate: expectedDate || null,
        notes: notes || null,
        lines: lines
          .filter((line) => line.productId && Number.parseFloat(line.quantity) > 0)
          .map((line) => ({
            productId: line.productId,
            quantity: Number.parseFloat(line.quantity),
            unitPriceKobo: moneyFromInput(line.unitPrice),
          })),
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setLines([emptyLine()]);
      setSupplierId("");
      setNotes("");
      setExpectedDate("");
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not create the purchase order."),
  });

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line, position) => {
        if (position !== index) return line;
        const merged = { ...line, ...patch };
        if (patch.productId) {
          const product = products.find((entry) => entry.id === patch.productId);
          if (product) merged.unitPrice = String(product.unit_price_kobo / 100);
        }
        return merged;
      }),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Raise purchase orders, approve them and record goods receipts against the receiving location."
        actions={
          has("procurement:create") ? (
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => {
                setLocationId(reference.data?.locations[0]?.id ?? "");
                setCreateOpen(true);
              }}
            >
              New purchase order
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs tabs={TABS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
        </div>
        <TableToolbar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} placeholder="Search reference or supplier" />
        <DataTable
          rows={list.data?.items ?? []}
          keyFor={(row) => row.id}
          loading={list.isLoading}
          emptyTitle="No purchase orders match this filter"
          columns={[
            {
              key: "reference",
              header: "Reference",
              render: (row) => (
                <button type="button" onClick={() => setDetailId(row.id)} className="font-medium text-brand hover:underline">
                  {row.reference}
                </button>
              ),
            },
            { key: "supplier", header: "Supplier", render: (row) => row.supplier.name },
            { key: "location", header: "Receive into", render: (row) => row.location.name },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Badge>,
            },
            { key: "expected", header: "Expected", render: (row) => <span className="text-muted">{dateOnly(row.expectedDate)}</span> },
            {
              key: "total",
              header: "Value",
              align: "right",
              render: (row) => <span className="tabular-nums">{money(row.totalKobo)}</span>,
            },
          ]}
        />
        {list.data ? <Pagination meta={list.data.meta} onPage={setPage} /> : null}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New purchase order"
        description="Receipts update stock at the selected location."
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              Order value <span className="font-semibold text-ink">{money(total)}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button loading={create.isPending} onClick={() => create.mutate()}>
                Save draft
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier" required htmlFor={supplierField}>
              <Select id={supplierField} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">Select a supplier</option>
                {(reference.data?.suppliers ?? []).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Receive into" required htmlFor={locationField}>
              <Select id={locationField} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">Select a location</option>
                {(reference.data?.locations ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Expected date" htmlFor={dateField}>
              <Input id={dateField} type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
            </Field>
          </div>

          <div className="rounded-[12px] border border-line">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <p className="text-[12px] font-medium text-ink">Lines</p>
              <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setLines((current) => [...current, emptyLine()])}>
                Add line
              </Button>
            </div>
            <div className="space-y-3 p-3">
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_110px_140px_36px]">
                  <Select value={line.productId} onChange={(event) => updateLine(index, { productId: event.target.value })} aria-label="Product">
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.unit})
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    inputMode="decimal"
                    placeholder="Quantity"
                    aria-label="Quantity"
                  />
                  <Input
                    value={line.unitPrice}
                    onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                    inputMode="decimal"
                    placeholder="Unit price ₦"
                    aria-label="Unit price"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove line"
                    onClick={() => setLines((current) => (current.length === 1 ? [emptyLine()] : current.filter((_, position) => position !== index)))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Field label="Notes" htmlFor={notesField}>
            <Textarea id={notesField} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
          </Field>
          <FormError message={error} />
        </div>
      </Modal>

      {detailId ? (
        <PurchaseOrderDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={invalidate}
        />
      ) : null}
    </div>
  );
}

function PurchaseOrderDetailModal({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { has } = useAuth();
  const { data, isLoading } = useApi<PurchaseOrderDetail>(["purchase-order", id], `/purchase-orders/${id}`);
  const [receiving, setReceiving] = useState(false);
  const [received, setReceived] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => api.post(`/purchase-orders/${id}/${path}`, body),
    onSuccess: () => {
      onChanged();
      setReceiving(false);
      setError(null);
      onClose();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "The action failed."),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={data?.reference ?? "Purchase order"}
      description={data ? `${data.supplier.name} · receiving into ${data.location.name}` : undefined}
      size="lg"
      footer={
        data ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {data.status === "draft" && has("procurement:create") ? (
                <Button icon={<Send className="size-4" />} onClick={() => action.mutate({ path: "submit" })} loading={action.isPending}>
                  Submit
                </Button>
              ) : null}
              {data.status === "pending_approval" && has("procurement:approve") ? (
                <Button icon={<CheckCircle2 className="size-4" />} onClick={() => action.mutate({ path: "approve" })} loading={action.isPending}>
                  Approve
                </Button>
              ) : null}
              {["approved", "partially_received"].includes(data.status) && has("procurement:receive") ? (
                <Button icon={<PackageCheck className="size-4" />} variant="secondary" onClick={() => setReceiving((current) => !current)}>
                  Record receipt
                </Button>
              ) : null}
              {["draft", "pending_approval", "approved"].includes(data.status) && has("procurement:create") ? (
                <Button icon={<XCircle className="size-4" />} variant="danger" onClick={() => action.mutate({ path: "cancel" })} loading={action.isPending}>
                  Cancel
                </Button>
              ) : null}
            </div>
            <Button variant="secondary" onClick={onClose}>
              Close
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
            <KeyValue label="Total">{money(data.totalKobo)}</KeyValue>
            <KeyValue label="Requested by">{data.requestedBy.name}</KeyValue>
            <KeyValue label="Approved by">{data.approvedBy?.name ?? "—"}</KeyValue>
            <KeyValue label="Expected">{dateOnly(data.expectedDate)}</KeyValue>
            <KeyValue label="Created">{dateTime(data.createdAt)}</KeyValue>
          </dl>

          <DataTable
            rows={data.lines}
            keyFor={(line) => line.id}
            columns={[
              {
                key: "product",
                header: "Product",
                render: (line) => (
                  <div>
                    <p className="text-ink">{line.product.name}</p>
                    <p className="text-[11px] text-muted">{line.product.sku}</p>
                  </div>
                ),
              },
              { key: "qty", header: "Ordered", align: "right", render: (line) => quantity(line.quantity, line.product.unit) },
              {
                key: "received",
                header: "Received",
                align: "right",
                render: (line) => (
                  <span className={line.receivedQuantity >= line.quantity ? "text-ok" : "text-muted"}>
                    {quantity(line.receivedQuantity, line.product.unit)}
                  </span>
                ),
              },
              { key: "price", header: "Unit price", align: "right", render: (line) => money(line.unitPriceKobo) },
              { key: "total", header: "Total", align: "right", render: (line) => money(line.lineTotalKobo) },
            ]}
          />

          {receiving ? (
            <div className="rounded-[12px] border border-line bg-surface-2/50 p-4">
              <p className="text-[12px] font-medium text-ink">Quantities received</p>
              <div className="mt-3 space-y-2">
                {data.lines.map((line) => (
                  <div key={line.id} className="grid items-center gap-2 sm:grid-cols-[1fr_120px]">
                    <span className="text-[12px] text-ink-soft">
                      {line.product.name}{" "}
                      <span className="text-muted">
                        (outstanding {quantity(Math.max(0, line.quantity - line.receivedQuantity), line.product.unit)})
                      </span>
                    </span>
                    <Input
                      value={received[line.id] ?? ""}
                      onChange={(event) => setReceived((current) => ({ ...current, [line.id]: event.target.value }))}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`Received ${line.product.name}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Field label="Receipt notes">
                  <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Waybill number, condition on arrival" />
                </Field>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  loading={action.isPending}
                  onClick={() =>
                    action.mutate({
                      path: "receipts",
                      body: {
                        notes: notes || null,
                        lines: data.lines.map((line) => ({
                          lineId: line.id,
                          quantity: Number.parseFloat(received[line.id] ?? "0") || 0,
                        })),
                      },
                    })
                  }
                >
                  Post receipt
                </Button>
              </div>
            </div>
          ) : null}

          {data.receipts.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Receipts</p>
              <ul className="mt-2 space-y-2">
                {data.receipts.map((receipt) => (
                  <li key={receipt.id} className="rounded-[10px] border border-line px-3 py-2 text-[12px]">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-ink">{receipt.reference}</span>
                      <span className="text-muted">{dateTime(receipt.receivedAt)}</span>
                    </div>
                    <p className="text-muted">
                      {quantity(receipt.totalQuantity)} received by {receipt.receivedBy}
                      {receipt.notes ? ` · ${receipt.notes}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.notes ? <Alert tone="info">{data.notes}</Alert> : null}
          <FormError message={error} />
        </div>
      )}
    </Modal>
  );
}
