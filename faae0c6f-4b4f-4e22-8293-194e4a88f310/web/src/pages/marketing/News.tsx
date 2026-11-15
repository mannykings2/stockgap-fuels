import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Container, CtaBand, Eyebrow } from "@/components/marketing/Section";
import { NEWS } from "@/features/marketing/content";

export function News() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 md:py-20">
          <Eyebrow>News &amp; insights</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-ink">
            Notes on how the product actually moves.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
            Short pieces on capacity reporting, terminal operations and the records that hold a supply chain together.
            Written for this build to explain the operating model behind the platform.
          </p>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-14 md:py-18">
          <div className="grid gap-px overflow-hidden rounded-[16px] border border-line bg-line">
            {NEWS.map((item) => (
              <Link
                key={item.slug}
                to={`/news/${item.slug}`}
                className="group grid gap-3 bg-surface p-6 transition-colors hover:bg-canvas md:grid-cols-[180px_1fr_auto] md:items-start md:gap-6"
              >
                <p className="font-mono text-[10px] tracking-[0.07em] uppercase">
                  <span className="block text-brand">{item.category}</span>
                  <span className="mt-1 block text-muted">{item.date}</span>
                </p>
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.015em] text-ink">{item.title}</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.summary}</p>
                </div>
                <ArrowUpRight className="size-4 text-muted transition-colors group-hover:text-brand" />
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            These articles are part of the demonstration build. They are not company announcements, press releases or
            published research.
          </p>
        </Container>
      </section>

      <CtaBand
        title="Need a figure verified?"
        body="The commercial desk can confirm product availability and point to the source behind any company fact shown on this site."
      />
    </>
  );
}
