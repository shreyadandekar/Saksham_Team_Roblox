/**
 * src/components/clearance/ExplainableBlockersPanel.tsx
 *
 * Feature 4 — Explainable Blockers:
 * "Why is this request pending?"
 *
 * Explains exactly which statutory prerequisites, document reviews,
 * departmental clearances, or regulatory holds are preventing the Approval
 * Bureau from issuing the final FDR release NOC under AICTE Section 6.46.
 */

import { AlertCircle, CheckCircle2, ShieldAlert, FileText, Building2, UserX } from "lucide-react";
import type { NocGuardEvaluationResult } from "../../types/clearance";

interface ExplainableBlockersPanelProps {
  guardResult: NocGuardEvaluationResult | null;
  workflowStage?: string;
}

export default function ExplainableBlockersPanel({
  guardResult,
  workflowStage,
}: ExplainableBlockersPanelProps) {
  if (!guardResult) return null;

  const isEligible = guardResult.isEligible;
  const isCompleted = workflowStage === "NOC_ISSUED";

  function getCategoryIcon(category: string) {
    switch (category) {
      case "DOCUMENT":
        return <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />;
      case "CLEARANCE":
        return <Building2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />;
      case "REGULATORY_HOLD":
        return <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />;
      case "SEPARATION_OF_DUTIES":
      case "AUTHORIZATION":
        return <UserX className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />;
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          {isEligible ? (
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Why is this request pending?
            </h3>
            <p className="text-xs text-slate-500">
              Authoritative AICTE Section 6.46 Release Precondition Status
            </p>
          </div>
        </div>

        {/* Readiness Tag */}
        <div>
          {isCompleted ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
              NOC Granted
            </span>
          ) : isEligible ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
              Ready for Final Decision
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              {guardResult.blockers.length} Precondition{guardResult.blockers.length > 1 ? "s" : ""} Pending
            </span>
          )}
        </div>
      </div>

      {/* Eligible banner */}
      {isEligible ? (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-emerald-900">
              All Statutory Prerequisites Satisfied
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              All 4 mandatory documents have been confirmed, all departmental clearances (PGRC, Vigilance, Other Bureau) are satisfied, and there are no active regulatory holds. An authorized Approval Bureau officer may issue the final Release NOC.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-slate-600 mb-1">
            The final release NOC cannot be granted until the following blocker{guardResult.blockers.length > 1 ? "s are" : " is"} resolved:
          </p>

          <div className="grid gap-2">
            {guardResult.blockers.map((b, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 hover:bg-slate-100/70 transition-colors"
              >
                {getCategoryIcon(b.category)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {b.message}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600">
                      {b.category}
                    </span>
                  </div>
                  {b.details && (
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Code: {b.code}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High-level status bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-100 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Documents Confirmed</span>
          <span className="font-semibold text-slate-800">
            {guardResult.documentStatus.confirmedCount} / {guardResult.documentStatus.totalRequired}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Clearances Satisfied</span>
          <span className="font-semibold text-slate-800">
            {guardResult.clearanceStatus.satisfiedCount} / {guardResult.clearanceStatus.totalRequired}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Regulatory Hold</span>
          <span className={`font-semibold ${guardResult.holdStatus.isOnHold ? "text-rose-600" : "text-emerald-600"}`}>
            {guardResult.holdStatus.isOnHold ? "Active Hold" : "None"}
          </span>
        </div>
      </div>
    </div>
  );
}
