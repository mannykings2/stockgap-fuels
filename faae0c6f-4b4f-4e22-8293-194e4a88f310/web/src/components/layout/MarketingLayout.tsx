import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { cx } from "@/components/ui/primitives";

const links = [
  { to: "/about", label: "Company" },
  { to: "/products", label: "Products" },
  { to: "/services", label: "Services" },
  { to: "/operations", label: "Operations" },
  { to: "/news", label: "News" },
  { to: "/careers", label: "Careers" },
  { to: "/contact", label: "Contact" },
];

export function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const onHero = location.pathname === "/";

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // The header stays fixed over the hero; once the page scrolls a translucent
  // dark bar fades in so the links remain legible over the content below.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={cx("min-h-screen bg-canvas", onHero && "home-site")}>
      <header
        className={cx(
          "inset-x-0 top-0 z-40",
          onHero
            ? cx(
                "fixed transition-[background-color,border-color,padding,box-shadow] duration-300",
                scrolled
                  ? "border-b border-white/10 bg-[#06120C]/92 py-3 shadow-[0_18px_40px_-28px_rgba(4,12,8,.9)] backdrop-blur-md"
                  : "border-b border-transparent bg-transparent py-5",
              )
            : "sticky border-b border-line bg-canvas/90 backdrop-blur",
        )}
      >
        <div
          className={cx(
            "mx-auto flex w-full max-w-[1200px] items-center gap-7 px-5 md:px-7",
            onHero ? "h-12" : "h-16",
          )}
        >
          <Logo onDark={onHero} />
          <nav className="ml-auto hidden items-center gap-6 lg:flex" aria-label="Primary">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  cx(
                    "border-b py-1 text-[13px] transition-colors",
                    onHero
                      ? isActive
                        ? "border-white/60 font-medium text-white"
                        : "border-transparent text-white/75 hover:border-white/45 hover:text-white"
                      : isActive
                        ? "border-brand font-medium text-ink"
                        : "border-transparent text-muted hover:text-ink",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {onHero ? (
              <>
                <ThemeToggle onDark />
                <Link
                  to="/login"
                  className="hidden items-center gap-1.5 rounded-[4px] border border-white/35 bg-white/5 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/12 sm:inline-flex"
                >
                  Client portal
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link
                  to="/login"
                  className="hidden items-center gap-1.5 rounded-[4px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-strong sm:inline-flex"
                >
                  Client portal <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className={cx(
                "inline-flex size-9 items-center justify-center rounded-[4px] border lg:hidden",
                onHero ? "border-white/30 text-white/80" : "border-line text-muted",
              )}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {open ? (
          <div
            className={cx(
              "lg:hidden",
              onHero ? "bg-[#06120C] shadow-[0_24px_48px_-24px_rgba(4,12,8,.8)]" : "border-t border-line bg-canvas",
            )}
          >
            <nav className="mx-auto grid w-full max-w-[1200px] gap-1 px-5 py-4 md:px-7" aria-label="Mobile">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    cx(
                      "rounded-[4px] px-3 py-2.5 text-sm",
                      onHero
                        ? isActive
                          ? "bg-white/10 font-medium text-white"
                          : "text-white/70"
                        : isActive
                          ? "bg-surface-2 font-medium text-ink"
                          : "text-muted",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Link
                to="/login"
                className={cx(
                  "mt-2 rounded-[4px] px-3 py-2.5 text-center text-sm font-semibold",
                  onHero ? "border border-white/35 text-white" : "bg-brand text-white",
                )}
              >
                Client portal
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-7">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
              Downstream energy infrastructure: bulk LPG and petroleum product storage and distribution, cylinder
              manufacturing, and channel supply from Port Harcourt, Rivers State.
            </p>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              This is a demonstration platform. Corporate facts are drawn from publicly available reporting;
              operational records shown in the portal are sample data.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">Company</p>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              {links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">Access</p>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              <li>
                <Link to="/login" className="hover:text-ink">
                  Client portal sign in
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-ink">
                  Demo accounts
                </Link>
              </li>
              <li>Port Harcourt, Rivers State, Nigeria</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line px-4 py-4 text-center text-[11px] text-muted">
          © {new Date().getFullYear()} Stockgap Fuels Limited · Enterprise prototype · Demonstration data only
        </div>
      </footer>
    </div>
  );
}
