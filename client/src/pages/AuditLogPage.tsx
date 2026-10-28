/**
 * src/pages/AuditLogPage.tsx
 * Milestone 8: Centralized, searchable, paginated audit log with role-aware
 * visibility, structured metadata inspection, and secure CSV export.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Filter,
  Download,
  Calendar,
  RefreshCw,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  History,
  Layers,
  Building2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";
import AuditMetadataViewer from "../components/audit/AuditMetadataViewer";
import { getAuditEvents, exportAuditCsv } from "../api/audit";
import type {
  AuditEventItem,
  AuditPagination,
  AuditFilterParams,
} from "../types/audit";
import { ACTION_REGISTRY, getActionMeta } from "../types/audit";
import { formatDateTime } from "../utils/format";

export default function AuditLogPage() {
  const { user } = useAuth();

  const isOfficerOrAdmin =
    user?.role === "SCRUTINY_OFFICER" ||
    user?.role === "APPROVER" ||
    user?.role === "ADMIN" ||
    user?.role === "AUDITOR" ||
    user?.role === "AICTE_OFFICER" ||
    user?.role === "SYSTEM_ADMIN";

  // Data states
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [pagination, setPagination] = useState<AuditPagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded row IDs for metadata viewer
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Export states
  const [exporting, setExporting] = useState<"page" | "all" | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Filter states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [entityIdFilter, setEntityIdFilter] = useState<string>("");
  const [actorIdFilter, setActorIdFilter] = useState<string>("");
  const [fromDateFilter, setFromDateFilter] = useState<string>("");
  const [toDateFilter, setToDateFilter] = useState<string>("");
  const [institutionIdFilter, setInstitutionIdFilter] = useState<string>("");

  // Build params object
  const buildCurrentParams = useCallback((): AuditFilterParams => {
    const params: AuditFilterParams = {
      page,
      limit,
    };

    if (actionFilter) params.action = actionFilter;
    if (entityTypeFilter) {
      params.entityType = entityTypeFilter as "Instrument" | "Document" | "User";
    }
    if (entityIdFilter.trim()) params.entityId = entityIdFilter.trim();
    if (actorIdFilter.trim()) params.actorId = actorIdFilter.trim();
    if (fromDateFilter) {
      // Append start of day if date only
      params.from = fromDateFilter.includes("T")
        ? fromDateFilter
        : `${fromDateFilter}T00:00:00.000Z`;
    }
    if (toDateFilter) {
      // Append end of day if date only
      params.to = toDateFilter.includes("T")
        ? toDateFilter
        : `${toDateFilter}T23:59:59.999Z`;
    }
    if (isOfficerOrAdmin && institutionIdFilter.trim()) {
      params.institutionId = institutionIdFilter.trim();
    }

    return params;
  }, [
    page,
    limit,
    actionFilter,
    entityTypeFilter,
    entityIdFilter,
    actorIdFilter,
    fromDateFilter,
    toDateFilter,
    institutionIdFilter,
    isOfficerOrAdmin,
  ]);

  const loadAuditEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditEvents(buildCurrentParams());
      setEvents(data.events);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [buildCurrentParams]);

  useEffect(() => {
    loadAuditEvents();
  }, [loadAuditEvents]);

  // Toggle single row details
  function toggleRow(id: string) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Clear all filters
  function handleResetFilters() {
    setActionFilter("");
    setEntityTypeFilter("");
    setEntityIdFilter("");
    setActorIdFilter("");
    setFromDateFilter("");
    setToDateFilter("");
    setInstitutionIdFilter("");
    setPage(1);
  }

  // Handle CSV export
  async function handleExportCsv(scope: "page" | "all") {
    setExporting(scope);
    setExportMessage(null);
    setError(null);
    try {
      const params = buildCurrentParams();
      const result = await exportAuditCsv(params, scope);
      setExportMessage(
        `Successfully exported ${result.count} audit record${
          result.count === 1 ? "" : "s"
        } (${scope === "all" ? "matching all pages" : "current page"}).`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to export audit log to CSV."
      );
    } finally {
      setExporting(null);
    }
  }

  const activeFilterCount = [
    actionFilter,
    entityTypeFilter,
    entityIdFilter,
    actorIdFilter,
    fromDateFilter,
    toDateFilter,
    institutionIdFilter,
  ].filter(Boolean).length;

  return (
    <AppShell>
      <div className="w-full space-y-6">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#CBD5E1]">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-[#1D4ED8]" />
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                Centralized Audit &amp; Regulatory Log
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
              {isOfficerOrAdmin
                ? "System-wide, immutable audit trail of all FDR operations, custody events, and regulatory transitions."
                : "Regulatory audit timeline of operations and decisions for your institution's deposits."}
            </p>
          </div>

          {/* Quick Actions: Refresh & CSV Export */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadAuditEvents()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#334155] bg-white border border-[#CBD5E1] rounded-md shadow-2xs hover:bg-[#F8FAFC] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#1D4ED8]" : ""}`} />
              Refresh
            </button>

            {/* CSV Export Dropdown Buttons */}
            <div className="inline-flex rounded-md shadow-2xs">
              <button
                type="button"
                onClick={() => handleExportCsv("page")}
                disabled={exporting !== null || events.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-l-md hover:bg-[#15284F] transition-colors disabled:opacity-50 cursor-pointer"
                title="Export currently displayed page to CSV"
              >
                <Download className="h-3.5 w-3.5 text-amber-400" />
                {exporting === "page" ? "Exporting..." : "Export Page"}
              </button>
              <button
                type="button"
                onClick={() => handleExportCsv("all")}
                disabled={exporting !== null || pagination.total === 0}
                className="inline-flex items-center px-2.5 py-2 text-xs font-semibold text-white bg-[#15284F] border-l border-blue-900 rounded-r-md hover:bg-[#1C355E] transition-colors disabled:opacity-50 cursor-pointer"
                title={`Export all ${pagination.total} matching records`}
              >
                {exporting === "all" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "All"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Banners: Feedback & Errors ──────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs text-rose-700 font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {exportMessage && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1">{exportMessage}</div>
            <button
              type="button"
              onClick={() => setExportMessage(null)}
              className="text-xs text-emerald-700 font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Filter Bar ─────────────────────────────────────────── */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-700" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Filter Audit Events
              </h2>
              {activeFilterCount > 0 && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {activeFilterCount} active
                </span>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Action Type Filter */}
            <div>
              <label htmlFor="audit-action-filter" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Action Type
              </label>
              <select
                id="audit-action-filter"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="">All Action Types</option>
                {Object.entries(ACTION_REGISTRY).map(([actionKey, meta]) => (
                  <option key={actionKey} value={actionKey}>
                    {meta.label} ({actionKey})
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter (Officers/Admins only) */}
            <div>
              <label htmlFor="audit-entity-type-filter" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Entity Type
              </label>
              <select
                id="audit-entity-type-filter"
                value={entityTypeFilter}
                disabled={!isOfficerOrAdmin}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-60"
              >
                {isOfficerOrAdmin ? (
                  <>
                    <option value="">All Entity Types</option>
                    <option value="Instrument">Instrument (FDR)</option>
                    <option value="Document">Document</option>
                    <option value="User">User / Authentication</option>
                  </>
                ) : (
                  <option value="Instrument">Instrument (FDR Only)</option>
                )}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label htmlFor="audit-from-date" className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                From Date
              </label>
              <input
                id="audit-from-date"
                type="date"
                value={fromDateFilter}
                onChange={(e) => {
                  setFromDateFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Date To */}
            <div>
              <label htmlFor="audit-to-date" className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                To Date
              </label>
              <input
                id="audit-to-date"
                type="date"
                value={toDateFilter}
                onChange={(e) => {
                  setToDateFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Entity ID Search */}
            <div>
              <label htmlFor="audit-entity-id" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Entity ID (Instrument ID)
              </label>
              <input
                id="audit-entity-id"
                type="text"
                placeholder="e.g. cm7x..."
                value={entityIdFilter}
                onChange={(e) => {
                  setEntityIdFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Actor ID Search */}
            <div>
              <label htmlFor="audit-actor-id" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Actor User ID
              </label>
              <input
                id="audit-actor-id"
                type="text"
                placeholder="e.g. user-delhi..."
                value={actorIdFilter}
                onChange={(e) => {
                  setActorIdFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Institution Filter (Officers/Admins only) */}
            {isOfficerOrAdmin && (
              <div>
                <label htmlFor="audit-institution-id" className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  Institution ID
                </label>
                <input
                  id="audit-institution-id"
                  type="text"
                  placeholder="e.g. inst-delhi-01"
                  value={institutionIdFilter}
                  onChange={(e) => {
                    setInstitutionIdFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Audit Events Table ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700">
              Showing{" "}
              <strong className="text-slate-900">
                {events.length > 0 ? (page - 1) * limit + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-900">
                {Math.min(page * limit, pagination.total)}
              </strong>{" "}
              of <strong className="text-slate-900">{pagination.total}</strong> recorded audit events
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Per page:</span>
              <select
                aria-label="Records per page"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600" />
              <p>Loading audit trail...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm space-y-2">
              <Layers className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700">No audit records found</p>
              <p className="text-xs text-slate-500">
                Try clearing or loosening your filters to view more events.
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 text-xs font-semibold text-blue-700 hover:underline"
                >
                  Clear all active filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Action & Category</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event) => {
                    const meta = getActionMeta(event.action);
                    const isExpanded = expandedRowIds.has(event.id);
                    const hasMetadata =
                      event.metadata && Object.keys(event.metadata).length > 0;

                    return (
                      <tr
                        key={event.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatDateTime(event.createdAt)}
                        </td>

                        {/* Action & Category */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta.dotClass}`}
                              />
                              <span className="font-bold text-slate-900">
                                {meta.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 pl-4.5">
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${meta.badgeClass}`}
                              >
                                {meta.categoryLabel}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {event.action}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Entity */}
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                              {event.entityType}
                            </span>
                            {event.entityType === "Instrument" ? (
                              <Link
                                to={`/instruments/${event.entityId}`}
                                className="text-blue-700 hover:text-blue-900 font-bold hover:underline inline-flex items-center gap-1"
                                title="Inspect FDR Instrument Details"
                              >
                                {event.entityId.length > 18
                                  ? `${event.entityId.slice(0, 10)}...${event.entityId.slice(-6)}`
                                  : event.entityId}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-slate-800">
                                {event.entityId.length > 20
                                  ? `${event.entityId.slice(0, 10)}...`
                                  : event.entityId}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">
                                {event.actor?.fullName || "System Engine"}
                              </p>
                              {event.actor?.email && (
                                <p className="text-[11px] font-mono text-slate-500">
                                  {event.actor.email}
                                </p>
                              )}
                              {event.actor?.role && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-mono border border-slate-200">
                                  {event.actor.role}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Metadata Details & Toggle */}
                        <td className="py-3.5 px-4 text-right align-top">
                          {hasMetadata ? (
                            <button
                              type="button"
                              onClick={() => toggleRow(event.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                            >
                              <span>{isExpanded ? "Hide Details" : "Inspect"}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              No payload
                            </span>
                          )}

                          {isExpanded && (
                            <div className="mt-2 text-left bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                              <AuditMetadataViewer
                                action={event.action}
                                metadata={event.metadata}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination Controls ──────────────────────────────── */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={!pagination.hasPrev || loading}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                &larr; Previous Page
              </button>

              <span className="text-xs text-slate-600 font-medium">
                Page <strong className="text-slate-900">{pagination.page}</strong> of{" "}
                <strong className="text-slate-900">{pagination.totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={!pagination.hasNext || loading}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next Page &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
