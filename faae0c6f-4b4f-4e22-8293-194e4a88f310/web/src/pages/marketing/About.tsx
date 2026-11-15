import { Container, CtaBand, Eyebrow, Figure, PullQuote, SectionHeading, SourceRefs, SourcesList } from "@/components/marketing/Section";
import { COMPANY, FACTS, TIMELINE } from "@/features/marketing/content";

export function About() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-20">
          <Eyebrow>Company</Eyebrow>
          <div className="mt-5 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
            <div>
              <h1 className="text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-ink">
                A downstream company built around one terminal and a long list of customers.
              </h1>
              <p className="mt-6 text-[15px] leading-relaxed text-muted">
                {COMPANY.name} was incorporated in Nigeria as a private limited liability company and trades refined
                petroleum products and liquefied petroleum gas. Product is either imported directly through
                international trading partners or lifted coastally through strategic arrangements with NNPC.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">
                The business activity that shapes everything else is the Port Harcourt terminal: pressurised LPG
                storage, white product tankage and a jetty able to receive product directly rather than through Lagos.
                Around it sit the commercial desk, the cylinder chain and the assurance functions that keep gas moving
                safely.
              </p>
              <dl className="mt-8 grid gap-4 rounded-[16px] border border-line bg-canvas p-5 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] tracking-wide text-muted uppercase">Head office</dt>
                  <dd className="mt-1 text-[13px] text-ink-soft">{COMPANY.address}</dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-wide text-muted uppercase">Telephone</dt>
                  <dd className="mt-1 text-[13px] text-ink-soft">{COMPANY.phone}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] tracking-wide text-muted uppercase">Focus</dt>
                  <dd className="mt-1 text-[13px] text-ink-soft">{COMPANY.focus}</dd>
                  <SourceRefs ids={["stockgap-site"]} />
                </div>
              </dl>
            </div>
            <Figure
              src="/images/leadership-visit.jpg"
              alt="Leadership visit at the terminal"
              caption="Leadership and site teams during a terminal visit."
              priority
            />
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-14 md:py-18">
          <SectionHeading
            eyebrow="Verified facts"
            title="What the public record actually says."
            intro="Capacity claims in this sector are often repeated without attribution. These are the figures as reported, with the source shown beside each one."
          />
          <div className="mt-10 grid gap-px overflow-hidden rounded-[16px] border border-line bg-line sm:grid-cols-2">
            {FACTS.map((fact) => (
              <div key={fact.label} className="bg-surface p-6">
                <p className="text-2xl font-semibold text-ink">{fact.value}</p>
                <p className="mt-1 text-[13px] font-medium text-ink-soft">{fact.label}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{fact.detail}</p>
                <SourceRefs ids={fact.sourceIds} />
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-surface">
        <Container className="grid gap-10 py-14 md:py-18 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <SectionHeading eyebrow="Timeline" title="How the terminal became a distribution platform." />
            <ol className="mt-8 space-y-8">
              {TIMELINE.map((entry) => (
                <li key={entry.year} className="relative pl-6">
                  <span className="absolute top-1.5 left-0 size-2 rounded-full bg-brand" aria-hidden />
                  <span className="absolute top-4 bottom-[-2rem] left-[3.5px] w-px bg-line last:hidden" aria-hidden />
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">{entry.year}</p>
                  <h3 className="mt-1 text-base font-semibold text-ink">{entry.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{entry.body}</p>
                  <SourceRefs ids={entry.sourceIds} />
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-4">
            <PullQuote attribution="Terminal manager, StockGap Fuels Port Harcourt — Independent, 2022">
              “Today it is StockGap terminal that allows NLNG to deliver gas to customers in this region. We need more
              terminals in places like Onitsha.”
            </PullQuote>
            <Figure
              src="/images/hse-inspection.jpg"
              alt="Safety inspection at the terminal"
              caption="Inspection walk at the terminal."
            />
            <div className="rounded-[16px] border border-line bg-canvas p-5">
              <h3 className="text-sm font-semibold text-ink">Governance and assurance</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Gas handling is unforgiving of informal process. The operating model keeps three records separate and
                permanent: stock movements, quality inspections and HSE incidents. Each is attributable to a person and
                a site.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <SourcesList />
      <CtaBand title="Need to verify something before you trade?" body="The commercial desk can confirm product availability, handling requirements and delivery windows." />
    </>
  );
}
