/**
 * src/components/layout/AppShell.tsx
 *
 * Master Application Shell matching SIH 2026 Reference Specification (fi.pdf).
 * Features:
 * - Topmost service notification bar (#0d1527) with status indicator
 * - Clean white navbar with dark navy brand icon, title, user profile, and sign-out
 * - Left vertical sidebar with active amber accent bar indicator
 * - Warm off-white content canvas (#fbfaf8) with responsive container
 * - Mobile sidebar drawer toggle
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
    SCRUTINY_OFFICER: "AICTE Officer",
    APPROVER: "Competent Authority",
    ADMIN: "System Administrator",
    AUDITOR: "Auditor",
    AICTE_OFFICER: "AICTE Officer",
    SYSTEM_ADMIN: "System Administrator",
  };

  // Derive initials from full name (e.g. "Ritu Malhotra" -> "RM")
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  // Navigation Items
  const primaryNavItems = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutGrid },
    { label: "FDR Registry", to: "/instruments", icon: Files },
    { label: "Maturities", to: "/maturities", icon: CalendarClock },
    { label: "Profile", to: "/profile", icon: UserCircle },
  ];

  // Secondary workflows based on user role
  const canRegisterFdr = user?.role === "INSTITUTION_USER";
  const canScrutinize =
    user?.role === "SCRUTINY_OFFICER" ||
    user?.role === "AICTE_OFFICER" ||
    user?.role === "SYSTEM_ADMIN" ||
    user?.role === "ADMIN";
  const canViewClearances = true; // All authenticated users can track clearances
  const canViewAudit =
    user?.role === "AUDITOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SYSTEM_ADMIN" ||
    user?.role === "SCRUTINY_OFFICER";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-slate-900 font-sans antialiased">
      {/* ── Main Top Navbar (Clean White matching IMAGE 3) ──────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
          {/* Left: Mobile hamburger & Brand */}
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
              className="flex items-center gap-3 cursor-pointer group select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-slate-200/90 shadow-xs group-hover:border-slate-300 transition p-0.5 shrink-0">
                <img
                  src="/assets/saksham-logo.png"
                  alt="Saksham Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                  Saksham
                </span>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Security Deposit Management
                </span>
              </div>
            </div>
          </div>

          {/* Right: User Profile & Sign Out Button */}
          {user && (
            <div className="flex items-center gap-4">
              {/* User text details */}
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.fullName}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  {roleLabels[user.role] || user.role}
                </p>
              </div>

              {/* Avatar circle with initials */}
              <div
                onClick={() => navigate("/profile")}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-300 hover:ring-2 hover:ring-sky-500/20 cursor-pointer transition select-none"
                title="View Profile"
              >
                {initials}
              </div>

              {/* Sign out button */}
              <button
                type="button"
                onClick={handleLogout}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-none"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── 3. Main Body: Sidebar + Content Canvas ────────────────────── */}
      <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
        {/* Left Sidebar (Desktop) */}
        <aside className="w-56 lg:w-60 shrink-0 bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between py-6 select-none">
          <div className="space-y-6 px-3">
            {/* Primary Navigation */}
            <nav className="space-y-1">
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
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-[#eef2f6] text-slate-900 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {/* Amber active indicator bar on the left */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-600 rounded-r" />
                    )}
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-slate-900" : "text-slate-500"
                      }`}
                    />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Separator / Modules Section */}
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3.5 mb-2">
                Workflows & Modules
              </span>

              <nav className="space-y-1">
                {/* Institution FDR Registration */}
                {canRegisterFdr && (
                  <NavLink
                    to="/instruments/new"
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? "bg-[#eef2f6] text-slate-900 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-600 rounded-r" />
                        )}
                        <FilePlus className="w-4 h-4 text-slate-500" />
                        <span>Register FDR</span>
                      </>
                    )}
                  </NavLink>
                )}

                {/* Scrutiny Queue for Officers */}
                {canScrutinize && (
                  <NavLink
                    to="/scrutiny"
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? "bg-[#eef2f6] text-slate-900 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-600 rounded-r" />
                        )}
                        <FileCheck2 className="w-4 h-4 text-slate-500" />
                        <span>Scrutiny Queue</span>
                      </>
                    )}
                  </NavLink>
                )}

                {/* Clearance Command Center */}
                {canViewClearances && (
                  <NavLink
                    to="/clearances"
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? "bg-[#eef2f6] text-slate-900 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-600 rounded-r" />
                        )}
                        <Award className="w-4 h-4 text-slate-500" />
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
                      `relative flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? "bg-[#eef2f6] text-slate-900 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-600 rounded-r" />
                        )}
                        <History className="w-4 h-4 text-slate-500" />
                        <span>Audit Log</span>
                      </>
                    )}
                  </NavLink>
                )}
              </nav>
            </div>
          </div>

          {/* Sidebar bottom institution info */}
          {user?.institution && (
            <div className="px-4 py-3 border-t border-slate-100 mx-3 rounded-xl bg-slate-50/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Institution
              </span>
              <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                {user.institution.name}
              </p>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                {user.institution.aicteId}
              </p>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 bg-white h-full p-6 shadow-2xl flex flex-col justify-between z-50">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center p-0.5 overflow-hidden">
                      <img
                        src="/assets/saksham-logo.png"
                        alt="Saksham Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Saksham</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {primaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium ${
                          isActive
                            ? "bg-[#eef2f6] text-slate-900 font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                  {canRegisterFdr && (
                    <NavLink
                      to="/instruments/new"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <FilePlus className="w-4 h-4 text-slate-500" />
                      <span>Register FDR</span>
                    </NavLink>
                  )}
                  {canScrutinize && (
                    <NavLink
                      to="/scrutiny"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <FileCheck2 className="w-4 h-4 text-slate-500" />
                      <span>Scrutiny Queue</span>
                    </NavLink>
                  )}
                  <NavLink
                    to="/clearances"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Award className="w-4 h-4 text-slate-500" />
                    <span>Clearances</span>
                  </NavLink>
                  {canViewAudit && (
                    <NavLink
                      to="/audit"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <History className="w-4 h-4 text-slate-500" />
                      <span>Audit Log</span>
                    </NavLink>
                  )}
                </nav>
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

        {/* ── Main Content Canvas ───────────────────────────────────── */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
          <div className="w-full max-w-7xl mx-auto space-y-6">
            {children}
          </div>

          {/* Reference matched footer */}
          <footer className="text-center text-[11px] text-slate-400 py-6 mt-12 border-t border-slate-200">
            Saksham · SIH 2026 prototype (PS26265) · All records shown are synthetic demonstration data.
          </footer>
        </main>
      </div>
    </div>
  );
}
