/**
 * src/pages/InstrumentsPage.tsx
 * FDR Registry page with search, filters, metrics, and role-aware instrument listing.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  RefreshCw,
  ExternalLink,
  Send,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getInstruments, submitInstrument } from "../api/instruments";
import type { Instrument, InstrumentStatus } from "../types/instrument";
import AppShell from "../components/layout/AppShell";
import StatusBadge from "../components/common/StatusBadge";
import { formatINR, formatDate } from "../utils/format";

export default function InstrumentsPage() {
  const { user } = useAuth();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [meta, setMeta] = useState<{
    totalCount: number;
    draftCount?: number;
    submittedCount?: number;
    underScrutinyCount?: number;
    activeCount?: number;
  }>({ totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Filters & Sorting state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadInstruments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInstruments({
        search: search || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
      });
      setInstruments(data.instruments);
      setMeta(data.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load instruments.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments]);

  async function handleSubmitDraft(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to submit this FDR for AICTE scrutiny?")) return;

    setSubmittingId(id);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await submitInstrument(id);
      setActionSuccess(res.message);
      await loadInstruments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit instrument.");
    } finally {
      setSubmittingId(null);
    }
  }

  const isInstitutionUser = user?.role === "INSTITUTION_USER";

  return (
    <AppShell>
      <div className="w-full space-y-6">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#CBD5E1]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-[#EFF6FF] text-[#1E40AF]">
                <FileText className="h-5 w-5 text-[#1D4ED8]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                {isInstitutionUser ? "My FDR Registry" : "Security Deposit & FDR Registry"}
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
              {isInstitutionUser
                ? "Manage and track security deposits, fixed deposit receipts, and scrutiny submissions for your institution."
                : "System-wide registry of institutional security deposits and fixed deposit receipts under regulatory oversight."}
            </p>
          </div>

          {/* Action button */}
          {isInstitutionUser && (
            <Link
              to="/instruments/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B192C] hover:bg-[#15284F] text-white rounded-md text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <PlusCircle className="h-4 w-4 text-amber-400" />
              <span>Register New FDR</span>
            </Link>
          )}
        </div>

        {/* ── Feedback Banners ───────────────────────────────────── */}
        {actionSuccess && (
          <div className="p-3.5 rounded-md bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] text-xs sm:text-sm flex items-center justify-between">
            <span>✓ {actionSuccess}</span>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-[#166534] hover:text-emerald-950 font-bold ml-4 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-md bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Metric Summary Cards ───────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm hover:border-slate-300 transition">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Records</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{meta.totalCount}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm hover:border-slate-300 transition">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drafts</p>
            <p className="mt-2 text-2xl font-bold text-slate-500">{meta.draftCount ?? 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm hover:border-slate-300 transition">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted for Scrutiny</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{meta.submittedCount ?? 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm hover:border-slate-300 transition">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Deposits</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{meta.activeCount ?? 0}</p>
          </div>
        </div>

        {/* ── Filters & Search Controls ───────────────────────────── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by FDR number, bank name, branch..."
              className="w-full pl-9 pr-4 py-2 border border-[#CBD5E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#334155]">
              <Filter className="h-4 w-4 text-[#64748B]" />
              <span className="font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_SCRUTINY">Under Scrutiny</option>
                <option value="ACTIVE">Active Deposit</option>
                <option value="CORRECTION_REQUIRED">Correction Required</option>
                <option value="MATURED">Matured</option>
                <option value="RELEASE_REQUESTED">Release Requested</option>
                <option value="RELEASED">Released</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#334155]">
              <ArrowUpDown className="h-4 w-4 text-[#64748B]" />
              <span className="font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="createdAt">Date Created</option>
                <option value="amount">Principal Amount</option>
                <option value="maturityDate">Maturity Date</option>
                <option value="issueDate">Issue Date</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={`Order: ${sortOrder.toUpperCase()}`}
                className="p-1.5 border border-[#CBD5E1] rounded-md hover:bg-[#F8FAFC] text-xs font-semibold cursor-pointer text-[#334155]"
              >
                {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadInstruments()}
              title="Refresh list"
              className="p-2 border border-[#CBD5E1] rounded-md hover:bg-[#F8FAFC] text-[#334155] cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#1D4ED8]" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Table & Record List ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-sm font-medium">Loading instrument records from database...</p>
            </div>
          ) : instruments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No instruments found</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                {search || statusFilter
                  ? "Try clearing your filters or search terms to find what you are looking for."
                  : isInstitutionUser
                  ? "Your institution has not registered any security deposits or fixed deposit receipts yet."
                  : "No FDR instruments currently match your criteria."}
              </p>
              {isInstitutionUser && !search && !statusFilter && (
                <div className="mt-5">
                  <Link
                    to="/instruments/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Register Your First FDR
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0F172A]">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase font-bold border-b border-[#CBD5E1] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">FDR Ref Number</th>
                    <th className="py-3 px-4">Issuing Bank & Branch</th>
                    {!isInstitutionUser && <th className="py-3 px-4">Institution</th>}
                    <th className="py-3 px-4 text-right">Principal Amount</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Maturity Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {instruments.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8FAFC] transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#0B192C]">
                        <Link
                          to={`/instruments/${item.id}`}
                          className="hover:text-[#1D4ED8] flex items-center gap-1.5"
                        >
                          {item.instrumentNumber}
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">{item.bankName}</div>
                        <div className="text-[11px] text-[#64748B]">{item.branchName}</div>
                      </td>

                      {!isInstitutionUser && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A]">
                            <Building2 className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                            <span>{item.institution?.name || "—"}</span>
                          </div>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            {item.institution?.code}
                          </span>
                        </td>
                      )}

                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {formatINR(item.amount)}
                      </td>

                      <td className="py-3 px-4 text-[#334155] whitespace-nowrap">
                        {formatDate(item.issueDate)}
                      </td>

                      <td className="py-3 px-4 text-[#334155] whitespace-nowrap font-medium">
                        {formatDate(item.maturityDate)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status as InstrumentStatus} />
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/instruments/${item.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition-colors hover:text-[#1D4ED8]"
                          >
                            <span>Dossier</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>

                          {/* Submit quick action for owned drafts */}
                          {isInstitutionUser && item.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={(e) => handleSubmitDraft(item.id, e)}
                              disabled={submittingId === item.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#15284F] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                              title="Submit for scrutiny"
                            >
                              <Send className="h-3 w-3 text-amber-400" />
                              <span>{submittingId === item.id ? "Submitting..." : "Submit"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary footer */}
              <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] text-[11px] text-[#64748B] flex items-center justify-between">
                <span>Showing {instruments.length} of {meta.totalCount} registered instruments</span>
                <span className="font-mono">Security Deposit &amp; FDR Registry</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
