/**
 * src/pages/MaturitiesPage.tsx
 *
 * Maturities monitoring page matching SIH 2026 Reference Specification (fi.pdf Page 3, 4, 6, 7).
 * Groups active open deposits into:
 * - Past maturity
 * - Within 30 days
 * - 31 to 90 days
 * - 91 days to 1 year
 * - Beyond 1 year
 */

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RefreshCw,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getInstruments } from "../api/instruments";
import type { Instrument } from "../types/instrument";
import AppShell from "../components/layout/AppShell";
import StatusBadge from "../components/common/StatusBadge";
import { formatINR } from "../utils/format";

export default function MaturitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getInstruments();
        // Exclude released and rejected FDRs per reference spec note:
        // "Open deposits grouped by how soon they mature. Released and rejected FDRs are excluded."
        const openInstruments = data.instruments.filter(
          (inst) => inst.status !== "RELEASED" && inst.status !== "REJECTED"
        );
        setInstruments(openInstruments);
      } catch (err: any) {
        setError(err.message || "Failed to load maturity records.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute days difference between maturity date and today
  const categorized = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastMaturity: Instrument[] = [];
    const within30: Instrument[] = [];
    const within31To90: Instrument[] = [];
    const within91To365: Instrument[] = [];
    const beyond1Year: Instrument[] = [];

    instruments.forEach((inst) => {
      const matDate = new Date(inst.maturityDate);
      matDate.setHours(0, 0, 0, 0);
      const diffTime = matDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        pastMaturity.push(inst);
      } else if (diffDays <= 30) {
        within30.push(inst);
      } else if (diffDays <= 90) {
        within31To90.push(inst);
      } else if (diffDays <= 365) {
        within91To365.push(inst);
      } else {
        beyond1Year.push(inst);
      }
    });

    return {
      pastMaturity,
      within30,
      within31To90,
      within91To365,
      beyond1Year,
    };
  }, [instruments]);

  const isOfficerOrAdmin =
    user?.role === "SCRUTINY_OFFICER" ||
    user?.role === "AICTE_OFFICER" ||
    user?.role === "ADMIN" ||
    user?.role === "SYSTEM_ADMIN" ||
    user?.role === "AUDITOR" ||
    user?.role === "APPROVER";

  function getDaysLabel(maturityDateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matDate = new Date(maturityDateStr);
    matDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return (
        <span className="text-amber-700 font-medium">
          Matured {Math.abs(diffDays)} days ago
        </span>
      );
    } else if (diffDays === 0) {
      return <span className="text-rose-600 font-bold">Matures today</span>;
    } else {
      return (
        <span className="text-slate-500 font-medium">In {diffDays} days</span>
      );
    }
  }

  function renderGroupTable(title: string, list: Instrument[]) {
    if (list.length === 0) return null;

    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <span className="text-xs text-slate-400">
            {list.length} deposit{list.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-2.5 px-4 font-semibold">FDR NUMBER</th>
                {isOfficerOrAdmin && (
                  <th className="py-2.5 px-4 font-semibold">INSTITUTION</th>
                )}
                <th className="py-2.5 px-4 font-semibold">BANK AND BRANCH</th>
                <th className="py-2.5 px-4 font-semibold text-right">AMOUNT</th>
                <th className="py-2.5 px-4 font-semibold">ISSUED</th>
                <th className="py-2.5 px-4 font-semibold">MATURITY</th>
                <th className="py-2.5 px-4 font-semibold">STATUS</th>
                <th className="py-2.5 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {list.map((inst) => (
                <tr
                  key={inst.id}
                  onClick={() => navigate(`/instruments/${inst.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition group"
                >
                  <td className="py-3 px-4 font-semibold text-slate-900 font-mono">
                    {inst.instrumentNumber}
                  </td>
                  {isOfficerOrAdmin && (
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[180px] truncate">
                      {inst.institution?.name || "Institution"}
                    </td>
                  )}
                  <td className="py-3 px-4 text-slate-600">
                    <span className="font-medium text-slate-800 block">
                      {inst.bankName}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {inst.branchName}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 text-right font-mono">
                    {formatINR(Number(inst.amount))}
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(inst.issueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="block font-medium text-slate-800">
                      {new Date(inst.maturityDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-[10px] block">
                      {getDaysLabel(inst.maturityDate)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inst.status} />
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 group-hover:text-slate-600 transition">
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in" id="maturities-page">
        {/* Header and Breadcrumb */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link to="/dashboard" className="hover:text-slate-800 transition">
              Dashboard
            </Link>
            <span>&gt;</span>
            <span className="text-slate-700 font-medium">Maturities</span>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pt-1">
            MONITORING
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Maturities
          </h1>
          <p className="text-xs text-slate-500">
            Open deposits grouped by how soon they mature. Released and rejected
            FDRs are excluded.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Metric Ribbon matching fi.pdf Page 3, 6, 7 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Past maturity
            </span>
            <span className="text-xl font-bold text-amber-700 block">
              {categorized.pastMaturity.length}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Within 30 days
            </span>
            <span className="text-xl font-bold text-rose-600 block">
              {categorized.within30.length}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">
              31 to 90 days
            </span>
            <span className="text-xl font-bold text-slate-800 block">
              {categorized.within31To90.length}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">
              91 days to 1 year
            </span>
            <span className="text-xl font-bold text-slate-800 block">
              {categorized.within91To365.length}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Beyond 1 year
            </span>
            <span className="text-xl font-bold text-slate-800 block">
              {categorized.beyond1Year.length}
            </span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
            <p>Loading maturity timelines...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {renderGroupTable(
              `Past maturity (${categorized.pastMaturity.length})`,
              categorized.pastMaturity
            )}
            {renderGroupTable(
              `Within 30 days (${categorized.within30.length})`,
              categorized.within30
            )}
            {renderGroupTable(
              `31 to 90 days (${categorized.within31To90.length})`,
              categorized.within31To90
            )}
            {renderGroupTable(
              `91 days to 1 year (${categorized.within91To365.length})`,
              categorized.within91To365
            )}
            {renderGroupTable(
              `Beyond 1 year (${categorized.beyond1Year.length})`,
              categorized.beyond1Year
            )}

            {instruments.length === 0 && (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-400">
                No active or open deposits found.
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
