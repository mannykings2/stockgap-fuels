import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { Alert, Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Input, Select, useFieldId } from "@/components/ui/form";
import { dateTime, statusMeta, titleCase } from "@/lib/format";
import type { PermissionRecord, RoleRecord, UserRecord } from "@/types";

export function Users() {
  const { has } = useAuth();
  const queryClient = useQueryClient();
  const users = useApi<UserRecord[]>(["users"], "/users");
  const roles = useApi<RoleRecord[]>(["roles"], "/roles");
  const permissions = useApi<PermissionRecord[]>(["permissions"], "/permissions");
  const parties = useApi<{ customers: { id: string; name: string }[]; suppliers: { id: string; name: string }[] }>(
    ["reference"],
    "/reference/options",
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleRecord | null>(null);

  const [form, setForm] = useState({ email: "", fullName: "", password: "", roleId: "", partyId: "", jobTitle: "" });
  const [error, setError] = useState<string | null>(null);
  const ids = {
    email: useFieldId("user-email"),
    name: useFieldId("user-name"),
    password: useFieldId("user-password"),
    role: useFieldId("user-role"),
    party: useFieldId("user-party"),
    title: useFieldId("user-title"),
  };

  const create = useMutation({
    mutationFn: () =>
      api.post("/users", {
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        roleId: form.roleId,
        partyId: form.partyId || null,
        jobTitle: form.jobTitle || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreateOpen(false);
      setForm({ email: "", fullName: "", password: "", roleId: "", partyId: "", jobTitle: "" });
      setError(null);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not create the user."),
  });

  const partyOptions = useMemo(
    () => [...(parties.data?.customers ?? []), ...(parties.data?.suppliers ?? [])],
    [parties.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & roles"
        description="Accounts are granted a role; the role carries the permissions. Portal access follows from both."
        actions={
          has("users:manage") ? (
            <Button icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
              Add user
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader title="Accounts" description={`${users.data?.length ?? 0} users`} />
        <DataTable
          rows={users.data ?? []}
          keyFor={(row) => row.id}
          loading={users.isLoading}
          emptyTitle="No users"
          columns={[
            {
              key: "name",
              header: "User",
              render: (row) => (
                <div>
                  <p className="font-medium text-ink">{row.fullName}</p>
                  <p className="text-[11px] text-muted">{row.email}</p>
                </div>
              ),
            },
            { key: "role", header: "Role", render: (row) => <Badge tone="info">{row.role.label}</Badge> },
            { key: "party", header: "Organisation", render: (row) => row.party ?? <span className="text-muted">Stockgap</span> },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Badge>,
            },
            {
              key: "login",
              header: "Last sign-in",
              align: "right",
              render: (row) => <span className="text-muted">{row.lastLoginAt ? dateTime(row.lastLoginAt) : "Never"}</span>,
            },
          ]}
        />
      </Card>

      <Card>
        <CardHeader
          title="Roles"
          description="Permission sets are enforced by the API, not hidden in the interface."
        />
        <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
          {(roles.data ?? []).map((role) => (
            <div key={role.id} className="bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{role.label}</p>
                  <p className="text-[11px] text-muted">{role.description}</p>
                </div>
                <Badge tone="neutral">{role.permissionCount}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] tracking-wide text-muted uppercase">
                  {role.isSystem ? "System role" : "Custom role"}
                </span>
                {has("roles:manage") ? (
                  <Button size="sm" variant="ghost" icon={<ShieldCheck className="size-3.5" />} onClick={() => setEditRole(role)}>
                    Permissions
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add a user"
        description="Passwords must be at least 10 characters with upper and lower case and a number."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              Create user
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required htmlFor={ids.name}>
            <Input id={ids.name} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </Field>
          <Field label="Email" required htmlFor={ids.email}>
            <Input id={ids.email} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label="Temporary password" required htmlFor={ids.password}>
            <Input id={ids.password} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </Field>
          <Field label="Job title" htmlFor={ids.title}>
            <Input id={ids.title} value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} />
          </Field>
          <Field label="Role" required htmlFor={ids.role}>
            <Select id={ids.role} value={form.roleId} onChange={(event) => setForm({ ...form, roleId: event.target.value })}>
              <option value="">Select a role</option>
              {(roles.data ?? []).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Organisation" htmlFor={ids.party} hint="Required for external roles such as distributor.">
            <Select id={ids.party} value={form.partyId} onChange={(event) => setForm({ ...form, partyId: event.target.value })}>
              <option value="">Stockgap (internal)</option>
              {partyOptions.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <FormError message={error} />
          </div>
        </div>
      </Modal>

      {editRole && permissions.data ? (
        <RolePermissionsModal
          role={editRole}
          permissions={permissions.data}
          onClose={() => setEditRole(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["roles"] });
            void queryClient.invalidateQueries({ queryKey: ["session"] });
          }}
        />
      ) : null}
    </div>
  );
}

function RolePermissionsModal({
  role,
  permissions,
  onClose,
  onSaved,
}: {
  role: RoleRecord;
  permissions: PermissionRecord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions));
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionRecord[]>();
    for (const permission of permissions) {
      const list = map.get(permission.module) ?? [];
      list.push(permission);
      map.set(permission.module, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const save = useMutation({
    mutationFn: () => api.put(`/roles/${role.id}/permissions`, { permissions: [...selected] }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not update permissions."),
  });

  function toggle(code: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${role.label} permissions`}
      description="Changes apply to every account holding this role on their next request."
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-muted">{selected.size} permissions selected</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={save.isPending} icon={<KeyRound className="size-4" />} onClick={() => save.mutate()}>
              Save permissions
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {role.isSystem ? (
          <Alert tone="warning">
            This is a system role. Editing it changes what every account with this role can do.
          </Alert>
        ) : null}
        {groups.map(([module, entries]) => (
          <div key={module}>
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{titleCase(module)}</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {entries.map((permission) => (
                <label
                  key={permission.code}
                  className="flex cursor-pointer items-start gap-2 rounded-[8px] border border-line px-3 py-2 text-[12px] hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(permission.code)}
                    onChange={() => toggle(permission.code)}
                    className="mt-0.5 size-3.5 accent-[var(--brand)]"
                  />
                  <span>
                    <span className="block text-ink-soft">{permission.description}</span>
                    <span className="block text-[10px] text-muted">{permission.code}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <FormError message={error} />
      </div>
    </Modal>
  );
}
