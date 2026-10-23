/**
 * src/components/release/RequestReleaseModal.tsx
 * Modal dialog for institution users to submit a release and refund request
 * for an eligible ACTIVE or MATURED security deposit.
 */

import { useState } from "react";
import { X, Send, AlertCircle, RefreshCw, HelpCircle, Building2 } from "lucide-react";
import { submitReleaseRequest } from "../../api/release";
import type { Instrument } from "../../types/instrument";
import { formatINR } from "../../utils/format";

interface RequestReleaseModalProps {
  instrument: Instrument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function RequestReleaseModal({
  instrument,
  isOpen,
  onClose,
  onSuccess,
}: RequestReleaseModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setError("Please provide a detailed justification of at least 10 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await submitReleaseRequest(instrument.id, { reason: trimmed });
      onSuccess(res.message);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit release request. Please try again."
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
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Request Deposit Release & Refund</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Instrument: <span className="font-mono text-purple-200">{instrument.instrumentNumber}</span> &bull; {instrument.bankName}
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
              <p className="font-semibold">Unable to submit release request</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Summary Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span>Institution:</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {instrument.institution?.name} ({instrument.institution?.code})
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Principal Amount:</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatINR(instrument.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Current Status:</span>
              <span className="font-semibold text-slate-800">{instrument.status}</span>
            </div>
          </div>

          {/* Workflow Guidance Alert */}
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-purple-600 shrink-0" />
              Regulatory Release Procedure
            </p>
            <p className="text-purple-800 leading-relaxed">
              Submitting this request will transition the deposit status to{" "}
              <span className="font-semibold text-purple-950 font-mono">RELEASE_REQUESTED</span>.
              AICTE regulatory officers will scrutinize your justification. Once regulatory approval is granted,
              refund remittance and physical certificate handover will proceed as auditable subsequent steps.
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Justification / Reason for Release <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {reason.length} / 2000 chars (min 10)
              </span>
            </div>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the formal basis for deposit release (e.g., successful completion of regulatory embargo period, program closure with AICTE no-objection, or replacement with approved newer instrument)..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none placeholder:text-slate-400"
              maxLength={2000}
              required
            />
          </div>

          {/* Action Buttons */}
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
              disabled={loading || reason.trim().length < 10}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Release Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
