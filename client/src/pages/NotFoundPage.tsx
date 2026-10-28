/**
 * src/pages/NotFoundPage.tsx
 *
 * SAKSHAM — Security Deposit & FDR Management Portal
 * Clean, institutional 404 fallback page.
 */

import { Link } from "react-router-dom";
import { Home, LayoutDashboard, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 text-slate-900 font-sans antialiased">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs flex items-center justify-center p-2">
          <img
            src="/assets/saksham-logo.png"
            alt="Saksham Emblem"
            className="w-full h-full object-contain"
          />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>404 · Resource Not Found</span>
          </div>
          <h1 className="text-xl font-bold text-[#0e1c2f] tracking-tight">
            Record or Page Unavailable
          </h1>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            The requested resource, instrument dossier, or path does not exist on this
            regulatory portal node.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
          >
            <Home className="w-3.5 h-3.5 text-slate-500" />
            <span>Public Home</span>
          </Link>

          {user && (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0e1c2f] hover:bg-[#15284F] text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
              <span>Go to Dashboard</span>
            </Link>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Saksham · Security Deposit &amp; FDR Management · SIH 2026 PS26265
      </p>
    </div>
  );
}
