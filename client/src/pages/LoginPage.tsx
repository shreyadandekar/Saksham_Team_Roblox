/**
 * src/pages/LoginPage.tsx
 * Secure login form communicating with POST /api/auth/login.
 * Includes development-only demo account quick-fill buttons.
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Delhi Engineering (Institution)",
    email: "inst.delhi@demo.fdr-sentinel.gov.in",
    role: "INSTITUTION_USER",
    institution: "Delhi Institute of Advanced Eng.",
  },
  {
    label: "Scrutiny Officer (Desk)",
    email: "officer.sharma@demo.fdr-sentinel.gov.in",
    role: "SCRUTINY_OFFICER",
    institution: "AICTE HQ",
  },
  {
    label: "Competent Authority (Approver)",
    email: "approver.verma@demo.fdr-sentinel.gov.in",
    role: "APPROVER",
    institution: "AICTE HQ",
  },
  {
    label: "System Administrator",
    email: "admin.sentinel@demo.fdr-sentinel.gov.in",
    role: "ADMIN",
    institution: "System Admin",
  },
  {
    label: "Oversight Auditor (Read-Only)",
    email: "auditor.patel@demo.fdr-sentinel.gov.in",
    role: "AUDITOR",
    institution: "External Audit Cell",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  // Redirect if already logged in
  if (user) {
    navigate(from, { replace: true });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setLocalError(err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleQuickFill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Demo@FDR2026!");
    setLocalError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2">
          <div className="bg-blue-900 p-2.5 rounded-xl shadow-md">
            <Shield className="h-8 w-8 text-sky-400" aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">
            FDR Sentinel
          </span>
        </div>
        <h2 className="mt-4 text-center text-xl font-semibold text-slate-800">
          Security Deposit & FDR Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          AICTE National Prototype · Problem Statement PS26265
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-slate-200">
          {localError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Official Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu.in"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* ── Demo Accounts Quick-Fill Section (Development Only) ── */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Demo Accounts (Development Only)
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                Synthetic Data
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickFill(acc.email)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-xs flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-slate-800 group-hover:text-blue-700">
                      {acc.label}
                    </p>
                    <p className="text-[11px] text-slate-500">{acc.email}</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    Fill
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Protected by HttpOnly JWT cookies & server-side role validation.
        </p>
      </div>
    </div>
  );
}
