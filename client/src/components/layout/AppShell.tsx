/**
 * src/components/layout/AppShell.tsx
 * Persistent application layout with authenticated user details and logout action.
 */

import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Shield, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const roleLabels: Record<string, string> = {
    INSTITUTION_USER: "Institution User",
    AICTE_OFFICER: "AICTE Officer",
    SYSTEM_ADMIN: "System Admin",
  };

  const roleColors: Record<string, string> = {
    INSTITUTION_USER: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    AICTE_OFFICER: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    SYSTEM_ADMIN: "bg-purple-500/20 text-purple-200 border-purple-400/30",
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Top Navigation ─────────────────────────────── */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-sky-400" aria-hidden="true" />
            <div>
              <span className="text-lg font-bold tracking-tight">
                FDR Sentinel
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-blue-300 border-l border-blue-700 pl-2">
                PS26265 Portal
              </span>
            </div>

            <nav className="ml-6 flex gap-1" aria-label="Main navigation">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-800 text-white"
                      : "text-blue-200 hover:bg-blue-800/60 hover:text-white"
                  }`
                }
              >
                Dashboard
              </NavLink>
            </nav>
          </div>

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">
                  {user.fullName}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                      roleColors[user.role] || "bg-blue-800 text-blue-200"
                    }`}
                  >
                    {roleLabels[user.role] || user.role}
                  </span>
                </div>
              </div>

              <div className="h-8 w-8 rounded-full bg-blue-800 flex items-center justify-center text-blue-200 border border-blue-700">
                <UserIcon className="h-4 w-4" />
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded-md text-blue-300 hover:text-white hover:bg-blue-800 transition-colors cursor-pointer"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200/60">
        FDR Sentinel · SIH 2026 Prototype · Synthetic Demonstration Data Only
      </footer>
    </div>
  );
}
