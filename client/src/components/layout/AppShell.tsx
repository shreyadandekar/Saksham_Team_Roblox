/**
 * src/components/layout/AppShell.tsx
 * Persistent shell: top nav + main content area.
 * Will be fleshed out in later iterations.
 */
import { Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Top Navigation ─────────────────────────────── */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <Shield className="h-7 w-7 text-sky-400" aria-hidden="true" />
          <span className="text-xl font-semibold tracking-tight">
            FDR Sentinel
          </span>
          <nav className="ml-8 flex gap-1" aria-label="Main navigation">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-700 text-white"
                    : "text-blue-200 hover:bg-blue-800 hover:text-white"
                }`
              }
            >
              Dashboard
            </NavLink>
          </nav>
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        FDR Sentinel · SIH 2026 Prototype · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
