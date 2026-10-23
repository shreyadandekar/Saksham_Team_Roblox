/**
 * src/components/release/ReleaseDecisionModal.tsx
 * Modal dialog for AICTE Officers and Admins to review and decide a pending
 * release request (APPROVE or REJECT) with mandatory regulatory remarks.
 */

import { useState } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Info,
  FileText,
} from "lucide-react";
import { submitReleaseDecision } from "../../api/release";
import type { Instrument } from "../../types/instrument";
import type { ReleaseRequest } from "../../types/release";

interface ReleaseDecisionModalProps {
  instrument: Instrument;
  pendingRequest: ReleaseRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ReleaseDecisionModal({
  instrument,
  pendingRequest,
  isOpen,
  onClose,
  onSuccess,
}: ReleaseDecisionModalProps) {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedRemarks = remarks.trim();
    if (trimmedRemarks.length < 5) {
      setError("Please provide official officer remarks of at least 5 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await submitReleaseDecision(instrument.id, {
        decision,
        remarks: trimmedRemarks,
      });
      onSuccess(res.message);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to record release decision. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Review Deposit Release Request</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Instrument: <span className="font-mono text-amber-200">{instrument.instrumentNumber}</span> &bull; {instrument.bankName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Action Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Institution's Submission Details */}
          {pendingRequest && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-200">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  Institution Release Justification
                </span>
                <span>
                  Submitted by {pendingRequest.requestedBy?.fullName || "Institution"}
                </span>
              </div>
              <p className="text-slate-800 italic bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                "{pendingRequest.reason}"
              </p>
            </div>
          )}

          {/* Decision Selection Cards */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Regulatory Determination <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Approve Card */}
              <button
                type="button"
                onClick={() => setDecision("APPROVE")}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  decision === "APPROVE"
                    ? "bg-emerald-50 border-emerald-500 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      decision === "APPROVE" ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Approve Release
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  Grants regulatory release. Instrument transitions to{" "}
                  <span className="font-mono font-semibold text-emerald-800">RELEASED</span>.
                </p>
              </button>

              {/* Reject Card */}
              <button
                type="button"
                onClick={() => setDecision("REJECT")}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  decision === "REJECT"
                    ? "bg-rose-50 border-rose-500 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <XCircle
                    className={`h-5 w-5 ${
                      decision === "REJECT" ? "text-rose-600" : "text-slate-400"
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Reject Request
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  Reverts instrument to prior status (
                  <span className="font-mono font-semibold text-rose-800">
                    {pendingRequest?.previousInstrumentStatus || "ACTIVE"}
                  </span>
                  ). Preserves audit history.
                </p>
              </button>
            </div>
          </div>

          {/* Workflow Decoupling Notice */}
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-950 text-[11px]">
                Separation of Regulatory Consent & Physical/Financial Execution
              </p>
              <p className="leading-relaxed text-blue-900">
                Approving this request records official AICTE regulatory consent.
                It does <strong>not</strong> record financial refund payment or physical document dispatch.
                Those actions must be recorded separately through the refund confirmation and custody handover steps.
              </p>
            </div>
          </div>

          {/* Remarks Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Official Regulatory Remarks <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {remarks.length} / 2000 chars (min 5)
              </span>
            </div>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record mandatory scrutiny observations, compliance basis, verification notes, or reasons for rejection..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
              maxLength={2000}
              required
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || remarks.trim().length < 5}
              className={`inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                decision === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording Decision...</span>
                </>
              ) : decision === "APPROVE" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Approval</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
