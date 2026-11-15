import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, PackageCheck, Send, Truck, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Alert, Badge, Button, Card, CardHeader, KeyValue, PageHeader, Spinner } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Select, useFieldId } from "@/components/ui/form";
import { DataTable } from "@/components/ui/table";
import { dateTime, money, quantity, statusMeta, titleCase } from "@/lib/format";
import type { OrderDetail as OrderDetailType } from "@/types";

export function OrderDetail() {
  const { id = "" } = useParams();
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const { data: order, isLoading, error } = useApi<OrderDetailType>(["order", id], `/orders/${id}`);
  const reference = useApi<{ transporters: { id: string; name: string }[] }>(
    ["reference"],
    "/reference/options",
    { enabled: has("orders:dispatch") },
  );

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [transporterId, setTransporterId] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const transporterField = useFieldId("transporter");
  const vehicleField = useFieldId("vehicle");
  const driverField = useFieldId("driver");
  const phoneField = useFieldId("phone");
  const destinationField = useFieldId("destination");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["order", id] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => api.post(`/orders/${id}/${path}`, body),
    onSuccess: () => {
      invalidate();
      setDispatchOpen(false);
      setActionError(null);
    },
    onError: (caught) => setActionError(caught instanceof ApiError ? caught.message : "The action failed."),
  });

  if (isLoading) return <Spinner label="Loading order" />;
  if (error || !order) {
    return (
      <Alert tone="critical" title="Order not found">
        {(error as Error)?.message ?? "This order may belong to another organisation."}
      </Alert>
    );
  }

  const status = statusMeta(order.status);
  const canApprove = has("orders:approve");
  const canDispatch = has("orders:dispatch");
  const canCreate = has("orders:create");

  const actions = [
    order.status === "draft" && canCreate
      ? { label: "Submit for approval", path: "submit", icon: <Send className="size-4" />, variant: "primary" as const }
      : null,
    order.status === "pending_approval" && canApprove
      ? { label: "Approve", path: "approve", icon: <CheckCircle2 className="size-4" />, variant: "primary" as const }
      : null,
    order.status === "approved" && canApprove
      ? { label: "Allocate stock", path: "allocate", icon: <PackageCheck className="size-4" />, variant: "primary" as const }
      : null,
    order.status === "allocated" && canDispatch
      ? { label: "Dispatch", path: "dispatch", icon: <Truck className="size-4" />, variant: "primary" as const }
      : null,
    ["draft", "pending_approval", "approved"].includes(order.status) && canCreate
      ? { label: "Cancel order", path: "cancel", icon: <XCircle className="size-4" />, variant: "danger" as const }
      : null,
  ].filter(Boolean) as { label: string; path: string; icon: React.ReactNode; variant: "primary" | "danger" }[];

  return (
    <div className="space-y-6">
      <Link to="/portal/orders" className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> All orders
      </Link>

      <PageHeader
        eyebrow={order.reference}
        title={order.customer.name}
        description={`${titleCase(order.channel)} channel · supplied from ${order.location.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {actions.map((entry) =>
              entry.path === "dispatch" ? (
                <Button key={entry.path} icon={entry.icon} onClick={() => setDispatchOpen(true)}>
                  {entry.label}
                </Button>
              ) : (
                <Button
                  key={entry.path}
                  variant={entry.variant}
                  icon={entry.icon}
                  loading={action.isPending && action.variables?.path === entry.path}
                  onClick={() => action.mutate({ path: entry.path })}
                >
                  {entry.label}
                </Button>
              ),
            )}
          </div>
        }
      />

      {actionError ? <Alert tone="critical">{actionError}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Order lines" description={`${order.lineCount} line${order.lineCount === 1 ? "" : "s"}`} />
          <DataTable
            rows={order.lines}
            keyFor={(line) => line.id}
            columns={[
              {
                key: "product",
                header: "Product",
                render: (line) => (
                  <div>
                    <p className="text-ink">{line.product.name}</p>
                    <p className="text-[11px] text-muted">
                      {line.product.sku} · {titleCase(line.product.category)}
                    </p>
                  </div>
                ),
              },
              {
                key: "quantity",
                header: "Quantity",
                align: "right",
                render: (line) => <span className="tabular-nums">{quantity(line.quantity, line.product.unit)}</span>,
              },
              {
                key: "allocated",
                header: "Allocated",
                align: "right",
                render: (line) => (
                  <span className={line.allocatedQuantity >= line.quantity ? "tabular-nums text-ok" : "tabular-nums text-muted"}>
                    {quantity(line.allocatedQuantity, line.product.unit)}
                  </span>
                ),
              },
              {
                key: "price",
                header: "Unit price",
                align: "right",
                render: (line) => <span className="tabular-nums text-muted">{money(line.unitPriceKobo)}</span>,
              },
              {
                key: "total",
                header: "Line total",
                align: "right",
                render: (line) => <span className="tabular-nums font-medium">{money(line.lineTotalKobo)}</span>,
              },
            ]}
          />
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <span className="text-[12px] text-muted">Order total</span>
            <span className="text-base font-semibold tabular-nums text-ink">{money(order.totalKobo)}</span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Order details" />
            <dl className="divide-y divide-line px-5 py-2">
              <KeyValue label="Reference">{order.reference}</KeyValue>
              <KeyValue label="Raised by">{order.createdBy.name}</KeyValue>
              <KeyValue label="Raised">{dateTime(order.createdAt)}</KeyValue>
              <KeyValue label="Requested delivery">{dateTime(order.requestedDeliveryDate)}</KeyValue>
              <KeyValue label="Contact">{order.contactPhone ?? "—"}</KeyValue>
              <KeyValue label="Delivery address">{order.deliveryAddress ?? "—"}</KeyValue>
            </dl>
            {order.notes ? (
              <div className="border-t border-line px-5 py-3">
                <p className="text-[11px] tracking-wide text-muted uppercase">Notes</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{order.notes}</p>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Shipments" description={`${order.shipments.length} record${order.shipments.length === 1 ? "" : "s"}`} />
            {order.shipments.length === 0 ? (
              <p className="px-5 py-4 text-[12px] text-muted">Nothing has left the terminal for this order yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {order.shipments.map((shipment) => (
                  <li key={shipment.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link to="/portal/logistics" className="text-[13px] font-medium text-brand hover:underline">
                        {shipment.reference}
                      </Link>
                      <Badge tone={statusMeta(shipment.status).tone}>{statusMeta(shipment.status).label}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {shipment.vehiclePlate ?? "No vehicle"} · {shipment.driverName ?? "No driver"} ·{" "}
                      {shipment.transporter ?? "Unassigned transporter"}
                    </p>
                    <p className="text-[11px] text-muted">
                      Dispatched {dateTime(shipment.dispatchedAt)} · Delivered {dateTime(shipment.deliveredAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Invoices" />
            {order.invoices.length === 0 ? (
              <p className="px-5 py-4 text-[12px] text-muted">An invoice is raised when delivery is confirmed.</p>
            ) : (
              <ul className="divide-y divide-line">
                {order.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div>
                      <Link to="/portal/finance" className="text-[13px] font-medium text-brand hover:underline">
                        {invoice.reference}
                      </Link>
                      <p className="text-[11px] text-muted">
                        Issued {dateTime(invoice.issuedAt)} · Due {dateTime(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-medium tabular-nums text-ink">{money(invoice.amountKobo)}</p>
                      <Badge tone={statusMeta(invoice.status).tone}>{statusMeta(invoice.status).label}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        title="Dispatch order"
        description="Loading a shipment moves the allocated stock out of the selected location."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDispatchOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={action.isPending}
              onClick={() =>
                action.mutate({
                  path: "dispatch",
                  body: {
                    transporterId: transporterId || null,
                    vehiclePlate: vehiclePlate || null,
                    driverName: driverName || null,
                    driverPhone: driverPhone || null,
                    destination: destination || null,
                  },
                })
              }
            >
              Dispatch
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Transporter" htmlFor={transporterField}>
            <Select id={transporterField} value={transporterId} onChange={(event) => setTransporterId(event.target.value)}>
              <option value="">Unassigned</option>
              {(reference.data?.transporters ?? []).map((transporter) => (
                <option key={transporter.id} value={transporter.id}>
                  {transporter.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vehicle plate" htmlFor={vehicleField}>
            <Select id={vehicleField} value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)}>
              <option value="">Select</option>
              {["RIV-421-AA", "RIV-883-KJ", "LAG-620-XA", "ABJ-119-KM"].map((plate) => (
                <option key={plate} value={plate}>
                  {plate}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Driver name" htmlFor={driverField}>
            <input
              id={driverField}
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              className="w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-ink"
            />
          </Field>
          <Field label="Driver phone" htmlFor={phoneField}>
            <input
              id={phoneField}
              value={driverPhone}
              onChange={(event) => setDriverPhone(event.target.value)}
              className="w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-ink"
            />
          </Field>
          <Field label="Destination" htmlFor={destinationField} className="sm:col-span-2">
            <input
              id={destinationField}
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder={order.deliveryAddress ?? order.customer.name}
              className="w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-ink"
            />
          </Field>
          <div className="sm:col-span-2">
            <FormError message={actionError} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
