import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, Settings, X } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/features/auth/AuthProvider";
import { NAV_SECTIONS } from "@/lib/navigation";
import { cx } from "@/components/ui/primitives";
import { titleCase } from "@/lib/format";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { hasAny } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-line px-5">
        <Logo to="/portal" compact />
        {onNavigate ? (
          <button type="button" onClick={onNavigate} className="rounded p-1 text-muted lg:hidden" aria-label="Close menu">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.permissions || hasAny(...item.permissions));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-5">
              <p className="px-2 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/portal"}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cx(
                          "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] transition-colors",
                          isActive
                            ? "bg-brand-soft font-medium text-brand"
                            : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                        )
                      }
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line px-4 py-3">
        <p className="text-[10px] leading-relaxed text-muted">
          Demonstration environment. All records are sample data, not live Stockgap Fuels transactions.
        </p>
      </div>
    </div>
  );
}

export function PortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const currentItem = NAV_SECTIONS.flatMap((section) => section.items).find(
    (item) => item.to !== "/portal" && location.pathname.startsWith(item.to),
  );

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[rgb(4_10_7_/_0.6)]" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="relative h-full w-[280px] border-r border-line bg-surface">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex size-9 items-center justify-center rounded-[10px] border border-line text-muted lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>
            <div>
              <p className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">Client portal</p>
              <p className="text-sm font-semibold text-ink">
                {currentItem ? currentItem.label : location.pathname === "/portal" ? "Dashboard" : titleCase(location.pathname.split("/").filter(Boolean).pop() ?? "")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted md:inline-flex">
              Demo data
            </span>
            <NotificationBell />
            <ThemeToggle />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-[10px] border border-line bg-surface py-1.5 pr-2 pl-1.5 text-left hover:bg-surface-2"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                  {initials(user?.fullName ?? "User")}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-[140px] truncate text-[12px] font-medium text-ink">{user?.fullName}</span>
                  <span className="block max-w-[140px] truncate text-[10px] text-muted">{user?.roleLabel}</span>
                </span>
                <ChevronDown className="size-3.5 text-muted" />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-[12px] border border-line bg-surface shadow-[var(--shadow-md)]">
                  <div className="border-b border-line px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{user?.fullName}</p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                    <p className="mt-1 text-[11px] text-brand">{user?.roleLabel}</p>
                    {user?.partyName ? <p className="text-[11px] text-muted">{user.partyName}</p> : null}
                  </div>
                  <Link
                    to="/portal/settings"
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-ink-soft hover:bg-surface-2"
                  >
                    <Settings className="size-4" /> Account settings
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      navigate("/login");
                    }}
                    className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-[13px] text-danger hover:bg-surface-2"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 md:py-8">
          <div className="mb-6 flex items-start gap-2 rounded-[10px] border border-line bg-surface-2/70 px-3 py-2 text-[11px] text-muted">
            <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
            Demonstration environment: records are sample data created for this prototype and do not represent
            actual Stockgap Fuels operations, partners or transactions.
          </div>
          <Outlet />
        </main>

        <footer className="border-t border-line px-4 py-4 text-[11px] text-muted md:px-6">
          Stockgap Fuels Limited · Integrated supply chain platform · Prototype
        </footer>
      </div>
    </div>
  );
}
