import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi, useReference } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Badge, Button, Card, PageHeader, Tabs } from "@/components/ui/primitives";
import { DataTable, Pagination, TableToolbar } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, Textarea, useFieldId } from "@/components/ui/form";
import { dateOnly, money, moneyFromInput, quantity, statusMeta, titleCase } from "@/lib/format";
import type { Order, Page } from "@/types";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "allocated", label: "Allocated" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
];

interface LineDraft {
  productId: string;
  quantity: string;
  unitPrice: string;
}

const emptyLine = (): LineDraft => ({ productId: "", quantity: "", unitPrice: "" });

export function Orders() {
  const { has, scopedToParty, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const list = useApi<Page<Order>>(["orders", status, search, page], `/orders${qs({ status, search, page, pageSize: 20 })}`);
  const reference = useReference();

  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [submitForApproval, setSubmitForApproval] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ids = {
    customer: useFieldId("customer"),
    location: useFieldId("location"),
    date: useFieldId("date"),
    address: useFieldId("address"),
    phone: useFieldId("phone"),
    notes: useFieldId("notes"),
  };

  const products = reference.data?.products ?? [];
  const customers = reference.data?.customers ?? [];

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const value = Number.parseFloat(line.quantity || "0");
        return sum + (Number.isFinite(value) ? value : 0) * moneyFromInput(line.unitPrice);
      }, 0),
    [lines],
  );

  const create = useMutation({
    mutationFn: async () => {
      const created = await api.post<{ id: string }>("/orders", {
        customerId: scopedToParty ? undefined : customerId || undefined,
        locationId,
        requestedDeliveryDate: deliveryDate || null,
        deliveryAddress: deliveryAddress || null,
        contactPhone: contactPhone || null,
        notes: notes || null,
        lines: lines
          .filter((line) => line.productId && Number.parseFloat(line.quantity) > 0)
          .map((line) => ({
            productId: line.productId,
            quantity: Number.parseFloat(line.quantity),
            unitPriceKobo: moneyFromInput(line.unitPrice),
          })),
      });
      if (submitForApproval) await api.post(`/orders/${created.id}/submit`);
      return created;
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOpen(false);
      resetForm();
      navigate(`/portal/orders/${created.id}`);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not create the order."),
  });

  function resetForm() {
    setCustomerId("");
    setLocationId(reference.data?.locations[0]?.id ?? "");
    setDeliveryDate("");
    setDeliveryAddress("");
    setContactPhone("");
    setNotes("");
    setLines([emptyLine()]);
    setError(null);
  }

  function openCreate() {
    resetForm();
    if (!locationId) setLocationId(reference.data?.locations[0]?.id ?? "");
    if (customers.length === 1) setCustomerId(customers[0]!.id);
    if (scopedToParty && user?.partyId) setCustomerId(user.partyId);
    setOpen(true);
  }

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

  const canCreate = has("orders:create");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales orders"
        description="Raise, approve, allocate and track customer orders through to delivery and invoice."
        actions={
          canCreate ? (
            <Button icon={<Plus className="size-4" />} onClick={openCreate}>
              New order
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs tabs={STATUS_TABS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
        </div>
        <TableToolbar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} placeholder="Search reference or customer">
          <span className="text-[11px] text-muted">{list.data?.meta.total ?? 0} orders</span>
        </TableToolbar>
        <DataTable
          rows={list.data?.items ?? []}
          keyFor={(row) => row.id}
          loading={list.isLoading}
          emptyTitle="No orders match this filter"
          emptyDescription="Adjust the filters or raise a new order."
          columns={[
            {
              key: "reference",
              header: "Reference",
              render: (row) => (
                <Link to={`/portal/orders/${row.id}`} className="font-medium text-brand hover:underline">
                  {row.reference}
                </Link>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              render: (row) => (
                <div>
                  <p className="text-ink">{row.customer.name}</p>
                  <p className="text-[11px] text-muted">{titleCase(row.channel)} channel</p>
                </div>
              ),
            },
            { key: "location", header: "Supply point", render: (row) => row.location.name },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Badge>,
            },
            {
              key: "delivery",
              header: "Requested",
              render: (row) => <span className="text-muted">{dateOnly(row.requestedDeliveryDate)}</span>,
            },
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
        open={open}
        onClose={() => setOpen(false)}
        title="Raise a sales order"
        description="Stock is reserved at allocation, not at order entry."
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              Order value <span className="font-semibold text-ink">{money(total)}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button loading={create.isPending} onClick={() => create.mutate()}>
                {submitForApproval ? "Create & submit" : "Save draft"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" required htmlFor={ids.customer}>
              <Select
                id={ids.customer}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                disabled={scopedToParty}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {titleCase(customer.type)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Supply from" required htmlFor={ids.location}>
              <Select id={ids.location} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">Select a location</option>
                {(reference.data?.locations ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Requested delivery date" htmlFor={ids.date}>
              <Input id={ids.date} type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
            </Field>
            <Field label="Contact phone" htmlFor={ids.phone}>
              <Input id={ids.phone} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
            </Field>
          </div>
          <Field label="Delivery address" htmlFor={ids.address}>
            <Input id={ids.address} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Street, city, state" />
          </Field>

          <div className="rounded-[12px] border border-line">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <p className="text-[12px] font-medium text-ink">Lines</p>
              <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setLines((current) => [...current, emptyLine()])}>
                Add line
              </Button>
            </div>
            <div className="space-y-3 p-3">
              {lines.map((line, index) => {
                const product = products.find((entry) => entry.id === line.productId);
                return (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_100px_130px_36px]">
                    <Select value={line.productId} onChange={(event) => updateLine(index, { productId: event.target.value })} aria-label="Product">
                      <option value="">Select product</option>
                      {products.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} ({entry.unit})
                        </option>
                      ))}
                    </Select>
                    <Input
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                      inputMode="decimal"
                      placeholder={product ? `Qty (${product.unit})` : "Qty"}
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
                );
              })}
              {lines.some((line) => line.productId) ? (
                <p className="text-[11px] text-muted">
                  {lines
                    .filter((line) => line.productId)
                    .map((line) => {
                      const product = products.find((entry) => entry.id === line.productId);
                      return product ? `${quantity(Number(line.quantity || 0), product.unit)} ${product.name}` : "";
                    })
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          </div>

          <Field label="Internal notes" htmlFor={ids.notes}>
            <Textarea id={ids.notes} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
          </Field>

          <label className="flex items-center gap-2 text-[12px] text-ink-soft">
            <input
              type="checkbox"
              checked={submitForApproval}
              onChange={(event) => setSubmitForApproval(event.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Submit for approval immediately
          </label>

          <FormError message={error} />
        </div>
      </Modal>
    </div>
  );
}
