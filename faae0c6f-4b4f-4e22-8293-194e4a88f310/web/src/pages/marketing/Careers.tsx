import { Link } from "react-router-dom";
import { ArrowUpRight, Check } from "lucide-react";
import { Container, CtaBand, Eyebrow } from "@/components/marketing/Section";
import { VACANCIES } from "@/features/marketing/content";

const HIRING_STEPS = [
  {
    title: "Application",
    body: "Send your CV and a short note on the role you are applying for through the enquiry form, naming the role in the message.",
  },
  {
    title: "Operational conversation",
    body: "A discussion with the hiring manager about the shift pattern, the records the role owns and the standards it works to.",
  },
  {
    title: "Site walk and offer",
    body: "A walk of the terminal or plant area, then a written offer with the terms, reporting line and safety obligations.",
  },
];

export function Careers() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-20">
          <Eyebrow>Careers</Eyebrow>
          <div className="mt-5 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
            <div>
              <h1 className="max-w-3xl text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-ink">
                Operational work, done with the record to prove it.
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
                Stockgap Fuels runs LPG storage, cylinder filling and petroleum distribution from the Port Harcourt
                terminal. Every role here touches product that is flammable, measured and accounted for, so the work is
                disciplined and the documentation matters as much as the equipment.
              </p>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
                We hire for terminal operations, production and quality, commercial support and assurance. Roles are
                based at the terminal unless the listing says otherwise.
              </p>
            </div>
            <div className="rounded-[16px] border border-line bg-canvas p-6">
              <h2 className="text-base font-semibold text-ink">What we look for</h2>
              <ul className="mt-4 grid gap-2.5">
                {[
                  "Comfort working to a written procedure",
                  "Willingness to own an entry you made",
                  "Safety as a habit, not a compliance exercise",
                  "Clear handovers at shift change",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-14 md:py-18">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Open roles</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold text-ink md:text-3xl">Where we are hiring</h2>
            </div>
            <p className="max-w-sm text-[12px] leading-relaxed text-muted">
              Listings in this demonstration build are illustrative, not live vacancies. Applications are handled
              through the contact form.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {VACANCIES.map((role) => (
              <article key={role.id} className="flex flex-col rounded-[16px] border border-line bg-surface p-6">
                <p className="font-mono text-[10px] tracking-[0.08em] text-brand uppercase">
                  {role.team} · {role.type}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.015em] text-ink">{role.title}</h3>
                <p className="mt-1 text-[12px] text-muted">{role.location}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{role.summary}</p>
                <ul className="mt-4 grid gap-2">
                  {role.responsibilities.map((item) => (
                    <li key={item} className="relative pl-[18px] text-[13px] leading-[1.6] text-ink-soft">
                      <span className="absolute top-[8px] left-0 size-1.5 rounded-full bg-brand/55" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
                  >
                    Apply through the contact form
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-18">
          <h2 className="text-2xl font-semibold text-ink">How hiring works</h2>
          <div className="mt-6 grid gap-px overflow-hidden rounded-[16px] border border-line bg-line md:grid-cols-3">
            {HIRING_STEPS.map((step, index) => (
              <div key={step.title} className="bg-surface p-6">
                <span className="font-mono text-[11px] text-brand">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-[15px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        title="No role that fits yet?"
        body="Send a short introduction and the kind of work you are looking for. We keep applications on file for terminal and commercial openings."
      />
    </>
  );
}
