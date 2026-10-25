/**
 * src/components/clearance/AphComplianceCard.tsx
 *
 * Feature 5 — USP 1 Integration:
 * Displays the live evaluation of the AICTE Approval Process Handbook (APH)
 * Security Deposit Compliance Engine for the instrument's institution.
 */

import { AlertTriangle, Clock, CheckCircle2, BookOpen, Scale } from "lucide-react";
import type { AphComplianceResult } from "../../types/clearance";

interface AphComplianceCardProps {
  aphResult: AphComplianceResult | null;
  instrumentAmount?: number;
}

export default function AphComplianceCard({
  aphResult,
  instrumentAmount,
}: AphComplianceCardProps) {
  if (!aphResult) return null;

  function formatRupees(amount: number | null | undefined) {
    if (amount === null || amount === undefined) return "—";
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)} Lakh (${amount.toLocaleString("en-IN")} INR)`;
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "COMPLIANT":
        return {
          label: "APH Compliant",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold",
          icon: CheckCircle2,
        };
      case "DEFICIENT":
        return {
          label: "APH Deficient",
          bg: "bg-rose-50 text-rose-800 border-rose-300 font-semibold",
          icon: AlertTriangle,
        };
      case "NEEDS_MANUAL_REVIEW":
        return {
          label: "Regulatory Review Required",
          bg: "bg-amber-50 text-amber-800 border-amber-300 font-semibold",
          icon: Clock,
        };
      case "INSUFFICIENT_DATA":
      default:
        return {
          label: "Insufficient Regulatory Data",
          bg: "bg-slate-100 text-slate-800 border-slate-300 font-medium",
          icon: Scale,
        };
    }
  }

  const badge = getStatusBadge(aphResult.complianceStatus);
  const BadgeIcon = badge.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              USP-1: APH Compliance Engine Evaluation
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                v{aphResult.regulatoryVersion}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              AICTE Approval Process Handbook 2024–2027, Section 1.12, Table 1.4
            </p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${badge.bg}`}>
          <BadgeIcon className="w-3.5 h-3.5" />
          {badge.label}
        </span>
      </div>

      {/* Financial Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Calculated Statutory Requirement</span>
          <span className="text-lg font-bold text-slate-900">
            {formatRupees(aphResult.calculatedRequirement)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Multiplier: {aphResult.applicableMultiplier ? `${aphResult.applicableMultiplier}x` : "1.0x (Standard)"}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Deposited Amount Compared</span>
          <span className="text-lg font-bold text-slate-900">
            {formatRupees(aphResult.amountBeingCompared || instrumentAmount)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Single / Multi-Instrument Portfolio
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Difference (Excess / Shortfall)</span>
          <span
            className={`text-lg font-bold ${
              aphResult.shortfallOrExcess && aphResult.shortfallOrExcess < 0
                ? "text-rose-600"
                : "text-emerald-600"
            }`}
          >
            {aphResult.shortfallOrExcess !== null
              ? aphResult.shortfallOrExcess >= 0
                ? `+${formatRupees(aphResult.shortfallOrExcess)}`
                : `-${formatRupees(Math.abs(aphResult.shortfallOrExcess))}`
              : "Pending Evaluation"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {aphResult.shortfallOrExcess && aphResult.shortfallOrExcess < 0 ? "Shortfall Deficit" : "Meets Obligation"}
          </span>
        </div>
      </div>

      {/* Explanation Box */}
      <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 mb-3">
        <span className="font-semibold text-indigo-900">Regulatory Assessment: </span>
        <span>{aphResult.plainLanguageExplanation}</span>
      </div>

      {/* Outstanding review requirements */}
      {aphResult.manualReviewReasons && aphResult.manualReviewReasons.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
          <div className="font-semibold flex items-center gap-1.5 text-amber-950 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Outstanding Regulatory Verification Items:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
            {aphResult.manualReviewReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
