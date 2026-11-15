import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldAlert } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi, useReference } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Badge, Button, Card, CardHeader, PageHeader, StatCard, Tabs } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Select, Textarea, useFieldId } from "@/components/ui/form";
import { dateTime, statusMeta, titleCase } from "@/lib/format";
import type { HsePayload, Incident } from "@/types";

const TABS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "closed", label: "Closed" },
];

const CATEGORIES = ["near_miss", "first_aid", "equipment_failure", "spill", "fire", "vehicle", "security", "other"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export function Hse() {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);

  const { data, isLoading } = useApi<HsePayload>(["incidents", status], `/incidents${qs({ status })}`);
  const reference = useReference();

  const [locationId, setLocationId] = useState("");
  const [category, setCategory] = useState("near_miss");
  const [severity, setSeverity] = useState("low");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const locationField = useFieldId("incident-location");
  const categoryField = useFieldId("incident-category");
  const severityField = useFieldId("incident-severity");
  const descriptionField = useFieldId("incident-description");

  const report = useMutation({
    mutationFn: () =>
      api.post("/incidents", {
        locationId,
        category,
        severity,
        description,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setDescription("");
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not report the incident."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health, safety & environment"
        description="Incidents stay visible until a corrective action is recorded and the case is closed."
        actions={
          has("hse:report") ? (
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => {
                setLocationId(reference.data?.locations[0]?.id ?? "");
                setOpen(true);
              }}
            >
              Report incident
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={data?.summary.open ?? 0} tone={(data?.summary.open ?? 0) > 0 ? "warning" : "success"} />
        <StatCard label="Investigating" value={data?.summary.investigating ?? 0} />
        <StatCard label="Closed" value={data?.summary.closed ?? 0} tone="success" />
        <StatCard label="Reported this month" value={data?.summary.thisMonth ?? 0} />
      </div>

      <Card>
        <div className="border-b border-line px-4 py-3">
          <Tabs tabs={TABS} value={status} onChange={setStatus} />
        </div>
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Loading incidents…</p>
        ) : (data?.incidents ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No incidents match this filter.</p>
        ) : (
          <ul className="divide-y divide-line">
            {(data?.incidents ?? []).map((incident) => (
              <li key={incident.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      className={`mt-0.5 size-4 ${["high", "critical"].includes(incident.severity) ? "text-danger" : "text-warn"}`}
                      aria-hidden
                    />
                    <div>
                      <p className="text-[13px] font-medium text-ink">
                        {incident.reference} · {titleCase(incident.category)}
                      </p>
                      <p className="text-[11px] text-muted">
                        {incident.location} · reported by {incident.reportedBy} · {dateTime(incident.occurredAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusMeta(incident.severity).tone}>{statusMeta(incident.severity).label}</Badge>
                    <Badge tone={statusMeta(incident.status).tone}>{statusMeta(incident.status).label}</Badge>
                    {has("hse:manage") ? (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(incident)}>
                        Update
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{incident.description}</p>
                {incident.correctiveAction ? (
                  <p className="mt-1.5 rounded-[8px] border border-line bg-surface-2/60 px-3 py-2 text-[11px] text-muted">
                    Corrective action: {incident.correctiveAction}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Open incidents by severity" />
        {data && data.summary.bySeverity.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.summary.bySeverity.map((entry) => (
              <li key={entry.severity} className="flex items-center justify-between px-5 py-2.5 text-[12px]">
                <span className="text-ink-soft">{titleCase(entry.severity)}</span>
                <span className="tabular-nums text-muted">{entry.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-[12px] text-muted">No open incidents.</p>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report an HSE incident"
        description="Reporting creates a permanent record and notifies the HSE officer."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={report.isPending} onClick={() => report.mutate()}>
              Submit report
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Location" required htmlFor={locationField}>
              <Select id={locationField} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">Select a location</option>
                {(reference.data?.locations ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category" required htmlFor={categoryField}>
              <Select id={categoryField} value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {titleCase(entry)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Severity" required htmlFor={severityField}>
              <Select id={severityField} value={severity} onChange={(event) => setSeverity(event.target.value)}>
                {SEVERITIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {titleCase(entry)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="What happened?" required htmlFor={descriptionField} hint="At least 10 characters. Facts only, no assumptions about cause.">
            <Textarea id={descriptionField} value={description} onChange={(event) => setDescription(event.target.value)} rows={5} />
          </Field>
          <FormError message={error} />
        </div>
      </Modal>

      {editing ? (
        <UpdateIncidentModal
          incident={editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            void queryClient.invalidateQueries({ queryKey: ["incidents"] });
            void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      ) : null}
    </div>
  );
}

function UpdateIncidentModal({
  incident,
  onClose,
  onChanged,
}: {
  incident: Incident;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState(incident.status);
  const [correctiveAction, setCorrectiveAction] = useState(incident.correctiveAction ?? "");
  const [error, setError] = useState<string | null>(null);
  const statusField = useFieldId("status");
  const actionField = useFieldId("action");

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/incidents/${incident.id}`, {
        status,
        correctiveAction: correctiveAction || null,
      }),
    onSuccess: () => {
      onChanged();
      onClose();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not update the incident."),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`${incident.reference} · ${titleCase(incident.category)}`}
      description={incident.location}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={update.isPending} onClick={() => update.mutate()}>
            Save update
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="rounded-[10px] border border-line bg-surface-2/60 px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
          {incident.description}
        </p>
        <Field label="Status" required htmlFor={statusField}>
          <Select id={statusField} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Field label="Corrective action" htmlFor={actionField} hint="Required before an incident is closed in practice.">
          <Textarea id={actionField} value={correctiveAction} onChange={(event) => setCorrectiveAction(event.target.value)} rows={4} />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}
