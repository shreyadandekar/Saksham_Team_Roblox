/**
 * src/components/ocr/OcrReviewCard.tsx
 * Comprehensive OCR Document Intelligence & Human Review Card.
 * Displays candidate values vs entered values, discrepancy summary,
 * raw text inspection, review provenance, and triggers.
 */

import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import type { OcrExtraction } from "../../types/ocr";
import { normalizeRuleCheckFields } from "../../types/ocr";
import type { Document } from "../../types/document";
import { triggerDocumentOcr } from "../../api/ocr";
import { formatDateTime } from "../../utils/format";
import {
  OcrStatusBadge,
  IndicatorBadge,
} from "./OcrStatusBadge";
import OcrComparisonTable from "./OcrComparisonTable";
import OcrReviewModal from "./OcrReviewModal";

interface OcrReviewCardProps {
  instrumentId: string;
  documents: Document[];
  extractions: OcrExtraction[];
  isOfficer: boolean;
  onRefresh: () => Promise<void>;
}

export default function OcrReviewCard({
  instrumentId,
  documents,
  extractions,
  isOfficer,
  onRefresh,
}: OcrReviewCardProps) {
  const [triggeringDocId, setTriggeringDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [selectedExtractionIndex, setSelectedExtractionIndex] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Eligible documents for OCR: PDF, JPEG, PNG
  const eligibleDocs = documents.filter(
    (d) =>
      d.mimeType === "application/pdf" ||
      d.mimeType === "image/jpeg" ||
      d.mimeType === "image/png"
  );

  const activeExtraction =
    extractions.length > 0
      ? extractions[Math.min(selectedExtractionIndex, extractions.length - 1)]
      : null;

  async function handleTriggerOcr(documentId: string) {
    setError(null);
    setSuccessMessage(null);
    setTriggeringDocId(documentId);

    try {
      const res = await triggerDocumentOcr(instrumentId, documentId);
      setSuccessMessage(res.message);
      await onRefresh();
      setSelectedExtractionIndex(0); // newest attempt
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to trigger OCR extraction."
      );
    } finally {
      setTriggeringDocId(null);
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
      {/* ── Card Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            OCR Document Intelligence & Rule Comparison
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated text extraction, discrepancy checking, and officer provenance verification
          </p>
        </div>

        {activeExtraction && (
          <div className="flex items-center gap-2">
            <OcrStatusBadge status={activeExtraction.status} />
            {activeExtraction.ruleCheckResults?.summary?.overallReviewIndicator && (
              <IndicatorBadge
                indicator={
                  activeExtraction.ruleCheckResults.summary.overallReviewIndicator
                }
              />
            )}
          </div>
        )}
      </div>

      {/* ── Notifications ──────────────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Document Trigger Toolbar ────────────────────────────── */}
      {eligibleDocs.length > 0 && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-800">
              Trigger Extraction Engine:
            </span>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Deterministic candidate extraction from uploaded receipt or bank letter
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {eligibleDocs.map((doc) => {
              const isTriggering = triggeringDocId === doc.id;
              const hasPriorExtraction = extractions.some(
                (e) => e.documentId === doc.id
              );

              return (
                <button
                  key={doc.id}
                  id={`ocr-trigger-${doc.id}`}
                  onClick={() => handleTriggerOcr(doc.id)}
                  disabled={Boolean(triggeringDocId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isTriggering ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  )}
                  <span>
                    {isTriggering
                      ? "Extracting..."
                      : hasPriorExtraction
                      ? `Re-run OCR (${doc.originalName})`
                      : `Run OCR on ${doc.originalName}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────────── */}
      {extractions.length === 0 && (
        <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 space-y-2">
          <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            No OCR Extraction Performed Yet
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {eligibleDocs.length > 0
              ? "Click 'Run OCR' above to trigger automated document text extraction and side-by-side discrepancy checking."
              : "Upload a PDF or image of the Fixed Deposit Receipt above to run OCR document intelligence."}
          </p>
        </div>
      )}

      {/* ── Active Extraction Display ──────────────────────────── */}
      {activeExtraction && (
        <div className="space-y-4">
          {/* Attempt Selector Tabs (if multiple attempts) */}
          {extractions.length > 1 && (
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs overflow-x-auto">
              <span className="font-semibold text-slate-500 shrink-0">
                Extraction Attempts:
              </span>
              {extractions.map((e, idx) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedExtractionIndex(idx)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                    selectedExtractionIndex === idx
                      ? "bg-indigo-600 text-white font-bold shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Attempt #{e.attemptNumber}{" "}
                  <span className="text-[10px] opacity-80">
                    ({e.status})
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Extraction Meta Info & Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">
                Document Source
              </div>
              <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                {activeExtraction.document?.originalName || "Attached Receipt"}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">
                Extraction Engine
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {activeExtraction.ocrEngine || "Deterministic PDF Parser"}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">
                Extraction Time
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {activeExtraction.ocrDurationMs
                  ? `${activeExtraction.ocrDurationMs} ms`
                  : "N/A"}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">
                Processed At
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {formatDateTime(activeExtraction.createdAt)}
              </div>
            </div>
          </div>

          {/* Rule Check Summary Metrics */}
          {activeExtraction.ruleCheckResults?.summary && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                {activeExtraction.ruleCheckResults.summary.matchCount} Match
                {activeExtraction.ruleCheckResults.summary.matchCount === 1 ? "" : "es"}
              </span>

              {activeExtraction.ruleCheckResults.summary.mismatchCount > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-bold flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-rose-600" />
                  {activeExtraction.ruleCheckResults.summary.mismatchCount} Mismatch
                  {activeExtraction.ruleCheckResults.summary.mismatchCount === 1 ? "" : "es"}
                </span>
              )}

              {activeExtraction.ruleCheckResults.summary.missingCount > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  {activeExtraction.ruleCheckResults.summary.missingCount} Missing
                </span>
              )}

              {activeExtraction.ruleCheckResults.summary.ambiguousCount > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-semibold flex items-center gap-1">
                  {activeExtraction.ruleCheckResults.summary.ambiguousCount} Ambiguous
                </span>
              )}
            </div>
          )}

          {/* Discrepancy warning banner */}
          {activeExtraction.hasMismatches && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Mismatches Detected: </span>
                One or more values extracted from the supporting document differ
                from what the institution entered. AICTE Officers must review
                and verify the original deposit receipt before approving.
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Table */}
          <OcrComparisonTable
            fields={normalizeRuleCheckFields(activeExtraction.ruleCheckResults)}
            acceptedValues={activeExtraction.acceptedValues}
          />

          {/* Officer Review Info (if already reviewed) */}
          {activeExtraction.status === "REVIEWED" && activeExtraction.reviewedBy && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  Officer Review Verified
                </span>
                <span className="text-[11px] text-emerald-800">
                  {activeExtraction.reviewedAt
                    ? formatDateTime(activeExtraction.reviewedAt)
                    : ""}
                </span>
              </div>
              <p className="text-emerald-900">
                Reviewed by{" "}
                <span className="font-semibold text-emerald-950">
                  {activeExtraction.reviewedBy.fullName}
                </span>{" "}
                ({activeExtraction.reviewedBy.email})
              </p>
              {activeExtraction.reviewRemarks && (
                <div className="pt-1 text-slate-700 italic border-t border-emerald-200/60 mt-1">
                  &ldquo;{activeExtraction.reviewRemarks}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* Action Row: Review Button & Raw Text Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowRawText(!showRawText)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {showRawText ? "Hide Extracted Raw Text" : "View Extracted Raw Text"}
              </span>
              {showRawText ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Officer Review CTA Button */}
            {isOfficer &&
              (activeExtraction.status === "EXTRACTED" ||
                activeExtraction.status === "REVIEWED") && (
                <button
                  type="button"
                  id="ocr-open-review-btn"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {activeExtraction.status === "REVIEWED"
                      ? "Re-Review OCR Evidence"
                      : "Conduct Officer OCR Review"}
                  </span>
                </button>
              )}
          </div>

          {/* Collapsible Raw Text Inspector */}
          {showRawText && activeExtraction.rawText && (
            <div className="p-4 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                <span>Raw Text Extracted from Document</span>
                <span>{activeExtraction.rawText.length} characters</span>
              </div>
              <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed text-[11px]">
                {activeExtraction.rawText}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {activeExtraction && isReviewModalOpen && (
        <OcrReviewModal
          instrumentId={instrumentId}
          extraction={activeExtraction}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={async () => {
            setIsReviewModalOpen(false);
            setSuccessMessage("OCR review decision successfully recorded in audit log.");
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}
