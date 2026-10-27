/**
 * src/pages/ClearanceCommandCenterPage.tsx
 *
 * Dedicated Clearance Workflow Command Center for Saksham (SIH 2026 PS26265).
 * Intelligent FDR Release & Multi-Department Clearance Workflow (AICTE APH 2024–2027 Section 6.46).
 */

import { useState, useEffect, useCallback } from "react";
import {
  FileCheck2,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";
import ClearanceStatsCards from "../components/clearance/ClearanceStatsCards";
import ClearanceFilters from "../components/clearance/ClearanceFilters";
import ClearanceTable from "../components/clearance/ClearanceTable";
import { getClearanceQueue } from "../api/clearances";
import type { ClearanceQueueResponse } from "../types/clearance";

export default function ClearanceCommandCenterPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ClearanceQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("ALL");
  const [department, setDepartment] = useState("ALL");

  const loadQueue = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await getClearanceQueue({
          stage: stage !== "ALL" ? stage : undefined,
          department: department !== "ALL" ? department : undefined,
          search: search.trim() || undefined,
        });
        setData(response);
      } catch (err: any) {
        setError(err.message || "Failed to load clearance queue.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [stage, department, search]
  );

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleStageSelect = (selectedStageId: string) => {
    setStage(selectedStageId);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStage("ALL");
    setDepartment("ALL");
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12 animate-fade-in" id="clearance-command-center">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-blue-500/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  USP 2 · AICTE Statutory Workflow
                </span>
                <span className="text-xs text-slate-400">
                  APH 2024–2027 Section 6.46
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                <FileCheck2 className="w-8 h-8 text-sky-400 shrink-0" />
                FDR Clearance Command Center
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Centralized multi-department scrutiny, vigilance clearance, and
                regulatory release lifecycle management with cryptographic audit guarantees.
              </p>
            </div>

            {/* Quick Actions & Department Badge */}
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center gap-3 shrink-0">
              {user?.department && (
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                    Assigned Unit
                  </span>
                  <span className="font-bold text-sky-300">
                    {user.department.replace("_", " ")}
                  </span>
                </div>
              )}

              <button
                onClick={() => loadQueue(true)}
                disabled={refreshing || loading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                id="clearance-refresh-btn"
              >
                <RefreshCw
                  className={`w-4 h-4 text-sky-400 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                <span>{refreshing ? "Refreshing..." : "Refresh Queue"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Error Banner ───────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to load clearance requests</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => loadQueue()}
              className="text-xs font-bold text-rose-800 hover:text-rose-950 underline cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Stats Metric Cards (USP-2 Key Lifecycle Metrics) ───── */}
        {data?.stats ? (
          <ClearanceStatsCards
            stats={data.stats}
            selectedStage={stage}
            onSelectStage={handleStageSelect}
          />
        ) : loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-slate-200/60 animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {/* ── Filters Bar ────────────────────────────────────────── */}
        <ClearanceFilters
          search={search}
          stage={stage}
          department={department}
          onSearchChange={setSearch}
          onStageChange={setStage}
          onDepartmentChange={setDepartment}
          onReset={handleResetFilters}
        />

        {/* ── Searchable & Filterable Case Table ─────────────────── */}
        <ClearanceTable
          cases={data?.cases || []}
          loading={loading}
          onRefresh={() => loadQueue(true)}
        />
      </div>
    </AppShell>
  );
}
