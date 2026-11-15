import { Link } from "react-router-dom";
import { cx } from "@/components/ui/primitives";

/**
 * Company mark: the supplied Stockgap Fuels logo. The artwork is a JPEG on a
 * white field, so it is inset in a small white tile that reads correctly on
 * both the light portal chrome and the dark marketing hero.
 */
export function LogoMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-white",
        onDark
          ? "ring-1 ring-white/25 shadow-[0_6px_16px_-8px_rgba(0,0,0,.6)]"
          : "ring-1 ring-black/8 shadow-[var(--shadow-sm)]",
        className,
      )}
      aria-hidden
    >
      <img src="/images/sg-logo.jpg" alt="" className="size-full object-contain" width={36} height={36} />
    </span>
  );
}

export function Logo({ to = "/", compact = false, onDark = false }: { to?: string; compact?: boolean; onDark?: boolean }) {
  return (
    <Link
      to={to}
      className={cx("flex items-center gap-2.5", onDark ? "text-white" : "text-ink")}
      aria-label="Stockgap Fuels Limited — home"
    >
      <LogoMark onDark={onDark} />
      <span className="leading-none">
        <span className="block text-[15px] font-bold tracking-[0.12em] uppercase">Stockgap</span>
        {compact ? null : (
          <span
            className={cx(
              "mt-1 block text-[9px] font-semibold tracking-[0.26em] uppercase",
              onDark ? "text-white/62" : "text-muted",
            )}
          >
            Fuels Limited
          </span>
        )}
      </span>
    </Link>
  );
}
