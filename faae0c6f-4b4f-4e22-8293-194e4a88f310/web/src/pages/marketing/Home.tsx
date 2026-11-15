import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Briefcase, Building2, Cylinder, Droplets, Flame } from "lucide-react";
import { NEWS, PARTNERS, VACANCIES } from "@/features/marketing/content";
import { cx } from "@/components/ui/primitives";

/* ------------------------------------------------------------------ helpers */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.17em] text-brand uppercase">
      <span className="inline-block h-px w-[22px] bg-current opacity-55" aria-hidden />
      {children}
    </span>
  );
}

function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
    >
      {children}
      <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

/* ------------------------------------------------------------------- content */

const HERO_FACTS: [string, string][] = [
  ["2019", "LPG terminal commissioned at Rumuolumeni, Port Harcourt"],
  ["8,000–15,000 MT", "LPG storage capacity as reported — 8,000 MT at commissioning, 15,000 MT cited in 2022"],
  ["LPG · PMS · AGO · DPK", "Product slate handled in bulk storage and distribution"],
  ["4 regions", "Additional bottling and storage sites announced for development"],
];

const COMPANY_FACTS: [string, ReactNode][] = [
  [
    "Head office",
    <>
      Eagle Cement Road, Rumuolumeni, Port Harcourt, Rivers State
      <small className="mt-1 block text-[12px] text-muted">As published on the company&rsquo;s website — to be confirmed</small>
    </>,
  ],
  ["Core activity", "Bulk storage and distribution of LPG and refined petroleum products"],
  ["Supply routes", "Direct import and coastal lifting under a strategic alliance with NNPC"],
  [
    "Published contact",
    <>
      +234 (84) 700 149
      <small className="mt-1 block text-[12px] text-muted">Official email address pending confirmation</small>
    </>,
  ],
];

const OPERATIONS = [
  {
    image: "/images/terminal-tanks.jpg",
    alt: "Large spherical LPG storage tanks with red walkways and pipework at the Port Harcourt terminal.",
    title: "LPG storage terminal",
    body: "Spherical and bullet storage for liquefied petroleum gas, with tank inventory held under continuous measurement and reconciliation before any allocation is released.",
    tags: ["Rumuolumeni", "Bulk LPG"],
    note: "Tank data pending",
  },
  {
    image: "/images/control-room.jpg",
    alt: "Two Stockgap representatives walking through a red-painted plant structure with electrical control panels.",
    title: "Bottling & cylinder handling",
    body: "Cylinder filling, handling and dispatch sit alongside the terminal, supporting distribution to resellers and households. Additional bottling capacity is being developed.",
    tags: ["Cylinder filling", "Dispatch"],
    note: "Expansion: 4 regions",
  },
  {
    image: "/images/hse-inspection.jpg",
    alt: "An inspector in a branded hard hat and high-visibility vest recording notes on a clipboard during a terminal walk-down.",
    title: "Inspection & assurance",
    body: "Quantity and quality checks at receipt, documented walk-downs and recorded handovers at every stage between the jetty and the customer.",
    tags: ["Quantity checks", "Recorded handovers"],
    note: null,
  },
];

const PRODUCTS = [
  {
    icon: Flame,
    title: "Liquefied Petroleum Gas (LPG)",
    body: "Bulk LPG into storage and out to distributors, commercial users and households through cylinders and bulk road delivery.",
    points: ["Bulk storage and onward allocation", "Supply to distributors and resellers", "Cylinder refilling and exchange"],
    tag: "Verified business line",
    pending: false,
  },
  {
    icon: Droplets,
    title: "Refined petroleum products",
    body: "Bulk storage and distribution of white products — PMS, AGO and DPK — supplied through the terminal to commercial and retail buyers.",
    points: ["Premium Motor Spirit (PMS)", "Automotive Gas Oil (AGO)", "Dual Purpose Kerosene (DPK)"],
    tag: "Product slate per public sources",
    pending: false,
  },
  {
    icon: Cylinder,
    title: "Gas cylinders",
    body: "LPG cylinders supplied to distributors and retailers for household and commercial use. Cylinder manufacturing and testing scope is being confirmed.",
    points: ["Cylinder supply and exchange channels", "Distributor and retailer allocation", "Manufacturing and testing: pending confirmation"],
    tag: "Scope to be confirmed",
    pending: true,
  },
  {
    icon: Building2,
    title: "Terminal & logistics services",
    body: "Bulk storage, marine receipt at the terminal jetty and road dispatch for product moving into the South-South and beyond.",
    points: ["Terminal storage and handling", "Jetty receipt and discharge", "Truck loading and dispatch"],
    tag: "Infrastructure-based service",
    pending: false,
  },
];

