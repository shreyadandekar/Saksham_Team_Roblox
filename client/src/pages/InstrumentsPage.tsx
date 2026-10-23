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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-700" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isInstitutionUser ? "My FDR Registry" : "Security Deposit & FDR Registry"}
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {isInstitutionUser
                ? "Manage and track security deposits, fixed deposit receipts, and scrutiny submissions for your institution."
                : "System-wide registry of institutional security deposits and fixed deposit receipts under AICTE regulation."}
            </p>
          </div>

          {/* Action button */}
          {isInstitutionUser && (
            <Link
              to="/instruments/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <PlusCircle className="h-4 w-4" />
              Register New FDR
            </Link>
          )}
        </div>

        {/* ── Feedback Banners ───────────────────────────────────── */}
        {actionSuccess && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <span>✓ {actionSuccess}</span>
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

        {/* ── Metric Summary Cards ───────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Records
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{meta.totalCount}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Drafts
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{meta.draftCount ?? 0}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Submitted for Scrutiny
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-700">{meta.submittedCount ?? 0}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Active Deposits
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{meta.activeCount ?? 0}</p>
          </div>
        </div>

        {/* ── Filters & Search Controls ───────────────────────────── */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by FDR number, bank name, branch..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ArrowUpDown className="h-4 w-4 text-slate-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-slate-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadInstruments()}
              title="Refresh list"
              className="p-2 border border-slate-300 rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Table & Record List ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
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
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100">
                  {instruments.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-blue-900">
                        <Link
                          to={`/instruments/${item.id}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          {item.instrumentNumber}
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.bankName}</div>
                        <div className="text-xs text-slate-500">{item.branchName}</div>
                      </td>

                      {!isInstitutionUser && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{item.institution?.name || "—"}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.institution?.code}
                          </span>
                        </td>
                      )}

                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatINR(item.amount)}
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(item.issueDate)}
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(item.maturityDate)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status as InstrumentStatus} />
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/instruments/${item.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>

                          {/* Submit quick action for owned drafts */}
                          {isInstitutionUser && item.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={(e) => handleSubmitDraft(item.id, e)}
                              disabled={submittingId === item.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                              title="Submit for scrutiny"
                            >
                              <Send className="h-3 w-3" />
                              <span>{submittingId === item.id ? "Submitting..." : "Submit"}</span>
                            </button>
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
      </main>
    </AppShell>
  );
}
