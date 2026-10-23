/**
 * src/services/ocr/comparisonTypes.ts
 * Type definitions for Milestone 9 Phase 3: Rule-Based Comparison Engine (Entered vs Extracted).
 */

export type ComparisonField =
  | "instrumentNumber"
  | "bankName"
  | "branchName"
  | "amount"
  | "issueDate"
  | "maturityDate";

export type FieldComparisonStatus =
  | "MATCH"
  | "MISMATCH"
  | "MISSING_ENTERED"
  | "MISSING_EXTRACTED"
  | "AMBIGUOUS";

export type ComparisonSeverity = "INFO" | "WARNING" | "HIGH";

export type OverallReviewIndicator =
  | "CLEAN_MATCH"
  | "REVIEW_RECOMMENDED"
  | "DISCREPANCY_DETECTED";

export interface FieldComparisonResult {
  field: ComparisonField;
  status: FieldComparisonStatus;
  enteredValue: string | null;
  extractedValue: string | null;
  rule: string;
  message: string;
  severity: ComparisonSeverity;
}

export interface ComparisonSummary {
  totalFields: number;
  matchCount: number;
  mismatchCount: number;
  missingEnteredCount: number;
  missingExtractedCount: number;
  ambiguousCount: number;
  hasMismatches: boolean;
  requiresReview: boolean;
  overallReviewIndicator: OverallReviewIndicator;
  evaluatedAt: string; // ISO 8601 string
  disclaimer: string;
}

export interface OcrComparisonReport {
  summary: ComparisonSummary;
  fields: Record<ComparisonField, FieldComparisonResult>;
}

export interface EnteredInstrumentData {
  instrumentNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  amount?: string | number | { toString(): string } | null;
  issueDate?: string | Date | null;
  maturityDate?: string | Date | null;
}
