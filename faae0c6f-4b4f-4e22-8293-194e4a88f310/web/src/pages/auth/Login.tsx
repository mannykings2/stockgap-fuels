import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/primitives";
import { Field, FormError, Input, useFieldId } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";

interface DemoAccount {
  email: string;
  fullName: string;
  roleLabel: string;
  jobTitle: string;
  password: string;
}

export function Login() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/portal";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const emailId = useFieldId("email");
  const passwordId = useFieldId("password");

  useEffect(() => {
    api
      .get<DemoAccount[]>("/auth/demo-accounts")
      .then(setDemoAccounts)
      .catch(() => setDemoAccounts([]));
  }, []);

  if (!isLoading && user) return <Navigate to={from} replace />;

  async function signIn(nextEmail: string, nextPassword: string) {
    setBusy(true);
    setError(null);
    try {
      await login(nextEmail, nextPassword);
      navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void signIn(email, password);
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Use your work account to reach orders, stock, production and finance."
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <Link to="/forgot-password" className="hover:text-ink">
            Forgot your password?
          </Link>
          <span>Access is granted by a platform administrator.</span>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Work email" required htmlFor={emailId}>
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
            placeholder="name@stockgap.demo"
          />
        </Field>
        <Field label="Password" required htmlFor={passwordId}>
          <Input
            id={passwordId}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            placeholder="••••••••••"
          />
        </Field>
        <FormError message={error} />
        <Button type="submit" loading={busy} className="w-full">
          Sign in
          <ArrowRight className="size-4" />
        </Button>
      </form>

      {demoAccounts.length > 0 ? (
        <div className="mt-7 rounded-[12px] border border-line bg-surface">
          <button
            type="button"
            onClick={() => setShowDemo((current) => !current)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <KeyRound className="size-4 text-brand" aria-hidden />
              Demonstration accounts
            </span>
            <span className="text-[11px] text-muted">{showDemo ? "Hide" : `${demoAccounts.length} roles`}</span>
          </button>
          {showDemo ? (
            <div className="scrollbar-thin max-h-[280px] overflow-y-auto border-t border-line">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    void signIn(account.email, account.password);
                  }}
                  className="flex w-full items-center justify-between gap-3 border-b border-line/60 px-4 py-2.5 text-left last:border-0 hover:bg-surface-2 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-ink">{account.roleLabel}</span>
                    <span className="block truncate text-[11px] text-muted">{account.email}</span>
                  </span>
                  {busy ? <Loader2 className="size-3.5 animate-spin text-muted" /> : <ArrowRight className="size-3.5 text-muted" />}
                </button>
              ))}
            </div>
          ) : null}
          <p className="border-t border-line px-4 py-2 text-[10px] leading-relaxed text-muted">
            Development only. Every account uses the same demo password and sample data.
          </p>
        </div>
      ) : null}
    </AuthLayout>
  );
}
