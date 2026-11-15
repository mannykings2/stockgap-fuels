import { Link } from "react-router-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import type { StatusTone } from "@/lib/format";

/** Condense conditional class names. */
export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-[color:var(--canvas)] hover:bg-brand-strong border border-transparent dark:text-[#06120d] font-semibold",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-surface-2 border border-transparent",
  danger: "bg-danger-soft text-danger border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] hover:bg-danger-soft/80",
  subtle: "bg-brand-soft text-brand border border-transparent hover:brightness-105",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        buttonVariants[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({
  to,
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
}: {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] transition-colors",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        buttonVariants[variant],
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

const badgeTones: Record<StatusTone["tone"], string> = {
  neutral: "bg-surface-3 text-muted border-line",
  success: "bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] text-ok border-[color-mix(in_srgb,var(--ok)_30%,transparent)]",
  warning: "bg-warn-soft text-warn border-[color-mix(in_srgb,var(--warn)_35%,transparent)]",
  danger: "bg-danger-soft text-danger border-[color-mix(in_srgb,var(--danger)_35%,transparent)]",
  info: "bg-info-soft text-info border-[color-mix(in_srgb,var(--info)_30%,transparent)]",
};

export function Badge({ tone = "neutral", children }: { tone?: StatusTone["tone"]; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-[var(--radius)] border border-line bg-surface", className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

const alertStyles = {
  info: "border-[color-mix(in_srgb,var(--info)_30%,transparent)] bg-info-soft text-info",
  warning: "border-[color-mix(in_srgb,var(--warn)_35%,transparent)] bg-warn-soft text-warn",
  critical: "border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-danger-soft text-danger",
  success: "border-[color-mix(in_srgb,var(--ok)_30%,transparent)] bg-[color-mix(in_srgb,var(--ok)_10%,transparent)] text-ok",
} as const;

const alertIcons = { info: Info, warning: AlertTriangle, critical: XCircle, success: CheckCircle2 };

export function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: keyof typeof alertStyles;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const Icon = alertIcons[tone];
  return (
    <div className={cx("flex items-start gap-3 rounded-[12px] border px-4 py-3 text-sm", alertStyles[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-0.5 text-[13px] opacity-90" : "text-[13px]"}>{children}</div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-muted">{icon}</div> : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  footer,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warning" | "critical" | "success";
  footer?: ReactNode;
}) {
  const accent =
    tone === "critical" ? "text-danger" : tone === "warning" ? "text-warn" : tone === "success" ? "text-ok" : "text-ink";
  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-5">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={cx("mt-2 text-2xl font-semibold tabular-nums", accent)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {footer}
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-[12px] border border-line bg-surface p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cx(
            "rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === tab.value ? "bg-brand text-[color:var(--canvas)] dark:text-[#06120d]" : "text-muted hover:text-ink",
          )}
        >
          {tab.label}
          {tab.count !== undefined ? <span className="ml-1.5 text-[11px] opacity-70">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}
