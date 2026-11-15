import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Container, CtaBand, Eyebrow, Figure } from "@/components/marketing/Section";
import { PRODUCT_FAMILIES } from "@/features/marketing/content";

export function Products() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-20">
          <Eyebrow>Product range</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-ink">
            LPG, cylinders and the white products that keep businesses running.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
            Every specification below describes how the product is handled and sold, not a commercial offer. Volumes,
            pricing and delivery terms are confirmed per contract.
          </p>
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Product sections">
            {PRODUCT_FAMILIES.map((family) => (
              <a
                key={family.id}
                href={`#${family.id}`}
                className="rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[12px] font-medium text-ink-soft hover:border-line-strong hover:text-ink"
              >
                {family.name}
              </a>
            ))}
          </nav>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-4">
          <Figure
            src="/images/operations-walk.jpg"
            alt="Operations team walking the product handling area"
            caption="Product handling area, Port Harcourt."
          />
        </Container>
      </section>

      {PRODUCT_FAMILIES.map((family, index) => (
        <section key={family.id} id={family.id} className={index % 2 === 0 ? "border-b border-line" : "border-b border-line bg-surface"}>
          <Container className="grid gap-10 py-14 md:py-18 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[11px] tabular-nums tracking-[0.14em] text-muted uppercase">
                {String(index + 1).padStart(2, "0")} · {family.uses[0]}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink md:text-3xl">{family.name}</h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted">{family.description}</p>
              <ul className="mt-6 space-y-2">
                {family.uses.map((use) => (
                  <li key={use} className="flex items-start gap-2 text-[13px] text-ink-soft">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                    {use}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <dl className="overflow-hidden rounded-[14px] border border-line bg-canvas">
                {family.specs.map((spec) => (
                  <div key={spec.label} className="flex items-start justify-between gap-6 border-b border-line px-4 py-3 last:border-0">
                    <dt className="text-[12px] text-muted">{spec.label}</dt>
                    <dd className="text-right text-[12px] font-medium text-ink">{spec.value}</dd>
                  </div>
                ))}
              </dl>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 self-start rounded-[10px] border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-ink hover:border-line-strong"
              >
                Request availability and pricing
                <ArrowUpRight className="size-3.5 text-brand" />
              </Link>
            </div>
          </Container>
        </section>
      ))}

      <section className="border-b border-line bg-surface">
        <Container className="py-12">
          <div className="rounded-[16px] border border-line bg-canvas p-6">
            <h2 className="text-base font-semibold text-ink">A note on figures</h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">
              Pack sizes and handling descriptions reflect the demonstration catalogue inside this platform. They are
              not a published price list, and no price shown anywhere in the portal is a commercial quote. Formal
              offers, credit terms and volumes are issued by the commercial team after confirmation of stock.
            </p>
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
