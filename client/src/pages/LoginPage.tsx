/**
 * src/pages/LoginPage.tsx
 *
 * Saksham — Security Deposit & FDR Management
 * Intelligent Security Deposit Compliance & Clearance Management
 *
 * Professional authentication screen designed in alignment with the Saksham design system.
 * Includes development-only synthetic demo account quick-fill buttons.
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  ArrowRight,
} from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Delhi Engineering (Institution)",
    email: "inst.delhi@demo.fdr-sentinel.gov.in",
    role: "INSTITUTION_USER",
    institution: "Delhi Institute of Advanced Eng.",
    roleBadge: "Institution",
  },
  {
    label: "Scrutiny Officer (Desk)",
    email: "officer.sharma@demo.fdr-sentinel.gov.in",
    role: "SCRUTINY_OFFICER",
    institution: "AICTE Scrutiny Cell",
    roleBadge: "Officer",
  },
  {
    label: "Competent Authority (Approver)",
    email: "approver.verma@demo.fdr-sentinel.gov.in",
    role: "APPROVER",
    institution: "AICTE HQ",
    roleBadge: "Approver",
  },
  {
    label: "System Administrator",
    email: "admin.sentinel@demo.fdr-sentinel.gov.in",
    role: "ADMIN",
    institution: "System Admin",
    roleBadge: "Admin",
  },
  {
    label: "Oversight Auditor (Read-Only)",
    email: "auditor.patel@demo.fdr-sentinel.gov.in",
    role: "AUDITOR",
    institution: "External Audit Cell",
    roleBadge: "Auditor",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

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
    setSelectedDemo(demoEmail);
    setLocalError(null);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* ── Brand Header ────────────────────────────────────────────── */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 overflow-hidden">
            <img
              src="/assets/saksham-logo.png"
              alt="Saksham Official Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Saksham
          </span>
        </div>
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">
          Security Deposit & FDR Management
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Intelligent Security Deposit Compliance & Clearance Management
        </p>
      </div>

      {/* ── Authentication Card ─────────────────────────────────────── */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-9 rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sign in to your account</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official institutional or regulatory credentials
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <KeyRound className="w-4 h-4 text-blue-600" />
            </div>
          </div>

          {localError && (
            <div
              className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{localError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Official Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedDemo(null);
                  }}
                  placeholder="name@institution.edu.in"
                  className="block w-full pl-9.5 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9.5 pr-10 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#0b192c] hover:bg-[#132845] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 shadow-xs transition-all disabled:opacity-60 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 text-sky-400" />
                </>
              )}
            </button>
          </form>

          {/* ── Demo Accounts Quick-Fill Section (Development Only) ── */}
          <div className="mt-7 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Demo Accounts (Development Only)
              </span>
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full font-medium">
                Synthetic Data
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = selectedDemo === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickFill(acc.email)}
                    className={`w-full text-left p-2.5 rounded-xl border transition text-xs flex justify-between items-center group cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-400 ring-1 ring-blue-400/30"
                        : "border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`font-semibold truncate ${
                            isSelected ? "text-blue-900" : "text-slate-800 group-hover:text-blue-900"
                          }`}
                        >
                          {acc.label}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {acc.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200">
                        {acc.roleBadge}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium group-hover:text-blue-600 transition">
                          Fill
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security & Isolation Assurance Note */}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Protected by HttpOnly JWT cookies & server-side role validation.
        </p>
      </div>
    </div>
  );
}
