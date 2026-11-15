import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Plus } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Alert, Badge, Button, Card, CardHeader, PageHeader, Tabs } from "@/components/ui/primitives";
import { DataTable, Pagination } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, Textarea, useFieldId } from "@/components/ui/form";
import { dateTime, quantity, statusMeta, titleCase } from "@/lib/format";
import type { Inspection, Page, ProductionOrder } from "@/types";

const RESULT_TABS = [
  { value: "", label: "All" },
  { value: "pass", label: "Passed" },
  { value: "conditional", label: "Conditional" },
  { value: "fail", label: "Failed" },
];

const INSPECTION_TYPES = [
  { value: "finished_goods", label: "Finished goods" },
  { value: "incoming_material", label: "Incoming material" },
  { value: "cylinder_certification", label: "Cylinder certification" },
  { value: "safety_audit", label: "Safety audit" },
];

export function Quality() {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const [result, setResult] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const list = useApi<Page<Inspection>>(
    ["inspections", result, page],
    `/inspections${qs({ result, page, pageSize: 20 })}`,
  );
  const queue = useApi<ProductionOrder[]>(["production-orders", "awaiting_quality"], "/production-orders?status=awaiting_quality");

  const [productionOrderId, setProductionOrderId] = useState("");
  const [inspectionType, setInspectionType] = useState("finished_goods");
  const [checked, setChecked] = useState("");
  const [passed, setPassed] = useState("");
  const [failed, setFailed] = useState("");
  const [outcome, setOutcome] = useState<"pass" | "conditional" | "fail">("pass");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const orderField = useFieldId("production-order");
  const typeField = useFieldId("inspection-type");
  const checkedField = useFieldId("checked");
  const passedField = useFieldId("passed");
  const failedField = useFieldId("failed");
  const outcomeField = useFieldId("outcome");
  const notesField = useFieldId("notes");

  const create = useMutation({
    mutationFn: () =>
      api.post("/inspections", {
        productionOrderId: productionOrderId || null,
        inspectionType,
        checkedQuantity: Number.parseFloat(checked) || 0,
        passedQuantity: Number.parseFloat(passed) || 0,
        failedQuantity: Number.parseFloat(failed) || 0,
        result: outcome,
        notes: notes || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inspections"] });
      void queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["production-orders", "awaiting_quality"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setChecked("");
      setPassed("");
      setFailed("");
      setNotes("");
      setProductionOrderId("");
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not record the inspection."),
  });

  function inspect(order: ProductionOrder) {
    setProductionOrderId(order.id);
    const remaining = order.plannedQuantity - order.producedQuantity;
    const target = order.producedQuantity > 0 ? remaining : order.plannedQuantity;
    setChecked(String(target));
    setPassed(String(target));
    setFailed("0");
    setInspectionType("finished_goods");
    setOutcome("pass");
    setNotes("");
    setError(null);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality assurance"
        description="Inspection results gate the release of finished goods. A batch stays in the queue until a result exists."
        actions={
          has("quality:inspect") ? (
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => {
                setProductionOrderId("");
                setChecked("");
                setPassed("");
                setFailed("");
                setNotes("");
                setError(null);
                setOpen(true);
              }}
            >
              Record inspection
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader
          title="Awaiting inspection"
          description="Batches submitted by production that have not yet been released."
        />
        {(queue.data ?? []).length === 0 ? (
          <p className="px-5 py-4 text-[12px] text-muted">Nothing is waiting on quality right now.</p>
        ) : (
          <ul className="divide-y divide-line">
            {(queue.data ?? []).map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">
                    {order.reference} · {order.product.name}
                  </p>
                  <p className="text-[11px] text-muted">
                    {quantity(order.plannedQuantity, order.product.unit)} planned · {order.location.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="warning">Awaiting quality</Badge>
                  {has("quality:inspect") ? (
                    <Button size="sm" variant="secondary" icon={<BadgeCheck className="size-3.5" />} onClick={() => inspect(order)}>
                      Inspect
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs tabs={RESULT_TABS} value={result} onChange={(value) => { setResult(value); setPage(1); }} />
        </div>
        <DataTable
          rows={list.data?.items ?? []}
          keyFor={(row) => row.id}
          loading={list.isLoading}
          emptyTitle="No inspections recorded"
          columns={[
            { key: "reference", header: "Reference", render: (row) => <span className="font-medium text-ink">{row.reference}</span> },
            {
              key: "batch",
              header: "Batch",
              render: (row) => (
                <div>
                  <p className="text-ink">{row.productionOrder?.productName ?? "General inspection"}</p>
                  <p className="text-[11px] text-muted">{row.productionOrder?.reference ?? titleCase(row.inspectionType)}</p>
                </div>
              ),
            },
            {
              key: "quantities",
              header: "Checked",
              align: "right",
              render: (row) => (
                <span className="tabular-nums">
                  {quantity(row.checkedQuantity)}
                  <span className="ml-1 text-[10px] text-ok">{row.passedQuantity} ok</span>
                  {row.failedQuantity > 0 ? <span className="ml-1 text-[10px] text-danger">{row.failedQuantity} failed</span> : null}
                </span>
              ),
            },
            {
              key: "result",
              header: "Result",
              render: (row) => <Badge tone={statusMeta(row.result).tone}>{statusMeta(row.result).label}</Badge>,
            },
            { key: "inspector", header: "Inspector", render: (row) => row.inspector },
            {
              key: "date",
              header: "Inspected",
              align: "right",
              render: (row) => <span className="text-muted">{dateTime(row.inspectedAt)}</span>,
            },
          ]}
        />
        {list.data ? <Pagination meta={list.data.meta} onPage={setPage} /> : null}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record a quality inspection"
        description="A pass or conditional result releases the passed quantity into finished goods stock."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              Record result
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Production batch" htmlFor={orderField} hint="Leave blank for an inspection not tied to a batch.">
            <Select id={orderField} value={productionOrderId} onChange={(event) => setProductionOrderId(event.target.value)}>
              <option value="">Not linked to a batch</option>
              {(queue.data ?? []).map((order) => (
                <option key={order.id} value={order.id}>
                  {order.reference} · {order.product.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inspection type" required htmlFor={typeField}>
              <Select id={typeField} value={inspectionType} onChange={(event) => setInspectionType(event.target.value)}>
                {INSPECTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Result" required htmlFor={outcomeField}>
              <Select id={outcomeField} value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}>
                <option value="pass">Pass</option>
                <option value="conditional">Conditional</option>
                <option value="fail">Fail</option>
              </Select>
            </Field>
            <Field label="Checked quantity" required htmlFor={checkedField}>
              <Input id={checkedField} value={checked} onChange={(event) => setChecked(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Failed quantity" required htmlFor={failedField}>
              <Input id={failedField} value={failed} onChange={(event) => setFailed(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Passed quantity" required htmlFor={passedField}>
              <Input id={passedField} value={passed} onChange={(event) => setPassed(event.target.value)} inputMode="decimal" />
            </Field>
          </div>
          <Field label="Notes" htmlFor={notesField} hint="Record the test performed and the reason for any failure.">
            <Textarea id={notesField} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
          <FormError message={error} />
          <Alert tone="info">
            Conditional results release only the passed quantity; failed units are excluded from stock.
          </Alert>
        </div>
      </Modal>
    </div>
  );
}
