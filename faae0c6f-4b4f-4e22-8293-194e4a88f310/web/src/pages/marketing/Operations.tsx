import { Link } from "react-router-dom";
import { ArrowUpRight, Factory, Flame, MapPin, Ship, Warehouse } from "lucide-react";
import { Alert } from "@/components/ui/primitives";
import { Container, CtaBand, Eyebrow, Figure, SectionHeading, SourceRefs } from "@/components/marketing/Section";
import { DEMO_NETWORK } from "@/features/marketing/content";

const terminalCapabilities = [
  { icon: Ship, label: "Jetty receiving", detail: "Direct cargo discharge rather than road bridging from Lagos." },
  { icon: Flame, label: "Pressurised LPG storage", detail: "Reported at 8,000 MT installed capacity." },
  { icon: Warehouse, label: "White product tankage", detail: "PMS, AGO and DPK storage for channel supply." },
  { icon: Factory, label: "Cylinder filling", detail: "Fill, inspect and release against a batch record." },
];

export function Operations() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-20">
          <Eyebrow>Operations</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-ink">
            One site where gas arrives, is stored, and leaves as supply.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
            The Port Harcourt terminal combines receiving, storage and filling in one footprint. That concentration is
            the company's advantage and its main operational risk — which is why the assurance functions sit alongside
            the physical operation rather than at head office.
          </p>
          <SourceRefs ids={["businessday-2019", "independent-2022", "stockgap-site"]} />
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-14 md:py-18">
          <div className="grid gap-4 md:grid-cols-3">
            <Figure
              src="/images/terminal-jetty.jpg"
              alt="Jetty at the Port Harcourt terminal"
              caption="Jetty receiving capacity, Port Harcourt."
              className="md:col-span-2"
              priority
            />
            <Figure src="/images/control-room.jpg" alt="Control room monitoring terminal operations" caption="Terminal coordination." />
            <Figure src="/images/terminal-tanks.jpg" alt="Bulk storage tanks" caption="Bulk storage." />
            <Figure
              src="/images/site-walkthrough.jpg"
              alt="Site walkthrough"
              caption="Routine site walkthrough."
              className="md:col-span-2"
            />
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-18">
          <SectionHeading
            eyebrow="Port Harcourt"
            title="What the terminal does."
            intro="Receiving, storage and filling are separate disciplines run by separate teams, coordinated by a single dispatch plan."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {terminalCapabilities.map((capability) => (
              <div key={capability.label} className="rounded-[14px] border border-line bg-canvas p-5">
                <capability.icon className="size-5 text-brand" aria-hidden />
                <h3 className="mt-4 text-[14px] font-semibold text-ink">{capability.label}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{capability.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[14px] border border-line bg-canvas p-5">
            <p className="text-[12px] leading-relaxed text-muted">
              Storage capacity figures are third-party reports of installed capacity and have varied as the facility has
              been upgraded. They are shown as reported, not as a company disclosure.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-14 md:py-18">
          <SectionHeading
            eyebrow="Prototype network"
            title="A demonstration trading network."
            intro="The portal models a wider network so the supply chain can be exercised end to end. These additional sites exist only inside this prototype and are not confirmed company facilities."
          />
          <div className="mt-8">
            <Alert tone="warning" title="Demonstration data">
              Lagos depot, Abuja warehouse and Rumuokoro retail outlet are sample locations created for this build.
              Only the Port Harcourt terminal and plant are described from public sources.
            </Alert>
          </div>
          <div className="mt-6 grid gap-px overflow-hidden rounded-[16px] border border-line bg-line md:grid-cols-3">
            {DEMO_NETWORK.map((site) => (
              <div key={site.name} className="bg-surface p-6">
                <div className="flex items-center justify-between">
                  <MapPin className="size-4 text-brand" aria-hidden />
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] tracking-wide text-muted uppercase">
                    Demo · {site.type}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{site.name}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{site.role}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-surface">
        <Container className="grid gap-10 py-14 md:py-18 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Assurance"
              title="Every incident stays on the board until it is closed."
              intro="Reported incidents carry a severity, an owner and a corrective action. Quality inspections gate the release of finished goods, so a failed batch cannot be sold while the record says otherwise."
            />
            <Link
              to="/services"
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
            >
              How supply works
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <Figure
            src="/images/hse-inspection.jpg"
            alt="HSE inspection in progress"
            caption="Inspection and assurance activity on site."
          />
        </Container>
      </section>

      <CtaBand title="Planning a lift from Port Harcourt?" body="Share the product, volume and timing and the operations desk will confirm the loading window." />
    </>
  );
}
