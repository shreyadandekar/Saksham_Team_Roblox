/**
 * src/pages/ScrutinyQueuePage.tsx
 * AICTE Officer Scrutiny Queue for cross-institutional scrutiny and regulatory review.
 */

import { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ShieldCheck,
  Search,
  Filter,
  Building2,
  RefreshCw,
  ExternalLink,
  Eye,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getScrutinyQueue, startScrutiny } from "../api/instruments";
import type { Instrument, InstrumentStatus } from "../types/instrument";
import AppShell from "../components/layout/AppShell";
import StatusBadge from "../components/common/StatusBadge";
import ScrutinyDecisionModal from "../components/scrutiny/ScrutinyDecisionModal";
import { formatINR, formatDateTime } from "../utils/format";

export default function ScrutinyQueuePage() {
  const { user } = useAuth();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [meta, setMeta] = useState<{
    totalCount: number;
    pendingCount: number;
    underScrutinyCount: number;
  }>({ totalCount: 0, pendingCount: 0, underScrutinyCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Scrutiny Decision Modal state
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<"APPROVE" | "REQUEST_CORRECTION" | "REJECT">("APPROVE");
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScrutinyQueue({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setInstruments(data.instruments);
      setMeta(data.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load scrutiny queue.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function handleStartScrutiny(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Initiate regulatory scrutiny on this deposit?")) return;

    setActionLoadingId(id);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await startScrutiny(id);
      setActionSuccess(res.message);
      await loadQueue();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate scrutiny.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const isOfficer = Boolean(
    user && (user.role === "SCRUTINY_OFFICER" || user.role === "AICTE_OFFICER" || user.role === "SYSTEM_ADMIN")
  );

  function handleOpenDecision(
    item: Instrument,
    defaultDecision: "APPROVE" | "REQUEST_CORRECTION" | "REJECT" = "APPROVE"
  ) {
    setSelectedInstrument(item);
    setSelectedDecision(defaultDecision);
    setIsDecisionModalOpen(true);
  }

  function handleDecisionSuccess(message?: string) {
    setIsDecisionModalOpen(false);
    setSelectedInstrument(null);
    setActionSuccess(message || "Scrutiny decision recorded successfully.");
    loadQueue();
  }

  // Frontend guard: Only AICTE_OFFICER and SYSTEM_ADMIN can access scrutiny queue
  if (user && user.role === "INSTITUTION_USER") {
    return <Navigate to="/instruments" replace />;
  }

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-amber-600" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                AICTE Scrutiny Queue
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Regulatory queue of institutional fixed deposit receipts submitted for scrutiny, validation, and compliance verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
              Officer Scrutiny Desk
            </span>
          </div>
        </div>

        {/* ── Feedback Banners ───────────────────────────────────── */}
        {actionSuccess && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Queue Metric Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending Scrutiny
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-700">{meta.pendingCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Newly submitted deposits awaiting review
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Under Active Scrutiny
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {meta.underScrutinyCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Under examination by AICTE officers
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total in Queue
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{meta.totalCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Matching current filter conditions
            </p>
          </div>
        </div>

        {/* ── Filters & Search ───────────────────────────────────── */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by institution name, code, FDR ref, or bank..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Pending & In-Review</option>
                <option value="SUBMITTED">Submitted (Pending)</option>
                <option value="UNDER_SCRUTINY">Under Scrutiny</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadQueue()}
              title="Refresh queue"
              className="p-2 border border-slate-300 rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Queue Table ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-sm font-medium">Loading scrutiny queue...</p>
            </div>
          ) : instruments.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Queue is clear</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                There are no submitted FDR instruments waiting for scrutiny matching your criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Institution</th>
                    <th className="py-3 px-4">FDR Ref Number</th>
                    <th className="py-3 px-4">Issuing Bank</th>
                    <th className="py-3 px-4 text-right">Principal Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {instruments.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.institution?.name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {item.institution?.code} • {item.institution?.institutionType}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-blue-900">
                        <Link
                          to={`/instruments/${item.id}`}
                          className="hover:underline"
                        >
                          {item.instrumentNumber}
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.bankName}</div>
                        <div className="text-xs text-slate-500">{item.branchName}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatINR(item.amount)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status as InstrumentStatus} />
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.updatedAt)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Inspect details button */}
                          <Link
                            to={`/instruments/${item.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>

                          {/* Quick Start Scrutiny button (if still SUBMITTED) */}
                          {isOfficer && item.status === "SUBMITTED" && (
                            <button
                              type="button"
                              onClick={(e) => handleStartScrutiny(item.id, e)}
                              disabled={actionLoadingId === item.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                              title="Begin scrutiny examination"
                            >
                              <Eye className="h-3 w-3" />
                              <span>{actionLoadingId === item.id ? "Updating..." : "Start Scrutiny"}</span>
                            </button>
                          )}

                          {/* Officer Scrutiny Decisions (Approve, Request Correction, Reject) */}
                          {isOfficer && (item.status === "SUBMITTED" || item.status === "UNDER_SCRUTINY") && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDecision(item, "APPROVE")}
                                disabled={actionLoadingId === item.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                title="Approve and activate deposit"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDecision(item, "REQUEST_CORRECTION")}
                                disabled={actionLoadingId === item.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                title="Request corrections from institution"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                <span>Correction</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDecision(item, "REJECT")}
                                disabled={actionLoadingId === item.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                title="Reject deposit submission"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Scrutiny Decision Modal */}
        {selectedInstrument && (
          <ScrutinyDecisionModal
            instrument={selectedInstrument}
            isOpen={isDecisionModalOpen}
            initialDecision={selectedDecision}
            onClose={() => {
              setIsDecisionModalOpen(false);
              setSelectedInstrument(null);
            }}
            onSuccess={handleDecisionSuccess}
          />
        )}
      </main>
    </AppShell>
  );
}
