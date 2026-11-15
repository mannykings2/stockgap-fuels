import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert, Button } from "@/components/ui/primitives";
import { Field, FormError, Input, useFieldId } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";

interface ForgotResult {
  message: string;
  resetToken?: string;
  expiresAt?: string;
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForgotResult | null>(null);
  const emailId = useFieldId("email");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await api.post<ForgotResult>("/auth/forgot-password", { email }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not issue a reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email address on your account and we will issue a reset link."
      footer={
        <Link to="/login" className="hover:text-ink">
          ← Back to sign in
        </Link>
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[12px] border border-line bg-surface p-4">
            <MailCheck className="mt-0.5 size-5 text-brand" aria-hidden />
            <div>
              <p className="text-[13px] font-medium text-ink">Request received</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{result.message}</p>
            </div>
          </div>
          {result.resetToken ? (
            <Alert tone="info" title="Development shortcut">
              Email delivery is not configured in this environment. Use the single-use reset link below.
              <div className="mt-3">
                <Link
                  to={`/reset-password?token=${result.resetToken}`}
                  className="inline-flex h-9 items-center rounded-[9px] bg-brand px-3 text-[12px] font-semibold text-[color:var(--canvas)] dark:text-[#06120d]"
                >
                  Continue to reset password
                </Link>
              </div>
            </Alert>
          ) : null}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Work email" required htmlFor={emailId}>
            <Input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
              placeholder="name@stockgap.demo"
            />
          </Field>
          <FormError message={error} />
          <Button type="submit" loading={busy} className="w-full">
            Issue reset link
          </Button>
          <p className="text-[11px] leading-relaxed text-muted">
            For security, the same response is shown whether or not an account exists for the address.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
