/**
 * src/components/layout/AppShell.tsx
 * Persistent application layout: utility strip, header, role-aware sidebar / mobile drawer.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, initials } from "../../lib/roles";
import { BrandMark } from "./BrandMark";
import { ServiceStatus } from "./ServiceStatus";
import { SideNav } from "./SideNav";

export interface Crumb {
  label: string;
  to?: string;
}

interface AppShellProps {
  children: ReactNode;
  breadcrumbs?: Crumb[];
}

export default function AppShell({ children, breadcrumbs }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const menuButton = menuButtonRef.current;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      menuButton?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh flex flex-col bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-navy-900 focus:shadow-[var(--shadow-raised)]"
      >
        Skip to main content
      </a>

      {/* Utility strip */}
      <div className="bg-navy-950 text-white/80 text-[12px]">
        <div className="mx-auto flex h-8 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <span className="truncate">Fixed Deposit Receipt portal for technical institutions</span>
          <span className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline">Prototype with synthetic data</span>
            <ServiceStatus />
          </span>
        </div>
      </div>
      <div className="h-[3px] flex" aria-hidden="true">
        <span className="flex-1 bg-saffron" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-green-accent" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            {user && (
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden -ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-navy-900 hover:bg-muted"
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                aria-controls="mobile-drawer"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <Link to="/dashboard" className="min-w-0 rounded-lg" aria-label="FDR Sentinel home">
              <BrandMark />
            </Link>
          </div>

          {user && (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-lg px-1.5 py-1 hover:bg-muted min-w-0"
                aria-label={`Your profile: ${user.fullName}, ${ROLE_LABELS[user.role]}`}
              >
                <span className="hidden md:flex flex-col items-end leading-tight min-w-0">
                  <span className="text-sm font-medium text-ink truncate max-w-[200px]">
                    {user.fullName}
                  </span>
                  <span className="text-[12px] text-ink-muted">{ROLE_LABELS[user.role]}</span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[13px] font-semibold text-navy-900">
                  {initials(user.fullName)}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink-muted hover:bg-muted hover:text-ink disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        {user && (
          <aside className="hidden lg:block w-64 shrink-0 border-r border-line bg-surface">
            <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto px-3 py-5">
              <SideNav role={user.role} />
            </div>
          </aside>
        )}

        <main id="main-content" className="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-3">
              <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-muted">
                {breadcrumbs.map((c, i) => {
                  const last = i === breadcrumbs.length - 1;
                  return (
                    <li key={`${c.label}-${i}`} className="flex items-center gap-1 min-w-0">
                      {c.to && !last ? (
                        <Link to={c.to} className="hover:text-navy-900 hover:underline">
                          {c.label}
                        </Link>
                      ) : (
                        <span
                          aria-current={last ? "page" : undefined}
                          className={`truncate ${last ? "text-ink font-medium" : ""}`}
                        >
                          {c.label}
                        </span>
                      )}
                      {!last && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          {children}
        </main>
      </div>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 py-4 text-[12px] text-ink-muted sm:flex-row sm:justify-between sm:px-6">
          <span>FDR Sentinel · SIH 2026 prototype (PS26265)</span>
          <span>All records shown are synthetic demonstration data.</span>
        </div>
      </footer>

      {/* Mobile drawer */}
      {user && drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50" id="mobile-drawer">
          <div
            className="absolute inset-0 bg-navy-950/45"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col bg-surface shadow-[var(--shadow-raised)]"
          >
            <div className="flex h-16 items-center justify-between gap-2 border-b border-line px-4">
              <BrandMark compact />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-muted hover:text-ink"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-medium text-ink truncate">{user.fullName}</p>
              <p className="text-[12px] text-ink-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SideNav role={user.role} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="border-t border-line p-3">
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium text-ink hover:bg-muted disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
