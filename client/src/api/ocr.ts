/**
 * src/api/ocr.ts
 * API client module for OCR Document Intelligence & Human Review Workflow.
 * All requests are routed through standard fetch with credentials.
 */

import type {
  OcrListResponse,
  OcrTriggerResponse,
  OcrReviewResponse,
  ReviewOcrInput,
} from "../types/ocr";

/**
 * GET /api/instruments/:instrumentId/ocr
 * Fetches all OCR extractions and rule-check comparison results for an instrument.
 */
export async function listOcrExtractions(
  instrumentId: string
): Promise<OcrListResponse> {
  const res = await fetch(
    `/api/instruments/${encodeURIComponent(instrumentId)}/ocr`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch OCR extractions (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * POST /api/instruments/:instrumentId/documents/:documentId/ocr
 * Triggers or retries deterministic OCR extraction for a specific document.
 */
export async function triggerDocumentOcr(
  instrumentId: string,
  documentId: string
): Promise<OcrTriggerResponse> {
  const res = await fetch(
    `/api/instruments/${encodeURIComponent(instrumentId)}/documents/${encodeURIComponent(documentId)}/ocr`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to trigger OCR extraction (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * POST /api/instruments/:instrumentId/ocr/review
 * Submits an AICTE officer's human-review decision with field-by-field provenance.
 */
export async function reviewOcrExtraction(
  instrumentId: string,
  input: ReviewOcrInput
): Promise<OcrReviewResponse> {
  const res = await fetch(
    `/api/instruments/${encodeURIComponent(instrumentId)}/ocr/review`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to record OCR review (HTTP ${res.status})`
    );
  }

  return res.json();
}
