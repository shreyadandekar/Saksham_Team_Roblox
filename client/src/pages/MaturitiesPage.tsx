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
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
          Matured {Math.abs(diffDays)}d ago
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]">
          Matures today
        </span>
      );
    } else if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
          Due in {diffDays} days
        </span>
      );
    } else if (diffDays <= 90) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
          Due in {diffDays} days
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
          In {diffDays} days
        </span>
      );
    }
  }

  function renderGroupTable(title: string, list: Instrument[]) {
    if (list.length === 0) return null;

    const totalAmount = list.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    return (
      <div className="bg-white border border-[#CBD5E1] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-0">
        <div className="p-3.5 sm:p-4 bg-[#F8FAFC] border-b border-[#CBD5E1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">{title}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-[#CBD5E1] text-[#334155]">
              {list.length} deposit{list.length === 1 ? "" : "s"}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-[#0F172A]">
            Total: {formatINR(totalAmount)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#CBD5E1] text-[10px] font-bold uppercase tracking-wider text-[#64748B] bg-white">
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
            <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
              {list.map((inst) => (
                <tr
                  key={inst.id}
                  onClick={() => navigate(`/instruments/${inst.id}`)}
                  className="hover:bg-[#F8FAFC] cursor-pointer transition group"
                >
                  <td className="py-3 px-4 font-semibold text-[#0B192C] font-mono group-hover:text-[#1D4ED8]">
                    {inst.instrumentNumber}
                  </td>
                  {isOfficerOrAdmin && (
                    <td className="py-3 px-4 font-medium text-[#0F172A] max-w-[180px] truncate">
                      {inst.institution?.name || "Institution"}
                    </td>
                  )}
                  <td className="py-3 px-4 text-[#334155]">
                    <span className="font-semibold text-[#0F172A] block">
                      {inst.bankName}
                    </span>
                    <span className="text-[11px] text-[#64748B] block truncate">
                      {inst.branchName}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#0F172A] text-right font-mono">
                    {formatINR(Number(inst.amount))}
                  </td>
                  <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                    {new Date(inst.issueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-[#0F172A]">
                      {new Date(inst.maturityDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="mt-0.5">
                      {getDaysLabel(inst.maturityDate)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inst.status} />
                  </td>
                  <td className="py-3 px-3 text-right text-[#94A3B8] group-hover:text-[#0B192C] transition">
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
        <div className="pb-3 border-b border-[#CBD5E1] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <Link to="/dashboard" className="hover:text-[#1D4ED8] transition font-medium">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[#0F172A] font-semibold">Maturities</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Statutory Maturity Radar • Multi-Tenure Tracking
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Automated tracking across 30-day, 90-day, and 1-year maturity horizons to prevent silent encashment or lapse. Released and rejected FDRs are excluded.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3.5 rounded-md bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-lg bg-white border border-[#CBD5E1] border-t-4 border-t-[#DC2626] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block tracking-wider">
              Past maturity
            </span>
            <span className="text-2xl font-bold text-[#991B1B] font-mono block">
              {categorized.pastMaturity.length}
            </span>
            <span className="text-[10px] text-[#64748B] block">Requires action</span>
          </div>

          <div className="p-4 rounded-lg bg-white border border-[#CBD5E1] border-t-4 border-t-[#D97706] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block tracking-wider">
              Within 30 days
            </span>
            <span className="text-2xl font-bold text-[#D97706] font-mono block">
              {categorized.within30.length}
            </span>
            <span className="text-[10px] text-[#D97706] font-medium block">Urgent renewal</span>
          </div>

          <div className="p-4 rounded-lg bg-white border border-[#CBD5E1] border-t-4 border-t-[#F59E0B] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block tracking-wider">
              31 to 90 days
            </span>
            <span className="text-2xl font-bold text-[#B45309] font-mono block">
              {categorized.within31To90.length}
            </span>
            <span className="text-[10px] text-[#64748B] block">T-90 window open</span>
          </div>

          <div className="p-4 rounded-lg bg-white border border-[#CBD5E1] border-t-4 border-t-[#1D4ED8] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block tracking-wider">
              91 days to 1 year
            </span>
            <span className="text-2xl font-bold text-[#1D4ED8] font-mono block">
              {categorized.within91To365.length}
            </span>
            <span className="text-[10px] text-[#64748B] block">Monitoring normal</span>
          </div>

          <div className="p-4 rounded-lg bg-white border border-[#CBD5E1] border-t-4 border-t-[#16A34A] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block tracking-wider">
              Beyond 1 year
            </span>
            <span className="text-2xl font-bold text-[#166534] font-mono block">
              {categorized.beyond1Year.length}
            </span>
            <span className="text-[10px] text-[#64748B] block">Active secure lien</span>
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
