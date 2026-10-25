/**
 * src/components/clearance/DepartmentClearanceModal.tsx
 *
 * Modal for authorized department officers (PGRC, Vigilance, Regional/Other Bureau)
 * to record or update clearance decisions under AICTE Section 6.46.
 */

import { useState } from "react";
import { X, CheckCircle2, XCircle, AlertTriangle, Building2, Scale } from "lucide-react";
import { decideDepartmentClearance } from "../../api/clearances";
import type { ClearanceDepartment, ClearanceStatus } from "../../types/clearance";

interface DepartmentClearanceModalProps {
  instrumentId: string;
  releaseRequestId: string;
  department: ClearanceDepartment;
  currentStatus?: ClearanceStatus;
  currentReason?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DepartmentClearanceModal({
  instrumentId,
  releaseRequestId,
  department,
  currentStatus,
  currentReason,
  onClose,
  onSuccess,
}: DepartmentClearanceModalProps) {
  const [status, setStatus] = useState<"CLEARED" | "OBJECTION_RAISED" | "NOT_APPLICABLE">(
    currentStatus && currentStatus !== "PENDING" ? (currentStatus as any) : "CLEARED"
  );
  const [decisionReason, setDecisionReason] = useState(currentReason || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getDepartmentTitle(dept: ClearanceDepartment) {
    switch (dept) {
      case "PGRC":
        return "Public Grievance Redressal Cell (PGRC)";
      case "VIGILANCE":
        return "AICTE Vigilance Bureau";
      case "OTHER_APPLICABLE_BUREAU":
        return "Regional Office / Legal Bureau";
      default:
        return dept;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (decisionReason.trim().length < 5) {
      setError("Please provide a detailed observation reason / justification (at least 5 characters).");
      return;
    }

    setLoading(true);
    try {
      await decideDepartmentClearance(instrumentId, releaseRequestId, department, {
        status,
        decisionReason: decisionReason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record clearance decision");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Departmental Clearance Decision
              </h3>
              <p className="text-xs text-slate-500">
                {getDepartmentTitle(department)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Clearance Status Decision:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus("CLEARED")}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  status === "CLEARED"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${status === "CLEARED" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>Grant Clearance</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("OBJECTION_RAISED")}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  status === "OBJECTION_RAISED"
                    ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <XCircle className={`w-5 h-5 ${status === "OBJECTION_RAISED" ? "text-rose-600" : "text-slate-400"}`} />
                <span>Raise Objection</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("NOT_APPLICABLE")}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  status === "NOT_APPLICABLE"
                    ? "bg-slate-100 border-slate-500 text-slate-900 ring-2 ring-slate-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Scale className={`w-5 h-5 ${status === "NOT_APPLICABLE" ? "text-slate-700" : "text-slate-400"}`} />
                <span>Not Applicable</span>
              </button>
            </div>
          </div>

          {status === "NOT_APPLICABLE" && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <span className="font-semibold block mb-0.5">Authoritative Determination Required:</span>
              Regulatory guidelines prohibit automatic exemption. You must provide specific factual justification why this clearance is not applicable.
            </div>
          )}

          {status === "OBJECTION_RAISED" && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <span className="font-semibold block mb-0.5">Automatic Hold Notice:</span>
              Raising an objection will automatically transition this case to <strong>ON_HOLD</strong> and halt final NOC processing until the objection is resolved.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Decision Observations & Formal Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Record inquiry findings, file reference numbers, clearance letter dates, or grounds for objection..."
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Recording..." : "Submit Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
