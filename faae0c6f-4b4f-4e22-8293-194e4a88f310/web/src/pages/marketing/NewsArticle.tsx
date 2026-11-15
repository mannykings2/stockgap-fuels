import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Container, CtaBand, Eyebrow } from "@/components/marketing/Section";
import { NEWS } from "@/features/marketing/content";

export function NewsArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = NEWS.find((item) => item.slug === slug);
  const others = NEWS.filter((item) => item.slug !== slug).slice(0, 2);

  if (!article) {
    return (
      <Container className="py-24">
        <Eyebrow>News &amp; insights</Eyebrow>
        <h1 className="mt-4 text-3xl font-semibold text-ink">That note does not exist</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
          The link may have changed. The full list of notes is on the news page.
        </p>
        <Link
          to="/news"
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to news &amp; insights
        </Link>
      </Container>
    );
  }

  return (
    <>
      <article className="border-b border-line bg-surface">
        <Container className="py-14 md:py-20">
          <Link
            to="/news"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            News &amp; insights
          </Link>
          <p className="mt-8 font-mono text-[10px] tracking-[0.08em] uppercase">
            <span className="text-brand">{article.category}</span>
            <span className="mx-2 text-muted">·</span>
            <span className="text-muted">{article.date}</span>
          </p>
          <h1 className="mt-3 max-w-3xl text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-ink">
            {article.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-ink-soft">{article.summary}</p>
        </Container>
      </article>

      <section className="border-b border-line">
        <Container className="grid gap-12 py-14 md:py-18 lg:grid-cols-[1fr_280px]">
          <div className="max-w-2xl space-y-5">
            {article.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-[15px] leading-[1.75] text-muted">
                {paragraph}
              </p>
            ))}
            <p className="border-t border-line pt-5 text-[11px] leading-relaxed text-muted">
              Written for the Stockgap Fuels demonstration build. Figures referenced are third-party reports shown
              elsewhere on this site with their sources; nothing here is a company disclosure.
            </p>
          </div>

          <aside>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">More notes</p>
            <ul className="mt-4 grid gap-4">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link to={`/news/${item.slug}`} className="group block rounded-[12px] border border-line bg-surface p-4 hover:border-line-strong">
                    <span className="font-mono text-[10px] tracking-[0.07em] text-brand uppercase">{item.category}</span>
                    <span className="mt-1.5 block text-[13px] leading-snug font-semibold text-ink">{item.title}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted group-hover:text-brand">
                      Read
                      <ArrowUpRight className="size-3" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
