/**
 * src/services/ocr/types.ts
 * Type definitions for Milestone 9: Deterministic Document Text & Candidate Extraction.
 */

export interface CandidateField<T> {
  value: T | null;
  confidence: number; // 0.0 to 1.0
  rawMatch?: string;
  anchor?: string;
}

export interface ExtractedCandidates {
  fdrNumber: CandidateField<string>;
  bankName: CandidateField<string>;
  branchName: CandidateField<string>;
  amount: CandidateField<string>; // Stored as decimal string e.g. "500000.00"
  issueDate: CandidateField<string>; // Stored as ISO string YYYY-MM-DD
  maturityDate: CandidateField<string>; // Stored as ISO string YYYY-MM-DD
  overallConfidence: number; // 0.0 to 1.0
}

export interface OcrRawExtractionResult {
  rawText: string;
  engine: string;
  durationMs: number;
  pageCount?: number;
}

export interface OcrProcessingResult {
  success: boolean;
  status: "EXTRACTED" | "FAILED";
  engine: string;
  durationMs: number;
  rawText?: string;
  candidates?: ExtractedCandidates;
  confidenceScores?: Record<string, number>;
  errorMessage?: string;
}
