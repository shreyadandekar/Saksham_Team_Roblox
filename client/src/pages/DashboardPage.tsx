/**
 * src/pages/DashboardPage.tsx
 * Authenticated dashboard displaying role-based information, verified database metrics,
 * Attention Priority distribution, upcoming maturities, and quick navigation.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardMetrics } from "../api/dashboard";
import type { DashboardMetricsResponse } from "../types/dashboard";
import AppShell from "../components/layout/AppShell";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { formatINR, formatDate } from "../utils/format";
import {
  Building,
  PlusCircle,
  Eye,
  ShieldCheck,
  Database,
  ArrowRight,
  AlertTriangle,
  Clock,
  Activity,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isInstitutionUser = user?.role === "INSTITUTION_USER";
  const isOfficer = user?.role === "AICTE_OFFICER";

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboardMetrics();
        if (isMounted) {
          setMetrics(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const roleHeaders: Record<
    string,
    { title: string; subtitle: string; icon: any }
  > = {
    INSTITUTION_USER: {
      title: "Institution Deposit Portal",
      subtitle:
        "Manage, register, and monitor Fixed Deposit Receipts strictly for your institution.",
      icon: Building,
    },
    SCRUTINY_OFFICER: {
      title: "AICTE Scrutiny & Regulatory Verification",
      subtitle:
        "Regulatory inspection desk, Attention Priority scoring, and document verification across institutions.",
      icon: ShieldCheck,
    },
    APPROVER: {
      title: "Competent Authority Release Approvals",
      subtitle:
        "Executive oversight, four-eyes release decision determinations, and refund confirmation.",
      icon: ShieldCheck,
    },
    ADMIN: {
      title: "System Administration & Oversight",
      subtitle:
        "Global portal audit, user credential management, and security oversight.",
      icon: Database,
    },
    AUDITOR: {
      title: "Regulatory Oversight & Audit Log",
      subtitle:
        "Independent cryptographic audit log verification and immutable export inspection.",
      icon: ShieldCheck,
    },
    AICTE_OFFICER: {
      title: "AICTE Scrutiny & Regulatory Verification",
      subtitle:
        "Regulatory inspection desk, Attention Priority scoring, and maturity monitoring across institutions.",
      icon: ShieldCheck,
    },
    SYSTEM_ADMIN: {
      title: "System Administration & Oversight",
      subtitle:
        "Global portal audit, cross-institution registry oversight, and maturity jobs.",
      icon: Database,
    },
  };

  const currentRoleInfo =
    (user && roleHeaders[user.role]) || roleHeaders.INSTITUTION_USER;
  const RoleIcon = currentRoleInfo.icon;

  const counts = metrics?.counts || {
    total: metrics?.metrics?.totalInstruments ?? 0,
    active: metrics?.metrics?.activeInstruments ?? 0,
    underScrutiny: metrics?.metrics?.underScrutinyCount ?? 0,
    submitted: metrics?.metrics?.submittedCount ?? 0,
    drafts: metrics?.metrics?.draftCount ?? 0,
    upcomingMaturities: metrics?.metrics?.upcomingMaturitiesCount ?? 0,
    maturedOrOverdue: metrics?.metrics?.maturedOrOverdueCount ?? 0,
    openDiscrepancies: metrics?.metrics?.openDiscrepanciesCount ?? 0,
    pendingReleaseRequests: metrics?.metrics?.pendingReleaseCount ?? 0,
  };

  const priorityDist = {
    critical:
      metrics?.priorityDistribution?.critical ??
      (metrics?.priorityDistribution as any)?.CRITICAL ??
      0,
    high:
      metrics?.priorityDistribution?.high ??
      (metrics?.priorityDistribution as any)?.HIGH ??
      0,
    medium:
      metrics?.priorityDistribution?.medium ??
      (metrics?.priorityDistribution as any)?.MEDIUM ??
      0,
    low:
      metrics?.priorityDistribution?.low ??
      (metrics?.priorityDistribution as any)?.LOW ??
      0,
  };

  const priorityColors = {
    CRITICAL: "bg-rose-100 text-rose-800 border-rose-300",
    HIGH: "bg-amber-100 text-amber-800 border-amber-300",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-300",
    LOW: "bg-slate-100 text-slate-800 border-slate-300",
  };

  return (
    <AppShell>
      <ErrorBoundary
        fallbackTitle="Dashboard Unavailable"
        fallbackMessage="An unexpected rendering issue occurred while displaying the dashboard. Your session and records are intact."
      >
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Welcome Banner ─────────────────────────────── */}
        <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-700 shrink-0">
              <RoleIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">
                  Welcome, {user?.fullName}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {user?.role}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {currentRoleInfo.subtitle}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Authenticated Account: {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <HealthBadge />
          </div>
        </div>

        {/* ── Error Banner (Prevents masking query failures as zero counts) ─ */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3" role="alert">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-rose-900">Database or Metrics Query Error</h3>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Key Operational Metrics Cards ────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {isInstitutionUser ? "My Total FDRs" : "Total Instruments"}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? "..." : counts.total}
            </p>
            <Link
              to="/instruments"
              className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
            >
              View Registry <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Active Security Deposits
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {loading ? "..." : counts.active}
            </p>
            <Link
              to="/instruments?status=ACTIVE"
              className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              View Active <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Upcoming Maturities (&le;90d)
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {loading ? "..." : counts.upcomingMaturities}
            </p>
            <span className="mt-2 text-xs text-slate-500 inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              Monitoring active
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Matured / Overdue
            </p>
            <p className="mt-1 text-2xl font-bold text-rose-700">
              {loading ? "..." : counts.maturedOrOverdue}
            </p>
            <span className="mt-2 text-xs text-slate-500 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              Action required
            </span>
          </div>
        </div>

        {/* ── Secondary Metrics & Attention Priority Distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attention Priority Distribution Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                Attention Priority Distribution
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">0-100 Score</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Maturity urgency and operational risk indicators scored deterministically per regulatory rules.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800 uppercase">Critical (70-100)</span>
                  <span className="text-lg font-bold text-rose-900 font-mono">
                    {loading ? "..." : priorityDist.critical}
                  </span>
                </div>
                <p className="text-[10px] text-rose-600 mt-0.5">Immediate intervention</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 uppercase">High (40-69)</span>
                  <span className="text-lg font-bold text-amber-900 font-mono">
                    {loading ? "..." : priorityDist.high}
                  </span>
                </div>
                <p className="text-[10px] text-amber-600 mt-0.5">Maturity &le;15d / Issues</p>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-yellow-800 uppercase">Medium (20-39)</span>
                  <span className="text-lg font-bold text-yellow-900 font-mono">
                    {loading ? "..." : priorityDist.medium}
                  </span>
                </div>
                <p className="text-[10px] text-yellow-600 mt-0.5">Maturity &le;30d-60d</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">Low (0-19)</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    {loading ? "..." : priorityDist.low}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Compliant / Long-term</p>
              </div>
            </div>
          </div>

          {/* Lifecycle Status Summary Card */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Workflow & Verification Pipeline
              </h2>
              <span className="text-xs text-slate-500 font-medium">PostgreSQL Database</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Drafts</span>
                <p className="text-xl font-bold text-slate-700 mt-1">{counts.drafts}</p>
                <span className="text-[10px] text-slate-400">Unsubmitted</span>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                <span className="text-[10px] font-semibold text-sky-700 uppercase">Submitted</span>
                <p className="text-xl font-bold text-sky-800 mt-1">{counts.submitted}</p>
                <span className="text-[10px] text-sky-600">Pending officer</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-semibold text-amber-700 uppercase">Under Scrutiny</span>
                <p className="text-xl font-bold text-amber-800 mt-1">{counts.underScrutiny}</p>
                <span className="text-[10px] text-amber-600">Active inspection</span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] font-semibold text-emerald-700 uppercase">Active Deposit</span>
                <p className="text-xl font-bold text-emerald-800 mt-1">{counts.active}</p>
                <span className="text-[10px] text-emerald-600">Approved & Locked</span>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100">
              <span className="text-slate-500">
                {isInstitutionUser
                  ? "Manage deposit drafts and certificates for submission."
                  : "Review pending deposits and record physical custody events."}
              </span>

              <div className="flex items-center gap-2">
                {isInstitutionUser && (
                  <Link
                    to="/instruments/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-semibold text-xs transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Register FDR</span>
                  </Link>
                )}
                <Link
                  to={isOfficer ? "/scrutiny" : "/instruments"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md font-semibold text-xs transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{isOfficer ? "Open Scrutiny Queue" : "View Registry"}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Attention Priority & Upcoming Maturities ── */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Maturity Monitoring & Attention Priority Records
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Instruments ranked by Attention Priority score with contributing conditions and calendar days to maturity.
              </p>
            </div>

            <Link
              to="/instruments"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
            >
              <span>View all in registry</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              Calculating live attention priority scores from database...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-rose-600">{error}</div>
          ) : !metrics?.topPriorityInstruments || metrics.topPriorityInstruments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No instruments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Instrument #</th>
                    <th className="py-3 px-4">Bank</th>
                    {!isInstitutionUser && <th className="py-3 px-4">Institution</th>}
                    <th className="py-3 px-4 text-right">Principal</th>
                    <th className="py-3 px-4">Maturity Date</th>
                    <th className="py-3 px-4">Days Remaining</th>
                    <th className="py-3 px-4">Attention Priority</th>
                    <th className="py-3 px-4">Score Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {metrics.topPriorityInstruments.map((inst) => {
                    const priorityBand =
                      inst.attention?.priorityBand ||
                      inst.priorityBand ||
                      "LOW";
                    const badgeClass =
                      priorityColors[priorityBand] || "bg-slate-100 text-slate-800 border-slate-200";
                    const daysRemaining =
                      inst.attention?.daysRemaining ??
                      inst.daysToMaturity ??
                      0;
                    const finalScore =
                      inst.attention?.finalScore ??
                      inst.attentionScore ??
                      0;
                    const explanation =
                      inst.attention?.explanation ||
                      inst.explanation ||
                      "Standard monitoring active";
                    const instName =
                      inst.institution?.name ||
                      inst.institutionName ||
                      "—";

                    return (
                      <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-blue-900">
                          <Link to={`/instruments/${inst.id}`} className="hover:underline">
                            {inst.instrumentNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{inst.bankName}</div>
                          {inst.branchName && (
                            <div className="text-[11px] text-slate-400">{inst.branchName}</div>
                          )}
                        </td>
                        {!isInstitutionUser && (
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800">
                              {instName}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-4 text-right font-medium text-slate-900 font-mono">
                          {formatINR(inst.amount)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatDate(inst.maturityDate)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold">
                          {daysRemaining < 0 ? (
                            <span className="text-rose-700">
                              {Math.abs(daysRemaining)}d overdue
                            </span>
                          ) : daysRemaining === 0 ? (
                            <span className="text-rose-700 font-bold">Matures Today</span>
                          ) : (
                            <span className={daysRemaining <= 30 ? "text-amber-700" : "text-slate-700"}>
                              {daysRemaining} days
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}
                          >
                            <span>{priorityBand}</span>
                            <span className="font-mono">({finalScore}/100)</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={explanation}>
                          {explanation}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Governance & Audit Note ────────────────────── */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">
            FDR Sentinel Regulatory Assurance & Milestone 5 Controls
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
            <li>
              Physical custody tracking logs receipt events, receiving officer, and physical vault locker location.
            </li>
            <li>
              Deterministic Attention Priority engine runs with calendar date interpretation in <span className="font-mono">Asia/Kolkata</span>.
            </li>
            <li>
              Automated daily scheduled jobs generate idempotent reminder alerts at 90d, 60d, 30d, 15d, and maturity.
            </li>
            <li>
              Role-based metrics strictly isolate institutional records while providing AICTE regulatory oversight.
            </li>
          </ul>
        </div>
      </main>
    </ErrorBoundary>
  </AppShell>
);
}

function HealthBadge() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">(
    "checking"
  );

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  const colours: Record<typeof status, string> = {
    checking: "bg-yellow-50 text-yellow-800 border-yellow-200",
    ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };

  const labels: Record<typeof status, string> = {
    checking: "Checking API…",
    ok: "API Connected",
    error: "API Offline",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colours[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "ok"
            ? "bg-emerald-500"
            : status === "error"
              ? "bg-red-500"
              : "bg-yellow-500"
        }`}
      />
      {labels[status]}
    </span>
  );
}
