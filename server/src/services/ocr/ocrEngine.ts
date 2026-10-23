/**
 * src/services/ocr/ocrEngine.ts
 * Main orchestrator for Milestone 9: Deterministic Document Text & Candidate Extraction.
 *
 * Coordinates:
 *   1. Text extraction from PDF/image buffers (textExtractor.ts)
 *   2. Candidate field identification & confidence scoring (candidateExtractor.ts)
 *   3. Result normalization for storage in OcrExtraction model
 *
 * Important safeguards:
 *   - Completely deterministic, zero LLM dependencies
 *   - Input buffers are never modified
 *   - Output represents unverified evidence only
 *   - Sanitizes error messages to protect filesystem paths/secrets
 */

import { extractTextFromBuffer } from "./textExtractor";
import { extractCandidateFields } from "./candidateExtractor";
import type { OcrProcessingResult } from "./types";

/**
 * Extracts raw text and candidate banking fields from a document buffer.
 *
 * @param buffer - Raw document file buffer (PDF, JPEG, or PNG)
 * @param mimeType - Document MIME type
 * @returns OcrProcessingResult with extracted candidates or sanitized failure info
 */
export async function processDocumentExtraction(
  buffer: Buffer,
  mimeType: string
): Promise<OcrProcessingResult> {
  const startTime = Date.now();

  try {
    const rawResult = await extractTextFromBuffer(buffer, mimeType);
    const candidates = extractCandidateFields(rawResult.rawText);

    const confidenceScores: Record<string, number> = {
      overall: candidates.overallConfidence,
      fdrNumber: candidates.fdrNumber.confidence,
      bankName: candidates.bankName.confidence,
      branchName: candidates.branchName.confidence,
      amount: candidates.amount.confidence,
      issueDate: candidates.issueDate.confidence,
      maturityDate: candidates.maturityDate.confidence,
    };

    return {
      success: true,
      status: "EXTRACTED",
      engine: rawResult.engine,
      durationMs: Date.now() - startTime,
      rawText: rawResult.rawText,
      candidates,
      confidenceScores,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const safeError = (error?.message || "Document text extraction encountered an unknown error")
      .replace(/(\/[\w\.-]+)+/g, "[path]")
      .replace(/([a-zA-Z]:\\[\w\.\-\\]+)/g, "[path]");

    return {
      success: false,
      status: "FAILED",
      engine: mimeType === "application/pdf" ? "pdf-parse/2.4.5" : "tesseract.js/7.0.0",
      durationMs,
      errorMessage: safeError,
    };
  }
}
