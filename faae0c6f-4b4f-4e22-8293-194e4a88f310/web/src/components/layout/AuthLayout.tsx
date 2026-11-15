import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col">
        <header className="flex items-center justify-between px-5 py-5 md:px-10">
          <Logo compact />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center px-5 pb-12 md:px-10">
          <div className="mx-auto w-full max-w-[420px]">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">Client portal</p>
            <h1 className="mt-3 text-2xl font-semibold text-ink">{title}</h1>
            {description ? <p className="mt-2 text-[13px] leading-relaxed text-muted">{description}</p> : null}
            <div className="mt-7">{children}</div>
            {footer ? <div className="mt-6 text-[12px] text-muted">{footer}</div> : null}
            <p className="mt-10 text-[11px] leading-relaxed text-muted">
              <Link to="/" className="hover:text-ink">
                ← Back to stockgapfuels.com
              </Link>
            </p>
          </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-line bg-surface-2 lg:block">
        <img
          src="/images/terminal-tanks.jpg"
          alt="Bulk storage tanks at the Port Harcourt terminal"
          className="absolute inset-0 size-full object-cover opacity-45 dark:opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--canvas)] via-[color:var(--canvas)]/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-10">
          <div className="max-w-md">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">Integrated operations</p>
            <p className="mt-3 text-2xl leading-snug font-semibold text-ink">
              Demand, stock, production, movement and settlement — in one chain.
            </p>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-5">
              {[
                ["8,000 MT", "Reported LPG storage"],
                ["2019", "First NLNG cargo"],
                ["4", "Product lines"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-[10px] tracking-wide text-muted uppercase">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-[10px] leading-relaxed text-muted">
              Demonstration environment. Company figures are reproduced from public sources; operational records are
              sample data.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
