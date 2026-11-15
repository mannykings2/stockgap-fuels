import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { Alert, Badge, Button, Card, CardHeader, KeyValue, PageHeader } from "@/components/ui/primitives";
import { Field, FormError, Input, useFieldId } from "@/components/ui/form";
import { titleCase } from "@/lib/format";

export function Settings() {
  const { user, permissions, scopedToParty } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const currentField = useFieldId("current");
  const newField = useFieldId("new");
  const confirmField = useFieldId("confirm");

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account, your access and the security of your session." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" description="Managed by a platform administrator." />
          <dl className="divide-y divide-line px-5 py-2">
            <KeyValue label="Name">{user?.fullName ?? "—"}</KeyValue>
            <KeyValue label="Email">{user?.email ?? "—"}</KeyValue>
            <KeyValue label="Role">{user?.roleLabel ?? "—"}</KeyValue>
            <KeyValue label="Job title">{user?.jobTitle ?? "—"}</KeyValue>
            <KeyValue label="Organisation">{user?.partyName ?? "Stockgap Fuels"}</KeyValue>
            <KeyValue label="Access scope">
              {scopedToParty ? <Badge tone="info">Own organisation only</Badge> : <Badge tone="success">Enterprise-wide</Badge>}
            </KeyValue>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Change password" description="At least 10 characters with upper case, lower case and a number." />
          <form className="space-y-4 px-5 py-4" onSubmit={changePassword}>
            <Field label="Current password" required htmlFor={currentField}>
              <Input
                id={currentField}
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password" required htmlFor={newField}>
              <Input
                id={newField}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={10}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password" required htmlFor={confirmField}>
              <Input
                id={confirmField}
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                minLength={10}
                autoComplete="new-password"
              />
            </Field>
            {done ? (
              <Alert tone="success" title="Password changed">
                Use the new password the next time you sign in.
              </Alert>
            ) : null}
            <FormError message={error} />
            <Button type="submit" loading={busy} icon={<KeyRound className="size-4" />}>
              Update password
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Your permissions"
          description="The API checks these on every request; the interface only hides what you cannot use."
        />
        <div className="flex flex-wrap gap-1.5 px-5 py-4">
          {[...permissions].sort().map((permission) => (
            <span key={permission} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-ink-soft">
              {permission}
            </span>
          ))}
          {permissions.size === 0 ? <p className="text-[12px] text-muted">No permissions granted.</p> : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Environment" description="This deployment runs against a local demonstration database." />
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
          {[
            ["Data set", "Demonstration"],
            ["Currency", "Nigerian naira (NGN)"],
            ["Access", titleCase("session cookie")],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] tracking-wide text-muted uppercase">{label}</p>
              <p className="mt-1 text-[13px] text-ink-soft">{value}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-5 py-3">
          <p className="flex items-center gap-2 text-[11px] text-muted">
            <ShieldCheck className="size-3.5 text-brand" aria-hidden />
            Sessions are httpOnly cookies with a server-side token hash. Role changes take effect on the next request.
          </p>
        </div>
      </Card>
    </div>
  );
}
