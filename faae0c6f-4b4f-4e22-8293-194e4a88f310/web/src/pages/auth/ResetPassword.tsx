import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert, Button } from "@/components/ui/primitives";
import { Field, FormError, Input, useFieldId } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const tokenId = useFieldId("token");
  const passwordId = useFieldId("password");
  const confirmId = useFieldId("confirm");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not reset the password. The link may have expired.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      description="Reset links are single use and expire after one hour."
      footer={
        <Link to="/login" className="hover:text-ink">
          ← Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="space-y-4">
          <Alert tone="success" title="Password updated">
            Your password has been changed. Sign in with the new password.
          </Alert>
          <Button onClick={() => navigate("/login", { replace: true })} className="w-full">
            Continue to sign in
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Reset token" required htmlFor={tokenId} hint="Pre-filled from your reset link.">
            <Input id={tokenId} value={token} onChange={(event) => setToken(event.target.value)} required minLength={10} />
          </Field>
          <Field
            label="New password"
            required
            htmlFor={passwordId}
            hint="At least 10 characters, including upper case, lower case and a number."
          >
            <Input
              id={passwordId}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm password" required htmlFor={confirmId}>
            <Input
              id={confirmId}
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <FormError message={error} />
          <Button type="submit" loading={busy} className="w-full">
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
