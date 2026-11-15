import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Truck, XCircle } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi, useReference } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Alert, Badge, Button, Card, CardHeader, KeyValue, PageHeader, Spinner, Tabs } from "@/components/ui/primitives";
import { DataTable, Pagination, TableToolbar } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, Textarea, useFieldId } from "@/components/ui/form";
import { dateTime, quantity, statusMeta, titleCase } from "@/lib/format";
import type { Page, Shipment } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "in_transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
];

export function Logistics() {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [failId, setFailId] = useState<string | null>(null);

  const list = useApi<Page<Shipment>>(
    ["shipments", status, search, page],
    `/shipments${qs({ status, search, page, pageSize: 20 })}`,
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["shipments"] });
    void queryClient.invalidateQueries({ queryKey: ["shipment"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistics"
        description="Shipments in transit, vehicle and driver assignment, and delivery confirmation at destination."
      />

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs tabs={TABS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
        </div>
        <TableToolbar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} placeholder="Search reference, customer or plate">
          <span className="text-[11px] text-muted">{list.data?.meta.total ?? 0} shipments</span>
        </TableToolbar>
        <DataTable
          rows={list.data?.items ?? []}
          keyFor={(row) => row.id}
          loading={list.isLoading}
          emptyTitle="No shipments match this filter"
          columns={[
            {
              key: "reference",
              header: "Shipment",
              render: (row) => (
                <button type="button" onClick={() => setDetailId(row.id)} className="font-medium text-brand hover:underline">
                  {row.reference}
                </button>
              ),
            },
            {
              key: "order",
              header: "Order",
              render: (row) => (
                <div>
                  <p className="text-ink">{row.customer}</p>
                  <p className="text-[11px] text-muted">{row.order.reference}</p>
                </div>
              ),
            },
            {
              key: "vehicle",
              header: "Vehicle",
              render: (row) => (
                <div>
                  <p className="text-ink">{row.vehiclePlate ?? "Unassigned"}</p>
                  <p className="text-[11px] text-muted">{row.transporter?.name ?? "No transporter"}</p>
                </div>
              ),
            },
            {
              key: "destination",
              header: "Destination",
              render: (row) => (
                <span className="flex items-center gap-1 text-muted">
                  <MapPin className="size-3" /> {row.destination}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Badge>,
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (row) => (
                <div className="flex justify-end gap-1">
                  {row.status === "in_transit" && has("deliveries:confirm") ? (
                    <Button
                      size="sm"
                      variant="subtle"
                      icon={<CheckCircle2 className="size-3.5" />}
                      onClick={() => confirmDelivery(row.id, invalidate)}
                    >
                      Delivered
                    </Button>
                  ) : null}
                  {row.status === "in_transit" && has("logistics:manage") ? (
                    <Button size="sm" variant="ghost" icon={<Truck className="size-3.5" />} onClick={() => setAssignId(row.id)}>
                      Assign
                    </Button>
                  ) : null}
                  {row.status === "in_transit" && has("logistics:manage") ? (
                    <Button size="sm" variant="ghost" icon={<XCircle className="size-3.5" />} onClick={() => setFailId(row.id)}>
                      Fail
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
        {list.data ? <Pagination meta={list.data.meta} onPage={setPage} /> : null}
      </Card>

      {detailId ? <ShipmentDetail id={detailId} onClose={() => setDetailId(null)} onChanged={invalidate} /> : null}
      {assignId ? <AssignModal id={assignId} onClose={() => setAssignId(null)} onChanged={invalidate} /> : null}
      {failId ? <FailModal id={failId} onClose={() => setFailId(null)} onChanged={invalidate} /> : null}
    </div>
  );
}

async function confirmDelivery(id: string, onChanged: () => void) {
  try {
    await api.post(`/shipments/${id}/confirm-delivery`, { notes: null });
    onChanged();
  } catch (error) {
    window.alert(error instanceof ApiError ? error.message : "Could not confirm delivery.");
  }
}

function ShipmentDetail({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data, isLoading } = useApi<Shipment>(["shipment", id], `/shipments/${id}`);

  return (
    <Modal open onClose={onClose} title={data?.reference ?? "Shipment"} description={data ? `${data.order.reference} · ${data.customer}` : undefined} size="lg">
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <KeyValue label="Status">
              <Badge tone={statusMeta(data.status).tone}>{statusMeta(data.status).label}</Badge>
            </KeyValue>
            <KeyValue label="Destination">{data.destination}</KeyValue>
            <KeyValue label="Transporter">{data.transporter?.name ?? "Unassigned"}</KeyValue>
            <KeyValue label="Vehicle">{data.vehiclePlate ?? "—"}</KeyValue>
            <KeyValue label="Driver">{data.driverName ?? "—"}</KeyValue>
            <KeyValue label="Driver phone">{data.driverPhone ?? "—"}</KeyValue>
            <KeyValue label="Dispatched">{dateTime(data.dispatchedAt)}</KeyValue>
            <KeyValue label="Delivered">{dateTime(data.deliveredAt)}</KeyValue>
          </dl>

          <Card>
            <CardHeader title="Cargo" description={`Loaded from ${data.location}`} />
            {data.cargo && data.cargo.length > 0 ? (
              <ul className="divide-y divide-line">
                {data.cargo.map((line) => (
                  <li key={line.sku} className="flex justify-between px-5 py-2 text-[12px]">
                    <span className="text-ink-soft">{line.name}</span>
                    <span className="tabular-nums text-muted">{quantity(line.quantity, line.unit)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-[12px] text-muted">No cargo lines recorded.</p>
            )}
          </Card>

          {data.deliveryNotes ? <Alert tone="info">{data.deliveryNotes}</Alert> : null}

          {data.status === "in_transit" ? (
            <div className="flex justify-end">
              <Button
                icon={<CheckCircle2 className="size-4" />}
                onClick={() => {
                  void confirmDelivery(data.id, onChanged);
                  onClose();
                }}
              >
                Confirm delivery
              </Button>
            </div>
          ) : null}
          <p className="text-[11px] text-muted">{titleCase(data.status)} shipments remain visible for reporting after delivery.</p>
        </div>
      )}
    </Modal>
  );
}

function AssignModal({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const reference = useReference();
  const [transporterId, setTransporterId] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const transporterField = useFieldId("transporter");
  const vehicleField = useFieldId("vehicle");
  const driverField = useFieldId("driver");
  const phoneField = useFieldId("phone");

  const assign = useMutation({
    mutationFn: () =>
      api.patch(`/shipments/${id}`, {
        transporterId: transporterId || null,
        vehiclePlate: vehiclePlate || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
      }),
    onSuccess: () => {
      onChanged();
      onClose();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not update the shipment."),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Assign vehicle and driver"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={assign.isPending} onClick={() => assign.mutate()}>
            Save assignment
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
          <Input id={vehicleField} value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)} />
        </Field>
        <Field label="Driver name" htmlFor={driverField}>
          <Input id={driverField} value={driverName} onChange={(event) => setDriverName(event.target.value)} />
        </Field>
        <Field label="Driver phone" htmlFor={phoneField}>
          <Input id={phoneField} value={driverPhone} onChange={(event) => setDriverPhone(event.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </div>
    </Modal>
  );
}

function FailModal({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const noteField = useFieldId("fail-note");

  const fail = useMutation({
    mutationFn: () => api.post(`/shipments/${id}/fail`, { note }),
    onSuccess: () => {
      onChanged();
      onClose();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not update the shipment."),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Mark shipment as failed"
      description="The order returns to an allocated state if the delivery did not happen."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={fail.isPending} onClick={() => fail.mutate()}>
            Mark failed
          </Button>
        </div>
      }
    >
      <Field label="What happened?" required htmlFor={noteField}>
        <Textarea id={noteField} value={note} onChange={(event) => setNote(event.target.value)} rows={4} minLength={5} />
      </Field>
      <div className="mt-3">
        <FormError message={error} />
      </div>
    </Modal>
  );
}
