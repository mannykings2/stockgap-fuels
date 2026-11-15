import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Quote } from "lucide-react";
import { cx } from "@/components/ui/primitives";
import { SOURCES, sourceById } from "@/features/marketing/content";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-6xl px-4 md:px-6", className)}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
      <span className="inline-block h-px w-6 bg-brand" aria-hidden />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.12] font-semibold text-ink">{title}</h2>
      {intro ? <p className="mt-4 text-[15px] leading-relaxed text-muted">{intro}</p> : null}
    </div>
  );
}

export function Figure({
  src,
  alt,
  caption,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <figure className={cx("overflow-hidden rounded-[18px] border border-line bg-surface", className)}>
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="aspect-[16/10] w-full object-cover"
      />
      {caption ? (
        <figcaption className="border-t border-line px-4 py-2.5 text-[11px] text-muted">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function SourceRefs({ ids }: { ids: string[] }) {
  return (
    <p className="mt-2 text-[10px] tracking-wide text-muted">
      Source:{" "}
      {ids.map((id, index) => {
        const source = sourceById(id);
        return (
          <span key={id}>
            {index > 0 ? " · " : ""}
            <a href={source.url} target="_blank" rel="noreferrer" className="underline decoration-line hover:text-ink">
              {source.publication}, {source.date}
            </a>
          </span>
        );
      })}
    </p>
  );
}

export function PullQuote({ children, attribution }: { children: ReactNode; attribution: string }) {
  return (
    <blockquote className="relative rounded-[18px] border border-line bg-surface p-6">
      <Quote className="size-5 text-brand" aria-hidden />
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{children}</p>
      <footer className="mt-3 text-[11px] tracking-wide text-muted uppercase">{attribution}</footer>
    </blockquote>
  );
}

export function SourcesList() {
  return (
    <section className="border-t border-line bg-surface">
      <Container className="py-12">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">Sources for company facts</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {SOURCES.map((source) => (
            <li key={source.id} className="flex gap-3 text-[12px] leading-relaxed text-muted">
              <span className="text-line-strong">—</span>
              <span>
                <a href={source.url} target="_blank" rel="noreferrer" className="text-ink-soft hover:text-brand">
                  {source.title}
                </a>
                <span className="block">
                  {source.publication} · {source.date}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl text-[11px] leading-relaxed text-muted">
          This site is a demonstration build. Company facts are reproduced from the public sources above. Capacity,
          expansion and offtake statements are third-party reports and are labelled as reported; they are not company
          disclosures. All prices, partners, orders, stock levels and staff inside the portal are sample data.
        </p>
      </Container>
    </section>
  );
}

export function CtaBand({
  title = "Talk to the commercial team",
  body = "Bulk LPG, cylinder supply and petroleum product enquiries are handled through one commercial desk.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="border-t border-line bg-brand-soft/40">
      <Container className="flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/contact"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-5 text-sm font-semibold text-[color:var(--canvas)] hover:bg-brand-strong dark:text-[#06120d]"
          >
            Send an enquiry
            <ArrowUpRight className="size-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 items-center rounded-[10px] border border-line bg-surface px-5 text-sm font-medium text-ink hover:bg-surface-2"
          >
            Client portal
          </Link>
        </div>
      </Container>
    </section>
  );
}
