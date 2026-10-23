/**
 * src/types/ocr.ts
 * Frontend types for Milestone 9 Phase 5: OCR Review Workflow.
 *
 * These mirror the backend OcrExtraction model and rule-check output.
 * OCR results are unverified candidates — they are NEVER treated as
 * authoritative and must not change the instrument's lifecycle status.
 */

// ── Extraction status ──────────────────────────────────────────────────────

export type OcrStatus = "PENDING" | "EXTRACTED" | "FAILED" | "REVIEWED";

// ── Rule-check comparison (mirroring server ruleEngine output) ─────────────

export type FieldVerdict =
  | "MATCH"
  | "MISMATCH"
  | "MISSING"
  | "AMBIGUOUS"
  | "NOT_CHECKED";

export interface FieldComparison {
  field: string;
  verdict: FieldVerdict;
  enteredValue: string | null;
  extractedValue: string | null;
  confidence: number | null;
  notes?: string;
}

export type OverallReviewIndicatorType =
  | "PASS"
  | "REVIEW_REQUIRED"
  | "FAIL"
  | "CLEAN_MATCH"
  | "REVIEW_RECOMMENDED"
  | "DISCREPANCY_DETECTED";

export interface ComparisonSummary {
  matchCount: number;
  mismatchCount: number;
  missingCount?: number;
  missingEnteredCount?: number;
  missingExtractedCount?: number;
  ambiguousCount: number;
  hasMismatches: boolean;
  overallReviewIndicator: OverallReviewIndicatorType;
}

export interface RuleCheckResults {
  fields: FieldComparison[] | Record<string, any>;
  summary: ComparisonSummary;
}

/**
 * Safely normalizes rule-check comparison results into a standard array of FieldComparison.
 * Supports both array formats and the server's native Record<ComparisonField, FieldComparisonResult> format.
 */
export function normalizeRuleCheckFields(ruleCheckResults?: any): FieldComparison[] {
  if (!ruleCheckResults || !ruleCheckResults.fields) return [];
  if (Array.isArray(ruleCheckResults.fields)) {
    return ruleCheckResults.fields;
  }
  return Object.values(ruleCheckResults.fields).map((item: any) => ({
    field: item.field,
    verdict:
      item.status === "MATCH"
        ? "MATCH"
        : item.status === "MISMATCH"
        ? "MISMATCH"
        : typeof item.status === "string" && item.status.startsWith("MISSING")
        ? "MISSING"
        : item.status === "AMBIGUOUS"
        ? "AMBIGUOUS"
        : "NOT_CHECKED",
    enteredValue: item.enteredValue !== undefined ? item.enteredValue : null,
    extractedValue: item.extractedValue !== undefined ? item.extractedValue : null,
    confidence: typeof item.confidence === "number" ? item.confidence : null,
    notes: item.message || item.notes,
  }));
}

// ── Accepted value provenance (human-review decisions) ─────────────────────

export type ValueProvenance = "ENTERED" | "EXTRACTED" | "OVERRIDE";

export interface AcceptedFieldValue {
  value: string | null;
  provenance: ValueProvenance;
}

export type AcceptedValues = Record<string, AcceptedFieldValue>;

// ── OCR Extraction record (from GET /api/instruments/:id/ocr) ─────────────

export interface OcrExtraction {
  id: string;
  instrumentId: string;
  documentId: string;
  attemptNumber: number;
  status: OcrStatus;

  // Extracted candidate fields (unverified)
  extractedFdrNumber: string | null;
  extractedBankName: string | null;
  extractedBranchName: string | null;
  extractedAmount: string | null;
  extractedIssueDate: string | null;
  extractedMaturityDate: string | null;

  // Raw text and metadata
  rawText: string | null;
  ocrEngine: string | null;
  ocrDurationMs: number | null;
  confidenceScores: Record<string, number> | null;

  // Rule-check results
  hasMismatches: boolean | null;
  ruleCheckResults: RuleCheckResults | null;

  // Review decision (Officers only)
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewRemarks: string | null;
  acceptedValues: AcceptedValues | null;

  // Error info (FAILED status)
  errorMessage: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Joined relations
  document?: {
    id: string;
    originalName: string;
    mimeType: string;
    category: string;
    sizeBytes: number;
    createdAt: string;
  };
  reviewedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

// ── API response shapes ────────────────────────────────────────────────────

export interface OcrListResponse {
  extractions: OcrExtraction[];
}

export interface OcrTriggerResponse {
  message: string;
  extraction: OcrExtraction;
}

export interface OcrReviewResponse {
  message: string;
  extraction: OcrExtraction;
}

// ── Review decision input ──────────────────────────────────────────────────

export type ReviewDecision = "ACCEPTED" | "REJECTED" | "OVERRIDDEN";

export interface ReviewOcrInput {
  extractionId: string;
  decision: ReviewDecision;
  remarks: string;
  acceptedValues?: AcceptedValues;
}
