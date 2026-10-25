/**
 * src/components/clearance/DocumentReviewModal.tsx
 *
 * Scrutiny modal for verifying, rejecting, or requesting corrections
 * on mandatory release documents.
 */

import { useState } from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, FileText } from "lucide-react";
import { reviewReleaseDocument } from "../../api/clearances";

interface DocumentReviewModalProps {
  instrumentId: string;
  releaseRequestId: string;
  documentType: string;
  currentStatus?: string;
  currentRemarks?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DocumentReviewModal({
  instrumentId,
  releaseRequestId,
  documentType,
  currentStatus,
  currentRemarks,
  onClose,
  onSuccess,
}: DocumentReviewModalProps) {
  const [status, setStatus] = useState<"CONFIRMED" | "REJECTED" | "CORRECTION_REQUIRED">(
    currentStatus && currentStatus !== "PENDING"
      ? (currentStatus as "CONFIRMED" | "REJECTED" | "CORRECTION_REQUIRED")
      : "CONFIRMED"
  );
  const [remarks, setRemarks] = useState(currentRemarks || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getDocumentTitle(type: string) {
    switch (type) {
      case "APPLICATION_LETTER":
        return "Formal Release Application Letter";
      case "AFFIDAVIT_6":
        return "Affidavit 6 (Prescribed Format)";
      case "FDR_DEPOSIT_EVIDENCE":
        return "Security Deposit / Original FDR Evidence";
      case "LATEST_LOA_EOA":
        return "Latest AICTE Approval (LoA / EoA)";
      default:
        return type;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if ((status === "REJECTED" || status === "CORRECTION_REQUIRED") && remarks.trim().length < 5) {
      setError("Please provide specific observation remarks explaining the deficiency (at least 5 characters).");
      return;
    }

    setLoading(true);
    try {
      await reviewReleaseDocument(instrumentId, releaseRequestId, documentType, {
        status,
        reviewRemarks: remarks.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save document review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Document Scrutiny Review
              </h3>
              <p className="text-xs text-slate-500">
                {getDocumentTitle(documentType)}
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
              Verification Decision:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus("CONFIRMED")}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  status === "CONFIRMED"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${status === "CONFIRMED" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>Confirm Document</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("CORRECTION_REQUIRED")}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  status === "CORRECTION_REQUIRED"
                    ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className={`w-5 h-5 ${status === "CORRECTION_REQUIRED" ? "text-amber-600" : "text-slate-400"}`} />
                <span>Request Correction</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("REJECTED")}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  status === "REJECTED"
                    ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <XCircle className={`w-5 h-5 ${status === "REJECTED" ? "text-rose-600" : "text-slate-400"}`} />
                <span>Reject Document</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Scrutiny Observations & Remarks:
              {status !== "CONFIRMED" && <span className="text-rose-500 ml-1">*</span>}
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record verification notes, notary compliance details, or specific reasons if requesting correction..."
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
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Recording..." : "Save Verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
