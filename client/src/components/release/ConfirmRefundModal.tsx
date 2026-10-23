/**
 * src/components/release/ConfirmRefundModal.tsx
 * Modal dialog for AICTE Officers and Admins to record bank payment confirmation
 * for an APPROVED release request.
 */

import { useState } from "react";
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  ShieldCheck,
} from "lucide-react";
import { confirmRefund } from "../../api/release";
import type { Instrument } from "../../types/instrument";
import { formatINR } from "../../utils/format";

interface ConfirmRefundModalProps {
  instrument: Instrument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ConfirmRefundModal({
  instrument,
  isOpen,
  onClose,
  onSuccess,
}: ConfirmRefundModalProps) {
  const [refundReference, setRefundReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = refundReference.trim();
    if (trimmed.length < 3) {
      setError("Please provide a valid refund / bank payment reference of at least 3 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await confirmRefund(instrument.id, {
        refundReference: trimmed,
      });
      onSuccess(res.message);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to confirm refund payment. Please try again."
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
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Confirm Security Deposit Refund</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Instrument: <span className="font-mono text-emerald-200">{instrument.instrumentNumber}</span> &bull; {instrument.bankName}
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
              <p className="font-semibold">Refund Confirmation Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Summary Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span>Institution:</span>
              <span className="font-semibold text-slate-900">
                {instrument.institution?.name} ({instrument.institution?.code})
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Principal Amount to Remit:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {formatINR(instrument.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Regulatory Status:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                RELEASED (Regulatory Approval Granted)
              </span>
            </div>
          </div>

          {/* Workflow Decoupling Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              Financial Evidence vs. Physical Custody Handover
            </p>
            <p className="text-amber-800 leading-relaxed">
              Recording this refund reference confirms that bank funds have been electronically remitted.
              Physical certificate custody is maintained separately: if the paper FDR certificate is still in the vault,
              record its physical release via the <strong>Physical Custody</strong> panel below using event type{" "}
              <span className="font-mono font-semibold text-amber-950">ORIGINAL_RELEASED</span>.
            </p>
          </div>

          {/* Refund Reference Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bank Refund / Payment Reference (UTR / Cheque / Transaction ID) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={refundReference}
              onChange={(e) => setRefundReference(e.target.value)}
              placeholder="e.g. UTR-HDFC202610239999 or SBIN00012345678"
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono placeholder:font-sans placeholder:text-slate-400"
              maxLength={255}
              required
            />
            <p className="text-[11px] text-slate-400">
              Provide the verifiable bank transaction identifier, RTGS/NEFT UTR, or demand draft number.
            </p>
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
              disabled={loading || refundReference.trim().length < 3}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording Refund...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Refund Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
