/**
 * src/components/clearance/ClearanceTable.tsx
 *
 * Case table for the Clearance Command Center displaying active release cases,
 * current stage, pending departments, APH compliance, and navigation to the Case Console.
 */

import { Link } from "react-router-dom";
import {
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import type { ClearanceCaseSummary, ReleaseWorkflowStage } from "../../types/clearance";

interface ClearanceTableProps {
  cases: ClearanceCaseSummary[];
  loading: boolean;
  onRefresh?: () => void;
}

export default function ClearanceTable({ cases, loading }: ClearanceTableProps) {
  function formatRupees(amount: number) {
    if (!amount) return "₹0.00";
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)} L`;
  }

  function getStageBadge(stage: ReleaseWorkflowStage) {
    switch (stage) {
      case "SUBMITTED":
        return {
          label: "Submitted",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Clock,
        };
      case "DOCUMENT_REVIEW":
        return {
          label: "Document Scrutiny",
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          icon: FileText,
        };
      case "CORRECTION_REQUIRED":
        return {
          label: "Correction Required",
          bg: "bg-amber-50 text-amber-700 border-amber-300",
          icon: AlertTriangle,
        };
      case "CLEARANCES_PENDING":
        return {
          label: "Clearances Pending",
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: Building,
        };
      case "READY_FOR_FINAL_DECISION":
        return {
          label: "Ready for Final NOC",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold",
          icon: ShieldCheck,
        };
      case "ON_HOLD":
        return {
          label: "Regulatory Hold",
          bg: "bg-rose-50 text-rose-800 border-rose-300 font-semibold",
          icon: ShieldAlert,
        };
      case "NOC_ISSUED":
        return {
          label: "NOC Issued",
          bg: "bg-teal-50 text-teal-800 border-teal-300 font-semibold",
          icon: CheckCircle2,
        };
      case "REJECTED":
        return {
          label: "Rejected",
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          icon: AlertTriangle,
        };
      default:
        return {
          label: stage,
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          icon: Clock,
        };
    }
  }

  function getAphBadge(status: string) {
    switch (status) {
      case "COMPLIANT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            APH Compliant
          </span>
        );
      case "DEFICIENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            APH Deficient
          </span>
        );
      case "NEEDS_MANUAL_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" />
            APH Review Needed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
            Data Incomplete
          </span>
        );
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading clearance cases...</p>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No clearance cases found</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
          No release requests match the selected stage and department filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-4">Institution</th>
              <th className="py-3.5 px-4">Instrument Details</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">Submitted</th>
              <th className="py-3.5 px-4">Current Stage</th>
              <th className="py-3.5 px-4">Pending Department / Action</th>
              <th className="py-3.5 px-4">Compliance</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {cases.map((c) => {
              const stageBadge = getStageBadge(c.currentStage);
              const StageIcon = stageBadge.icon;
              const formattedDate = new Date(c.submissionDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              return (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Institution */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {c.institutionName}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px] text-slate-600">
                        {c.institutionCode}
                      </span>
                      {c.institutionType && (
                        <span>· {c.institutionType.replace("_", " ")}</span>
                      )}
                    </div>
                  </td>

                  {/* Instrument */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-medium text-slate-800 text-xs">
                      {c.instrumentNumber}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]">
                      {c.bankName}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900">
                      {formatRupees(c.amount)}
                    </span>
                  </td>

                  {/* Submitted Date */}
                  <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Stage */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${stageBadge.bg}`}
                    >
                      <StageIcon className="w-3.5 h-3.5" />
                      {stageBadge.label}
                    </span>
                  </td>

                  {/* Pending Action */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="text-xs font-medium text-slate-800 truncate" title={c.pendingAction}>
                      {c.pendingAction}
                    </div>
                    {c.holdReason && (
                      <p className="text-[11px] text-rose-600 italic truncate mt-0.5" title={c.holdReason}>
                        Hold: {c.holdReason}
                      </p>
                    )}
                  </td>

                  {/* Compliance */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getAphBadge(c.complianceStatus)}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      to={`/clearances/${c.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Command Console</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
