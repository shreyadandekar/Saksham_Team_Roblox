/**
 * src/components/scrutiny/ScrutinyDecisionModal.tsx
 * Modal for AICTE Officers and Admins to record scrutiny decisions (APPROVE, REQUEST_CORRECTION, REJECT)
 * with mandatory regulatory observations.
 */

import { useState, useEffect } from "react";
import { X, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Building2 } from "lucide-react";
import { submitScrutinyDecision } from "../../api/relationships";
import type { Instrument, InstrumentStatus } from "../../types/instrument";
import StatusBadge from "../common/StatusBadge";
import { formatINR } from "../../utils/format";

interface ScrutinyDecisionModalProps {
  instrument: Instrument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  initialDecision?: "APPROVE" | "REQUEST_CORRECTION" | "REJECT";
}

export default function ScrutinyDecisionModal({
  instrument,
  isOpen,
  onClose,
  onSuccess,
  initialDecision = "APPROVE",
}: ScrutinyDecisionModalProps) {
  const [decision, setDecision] = useState<"APPROVE" | "REQUEST_CORRECTION" | "REJECT">(initialDecision);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDecision(initialDecision || "APPROVE");
      setRemarks("");
      setError(null);
    }
  }, [isOpen, initialDecision]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!remarks.trim() || remarks.trim().length < 3) {
      setError("Please provide an inspection observation note of at least 3 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await submitScrutinyDecision(instrument.id, {
        decision,
        remarks: remarks.trim(),
      });
      onSuccess(res?.message || `Scrutiny decision '${decision}' successfully applied.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record scrutiny decision.");
    } finally {
      setLoading(false);
    }
  }

  const decisionStyles = {
    APPROVE: {
      bg: "bg-emerald-50 border-emerald-300 text-emerald-900 ring-emerald-600",
      icon: CheckCircle2,
      label: "Approve & Activate Deposit",
      desc: "Certifies regulatory compliance. Transitions deposit to ACTIVE. If this is a renewal/replacement, atomically marks predecessor as superseded/matured.",
    },
    REQUEST_CORRECTION: {
      bg: "bg-amber-50 border-amber-300 text-amber-900 ring-amber-600",
      icon: AlertTriangle,
      label: "Request Correction / Resubmission",
      desc: "Returns deposit to institution for correction. Existing predecessor deposit remains valid and untouched.",
    },
    REJECT: {
      bg: "bg-rose-50 border-rose-300 text-rose-900 ring-rose-600",
      icon: XCircle,
      label: "Reject Submission",
      desc: "Rejects proposed deposit. Existing predecessor deposit remains valid and untouched.",
    },
  };

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
              <h2 className="text-base font-bold">Record Regulatory Scrutiny Decision</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Instrument: <span className="font-mono text-amber-200">{instrument.instrumentNumber}</span> &bull; {instrument.bankName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Instrument Summary Card */}
        <div className="mx-6 mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">{instrument.institution?.name}</span>
              {instrument.institution?.code && (
                <span className="font-mono text-slate-500 text-[11px]">({instrument.institution.code})</span>
              )}
            </div>
            <StatusBadge status={instrument.status as InstrumentStatus} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 block">Bank & Branch</span>
              <span className="font-medium text-slate-800">{instrument.bankName}</span>
              {instrument.branchName && (
                <span className="text-slate-500 text-[11px] block">{instrument.branchName}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Principal Amount</span>
              <span className="font-bold font-mono text-slate-900">{formatINR(instrument.amount)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Decision selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Official Decision *
            </label>
            <div className="space-y-2">
              {(["APPROVE", "REQUEST_CORRECTION", "REJECT"] as const).map((opt) => {
                const conf = decisionStyles[opt];
                const Icon = conf.icon;
                const isSelected = decision === opt;

                return (
                  <label
                    key={opt}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? `${conf.bg} ring-1 font-semibold`
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={opt}
                      checked={isSelected}
                      onChange={() => setDecision(opt)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{conf.label}</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500 mt-0.5 leading-snug">
                        {conf.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Officer Inspection Observations & Regulatory Remarks *
            </label>
            <textarea
              required
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record details of bank verification, deposit certificate cross-checks, or specific reasons for rejection/correction..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5 ${
                decision === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : decision === "REQUEST_CORRECTION"
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting Decision...</span>
                </>
              ) : (
                <span>Confirm {decision.replace(/_/g, " ")}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
