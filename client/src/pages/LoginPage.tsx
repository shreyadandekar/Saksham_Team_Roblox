/**
 * src/pages/LoginPage.tsx
 *
 * Saksham — Security Deposit & FDR Management
 * SIH 2026 Problem Statement PS26265
 *
 * Professional government-facing authentication screen designed in alignment
 * with login_page.html reference, preserving real HttpOnly cookie-based auth.
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
  ShieldCheck,
  ChevronLeft,
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
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* ── Top Back Link & Institutional Context ───────────────────── */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[490px] mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#15284F] transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Public Portal</span>
        </Link>
      </div>

      {/* ── Regulatory Super-Header ─────────────────────────────────── */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[490px] text-center mb-6 space-y-2">
        <div className="flex items-center justify-center space-x-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
          <span className="inline-flex items-center text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-700" />
            Regulatory Deposit Oversight
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>SIH 2026 PS26265</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span className="text-emerald-700 font-bold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">
            Prototype
          </span>
        </div>

        {/* Portal Emblem & Title */}
        <div className="flex items-center justify-center space-x-3 pt-1">
          <img
            src="/assets/national-emblem.png"
            alt="National Emblem of India"
            className="h-12 w-auto object-contain"
          />
          <div className="h-8 w-px bg-slate-300" />
          <div className="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center p-1.5 border border-slate-200">
            <img
              src="/assets/saksham-logo.png"
              alt="Saksham Emblem"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0e1c2f]">
            Saksham
          </h1>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Security Deposit &amp; FDR Management
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Intelligent Security Deposit Compliance &amp; Clearance Management
          </p>
        </div>
      </div>

      {/* ── Central Authentication Card ─────────────────────────────── */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[490px]">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Card Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Sign in to your account
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official institutional or regulatory credentials
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
                <KeyRound className="w-4 h-4 text-blue-700" />
              </div>
            </div>

            {/* Error Notification */}
            {localError && (
              <div
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{localError}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Official Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
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
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Encrypted via HttpOnly Cookie
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
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
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-[#0e1c2f] hover:bg-[#15284F] text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </>
                )}
              </button>
            </form>

            {/* Synthetic / Demo Accounts Section */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  DEMO ACCOUNTS (DEVELOPMENT ONLY)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                  Synthetic Data
                </span>
              </div>

              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = selectedDemo === acc.email;
                  return (
                    <div
                      key={acc.email}
                      onClick={() => handleQuickFill(acc.email)}
                      className={`group flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-400 ring-1 ring-blue-400/30"
                          : "border-slate-200/90 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div
                          className={`text-xs font-semibold truncate ${
                            isSelected
                              ? "text-blue-900"
                              : "text-slate-800 group-hover:text-blue-900"
                          }`}
                        >
                          {acc.label}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {acc.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
                          {acc.roleBadge}
                        </span>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium group-hover:text-blue-600 transition">
                            Fill
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Security / Isolation Assurance */}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Protected by HttpOnly JWT cookies &amp; server-side role validation.
        </p>
      </div>
    </div>
  );
}
