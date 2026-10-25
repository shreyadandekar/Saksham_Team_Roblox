import { useState } from "react";
import {
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { issueFinalNoc } from "../../api/clearances";
import type { ClearanceCaseDetailResponse } from "../../types/clearance";

interface IssueNocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  instrumentId: string;
  releaseRequestId: string;
  caseDetail: ClearanceCaseDetailResponse;
}

export default function IssueNocModal({
  isOpen,
  onClose,
  onSuccess,
  instrumentId,
  releaseRequestId,
  caseDetail,
}: IssueNocModalProps) {
  const [remarks, setRemarks] = useState(
    "Approved as per AICTE Approval Process Handbook (Section 6.46) guidelines."
  );
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);

  if (!isOpen) return null;

  const { releaseRequest } = caseDetail;
  const instrument = releaseRequest?.instrument || {};
  const institution = instrument?.institution || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError("Please confirm your review of the compliance prerequisites.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setBlockers([]);
      await issueFinalNoc(instrumentId, releaseRequestId, remarks);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to issue FDR Release NOC.");
      if (err.blockers && Array.isArray(err.blockers)) {
        setBlockers(err.blockers);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      id="issue-noc-modal"
    >
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-emerald-950/40">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Issue Final FDR Release NOC
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  AICTE Approval Bureau
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Statutory clearance under APH 2024–2027 Section 6.46
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Target Instrument Info */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Institution</span>
              <span className="font-semibold text-slate-200">
                {institution.name || "AICTE Approved Institute"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">FDR Number</span>
              <span className="font-semibold text-white font-mono">
                {instrument.instrumentNumber || instrument.fdrNumber}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Release Amount</span>
              <span className="font-bold text-emerald-400 font-mono">
                ₹{Number(releaseRequest?.amountRequested || instrument.amount || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Verification Checklist */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Statutory Prerequisites Verification
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All mandatory statutory documents confirmed by Scrutiny</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>PGRC clearance recorded with no outstanding grievances</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Vigilance clearance recorded with no active inquiries</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No active regulatory or financial holds placed</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Four-Eyes Separation of Duties strictly verified by backend guard</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              NOC Issuance Remarks / Council Reference
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition resize-none placeholder:text-slate-600"
              placeholder="Record official sanction order reference, meeting minutes, or regulatory remarks..."
              required
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 space-y-1">
                <p className="font-semibold">Consequential Decision Notice</p>
                <p>
                  Issuing this No Objection Certificate (NOC) will formally approve
                  the release and disbursement of the fixed deposit. This decision
                  is cryptographically signed, permanently recorded in the SHA-256
                  audit chain, and cannot be reversed.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1 text-sm font-medium text-slate-200 select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                id="noc-confirm-checkbox"
              />
              <span>I confirm that all statutory requirements have been fully verified.</span>
            </label>
          </div>

          {/* Error & Blockers Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{error}</span>
              </div>
              {blockers.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-200 pl-2">
                  {blockers.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !confirmed}
              className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              id="confirm-noc-issuance-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Issuing NOC...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Issue Statutory Release NOC</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
