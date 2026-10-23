/**
 * src/components/ocr/OcrReviewModal.tsx
 * Interactive Human-Review Modal for AICTE Officers & System Admins.
 * Enforces provenance tracking, mandatory observations/remarks,
 * and safeguards that prevent automatic status transitions.
 */

import { useState } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Edit3,
} from "lucide-react";
import type {
  OcrExtraction,
  ReviewDecision,
  ValueProvenance,
  AcceptedValues,
} from "../../types/ocr";
import { normalizeRuleCheckFields } from "../../types/ocr";
import { reviewOcrExtraction } from "../../api/ocr";
import OcrComparisonTable from "./OcrComparisonTable";

interface OcrReviewModalProps {
  instrumentId: string;
  extraction: OcrExtraction;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OcrReviewModal({
  instrumentId,
  extraction,
  isOpen,
  onClose,
  onSuccess,
}: OcrReviewModalProps) {
  const fields = normalizeRuleCheckFields(extraction.ruleCheckResults);

  // Initialize provenance selections: default to ENTERED for each field
  const [selectedProvenance, setSelectedProvenance] = useState<
    Record<string, ValueProvenance>
  >(() => {
    const init: Record<string, ValueProvenance> = {};
    for (const f of fields) {
      // If field already had accepted value recorded:
      if (extraction.acceptedValues?.[f.field]) {
        init[f.field] = extraction.acceptedValues[f.field].provenance;
      } else {
        init[f.field] = "ENTERED";
      }
    }
    return init;
  });

  const [overrideValues, setOverrideValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      if (extraction.acceptedValues?.[f.field]?.provenance === "OVERRIDE") {
        init[f.field] = extraction.acceptedValues[f.field].value ?? "";
      }
    }
    return init;
  });

  const [decision, setDecision] = useState<ReviewDecision>("ACCEPTED");
  const [remarks, setRemarks] = useState(extraction.reviewRemarks ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleProvenanceChange(field: string, prov: ValueProvenance) {
    setSelectedProvenance((prev) => ({ ...prev, [field]: prov }));
  }

  function handleOverrideValueChange(field: string, val: string) {
    setOverrideValues((prev) => ({ ...prev, [field]: val }));
  }

  function handleSelectAllEntered() {
    const next: Record<string, ValueProvenance> = {};
    for (const f of fields) {
      next[f.field] = "ENTERED";
    }
    setSelectedProvenance(next);
  }

  function handleSelectAllExtracted() {
    const next: Record<string, ValueProvenance> = {};
    for (const f of fields) {
      if (f.extractedValue) {
        next[f.field] = "EXTRACTED";
      } else {
        next[f.field] = "ENTERED";
      }
    }
    setSelectedProvenance(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!remarks.trim() || remarks.trim().length < 3) {
      setError("Please provide a review remark of at least 3 characters.");
      return;
    }

    // Build acceptedValues payload
    const acceptedValues: AcceptedValues = {};
    for (const f of fields) {
      const prov = selectedProvenance[f.field] || "ENTERED";
      let val: string | null = null;

      if (prov === "ENTERED") {
        val = f.enteredValue;
      } else if (prov === "EXTRACTED") {
        val = f.extractedValue;
      } else if (prov === "OVERRIDE") {
        val = overrideValues[f.field] ?? "";
      }

      acceptedValues[f.field] = {
        value: val,
        provenance: prov,
      };
    }

    setLoading(true);
    setError(null);

    try {
      await reviewOcrExtraction(instrumentId, {
        extractionId: extraction.id,
        decision,
        remarks: remarks.trim(),
        acceptedValues,
      });

      onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit OCR review decision."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Conduct OCR Evidence & Discrepancy Review
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Document:{" "}
                <span className="font-semibold text-indigo-200">
                  {extraction.document?.originalName || "Attached Receipt"}
                </span>{" "}
                &bull; Attempt #{extraction.attemptNumber}
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

        {/* Regulatory safeguard alert */}
        <div className="p-4 bg-amber-50/90 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Human-in-the-Loop Safeguard: </span>
            OCR extraction is strictly advisory evidence. Submitting this review
            records your field verification provenance and audit trail. It does
            <strong className="font-semibold"> NOT</strong> automatically
            approve, reject, or modify the deposit&apos;s lifecycle status.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick provenance presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="text-slate-700 font-semibold">
              Select Provenance for Accepted Values:
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllEntered}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition-colors cursor-pointer"
              >
                Use All Entered
              </button>
              <button
                type="button"
                onClick={handleSelectAllExtracted}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition-colors cursor-pointer"
              >
                Use All Extracted
              </button>
            </div>
          </div>

          {/* Interactive Comparison Table */}
          <OcrComparisonTable
            fields={fields}
            interactive={true}
            selectedProvenance={selectedProvenance}
            overrideValues={overrideValues}
            onProvenanceChange={handleProvenanceChange}
            onOverrideValueChange={handleOverrideValueChange}
          />

          {/* Review Decision Radios */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Regulatory Review Decision
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* ACCEPTED */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  decision === "ACCEPTED"
                    ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="ocrDecision"
                  value="ACCEPTED"
                  checked={decision === "ACCEPTED"}
                  onChange={() => setDecision("ACCEPTED")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Accept Evidence
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5 leading-tight">
                    Document matches or discrepancies are reconciled and acceptable.
                  </div>
                </div>
              </label>

              {/* OVERRIDDEN */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  decision === "OVERRIDDEN"
                    ? "bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="ocrDecision"
                  value="OVERRIDDEN"
                  checked={decision === "OVERRIDDEN"}
                  onChange={() => setDecision("OVERRIDDEN")}
                  className="mt-0.5 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-purple-600" />
                    Accept with Overrides
                  </div>
                  <div className="text-[11px] text-purple-700 mt-0.5 leading-tight">
                    Verified through manual checks with officer override values.
                  </div>
                </div>
              </label>

              {/* REJECTED */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  decision === "REJECTED"
                    ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="ocrDecision"
                  value="REJECTED"
                  checked={decision === "REJECTED"}
                  onChange={() => setDecision("REJECTED")}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    Reject Document Evidence
                  </div>
                  <div className="text-[11px] text-rose-700 mt-0.5 leading-tight">
                    Document is illegible, fraudulent, or substantially discrepant.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="ocrReviewRemarks"
                className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
              >
                Officer Review Remarks / Inspection Notes{" "}
                <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Minimum 3 characters
              </span>
            </div>
            <textarea
              id="ocrReviewRemarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record regulatory observations regarding OCR comparison, discrepancy rationale, or bank verification details..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                  Recording Review...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Confirm & Record OCR Review
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
