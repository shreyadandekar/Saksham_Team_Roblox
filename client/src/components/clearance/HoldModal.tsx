/**
 * src/components/clearance/HoldModal.tsx
 *
 * Modal to place or lift an administrative/regulatory hold on a release request.
 */

import { useState } from "react";
import { X, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { toggleReleaseHold } from "../../api/clearances";

interface HoldModalProps {
  instrumentId: string;
  releaseRequestId: string;
  isCurrentlyOnHold: boolean;
  currentHoldReason?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HoldModal({
  instrumentId,
  releaseRequestId,
  isCurrentlyOnHold,
  currentHoldReason,
  onClose,
  onSuccess,
}: HoldModalProps) {
  const [action, setAction] = useState<"PLACE_HOLD" | "LIFT_HOLD">(
    isCurrentlyOnHold ? "LIFT_HOLD" : "PLACE_HOLD"
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 5) {
      setError("Please provide a comprehensive explanation for placing or lifting the hold (at least 5 characters).");
      return;
    }

    setLoading(true);
    try {
      await toggleReleaseHold(instrumentId, releaseRequestId, action, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update hold status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${action === "PLACE_HOLD" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
              {action === "PLACE_HOLD" ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {action === "PLACE_HOLD" ? "Place Regulatory Hold" : "Lift Regulatory Hold"}
              </h3>
              <p className="text-xs text-slate-500">
                Statutory hold management under AICTE Section 6.46
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

          {isCurrentlyOnHold && currentHoldReason && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold block mb-0.5">Current Hold Reason:</span>
              <p className="italic text-slate-600">{currentHoldReason}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Action:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction("PLACE_HOLD")}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-colors ${
                  action === "PLACE_HOLD"
                    ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Place Regulatory Hold
              </button>
              <button
                type="button"
                onClick={() => setAction("LIFT_HOLD")}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-colors ${
                  action === "LIFT_HOLD"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Lift Existing Hold
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Statutory Justification & Observations <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the audit finding, court order reference, vigilance inquiry, or justification for lifting hold..."
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
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
                action === "PLACE_HOLD" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {loading ? "Processing..." : action === "PLACE_HOLD" ? "Apply Hold" : "Lift Hold"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
