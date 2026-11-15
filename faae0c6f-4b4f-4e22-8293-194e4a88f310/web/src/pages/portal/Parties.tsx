import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, ApiError, qs } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Badge, Button, Card, PageHeader } from "@/components/ui/primitives";
import { DataTable, TableToolbar } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, Textarea, useFieldId } from "@/components/ui/form";
import { money, moneyFromInput, statusMeta, titleCase } from "@/lib/format";
import type { Party } from "@/types";

const PARTY_TYPES = ["distributor", "retailer", "customer", "supplier", "transporter", "partner"] as const;

function PartiesPage({
  scope,
  title,
  description,
  types,
}: {
  scope: "customers" | "suppliers";
  title: string;
  description: string;
  types: string[];
}) {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [type] = useState("");
  const [open, setOpen] = useState(false);

  const list = useApi<Party[]>(["parties", scope, search, type], `/parties${qs({ search, type })}`);
  const canManage = has(`${scope}:manage`);

  const [form, setForm] = useState({
    name: "",
    type: types[0] ?? "customer",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    tin: "",
    creditLimit: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const ids = {
    name: useFieldId("party-name"),
    type: useFieldId("party-type"),
    contact: useFieldId("party-contact"),
    email: useFieldId("party-email"),
    phone: useFieldId("party-phone"),
    address: useFieldId("party-address"),
    city: useFieldId("party-city"),
    state: useFieldId("party-state"),
    tin: useFieldId("party-tin"),
    credit: useFieldId("party-credit"),
    notes: useFieldId("party-notes"),
  };

  const rows = useMemo(
    () => (list.data ?? []).filter((party) => types.includes(party.type)),
    [list.data, types],
  );

  const create = useMutation({
    mutationFn: () =>
      api.post("/parties", {
        name: form.name,
        type: form.type,
        contactName: form.contactName || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        tin: form.tin || null,
        creditLimitKobo: form.creditLimit ? moneyFromInput(form.creditLimit) : 0,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["parties"] });
      setOpen(false);
      setForm({ ...form, name: "", contactName: "", email: "", phone: "", address: "", city: "", state: "", tin: "", creditLimit: "", notes: "" });
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not create the record."),
  });

  const update = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          canManage ? (
            <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
              Add {scope === "customers" ? "customer" : "supplier"}
            </Button>
          ) : null
        }
      />

      <Card>
        <TableToolbar search={search} onSearch={setSearch} placeholder="Search name, code or contact">
          <span className="text-[11px] text-muted">{rows.length} records</span>
        </TableToolbar>
        <DataTable
          rows={rows}
          keyFor={(row) => row.id}
          loading={list.isLoading}
          emptyTitle="No records yet"
          emptyDescription={canManage ? "Add the first record to begin trading." : "No records are visible for your role."}
          columns={[
            {
              key: "name",
              header: "Organisation",
              render: (row) => (
                <div>
                  <p className="font-medium text-ink">{row.name}</p>
                  <p className="text-[11px] text-muted">
                    {row.code} · {titleCase(row.type)}
                  </p>
                </div>
              ),
            },
            {
              key: "contact",
              header: "Contact",
              render: (row) => (
                <div>
                  <p className="text-ink-soft">{row.contactName ?? "—"}</p>
                  <p className="text-[11px] text-muted">{row.email ?? row.phone ?? ""}</p>
                </div>
              ),
            },
            { key: "location", header: "Location", render: (row) => `${row.city ?? "—"}${row.state ? `, ${row.state}` : ""}` },
            {
              key: "credit",
              header: "Credit limit",
              align: "right",
              render: (row) => <span className="tabular-nums text-muted">{money(row.creditLimitKobo)}</span>,
            },
            {
              key: "outstanding",
              header: scope === "customers" ? "Outstanding" : "Open POs",
              align: "right",
              render: (row) =>
                scope === "customers" ? (
                  <span className={`tabular-nums ${row.outstandingKobo > 0 ? "text-warn" : "text-muted"}`}>
                    {money(row.outstandingKobo)}
                  </span>
                ) : (
                  <span className="tabular-nums text-muted">{row.openOrders}</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Badge>,
            },
          ]}
        />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Add ${scope === "customers" ? "customer" : "supplier"}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              Create record
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organisation name" required htmlFor={ids.name}>
            <Input id={ids.name} value={form.name} onChange={update("name")} />
          </Field>
          <Field label="Type" required htmlFor={ids.type}>
            <Select id={ids.type} value={form.type} onChange={update("type")}>
              {PARTY_TYPES.filter((entry) => types.includes(entry) || scope === "customers").map((entry) => (
                <option key={entry} value={entry}>
                  {titleCase(entry)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Contact person" htmlFor={ids.contact}>
            <Input id={ids.contact} value={form.contactName} onChange={update("contactName")} />
          </Field>
          <Field label="Email" htmlFor={ids.email}>
            <Input id={ids.email} type="email" value={form.email} onChange={update("email")} />
          </Field>
          <Field label="Phone" htmlFor={ids.phone}>
            <Input id={ids.phone} value={form.phone} onChange={update("phone")} />
          </Field>
          <Field label="TIN" htmlFor={ids.tin}>
            <Input id={ids.tin} value={form.tin} onChange={update("tin")} />
          </Field>
          <Field label="Address" htmlFor={ids.address} className="sm:col-span-2">
            <Input id={ids.address} value={form.address} onChange={update("address")} />
          </Field>
          <Field label="City" htmlFor={ids.city}>
            <Input id={ids.city} value={form.city} onChange={update("city")} />
          </Field>
          <Field label="State" htmlFor={ids.state}>
            <Input id={ids.state} value={form.state} onChange={update("state")} />
          </Field>
          <Field label="Credit limit (₦)" htmlFor={ids.credit}>
            <Input id={ids.credit} value={form.creditLimit} onChange={update("creditLimit")} inputMode="decimal" />
          </Field>
          <Field label="Notes" htmlFor={ids.notes} className="sm:col-span-2">
            <Textarea id={ids.notes} value={form.notes} onChange={update("notes")} rows={2} />
          </Field>
          <div className="sm:col-span-2">
            <FormError message={error} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function Customers() {
  return (
    <PartiesPage
      scope="customers"
      title="Customers & partners"
      description="Distributors, retailers and direct customers, with credit exposure and open order counts."
      types={["distributor", "retailer", "customer"]}
    />
  );
}

export function Suppliers() {
  return (
    <PartiesPage
      scope="suppliers"
      title="Suppliers"
      description="Vendors supplying product, cylinders, components and services."
      types={["supplier"]}
    />
  );
}
