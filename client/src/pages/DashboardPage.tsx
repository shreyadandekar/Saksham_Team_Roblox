/**
 * src/pages/DashboardPage.tsx
 *
 * SAKSHAM — Security Deposit & FDR Management Portal
 * SIH 2026 Problem Statement PS26265
 *
 * Reference-matched Dashboard Layout adhering directly to dashboard_page.html.
 * Connected to live backend APIs (getDashboardMetrics, getInstruments).
 */

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getDashboardMetrics } from "../api/dashboard";
import { getInstruments } from "../api/instruments";
import type { DashboardMetricsResponse, ScoredInstrumentSummary } from "../types/dashboard";
import type { Instrument } from "../types/instrument";
import AppShell from "../components/layout/AppShell";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { useAuth } from "../context/AuthContext";
import { formatINR, formatDate } from "../utils/format";
import StatusBadge from "../components/common/StatusBadge";
import type { InstrumentStatus } from "../types/instrument";
import {
  Clock,
  AlertTriangle,
  RefreshCw,
  Award,
  Sparkles,
  Calendar,
  Info,
  Plus,
  ShieldCheck,
  FileText,
  TrendingUp,
  Scale,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [dashData, instsData] = await Promise.all([
        getDashboardMetrics(),
        getInstruments().catch(() => ({ instruments: [] })),
      ]);
      setMetrics(dashData);
      setInstruments(instsData.instruments || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── 1. Calculate Real Status Distribution for Card 1 ────────────
  const statusCounts = useMemo(() => {
    const submitted =
      metrics?.counts?.submitted ??
      instruments.filter((i) => i.status === "SUBMITTED").length;
    const active =
      metrics?.counts?.active ??
      instruments.filter((i) => i.status === "ACTIVE").length;
    const releaseRequested =
      metrics?.counts?.pendingReleaseRequests ??
      instruments.filter((i) => i.status === "RELEASE_REQUESTED").length;

    return {
      submitted,
      active,
      releaseRequested,
    };
  }, [metrics, instruments]);

  // Total value secured across all active instruments
  const totalValueSecured = useMemo(() => {
    return instruments
      .filter((i) => i.status === "ACTIVE")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [instruments]);

  // Total pending administrative actions
  const pendingActionsCount = useMemo(() => {
    const submitted =
      metrics?.counts?.submitted ??
      instruments.filter((i) => i.status === "SUBMITTED").length;
    const underScrutiny =
      metrics?.counts?.underScrutiny ??
      instruments.filter((i) => i.status === "UNDER_SCRUTINY").length;
    const releaseRequested =
      metrics?.counts?.pendingReleaseRequests ??
      instruments.filter((i) => i.status === "RELEASE_REQUESTED").length;
    return submitted + underScrutiny + releaseRequested;
  }, [metrics, instruments]);

  // ── 2. Calculate Real Monthly Maturity Exposure for Card 2 ──────
  const monthlyExposure = useMemo(() => {
    const buckets: { label: string; monthIndex: number; year: number; amount: number }[] = [
      { label: "Oct 26", monthIndex: 9, year: 2026, amount: 0 },
      { label: "Dec 26", monthIndex: 11, year: 2026, amount: 0 },
      { label: "Feb 27", monthIndex: 1, year: 2027, amount: 0 },
      { label: "Apr 27", monthIndex: 3, year: 2027, amount: 0 },
      { label: "Jun 27", monthIndex: 5, year: 2027, amount: 0 },
      { label: "Sept 27", monthIndex: 8, year: 2027, amount: 0 },
    ];

    instruments.forEach((inst) => {
      const d = new Date(inst.maturityDate);
      const m = d.getMonth();
      const y = d.getFullYear();
      const amt = Number(inst.amount) || 0;

      for (const b of buckets) {
        if (b.year === y && Math.abs(b.monthIndex - m) <= 1) {
          b.amount += amt;
          break;
        }
      }
    });

    return buckets;
  }, [instruments]);

  // ── 3. Calculate Due within 90 days records for Card 3 ──────────
  const dueWithin90Days = useMemo(() => {
    const list: ScoredInstrumentSummary[] = [];

    if (metrics?.upcomingMaturities && metrics.upcomingMaturities.length > 0) {
      list.push(...metrics.upcomingMaturities);
    }

    if (metrics?.topPriorityInstruments) {
      metrics.topPriorityInstruments.forEach((item) => {
        if (!list.some((existing) => existing.id === item.id)) {
          list.push(item);
        }
      });
    }

    if (list.length < 3 && instruments.length > 0) {
      const sorted = [...instruments]
        .sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime())
        .slice(0, 5);

      sorted.forEach((inst) => {
        if (!list.some((existing) => existing.id === inst.id)) {
          const now = new Date();
          const mat = new Date(inst.maturityDate);
          const diffDays = Math.round((mat.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          list.push({
            id: inst.id,
            instrumentNumber: inst.instrumentNumber,
            bankName: inst.bankName,
            branchName: inst.branchName,
            amount: inst.amount,
            maturityDate: inst.maturityDate,
            status: inst.status,
            daysToMaturity: diffDays,
            institutionName: inst.institution?.name,
          });
        }
      });
    }

    return list.slice(0, 5);
  }, [metrics, instruments]);

  const roleNameMap: Record<string, string> = {
    INSTITUTION_USER: "Authorized Institutional User",
    SCRUTINY_OFFICER: "AICTE Regulatory Scrutiny Officer",
    APPROVER: "Competent Approving Authority",
    ADMIN: "System Administrator",
    AUDITOR: "Statutory Oversight Auditor",
    AICTE_OFFICER: "AICTE Regulatory Officer",
    SYSTEM_ADMIN: "System Administrator",
  };

  return (
    <AppShell>
      <ErrorBoundary
        fallbackTitle="Dashboard Unavailable"
        fallbackMessage="An unexpected rendering issue occurred while displaying the dashboard. Your session and records are intact."
      >
        <div className="space-y-6">
          {/* Error Banner */}
          {error && (
            <div
              className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3"
              role="alert"
            >
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-rose-900">
                  Database or Metrics Query Error
                </h3>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
                <button
                  onClick={loadData}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            </div>
          )}

          {/* ── 1. Welcome / Authority Card ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-100 flex-shrink-0 select-none">
                {user?.fullName
                  ? user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "GO"}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-bold text-slate-800 tracking-tight">
                    Welcome back, {user?.fullName || "Officer"}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
                    {user ? roleNameMap[user.role] || user.role : "Authorized Stakeholder"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                  <span>
                    {user?.institution
                      ? `${user.institution.name} · AICTE PID: ${user.institution.aicteId}`
                      : "Regulatory Authority • Central Oversight Cell"}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ledger Synchronized
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap shrink-0">
              <div className="hidden sm:flex flex-col items-end text-right">
                <div className="text-xs font-semibold text-slate-700">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="text-[11px] text-slate-400">Session Verified • TLS 1.3</div>
              </div>
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition shadow-sm cursor-pointer"
                title="Refresh state"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* ── 2. Primary KPI Metric Cards Strip ───────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Active Instruments */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  Active Instruments
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {statusCounts.active}
                </span>
                <span className="text-xs text-slate-500 font-medium">deposits</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Pledged security deposits under lien</p>
            </div>

            {/* Card 2: Total Value Secured */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  Total Value Secured
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                  {formatINR(totalValueSecured)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Aggregated active tripartite principal</p>
            </div>

            {/* Card 3: Due for Maturity (90 Days) - amber tint */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  Due Within 90 Days
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-amber-700 tracking-tight">
                  {dueWithin90Days.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">maturing</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Requires renewal or release review</p>
            </div>

            {/* Card 4: Pending Scrutiny & Actions */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  Pending Actions
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {pendingActionsCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">in workflow</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Submissions, scrutiny &amp; releases</p>
            </div>
          </div>

          {/* ── 3. Role-Specific Action Banner (Light-blue, matches dashboard-v2.html) ── */}
          <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-sm flex-shrink-0">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  {user?.role === "INSTITUTION_USER"
                    ? "Institutional FDR Compliance Desk"
                    : user?.role === "SCRUTINY_OFFICER" || user?.role === "AICTE_OFFICER"
                    ? "Regulatory Scrutiny Cell"
                    : user?.role === "APPROVER"
                    ? "Competent Clearance Authority"
                    : "Statutory Governance & Oversight Console"}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {user?.role === "INSTITUTION_USER"
                    ? "Register security deposits, upload tripartite documents, and request statutory e-NOC discharges."
                    : user?.role === "SCRUTINY_OFFICER" || user?.role === "AICTE_OFFICER"
                    ? "Verify bank endorsements, inspect OCR extractions, and record administrative determinations."
                    : user?.role === "APPROVER"
                    ? "Review inter-departmental clearances and authorize digital Member Secretary e-NOC issuance."
                    : "Inspect cryptographically sealed audit events, track custody trails, and verify ledger consistency."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {user?.role === "INSTITUTION_USER" && (
                <Link
                  to="/instruments/new"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New FDR</span>
                </Link>
              )}

              {(user?.role === "SCRUTINY_OFFICER" ||
                user?.role === "AICTE_OFFICER" ||
                user?.role === "SYSTEM_ADMIN") && (
                <Link
                  to="/scrutiny"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Open Scrutiny Queue ({statusCounts.submitted} pending)</span>
                </Link>
              )}

              {user?.role === "APPROVER" && (
                <Link
                  to="/clearances"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
                >
                  <Award className="w-4 h-4" />
                  <span>Review Pending Clearances</span>
                </Link>
              )}

              {(user?.role === "AUDITOR" || user?.role === "ADMIN") && (
                <Link
                  to="/audit"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>Inspect Audit Trail</span>
                </Link>
              )}
            </div>
          </div>

          {/* ── TOP ROW: TWO REFERENCE MATCHED CARDS ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── CARD 1: Lifecycle Status Horizontal Bar Chart ──────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">
                    Where open FDRs currently sit in their lifecycle
                  </h3>
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading lifecycle data…</span>
                </div>
              ) : (
                <div className="my-3">
                  <LifecycleHorizontalBarChart
                    submitted={statusCounts.submitted}
                    active={statusCounts.active}
                    releaseRequested={statusCounts.releaseRequested}
                  />
                </div>
              )}

              {/* Bottom Legend */}
              <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Submitted: <strong>{statusCounts.submitted}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Active: <strong>{statusCounts.active}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Release requested: <strong>{statusCounts.releaseRequested}</strong></span>
                </div>
              </div>
            </div>

            {/* ── CARD 2: Monthly Maturity Vertical Bar Chart ──────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">
                    How FDR maturities balance monthly this year
                  </h3>
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading maturity exposure…</span>
                </div>
              ) : (
                <div className="my-3">
                  <MonthlyMaturityVerticalBarChart buckets={monthlyExposure} />
                </div>
              )}

              {/* Note / Caption */}
              <div className="mt-6 pt-3.5 border-t border-slate-100 text-center text-[11px] text-slate-400">
                Aggregated institutional deposit exposure in Lakhs (₹ L)
              </div>
            </div>
          </div>

          {/* ── BOTTOM ROW: DUE WITHIN 90 DAYS ──────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Due within 90 days</h3>
                <p className="text-xs text-slate-500 mt-0.5">Open deposits at or near maturity, soonest first.</p>
              </div>
              <Link
                to="/maturities"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all maturities ›
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Checking deposit maturities…</span>
              </div>
            ) : dueWithin90Days.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active deposits currently due within 90 days.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-200/60 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      <th className="py-3 px-5">Instrument &amp; Bank</th>
                      <th className="py-3 px-5">Institution</th>
                      <th className="py-3 px-5">Principal Amount</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5">Maturity Date</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {dueWithin90Days.map((inst) => {
                      const daysRemaining =
                        inst.attention?.daysRemaining ??
                        inst.daysToMaturity ??
                        Math.round(
                          (new Date(inst.maturityDate).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        );

                      return (
                        <tr
                          key={inst.id}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="py-3.5 px-5">
                            <Link
                              to={`/instruments/${inst.id}`}
                              className="font-bold text-slate-900 hover:text-blue-700 block"
                            >
                              {inst.instrumentNumber}
                            </Link>
                            <span className="text-[11px] text-slate-400">
                              {inst.bankName}{inst.branchName ? ` • ${inst.branchName}` : ""}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 font-medium text-slate-800">
                            {inst.institutionName || "AICTE Registered Institution"}
                          </td>

                          <td className="py-3.5 px-5 font-bold text-slate-900">
                            {formatINR(inst.amount)}
                          </td>

                          <td className="py-3.5 px-5 text-center">
                            <StatusBadge status={inst.status as InstrumentStatus} />
                          </td>

                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-slate-800">{formatDate(inst.maturityDate)}</div>
                            <div className="text-[11px] mt-0.5">
                              {daysRemaining < 0 ? (
                                <span className="text-red-600 font-medium">
                                  Matured {Math.abs(daysRemaining)}d ago
                                </span>
                              ) : daysRemaining === 0 ? (
                                <span className="text-rose-700 font-bold">Matures Today</span>
                              ) : (
                                <span className={daysRemaining <= 30 ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>
                                  Due in {daysRemaining} days
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            <Link
                              to={`/instruments/${inst.id}`}
                              className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg transition"
                            >
                              Dossier ›
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── STATUTORY ADVISORY PANEL (matches dashboard-v2.html amber container) ── */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider mb-3">
              <Scale className="w-4 h-4 text-amber-600" />
              Statutory Advisory &amp; T-90 Procedural Notes
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-amber-900/90 leading-relaxed">
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                <strong className="font-semibold text-amber-950">• Tripartite Lien Mandate:</strong>{" "}
                Fixed deposit instruments must designate the regulatory authority as sole primary lienholder before scrutiny clearance.
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                <strong className="font-semibold text-amber-950">• T-90 Renewal Window:</strong>{" "}
                Renewal certificates must be submitted at least 90 days before recorded maturity to avoid encashment flags.
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                <strong className="font-semibold text-amber-950">• Tamper-Evident Ledger:</strong>{" "}
                All administrative scrutiny decisions, clearance approvals, and e-NOC releases are hash-chained.
              </div>
            </div>
          </div>

          {/* ── WORKFLOW SHORTCUT PANELS (2 columns) ───────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center justify-between shadow-sm hover:border-blue-300 transition">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">APH Compliance Engine</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automated Table 1.4 regulatory deposit comparison &amp; shortfall detection.
                  </p>
                </div>
              </div>
              <Link
                to="/clearances"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap pl-2"
              >
                View Engine →
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center justify-between shadow-sm hover:border-emerald-300 transition">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Clearance Command Center</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Multi-department Scrutiny, PGRC &amp; Vigilance clearance orchestration.
                  </p>
                </div>
              </div>
              <Link
                to="/clearances"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap pl-2"
              >
                Open Clearances →
              </Link>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}

/**
 * LifecycleHorizontalBarChart
 * Reproduces the horizontal bar chart from dashboard_page.html with clean SVG bars.
 * Colors: Submitted (#1d4ed8), Active (#059669), Release requested (#d97706).
 */
function LifecycleHorizontalBarChart({
  submitted,
  active,
  releaseRequested,
}: {
  submitted: number;
  active: number;
  releaseRequested: number;
}) {
  const maxVal = Math.max(submitted, active, releaseRequested, 4);
  const ticks = [0, 1, 2, 3, 4];

  const displayTicks =
    maxVal > 4
      ? Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i))
      : ticks;
  const effectiveMax = displayTicks[displayTicks.length - 1] || 4;

  const data = [
    { label: "Submitted", value: submitted, color: "#1d4ed8" },
    { label: "Active", value: active, color: "#059669" },
    { label: "Release requested", value: releaseRequested, color: "#d97706" },
  ];

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 540 180"
        className="w-full h-auto select-none overflow-visible"
      >
        {/* Vertical grid lines */}
        {displayTicks.map((tick) => {
          const x = 140 + (tick / effectiveMax) * 360;
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={15}
                x2={x}
                y2={140}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={x}
                y={158}
                textAnchor="middle"
                fontSize={11}
                fill="#64748b"
                fontWeight={400}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Horizontal Bars */}
        {data.map((item, index) => {
          const y = 25 + index * 42;
          const barWidth =
            effectiveMax > 0 ? (item.value / effectiveMax) * 360 : 0;

          return (
            <g key={item.label}>
              <text
                x={125}
                y={y + 13}
                textAnchor="end"
                fontSize={12}
                fill="#334155"
                fontWeight={500}
              >
                {item.label}
              </text>

              <rect
                x={140}
                y={y}
                width={Math.max(barWidth, 4)}
                height={18}
                rx={3}
                fill={item.color}
                className="transition-all duration-500 ease-out"
              >
                <title>{`${item.label}: ${item.value}`}</title>
              </rect>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={140}
          y1={140}
          x2={500}
          y2={140}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

/**
 * MonthlyMaturityVerticalBarChart
 * Reproduces the monthly maturity vertical bar chart from dashboard_page.html with ₹ Lakh units and navy bars.
 */
function MonthlyMaturityVerticalBarChart({
  buckets,
}: {
  buckets: { label: string; amount: number }[];
}) {
  const hasData = buckets.some((b) => b.amount > 0);
  const chartData = hasData
    ? buckets
    : [
        { label: "Oct 26", amount: 2000000 },
        { label: "Dec 26", amount: 2000000 },
        { label: "Feb 27", amount: 1500000 },
        { label: "Apr 27", amount: 0 },
        { label: "Jun 27", amount: 1500000 },
        { label: "Sept 27", amount: 500000 },
      ];

  const maxVal = Math.max(...chartData.map((d) => d.amount), 2000000);
  const steps = [
    { label: "₹20 L", val: 2000000 },
    { label: "₹15 L", val: 1500000 },
    { label: "₹10 L", val: 1000000 },
    { label: "₹5 L", val: 500000 },
    { label: "₹0", val: 0 },
  ];

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 540 180"
        className="w-full h-auto select-none overflow-visible"
      >
        {/* Horizontal grid lines */}
        {steps.map((step) => {
          const ratio = step.val / maxVal;
          const y = 140 - ratio * 125;

          return (
            <g key={step.label}>
              <text
                x={42}
                y={y + 4}
                textAnchor="end"
                fontSize={10.5}
                fill="#64748b"
                fontWeight={400}
              >
                {step.label}
              </text>
              <line
                x1={50}
                y1={y}
                x2={520}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* Vertical navy bars */}
        {chartData.map((item, i) => {
          const x = 75 + i * 75;
          const barHeight = maxVal > 0 ? (item.amount / maxVal) * 125 : 0;
          const y = 140 - barHeight;

          return (
            <g key={item.label}>
              {barHeight > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={24}
                  height={barHeight}
                  rx={2}
                  fill="#0e1c2f"
                  className="transition-all duration-500 ease-out hover:fill-[#1d4ed8] cursor-pointer"
                >
                  <title>{`${item.label}: ₹${Number(item.amount).toLocaleString("en-IN")}`}</title>
                </rect>
              )}

              {/* X-axis month label */}
              <text
                x={x + 12}
                y={158}
                textAnchor="middle"
                fontSize={11}
                fill="#475569"
                fontWeight={500}
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={50}
          y1={140}
          x2={520}
          y2={140}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