/* ---------------------------------------------------------------------- page */

export function Home() {
  const latestNews = NEWS.slice(0, 3);
  const openRoles = VACANCIES.slice(0, 3);

  return (
    <>
      {/* ============================== HERO ============================== */}
      <section id="top" className="relative isolate overflow-hidden bg-[#06120C] text-white">
        <img
          src="/images/terminal-jetty.jpg"
          alt="Marine jetty used to receive LPG cargoes at the Port Harcourt terminal"
          className="absolute inset-0 size-full object-cover object-[center_42%]"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,12,8,.90)_0%,rgba(4,12,8,.54)_34%,rgba(4,12,8,.74)_72%,rgba(4,12,8,.95)_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_78%_12%,rgba(10,125,56,.32),transparent_62%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 md:px-7">
          <div className="pt-[132px] md:pt-[172px]">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(168,219,186,.28)] bg-[rgba(8,30,18,.55)] px-3 py-[7px] text-[11px] font-semibold tracking-[0.1em] text-[#D3EBDB] uppercase backdrop-blur-sm">
              <i className="size-[5px] rounded-full bg-[#E04A41] shadow-[0_0_0_3px_rgba(224,74,65,.18)]" aria-hidden />
              Downstream energy infrastructure · Port Harcourt, Nigeria
            </span>
            <h1 className="mt-6 max-w-[19ch] text-[clamp(2.3rem,5.2vw,4.15rem)] leading-[1.03] font-semibold tracking-[-0.035em]">
              LPG and refined products, stored, moved and <em className="text-[#A8DBBA] not-italic">accounted for</em>.
            </h1>
            <p className="mt-6 max-w-[56ch] text-[17px] leading-[1.66] text-[rgba(234,241,246,.8)]">
              Stockgap Fuels Limited operates LPG storage and downstream distribution from its Port Harcourt terminal,
              supplying LPG, PMS, AGO and DPK across the South-South — with cylinder bottling and distribution expanding
              to new regions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/operations"
                className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-brand px-5 py-[13px] text-sm leading-none font-semibold text-white transition-colors hover:bg-brand-strong"
              >
                Explore our operations
                <ArrowRight className="size-[15px]" />
              </Link>
              <Link
                to="/news"
                className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-white/30 bg-white/5 px-5 py-[13px] text-sm leading-none font-medium text-white transition-colors hover:border-white/60 hover:bg-white/12"
              >
                News &amp; insights
              </Link>
            </div>
          </div>

          <dl className="mt-14 grid gap-8 border-t border-white/18 pt-7 sm:grid-cols-2 lg:grid-cols-4">
            {HERO_FACTS.map(([value, label]) => (
              <div key={value}>
                <dd className="text-[clamp(1.35rem,2.3vw,1.85rem)] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                  {value}
                </dd>
                <dt className="mt-2 max-w-[24ch] text-[12px] leading-[1.5] text-[rgba(234,241,246,.66)]">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="pb-6 pt-4 font-mono text-[11px] leading-relaxed tracking-[0.02em] text-[rgba(234,241,246,.45)]">
            Capacity reporting differs between publications. Both figures are shown with their sources —{" "}
            <Link to="/about" className="underline decoration-white/30 underline-offset-2 hover:text-white">
              research notes
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ============================= COMPANY ============================ */}
      <section id="company" className="scroll-mt-24 border-b border-line bg-surface">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 py-24 md:px-7 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            <Eyebrow>The company</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.75rem,3.1vw,2.55rem)] leading-[1.14] font-semibold tracking-[-0.028em] text-ink">
              A Port Harcourt terminal built to shorten the LPG journey.
            </h2>
            <p className="mt-4 text-[16px] leading-[1.7] text-muted">
              Stockgap Fuels Limited was incorporated in Nigeria as a private limited liability company and is engaged
              in the distribution of refined petroleum products and Liquefied Petroleum Gas (LPG), sourced directly from
              international trading partners or through coastal lifting under a strategic alliance with the NNPC.
            </p>
            <p className="mt-4 text-[16px] leading-[1.7] text-muted">
              The terminal at Rumuolumeni was commissioned in 2019, ending the practice of shipping product to Lagos and
              trucking it back to the Niger Delta. Product now discharges directly at the Port Harcourt jetty for onward
              distribution to distributors, retailers and households in the region.
            </p>

            <dl className="mt-7 grid border-t border-line">
              {COMPANY_FACTS.map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 border-b border-line py-[15px] sm:grid-cols-[148px_1fr] sm:items-baseline sm:gap-5"
                >
                  <dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{label}</dt>
                  <dd className="text-[15px] leading-[1.6] text-ink-soft">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <TextLink to="/about">About the company</TextLink>
            </div>
          </div>

          <figure className="relative">
            <span className="absolute top-3.5 left-3.5 z-10 rounded-[3px] border border-white/18 bg-[rgba(6,18,12,.72)] px-2 py-1 font-mono text-[10px] tracking-[0.07em] text-white uppercase backdrop-blur-sm">
              Company photograph
            </span>
            <img
              src="/images/leadership-visit.jpg"
              alt="Stockgap Fuels personnel in high-visibility vests and a branded helmet standing in front of the LPG spheres and tanker loading bays at the Port Harcourt terminal."
              loading="lazy"
              className="aspect-[4/3] w-full rounded-[5px] object-cover shadow-[var(--shadow-md)]"
            />
            <figcaption className="mt-3 flex gap-2.5 text-[12px] leading-[1.55] text-muted">
              <span className="mt-2 h-px w-3.5 flex-none bg-line-strong" aria-hidden />
              Terminal visit at the LPG storage facility, Port Harcourt. Photograph supplied by the company.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* =========================== OPERATIONS =========================== */}
      <section id="operations" className="scroll-mt-24 border-b border-line bg-surface-2">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-24 md:px-7">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_.8fr] lg:items-end">
            <div>
              <Eyebrow>Operations &amp; infrastructure</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.75rem,3.1vw,2.55rem)] leading-[1.14] font-semibold tracking-[-0.028em] text-ink">
                One terminal, four products, a regional distribution footprint.
              </h2>
              <p className="mt-4 max-w-[64ch] text-[17px] leading-[1.65] text-muted">
                Storage, marine receipt and cylinder handling sit on a single site, which shortens the distance between
                a cargo discharge and the truck that serves a distributor.
              </p>
            </div>
            <p className="border-l-2 border-line-strong pl-4 text-[13px] leading-[1.6] text-muted">
              Tank counts, working capacities and throughput figures are not published. Details are marked as pending
              confirmation rather than estimated.
            </p>
          </div>

          <div className="mt-11 grid gap-6 md:grid-cols-3">
            {OPERATIONS.map((item) => (
              <article
                key={item.title}
                className="group flex flex-col overflow-hidden rounded-[5px] border border-line bg-surface shadow-[var(--shadow-sm)]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-surface-2">
                  <img
                    src={item.image}
                    alt={item.alt}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-[22px] pb-[26px]">
                  <h3 className="text-[17px] leading-snug font-semibold tracking-[-0.015em] text-ink">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.62] text-muted">{item.body}</p>
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-[3px] border border-line bg-surface-2 px-[7px] py-1 font-mono text-[10px] tracking-[0.05em] text-muted uppercase"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.note ? (
                      <span className="inline-flex items-center rounded-[3px] border border-[#EEDCBC] bg-warn-soft px-2 py-1 text-[11px] font-semibold text-warn">
                        {item.note}
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8">
            <TextLink to="/operations">Visit the operations page</TextLink>
          </div>
        </div>
      </section>

      {/* ============================ PRODUCTS ============================ */}
      <section id="products" className="scroll-mt-24 border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-24 md:px-7">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[74ch]">
              <Eyebrow>Products &amp; services</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.75rem,3.1vw,2.55rem)] leading-[1.14] font-semibold tracking-[-0.028em] text-ink">
                What Stockgap stores, supplies and distributes.
              </h2>
              <p className="mt-4 max-w-[64ch] text-[17px] leading-[1.65] text-muted">
                Four verified product lines. Specifications, grades and cylinder sizes are deliberately omitted until the
                company confirms them for publication.
              </p>
            </div>
            <TextLink to="/products">Product detail</TextLink>
          </div>

          <div className="mt-11 grid gap-[22px] md:grid-cols-2">
            {PRODUCTS.map((product) => (
              <Link
                key={product.title}
                to="/products"
                className="group flex flex-col rounded-[5px] border border-line bg-surface px-7 pt-7 pb-[30px] transition-colors hover:border-line-strong"
              >
                <span className="mb-[18px] grid size-[38px] place-items-center rounded-[4px] border border-brand/20 bg-brand-soft text-brand">
                  <product.icon className="size-[19px]" aria-hidden />
                </span>
                <h3 className="flex items-center gap-2 text-[17px] leading-snug font-semibold tracking-[-0.015em] text-ink">
                  {product.title}
                  <ArrowUpRight className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </h3>
                <p className="mt-2.5 text-[14px] leading-[1.65] text-muted">{product.body}</p>
                <ul className="mt-[18px] grid gap-2">
                  {product.points.map((point) => (
                    <li key={point} className="relative pl-[19px] text-[14px] leading-[1.5] text-ink-soft">
                      <span
                        className="absolute top-[7px] left-0 size-[7px] rounded-[2px] bg-brand opacity-55"
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5">
                  <span
                    className={cx(
                      "inline-flex rounded-[3px] border px-2 py-1",
                      product.pending
                        ? "border-warn/30 bg-warn-soft text-[11px] font-semibold text-warn"
                        : "border-line bg-surface-2 font-mono text-[10px] tracking-[0.05em] text-muted uppercase",
                    )}
                  >
                    {product.tag}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ PARTNERS =========================== */}
      <section id="partners" className="scroll-mt-24 border-b border-line bg-surface-2">
        <div className="mx-auto w-full max-w-[1200px] px-5 pt-20 pb-9 md:px-7">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <Eyebrow>Partners &amp; affiliations</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.6rem,2.8vw,2.25rem)] leading-[1.14] font-semibold tracking-[-0.028em] text-ink">
                The institutions behind the supply chain.
              </h2>
            </div>
            <p className="max-w-[40ch] text-[12px] leading-[1.6] text-muted">
              Bodies named in public reporting about the company. Marks are typographic abbreviations, not official
              logos, and inclusion is not an endorsement.
            </p>
          </div>
        </div>

        <div className="marquee relative overflow-hidden border-y border-line bg-surface">
          <div className="animate-marquee flex w-max items-stretch">
            {[...PARTNERS, ...PARTNERS].map((partner, index) => (
              <div
                key={`${partner.abbr}-${index}`}
                aria-hidden={index >= PARTNERS.length}
                className="flex min-w-[250px] items-center gap-3.5 border-r border-line px-6 py-5"
              >
                <span className="grid size-11 flex-none place-items-center rounded-[4px] border border-brand/20 bg-brand-soft px-1 font-mono text-[9px] font-semibold tracking-[0.04em] text-brand uppercase">
                  {partner.abbr}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] leading-snug font-semibold text-ink">{partner.name}</span>
                  <span className="mt-0.5 block text-[11px] leading-[1.45] text-muted">{partner.role}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-surface to-transparent" aria-hidden />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-surface to-transparent" aria-hidden />
        </div>
      </section>

      {/* ============================= CAREERS ============================ */}
      <section id="careers" className="scroll-mt-24 border-b border-line bg-surface-2">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-24 md:px-7">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <div>
              <Eyebrow>Careers</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.75rem,3.1vw,2.55rem)] leading-[1.14] font-semibold tracking-[-0.028em] text-ink">
                Run the terminal. Keep the record straight.
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-muted">
                The work here is operational: receipts, storage, filling, dispatch and the paperwork that proves each
                movement happened the way it was described. If that kind of discipline appeals to you, we would like to
                hear from you.
              </p>
              <ul className="mt-6 grid gap-2.5">
                {[
                  "Shift-based roles at the Port Harcourt terminal",
                  "Safety and quality training is part of the job, not an extra",
                  "Records are owned by the person who makes the entry",
                ].map((point) => (
                  <li key={point} className="relative pl-[19px] text-[14px] leading-[1.55] text-ink-soft">
                    <span className="absolute top-[7px] left-0 size-[7px] rounded-[2px] bg-brand opacity-55" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <TextLink to="/careers">See all open roles</TextLink>
              </div>
            </div>

            <div className="overflow-hidden rounded-[5px] border border-line bg-surface">
              {openRoles.map((role, index) => (
                <Link
                  key={role.id}
                  to="/careers"
                  className={cx(
                    "group flex items-start gap-4 px-5 py-5 transition-colors hover:bg-canvas",
                    index > 0 && "border-t border-line",
                  )}
                >
                  <span className="mt-0.5 grid size-8 flex-none place-items-center rounded-[4px] border border-brand/20 bg-brand-soft text-brand">
                    <Briefcase className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold tracking-[-0.01em] text-ink">{role.title}</span>
                    <span className="mt-1 block text-[12px] text-muted">
                      {role.team} · {role.location} · {role.type}
                    </span>
                    <span className="mt-2 block text-[13px] leading-[1.55] text-muted">{role.summary}</span>
                  </span>
                  <ArrowUpRight className="mt-1 size-4 flex-none text-muted transition-colors group-hover:text-brand" />
                </Link>
              ))}
              <p className="border-t border-line bg-canvas px-5 py-3 text-[11px] leading-relaxed text-muted">
                Listings shown in this demonstration build are illustrative, not live vacancies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== NEWS ============================== */}
      <section id="news" className="scroll-mt-24 border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-24 md:px-7">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[70ch]">
              <Eyebrow>News &amp; insights</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.75rem,3.1vw,2.55rem)] leading-[1.14] font-semibold tracking-[-0.028em] text-ink">
                Notes on how the product actually moves.
              </h2>
              <p className="mt-4 max-w-[64ch] text-[17px] leading-[1.65] text-muted">
                Short pieces on capacity reporting, terminal operations and the records that hold a supply chain
                together.
              </p>
            </div>
            <TextLink to="/news">All news &amp; insights</TextLink>
          </div>

          <div className="mt-11 grid gap-px overflow-hidden rounded-[5px] border border-line bg-line md:grid-cols-3">
            {latestNews.map((item) => (
              <Link
                key={item.slug}
                to={`/news/${item.slug}`}
                className="group flex flex-col bg-surface p-6 transition-colors hover:bg-canvas"
              >
                <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.07em] text-muted uppercase">
                  <span className="text-brand">{item.category}</span>
                  <span aria-hidden>·</span>
                  <span>{item.date}</span>
                </p>
                <h3 className="mt-3 text-[16px] leading-snug font-semibold tracking-[-0.012em] text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-[13px] leading-[1.65] text-muted">{item.summary}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand">
                  Read the note
                  <ArrowUpRight className="size-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================= SAFETY ============================= */}
      <section id="safety" className="scroll-mt-24 border-b border-line bg-surface-2">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 py-24 md:px-7 lg:grid-cols-[.95fr_1.05fr] lg:gap-16">
          <figure className="relative">
            <span className="absolute top-3.5 left-3.5 z-10 rounded-[3px] border border-white/18 bg-[rgba(6,18,12,.72)] px-2 py-1 font-mono text-[10px] tracking-[0.07em] text-white uppercase backdrop-blur-sm">
              Company photograph
            </span>
            <img
              src="/images/team-terminal.jpg"
              alt="A large group of Stockgap Fuels staff and visiting officials in high-visibility vests and hard hats standing in front of the LPG storage spheres."
              loading="lazy"
              className="aspect-[4/3] w-full rounded-[5px] object-cover shadow-[var(--shadow-md)]"
            />
            <figcaption className="mt-3 flex gap-2.5 text-[12px] leading-[1.55] text-muted">
              <span className="mt-2 h-px w-3.5 flex-none bg-line-strong" aria-hidden />
              Terminal walk-down with visiting officials and staff. Photograph supplied by the company.
            </figcaption>
          </figure>

          <div>
            <Eyebrow>Safety &amp; compliance</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.75rem,3.1vw,2.55rem)] leading-[1.14] font-semibold tracking-[-0.028em] text-ink">
              LPG is only useful if it is handled without incident.
            </h2>
            <p className="mt-4 text-[16px] leading-[1.7] text-muted">
              Storage and distribution of a flammable product depend on discipline: controlled access, documented
              inspection, trained people and records that survive an audit.
            </p>

            <div className="mt-6 grid border-t border-line">
              {[
                ["01", "Operational safety", "Permit-controlled work, documented walk-downs and recorded handovers at every transfer point."],
                ["02", "Incident and hazard reporting", "HSE observations, corrective actions and closure tracked with the same rigour as commercial records."],
                ["03", "Environmental responsibility", "LPG distribution displaces kerosene and firewood use. Claims about emissions or savings require measurement and are not made here."],
                ["04", "Regulatory alignment", "The platform is designed to record the licences, inspections and certificates that NMDPRA, SON and NUPRC requirements demand. It does not itself confer compliance."],
              ].map(([step, title, body]) => (
                <div key={step} className="grid grid-cols-[44px_1fr] gap-[18px] border-b border-line py-[18px]">
                  <i className="grid size-7 place-items-center rounded-[3px] border border-brand/20 bg-brand-soft font-mono text-[11px] text-brand not-italic">
                    {step}
                  </i>
                  <div>
                    <b className="text-[15px] font-semibold tracking-[-0.012em] text-ink">{title}</b>
                    <p className="mt-1.5 max-w-[52ch] text-[14px] leading-[1.62] text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[4px] border border-warn/30 bg-warn-soft px-5 py-[18px] text-[13px] leading-[1.6] text-warn">
              <b className="text-ink">Certifications and licences are pending confirmation.</b> No regulatory
              approval, certification or compliance status is asserted on this page. Verified credentials will be
              published once confirmed by the company and its advisers.
            </div>
          </div>
        </div>
      </section>

      {/* ============================= CONTACT ============================ */}
      <section id="contact" className="scroll-mt-24 bg-surface">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-24 md:px-7">
          <div className="max-w-[74ch]">
            <Eyebrow>Contact &amp; business enquiries</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.75rem,3.1vw,2.55rem)] leading-[1.14] font-semibold tracking-[-0.028em] text-ink">
              Talk to the terminal.
            </h2>
            <p className="mt-4 text-[17px] leading-[1.65] text-muted">
              Supply enquiries, distribution partnerships and supplier onboarding all start here.
            </p>
          </div>

          <div className="mt-11 grid gap-6 lg:grid-cols-2 lg:gap-14">
            <div className="rounded-[5px] border border-line bg-surface p-[30px] shadow-[var(--shadow-sm)]">
              <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">Head office &amp; terminal</h3>
              <dl className="mt-6 grid border-t border-line">
                {[
                  ["Address", <>Eagle Cement Road, Rumuolumeni<br />Port Harcourt, Rivers State, Nigeria<br /><small className="mt-1 block text-[12px] text-muted">As published on the company website — to be confirmed</small></>],
                  ["Telephone", <>+234 (84) 700 149<br /><small className="mt-1 block text-[12px] text-muted">Published number; current lines to be confirmed</small></>],
                  ["Email", <>Official email address to be confirmed<br /><small className="mt-1 block text-[12px] text-muted">Deliberately not invented</small></>],
                  ["Portal", <>Authorised staff and partners — <Link to="/login" className="text-brand underline decoration-brand/30 underline-offset-2">portal access</Link></>],
                ].map(([label, value]) => (
                  <div key={String(label)} className="grid gap-1 border-b border-line py-3.5 text-[14px] sm:grid-cols-[120px_1fr] sm:gap-4">
                    <dt className="font-mono text-[11px] tracking-[0.07em] text-muted uppercase">{label}</dt>
                    <dd className="text-ink-soft">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-[5px] border border-line bg-surface p-[30px] shadow-[var(--shadow-sm)]">
              <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">Send an enquiry</h3>
              <p className="mt-2.5 text-[14px] leading-[1.65] text-muted">
                Share the product, volume and destination and the commercial desk will confirm availability. Enquiries
                are received by the operations team and tracked in the portal.
              </p>
              <ul className="mt-5 grid gap-2">
                {[
                  "Product supply — LPG",
                  "Product supply — PMS / AGO / DPK",
                  "Distribution partnership",
                  "Supplier / vendor registration",
                  "General enquiry",
                ].map((item) => (
                  <li key={item} className="relative pl-[19px] text-[14px] leading-[1.5] text-ink-soft">
                    <span className="absolute top-[7px] left-0 size-[7px] rounded-[2px] bg-brand opacity-55" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-[4px] bg-brand px-5 py-3.5 text-sm leading-none font-semibold text-white transition-colors hover:bg-brand-strong"
              >
                Open the enquiry form
                <ArrowRight className="size-[15px]" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
