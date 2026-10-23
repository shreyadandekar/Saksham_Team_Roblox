/**
 * src/pages/LoginPage.tsx
 * Secure login form communicating with POST /api/auth/login.
 * Includes development-only demo account quick-fill buttons.
 */

import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CalendarClock, Eye, EyeOff, FileSearch, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";
import { BrandMark } from "../components/layout/BrandMark";
import { ROLE_LABELS } from "../lib/roles";
import type { Role } from "../types/auth";

const DEMO_PASSWORD = "Demo@FDR2026!";

const DEMO_ACCOUNTS: { label: string; email: string; role: Role }[] = [
  { label: "Delhi Institute of Advanced Eng.", email: "inst.delhi@demo.fdr-sentinel.gov.in", role: "INSTITUTION_USER" },
  { label: "Maharashtra Inst. of Pharmacy", email: "inst.pune@demo.fdr-sentinel.gov.in", role: "INSTITUTION_USER" },
  { label: "AICTE Scrutiny Officer", email: "officer.sharma@demo.fdr-sentinel.gov.in", role: "AICTE_OFFICER" },
  { label: "System Administrator", email: "admin.sentinel@demo.fdr-sentinel.gov.in", role: "SYSTEM_ADMIN" },
];

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your registered email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof loginSchema>;

const HIGHLIGHTS = [
  { icon: FileSearch, title: "Status at every stage", text: "Follow each FDR from submission through scrutiny to release." },
  { icon: CalendarClock, title: "Maturity tracking", text: "See deposits approaching maturity well before they lapse." },
  { icon: ShieldCheck, title: "Role-scoped access", text: "Institutions see their own records; officers see the full registry." },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error && err.message ? err.message : "Invalid email or password.");
    }
  }

  function quickFill(email: string) {
    setValue("email", email, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
    setServerError(null);
  }

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-canvas">
      {/* Context panel */}
      <section className="relative bg-navy-900 text-white lg:w-[44%] lg:min-h-dvh flex flex-col">
        <div className="h-[3px] flex" aria-hidden="true">
          <span className="flex-1 bg-saffron" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-green-accent" />
        </div>
        <div className="flex flex-1 flex-col px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <BrandMark inverted />
          <div className="mt-8 lg:mt-auto">
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight text-balance">
              Security deposits for technical institutions, tracked in one place.
            </h1>
            <p className="mt-3 text-sm sm:text-[15px] text-white/75 leading-relaxed max-w-md">
              FDR Sentinel keeps Fixed Deposit Receipts lodged with AICTE visible, verifiable and
              accounted for throughout their lifecycle.
            </p>
          </div>
          <ul className="mt-8 hidden sm:flex flex-col gap-5 lg:mb-auto lg:mt-10">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-[18px] w-[18px] text-saffron" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-[13px] text-white/70 mt-0.5">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[12px] text-white/55">
            SIH 2026 prototype (PS26265). All records are synthetic demonstration data.
          </p>
        </div>
      </section>

      {/* Form */}
      <main className="flex flex-1 items-start lg:items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-md">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8 shadow-[var(--shadow-card)]">
            <h2 className="text-xl font-semibold text-navy-900">Sign in to your account</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Use the credentials issued to your institution or office.
            </p>

            {serverError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm text-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="break-words">{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-5">
              <Field id="email" label="Email address" error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="name@institution.edu.in"
                  leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
                  invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
              </Field>

              <Field id="password" label="Password" error={errors.password?.message}>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
                  invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="flex h-11 w-11 items-center justify-center rounded-r-lg text-ink-muted hover:text-ink"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  }
                  {...register("password")}
                />
              </Field>

              <Button type="submit" size="lg" loading={isSubmitting} loadingText="Signing in…" className="w-full">
                Sign in
              </Button>
            </form>
          </div>

          {import.meta.env.DEV && (
            <section
              aria-labelledby="demo-heading"
              className="mt-5 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="demo-heading" className="text-sm font-semibold text-ink">
                  Demo accounts
                </h2>
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
                  Development only
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ink-muted">
                Fills in seeded test credentials. You still sign in normally.
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <li key={acc.email}>
                    <button
                      type="button"
                      onClick={() => quickFill(acc.email)}
                      className="flex w-full min-h-11 flex-col items-start rounded-lg border border-line bg-surface px-3 py-2 text-left hover:border-navy-700 hover:bg-navy-50 transition-colors duration-150"
                    >
                      <span className="text-[13px] font-medium text-ink leading-snug">{acc.label}</span>
                      <span className="text-[11px] text-ink-muted">{ROLE_LABELS[acc.role]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
