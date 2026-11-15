import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Play, Plus, Send, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApi, useReference } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Alert, Badge, Button, Card, CardHeader, KeyValue, PageHeader, Tabs } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, useFieldId } from "@/components/ui/form";
import { dateOnly, dateTime, quantity, statusMeta, titleCase } from "@/lib/format";
import type { ProductionOrder } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_quality", label: "Awaiting quality" },
  { value: "completed", label: "Completed" },
];

interface BomEntry {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  components: { sku: string; name: string; unit: string; quantityPerUnit: number }[];
}

export function Manufacturing() {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const list = useApi<ProductionOrder[]>(["production-orders", status], `/production-orders${status ? `?status=${status}` : ""}`);
  const bom = useApi<BomEntry[]>(["bill-of-materials"], "/bill-of-materials");
  const reference = useReference();

  const [type, setType] = useState<"cylinder_manufacture" | "lpg_filling">("cylinder_manufacture");
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [planned, setPlanned] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const typeField = useFieldId("type");
  const productField = useFieldId("product");
  const locationField = useFieldId("location");
  const plannedField = useFieldId("planned");
  const dueField = useFieldId("due");

  const products = (reference.data?.products ?? []).filter((product) =>
    type === "cylinder_manufacture" ? product.category === "cylinder" : product.category === "cylinder",
  );
  const makeable = (bom.data ?? []).map((entry) => entry.productId);

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/production-orders", {
        type,
        productId,
        locationId,
        plannedQuantity: Number.parseFloat(planned),
        dueDate: dueDate || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      setCreateOpen(false);
      setPlanned("");
      setProductId("");
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not create the production order."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing"
        description="Cylinder batches and LPG filling runs, from plan through component consumption to quality release."
        actions={
          has("manufacturing:create") ? (
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => {
                setLocationId(reference.data?.locations.find((location) => location.type === "plant")?.id ?? reference.data?.locations[0]?.id ?? "");
                setCreateOpen(true);
              }}
            >
              New production order
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs tabs={TABS} value={status} onChange={setStatus} />
        </div>
        <DataTable
          rows={list.data ?? []}
          keyFor={(row) => row.id}
          loading={list.isLoading}
          emptyTitle="No production orders match this filter"
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
            {
              key: "product",
              header: "Output",
              render: (row) => (
                <div>
                  <p className="text-ink">{row.product.name}</p>
                  <p className="text-[11px] text-muted">{titleCase(row.type)} · {row.location.name}</p>
                </div>
              ),
            },
            {
              key: "planned",
              header: "Planned",
              align: "right",
              render: (row) => <span className="tabular-nums">{quantity(row.plannedQuantity, row.product.unit)}</span>,
            },
            {
              key: "produced",
              header: "Produced",
              align: "right",
              render: (row) => <span className="tabular-nums text-muted">{quantity(row.producedQuantity, row.product.unit)}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Badge>,
            },
            { key: "due", header: "Due", render: (row) => <span className="text-muted">{dateOnly(row.dueDate)}</span> },
          ]}
        />
      </Card>

      <Card>
        <CardHeader
          title="Bill of materials"
          description="Components consumed per finished unit when a batch starts."
        />
        <div className="grid gap-px bg-line md:grid-cols-2">
          {(bom.data ?? []).map((entry) => (
            <div key={entry.productId} className="bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">{entry.name}</p>
                <span className="text-[10px] text-muted">{entry.sku}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {entry.components.map((component) => (
                  <li key={component.sku} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-ink-soft">{component.name}</span>
                    <span className="tabular-nums text-muted">
                      {quantity(component.quantityPerUnit, component.unit)} / {entry.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {bom.data && bom.data.length === 0 ? (
            <p className="bg-surface px-5 py-6 text-[12px] text-muted">No bill of materials has been configured.</p>
          ) : null}
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New production order"
        description="Components are consumed when the batch is started."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              Create order
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Production type" required htmlFor={typeField}>
              <Select id={typeField} value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                <option value="cylinder_manufacture">Cylinder manufacture</option>
                <option value="lpg_filling">LPG filling</option>
              </Select>
            </Field>
            <Field label="Output product" required htmlFor={productField}>
              <Select id={productField} value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {makeable.includes(product.id) ? "" : " (no BOM)"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Plant" required htmlFor={locationField}>
              <Select id={locationField} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">Select a location</option>
                {(reference.data?.locations ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Planned quantity" required htmlFor={plannedField}>
              <Input id={plannedField} value={planned} onChange={(event) => setPlanned(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Due date" htmlFor={dueField}>
              <Input id={dueField} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
          </div>
          <FormError message={error} />
        </div>
      </Modal>

      {detailId ? <ProductionDetail id={detailId} onClose={() => setDetailId(null)} /> : null}
    </div>
  );
}

function ProductionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useApi<ProductionOrder>(["production-order", id], `/production-orders/${id}`);
  const [error, setError] = useState<string | null>(null);

  const action = useMutation({
    mutationFn: (path: string) => api.post(`/production-orders/${id}/${path}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["production-order", id] });
      void queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "The action failed."),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={data?.reference ?? "Production order"}
      description={data ? `${data.product.name} · ${data.location.name}` : undefined}
      size="lg"
      footer={
        data ? (
          <div className="flex flex-wrap justify-end gap-2">
            {data.status === "planned" && has("manufacturing:operate") ? (
              <Button icon={<Play className="size-4" />} loading={action.isPending} onClick={() => action.mutate("start")}>
                Start batch
              </Button>
            ) : null}
            {data.status === "in_progress" && has("manufacturing:operate") ? (
              <Button icon={<Send className="size-4" />} loading={action.isPending} onClick={() => action.mutate("submit-for-quality")}>
                Submit for quality
              </Button>
            ) : null}
            {["planned", "in_progress"].includes(data.status) && has("manufacturing:operate") ? (
              <Button variant="danger" icon={<XCircle className="size-4" />} loading={action.isPending} onClick={() => action.mutate("cancel")}>
                Cancel
              </Button>
            ) : null}
            {data.status === "awaiting_quality" ? (
              <span className="flex items-center gap-1 text-[12px] text-warn">
                Awaiting inspection <ArrowRight className="size-3.5" />
              </span>
            ) : null}
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
            <KeyValue label="Planned">{quantity(data.plannedQuantity, data.product.unit)}</KeyValue>
            <KeyValue label="Produced">{quantity(data.producedQuantity, data.product.unit)}</KeyValue>
            <KeyValue label="Outstanding">{quantity(data.outstandingQuantity, data.product.unit)}</KeyValue>
            <KeyValue label="Started">{dateTime(data.startedAt)}</KeyValue>
            <KeyValue label="Completed">{dateTime(data.completedAt)}</KeyValue>
            <KeyValue label="Created by">{data.createdBy}</KeyValue>
            <KeyValue label="Due">{dateOnly(data.dueDate)}</KeyValue>
          </dl>

          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Components consumed</p>
            {data.consumptions && data.consumptions.length > 0 ? (
              <ul className="mt-2 divide-y divide-line rounded-[10px] border border-line">
                {data.consumptions.map((consumption) => (
                  <li key={consumption.componentProductId} className="flex justify-between px-3 py-2 text-[12px]">
                    <span className="text-ink-soft">{consumption.name}</span>
                    <span className="tabular-nums text-muted">{quantity(consumption.quantity, consumption.unit)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-muted">Consumption is posted when the batch starts.</p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Inspections</p>
            {data.inspections && data.inspections.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {data.inspections.map((inspection) => (
                  <li key={inspection.id} className="rounded-[10px] border border-line px-3 py-2 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{inspection.reference}</span>
                      <Badge tone={statusMeta(inspection.result).tone}>{statusMeta(inspection.result).label}</Badge>
                    </div>
                    <p className="mt-1 text-muted">
                      {quantity(inspection.passedQuantity)} passed · {quantity(inspection.failedQuantity)} failed ·{" "}
                      {inspection.inspector} · {dateTime(inspection.inspectedAt)}
                    </p>
                    {inspection.notes ? <p className="mt-1 text-ink-soft">{inspection.notes}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-muted">No inspection recorded for this batch.</p>
            )}
          </div>

          {error ? <Alert tone="critical">{error}</Alert> : null}
        </div>
      )}
    </Modal>
  );
}
