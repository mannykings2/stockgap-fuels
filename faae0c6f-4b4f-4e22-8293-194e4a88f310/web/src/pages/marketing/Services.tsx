import { Container, CtaBand, Eyebrow, Figure, SectionHeading } from "@/components/marketing/Section";
import { OPERATING_PRINCIPLES, SERVICES } from "@/features/marketing/content";

const steps = [
  {
    title: "Enquiry and qualification",
    body: "We confirm the product, volume, destination and payment basis before anything is committed.",
  },
  {
    title: "Stock and allocation",
    body: "Available stock is checked at the supplying location and reserved against the order.",
  },
  {
    title: "Loading and dispatch",
    body: "Product is loaded against a dispatch record, with transporter, vehicle and driver captured.",
  },
  {
    title: "Delivery and settlement",
    body: "Delivery is confirmed at destination, an invoice is raised and payments are recorded against it.",
  },
];

export function Services() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-20">
          <Eyebrow>Services</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-ink">
            The work between the tank and the customer.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
            Storage is capital-intensive but simple. Distribution is not. These are the services that turn a terminal
            position into reliable supply.
          </p>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-14 md:py-18">
          <div className="grid gap-px overflow-hidden rounded-[16px] border border-line bg-line md:grid-cols-3">
            {SERVICES.map((service) => (
              <article key={service.title} className="flex flex-col bg-surface p-6">
                <h2 className="text-[15px] font-semibold text-ink">{service.title}</h2>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{service.body}</p>
                <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-[12px] text-ink-soft">
                      <span className="size-1 rounded-full bg-brand" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="grid gap-10 py-14 md:py-18 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <Figure
            src="/images/operations-walk.jpg"
            alt="Terminal operations walkthrough"
            caption="Coordinating loading and dispatch at the terminal."
          />
          <div>
            <SectionHeading
              eyebrow="How supply works"
              title="Four stages, each with a record that has to exist."
              intro="The platform was designed around this sequence. If a stage is skipped, the next one will not let it through."
            />
            <ol className="mt-8 space-y-5">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-semibold tabular-nums text-brand">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[14px] font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-18">
          <SectionHeading eyebrow="Operating principles" title="What a customer can hold us to." />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {OPERATING_PRINCIPLES.map((principle, index) => (
              <div key={principle.title} className="border-t border-line pt-5">
                <span className="text-[11px] tabular-nums text-brand">0{index + 1}</span>
                <h3 className="mt-2 text-[15px] font-semibold text-ink">{principle.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{principle.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand title="Bring us your supply requirement" body="Tell us the product, volume and destination. We will come back with availability and terms." />
    </>
  );
}
