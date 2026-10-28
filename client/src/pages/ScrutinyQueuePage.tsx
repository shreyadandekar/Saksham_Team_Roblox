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
      <div className="w-full space-y-6">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#CBD5E1]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-[#FEF3C7] text-[#92400E]">
                <ShieldCheck className="h-5 w-5 text-[#D97706]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                Regulatory Scrutiny Queue • Cross-Institutional Intake
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
              Review submitted tripartite FDR instruments, verify lienholder endorsement, and record administrative determinations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#92400E] font-bold border border-[#FCD34D]">
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
          <div className="bg-white p-4.5 rounded-lg border border-[#CBD5E1] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-t-4 border-t-[#D97706]">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Pending Scrutiny
            </p>
            <p className="mt-1 text-2xl font-bold text-[#D97706] font-mono">{meta.pendingCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Newly submitted deposits awaiting review
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-lg border border-[#CBD5E1] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-t-4 border-t-[#1D4ED8]">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Under Active Scrutiny
            </p>
            <p className="mt-1 text-2xl font-bold text-[#1D4ED8] font-mono">
              {meta.underScrutinyCount}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Under examination by AICTE officers
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-lg border border-[#CBD5E1] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-t-4 border-t-[#0B192C]">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Total in Queue
            </p>
            <p className="mt-1 text-2xl font-bold text-[#0F172A] font-mono">{meta.totalCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Matching current filter conditions
            </p>
          </div>
        </div>

        {/* ── Filters & Search ───────────────────────────────────── */}
        <div className="bg-white p-4 rounded-lg border border-[#CBD5E1] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by institution name, code, FDR ref, or bank..."
              className="w-full pl-9 pr-4 py-2 border border-[#CBD5E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#334155]">
              <Filter className="h-4 w-4 text-[#64748B]" />
              <span className="font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
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
              className="p-2 border border-[#CBD5E1] rounded-md hover:bg-[#F8FAFC] text-[#334155] cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#1D4ED8]" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Queue Table ────────────────────────────────────────── */}
        <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
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
              <table className="w-full text-left text-xs text-[#0F172A]">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase font-bold border-b border-[#CBD5E1] tracking-wider">
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
                <tbody className="divide-y divide-[#E2E8F0]">
                  {instruments.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#64748B] shrink-0" />
                          <div>
                            <p className="font-semibold text-[#0F172A]">
                              {item.institution?.name}
                            </p>
                            <p className="text-[11px] text-[#64748B] font-mono">
                              {item.institution?.code} • {item.institution?.institutionType}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-[#0B192C]">
                        <Link
                          to={`/instruments/${item.id}`}
                          className="hover:text-[#1D4ED8]"
                        >
                          {item.instrumentNumber}
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">{item.bankName}</div>
                        <div className="text-[11px] text-[#64748B]">{item.branchName}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {formatINR(item.amount)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status as InstrumentStatus} />
                      </td>

                      <td className="py-3 px-4 text-[11px] text-[#64748B] whitespace-nowrap">
                        {formatDateTime(item.updatedAt)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Inspect details button */}
                          <Link
                            to={`/instruments/${item.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition-colors hover:text-[#1D4ED8]"
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#2563EB] rounded-md transition-colors cursor-pointer disabled:opacity-50"
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
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#166534] bg-[#DCFCE7] hover:bg-emerald-100 border border-[#86EFAC] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                title="Approve and activate deposit"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDecision(item, "REQUEST_CORRECTION")}
                                disabled={actionLoadingId === item.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#92400E] bg-[#FEF3C7] hover:bg-amber-100 border border-[#FCD34D] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                title="Request corrections from institution"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                <span>Correction</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDecision(item, "REJECT")}
                                disabled={actionLoadingId === item.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#991B1B] bg-[#FEE2E2] hover:bg-rose-100 border border-[#FCA5A5] rounded-md transition-colors cursor-pointer disabled:opacity-50"
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

              {/* Summary footer */}
              <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] text-[11px] text-[#64748B] flex items-center justify-between">
                <span>Total {instruments.length} deposits pending officer determination</span>
                <span className="font-mono">Central Regulatory Oversight</span>
              </div>
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
      </div>
    </AppShell>
  );
}
