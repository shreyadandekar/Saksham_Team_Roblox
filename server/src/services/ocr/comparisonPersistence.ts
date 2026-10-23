/**
 * src/services/ocr/comparisonPersistence.ts
 * Persistence boundary service for Milestone 9 Phase 3 rule-check comparison results.
 *
 * Strict safeguards:
 *  - Verifies that the extraction belongs to the specified instrument before persistence.
 *  - Updates ONLY the OCR extraction record's ruleCheckResults and hasMismatches fields.
 *  - Never mutates or overwrites institution-entered instrument data.
 *  - Never automatically advances the extraction or instrument lifecycle status.
 */

import type { PrismaClient } from "@prisma/client";
import type { OcrComparisonReport } from "./comparisonTypes";

export interface PersistRuleCheckParams {
  extractionId: string;
  instrumentId: string;
  comparison: OcrComparisonReport;
}

/**
 * Persists rule-based comparison results into the intended OcrExtraction record.
 *
 * @param prisma - PrismaClient instance
 * @param params - extractionId, instrumentId, and comparison report
 * @returns Updated OcrExtraction record
 */
export async function persistRuleCheckResults(
  prisma: PrismaClient,
  params: {
    extractionId: string;
    instrumentId: string;
    comparison: OcrComparisonReport;
  }
) {
  const { extractionId, instrumentId, comparison } = params;

  // 1. Verify existence and tenant/instrument ownership
  const existing = await prisma.ocrExtraction.findUnique({
    where: { id: extractionId },
    select: { id: true, instrumentId: true, status: true },
  });

  if (!existing) {
    throw new Error(`OCR extraction record not found: ${extractionId}`);
  }

  if (existing.instrumentId !== instrumentId) {
    throw new Error(
      `Security violation: OCR extraction ${extractionId} does not belong to instrument ${instrumentId}`
    );
  }

  // 2. Persist ONLY ruleCheckResults and hasMismatches to ocr_extractions
  // Does NOT overwrite instrument fields or mark status as REVIEWED
  const updated = await prisma.ocrExtraction.update({
    where: { id: extractionId },
    data: {
      hasMismatches: comparison.summary.hasMismatches,
      ruleCheckResults: comparison as any,
    },
  });

  return updated;
}
