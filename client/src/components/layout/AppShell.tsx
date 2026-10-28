/**
 * src/components/layout/AppShell.tsx
 *
 * SAKSHAM — Security Deposit & FDR Management Portal
 * SIH 2026 Problem Statement PS26265
 *
 * Institutional Government-Style Application Shell inspired by dashboard_page.html.
 * Preserves all role permissions, navigation rules, real user state, and session logout.
 */

import { useState, type ReactNode } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  LayoutGrid,
  Files,
  CalendarClock,
  UserCircle,
  FilePlus,
  FileCheck2,
  Award,
  History,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const roleLabels: Record<string, string> = {
    INSTITUTION_USER: "Institution User",
    SCRUTINY_OFFICER: "Scrutiny Officer",
    APPROVER: "Competent Authority",
    ADMIN: "System Administrator",
    AUDITOR: "Oversight Auditor",
    AICTE_OFFICER: "AICTE Officer",
    SYSTEM_ADMIN: "System Administrator",
  };

  const roleBadgeColors: Record<string, string> = {
    INSTITUTION_USER: "bg-blue-100 text-blue-900 border-blue-200",
    SCRUTINY_OFFICER: "bg-amber-100 text-amber-900 border-amber-200",
    APPROVER: "bg-emerald-100 text-emerald-900 border-emerald-200",
    ADMIN: "bg-purple-100 text-purple-900 border-purple-200",
    AUDITOR: "bg-indigo-100 text-indigo-900 border-indigo-200",
    AICTE_OFFICER: "bg-amber-100 text-amber-900 border-amber-200",
    SYSTEM_ADMIN: "bg-purple-100 text-purple-900 border-purple-200",
  };

  // Derive initials from full name
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  // Core navigation items
  const primaryNavItems = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutGrid },
    { label: "FDR Registry", to: "/instruments", icon: Files },
    { label: "Maturities", to: "/maturities", icon: CalendarClock },
    { label: "Profile", to: "/profile", icon: UserCircle },
  ];

  // Role permissions checks
  const canRegisterFdr = user?.role === "INSTITUTION_USER";
  const canScrutinize =
    user?.role === "SCRUTINY_OFFICER" ||
    user?.role === "AICTE_OFFICER" ||
    user?.role === "SYSTEM_ADMIN" ||
    user?.role === "ADMIN";
  const canViewClearances = true;
  const canViewAudit =
    user?.role === "AUDITOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SYSTEM_ADMIN" ||
    user?.role === "SCRUTINY_OFFICER";

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fb] text-slate-900 font-sans antialiased">
      {/* ── 1. Top Masthead & Navigation Header ─────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        {/* Tricolor ribbon */}
        <div className="h-0.5 w-full flex">
          <div className="h-full flex-1 bg-[#FF9933]" />
          <div className="h-full flex-1 bg-white" />
          <div className="h-full flex-1 bg-[#138808]" />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Mobile hamburger & Institutional Branding */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Logo & Title */}
            <div
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="h-10 w-auto flex items-center justify-center shrink-0">
                <img
                  src="/assets/national-emblem.png"
                  alt="National Emblem of India"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-slate-200 shadow-xs group-hover:border-slate-300 transition p-0.5 shrink-0">
                <img
                  src="/assets/saksham-logo.png"
                  alt="Saksham Emblem"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col justify-center border-l border-slate-200 pl-2.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold leading-none">
                  SIH 2026 PS26265 • Regulatory Authority
                </span>
                <span className="text-sm sm:text-base font-bold text-[#0e1c2f] tracking-tight leading-tight mt-0.5">
                  Saksham{" "}
                  <span className="text-xs text-slate-500 font-normal hidden sm:inline">
                    | Security Deposit &amp; FDR Management
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: User Profile & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-5">
            {user && (
              <div className="flex items-center gap-3">
                {/* User text details */}
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {user.fullName}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span
                      className={`inline-block px-1.5 py-0.2 font-semibold text-[10px] rounded border ${
                        roleBadgeColors[user.role] || "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {roleLabels[user.role] || user.role}
                    </span>
                  </div>
                </div>

                {/* Avatar with initials */}
                <div
                  onClick={() => navigate("/profile")}
                  className="w-8 h-8 rounded-full bg-[#15284F] text-amber-400 font-bold text-xs flex items-center justify-center border border-[#1c355e] hover:ring-2 hover:ring-blue-500/20 cursor-pointer transition select-none shrink-0"
                  title="View Profile"
                >
                  {initials}
                </div>

                {/* Sign out button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 transition px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                  title="Sign out of Saksham"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. Main Body: Sidebar + Content Canvas ────────────────────── */}
      <div className="flex flex-1 w-full">
        {/* Left Vertical Sidebar (Desktop) */}
        <aside className="w-64 shrink-0 bg-[#f6f8fb] hidden lg:flex flex-col py-5 select-none gap-4 px-3">

          {/* ── User Profile Card ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200/60 cursor-pointer hover:ring-2 hover:ring-blue-300/40 transition shrink-0"
                title="View Profile"
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 truncate">{user?.fullName || "Authorized User"}</h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {user ? (roleLabels[user.role] || user.role) : "Stakeholder"}
                </p>
              </div>
            </div>
            {user?.institution && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Institution</label>
                <p className="text-[11px] font-medium text-slate-700 truncate">{user.institution.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{user.institution.aicteId}</p>
              </div>
            )}
          </div>

          {/* ── Navigation Card ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm flex-1">
            <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
              Navigation
            </div>
            <nav className="space-y-0.5">
              {/* Primary nav items */}
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.to === "/instruments"
                    ? location.pathname.startsWith("/instruments") &&
                      location.pathname !== "/instruments/new"
                    : location.pathname === item.to;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              {/* Separator */}
              <div className="border-t border-slate-100 my-1.5" />

              {/* Register FDR (Institution only) */}
              {canRegisterFdr && (
                <NavLink
                  to="/instruments/new"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <FilePlus className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span>Register FDR</span>
                    </>
                  )}
                </NavLink>
              )}

              {/* Scrutiny Queue (Officers) */}
              {canScrutinize && (
                <NavLink
                  to="/scrutiny"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <FileCheck2 className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span>Scrutiny Queue</span>
                    </>
                  )}
                </NavLink>
              )}

              {/* Clearances */}
              {canViewClearances && (
                <NavLink
                  to="/clearances"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive || location.pathname.startsWith("/clearances")
                        ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Award
                        className={`w-4 h-4 shrink-0 ${
                          isActive || location.pathname.startsWith("/clearances")
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <span>Clearances</span>
                    </>
                  )}
                </NavLink>
              )}

              {/* Audit Log */}
              {canViewAudit && (
                <NavLink
                  to="/audit"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <History className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span>Audit Log</span>
                    </>
                  )}
                </NavLink>
              )}
            </nav>
          </div>

          {/* ── Quick Access Amber Card ───────────────────────────── */}
          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Quick Access
            </div>
            <ul className="text-xs space-y-1.5 text-amber-800/90 font-medium">
              <li>
                <a href="tel:18001112026" className="hover:text-amber-950 hover:underline flex items-center gap-1.5">
                  <span className="text-amber-500 font-bold">•</span> Portal Helpline
                </a>
              </li>
              <li>
                <a href="mailto:saksham-support@aicte.in" className="hover:text-amber-950 hover:underline flex items-center gap-1.5">
                  <span className="text-amber-500 font-bold">•</span> Technical Support
                </a>
              </li>
            </ul>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-[#f6f8fb] h-full p-4 shadow-2xl flex flex-col justify-between z-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <img
                      src="/assets/saksham-logo.png"
                      alt="Saksham"
                      className="w-6 h-6 object-contain"
                    />
                    <span className="text-sm font-bold text-slate-900">Saksham</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {user && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm flex items-center gap-3">
                    <div
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200/60 cursor-pointer"
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{roleLabels[user.role] || user.role}</p>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm">
                  <nav className="space-y-0.5">
                    {primaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.to === "/instruments"
                        ? location.pathname.startsWith("/instruments") && location.pathname !== "/instruments/new"
                        : location.pathname === item.to;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                            isActive
                              ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                    <div className="border-t border-slate-100 my-1.5" />
                    {canRegisterFdr && (
                      <NavLink
                        to="/instruments/new"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                            isActive
                              ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                              : "text-slate-600 hover:bg-slate-50"
                          }`
                        }
                      >
                        <FilePlus className="w-4 h-4 text-slate-400" />
                        <span>Register FDR</span>
                      </NavLink>
                    )}
                    {canScrutinize && (
                      <NavLink
                        to="/scrutiny"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                            isActive
                              ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                              : "text-slate-600 hover:bg-slate-50"
                          }`
                        }
                      >
                        <FileCheck2 className="w-4 h-4 text-slate-400" />
                        <span>Scrutiny Queue</span>
                      </NavLink>
                    )}
                    {canViewClearances && (
                      <NavLink
                        to="/clearances"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                            isActive || location.pathname.startsWith("/clearances")
                              ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                              : "text-slate-600 hover:bg-slate-50"
                          }`
                        }
                      >
                        <Award className="w-4 h-4 text-slate-400" />
                        <span>Clearances</span>
                      </NavLink>
                    )}
                    {canViewAudit && (
                      <NavLink
                        to="/audit"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                            isActive
                              ? "bg-blue-50/90 text-blue-800 font-semibold border border-blue-100"
                              : "text-slate-600 hover:bg-slate-50"
                          }`
                        }
                      >
                        <History className="w-4 h-4 text-slate-400" />
                        <span>Audit Log</span>
                      </NavLink>
                    )}
                  </nav>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 3. Main Content Canvas ─────────────────────────────────── */}
        <main className="flex-1 min-w-0 p-4 sm:p-5 lg:p-6 flex flex-col justify-between">
          <div className="w-full space-y-5">
            {children}
          </div>

          {/* Reference matched institutional footer */}
          <footer className="text-center text-[11px] text-slate-400 py-6 mt-12 border-t border-slate-200 flex flex-col items-center justify-center gap-2">
            <img
              src="/assets/national-emblem.png"
              alt="National Emblem of India"
              className="h-8 w-auto object-contain opacity-75"
            />
            <span>Saksham · SIH 2026 PS26265 Prototype · Security Deposit &amp; FDR Management · Synthetic Demonstration Data</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
