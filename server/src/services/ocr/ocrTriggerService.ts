/**
 * src/services/ocr/ocrTriggerService.ts
 * Service for triggering and executing OCR extraction on an instrument document.
 *
 * Implements:
 *  - Institution isolation and role authorization checks
 *  - Concurrency control (prevents duplicate PENDING extractions on the same document)
 *  - Attempt number calculation (retry history preservation)
 *  - Document download from Supabase storage
 *  - Deterministic text and candidate extraction (textExtractor / candidateExtractor)
 *  - Automatic rule-based entered vs extracted comparison (ruleEngine)
 *  - Atomic database transaction for extraction persistence and audit logging
 */

import { Role, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { getSupabaseAdmin } from "../../lib/supabase";
import {
  isSupportedExtractionMime,
  processDocumentExtraction,
  compareEnteredAgainstExtracted,
} from "./index";

export interface TriggerOcrParams {
  instrumentId: string;
  documentId: string;
  user: {
    id: string;
    role: Role;
    institutionId?: string | null;
  };
}

export interface TriggerOcrResult {
  statusCode: number;
  success: boolean;
  message: string;
  extraction?: any;
  error?: string;
}

export async function triggerDocumentOcr(
  params: TriggerOcrParams
): Promise<TriggerOcrResult> {
  const { instrumentId, documentId, user } = params;

  // 1. Resolve Instrument and enforce tenant isolation
  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    select: {
      id: true,
      institutionId: true,
      instrumentNumber: true,
      bankName: true,
      branchName: true,
      amount: true,
      issueDate: true,
      maturityDate: true,
      status: true,
    },
  });

  if (!instrument) {
    return {
      statusCode: 404,
      success: false,
      error: "Not Found",
      message: "Instrument not found.",
    };
  }

  if (
    user.role === Role.INSTITUTION_USER &&
    instrument.institutionId !== user.institutionId
  ) {
    return {
      statusCode: 404,
      success: false,
      error: "Not Found",
      message: "Instrument not found.",
    };
  }

  // 2. Resolve Document and verify relationship
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      instrumentId: true,
      storagePath: true,
      originalName: true,
      mimeType: true,
    },
  });

  if (!document || document.instrumentId !== instrument.id) {
    return {
      statusCode: 404,
      success: false,
      error: "Not Found",
      message: "Document not found.",
    };
  }

  if (!isSupportedExtractionMime(document.mimeType)) {
    return {
      statusCode: 400,
      success: false,
      error: "Bad Request",
      message: `Unsupported document format for text extraction (${document.mimeType}). Only PDF, JPEG, and PNG are supported.`,
    };
  }

  // 3. Concurrency check: Ensure no extraction is currently in PENDING status for this document
  const activePending = await prisma.ocrExtraction.findFirst({
    where: {
      documentId: document.id,
      status: "PENDING",
    },
  });

  if (activePending) {
    return {
      statusCode: 409,
      success: false,
      error: "Conflict",
      message: "An OCR extraction is already in progress for this document.",
    };
  }

  // 4. Calculate attempt number
  const existingAttempts = await prisma.ocrExtraction.count({
    where: { documentId: document.id },
  });
  const attemptNumber = existingAttempts + 1;

  // 5. Create initial PENDING extraction record with concurrency guard
  let extractionRecord;
  try {
    extractionRecord = await prisma.ocrExtraction.create({
      data: {
        documentId: document.id,
        instrumentId: instrument.id,
        attemptNumber,
        status: "PENDING",
      },
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        statusCode: 409,
        success: false,
        error: "Conflict",
        message: "An OCR extraction is already in progress for this document.",
      };
    }
    throw err;
  }

  // 6. Download file buffer from Supabase Storage
  let buffer: Buffer;
  try {
    const supabase = getSupabaseAdmin();
    const bucket = env.SUPABASE_STORAGE_BUCKET!;
    const { data, error } = await supabase.storage.from(bucket).download(document.storagePath);

    if (error || !data) {
      throw new Error(error?.message || "Storage object could not be retrieved");
    }

    const arrayBuffer = await data.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (storageErr: any) {
    const safeError = (storageErr?.message || "Storage service unavailable")
      .replace(/(\/[\w\.-]+)+/g, "[path]")
      .replace(/([a-zA-Z]:\\[\w\.\-\\]+)/g, "[path]");

    // Mark extraction as FAILED and record audit event atomically
    const failedExtraction = await prisma.$transaction(async (tx) => {
      const updated = await tx.ocrExtraction.update({
        where: { id: extractionRecord.id },
        data: {
          status: "FAILED",
          errorMessage: `Storage retrieval failed: ${safeError}`,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          action: "OCR_EXTRACTION_FAILED",
          entityType: "Instrument",
          entityId: instrument.id,
          metadata: {
            documentId: document.id,
            extractionId: extractionRecord.id,
            attemptNumber,
            errorMessage: `Storage retrieval failed: ${safeError}`,
          },
        },
      });

      return updated;
    });

    return {
      statusCode: 502,
      success: false,
      error: "Storage Error",
      message: "Failed to download document from storage for text extraction.",
      extraction: failedExtraction,
    };
  }

  // 7. Process Document Extraction (deterministic OCR)
  const ocrResult = await processDocumentExtraction(buffer, document.mimeType);

  if (!ocrResult.success || ocrResult.status === "FAILED") {
    const failedExtraction = await prisma.$transaction(async (tx) => {
      const updated = await tx.ocrExtraction.update({
        where: { id: extractionRecord.id },
        data: {
          status: "FAILED",
          ocrEngine: ocrResult.engine,
          ocrDurationMs: ocrResult.durationMs,
          errorMessage: ocrResult.errorMessage || "Text extraction failed",
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          action: "OCR_EXTRACTION_FAILED",
          entityType: "Instrument",
          entityId: instrument.id,
          metadata: {
            documentId: document.id,
            extractionId: extractionRecord.id,
            attemptNumber,
            errorMessage: ocrResult.errorMessage,
          },
        },
      });

      return updated;
    });

    return {
      statusCode: 422,
      success: false,
      error: "Extraction Failed",
      message: ocrResult.errorMessage || "Document text extraction failed.",
      extraction: failedExtraction,
    };
  }

  // 8. Run Rule-Based Comparison Engine (Entered vs Extracted)
  const comparison = compareEnteredAgainstExtracted(instrument, ocrResult.candidates!);

  // 9. Persist extraction results and audit event atomically
  const completedExtraction = await prisma.$transaction(async (tx) => {
    const updated = await tx.ocrExtraction.update({
      where: { id: extractionRecord.id },
      data: {
        status: "EXTRACTED",
        extractedFdrNumber: ocrResult.candidates?.fdrNumber.value || null,
        extractedBankName: ocrResult.candidates?.bankName.value || null,
        extractedBranchName: ocrResult.candidates?.branchName.value || null,
        extractedAmount: ocrResult.candidates?.amount.value
          ? new Prisma.Decimal(ocrResult.candidates.amount.value)
          : null,
        extractedIssueDate: ocrResult.candidates?.issueDate.value
          ? new Date(ocrResult.candidates.issueDate.value)
          : null,
        extractedMaturityDate: ocrResult.candidates?.maturityDate.value
          ? new Date(ocrResult.candidates.maturityDate.value)
          : null,
        rawText: ocrResult.rawText,
        confidenceScores: ocrResult.confidenceScores as any,
        ocrEngine: ocrResult.engine,
        ocrDurationMs: ocrResult.durationMs,
        hasMismatches: comparison.summary.hasMismatches,
        ruleCheckResults: comparison as any,
      },
      include: {
        document: {
          select: { id: true, originalName: true, mimeType: true, category: true },
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        actorId: user.id,
        action: "OCR_EXTRACTED",
        entityType: "Instrument",
        entityId: instrument.id,
        metadata: {
          documentId: document.id,
          extractionId: extractionRecord.id,
          attemptNumber,
          ocrEngine: ocrResult.engine,
          ocrDurationMs: ocrResult.durationMs,
          overallConfidence: ocrResult.candidates?.overallConfidence,
          hasMismatches: comparison.summary.hasMismatches,
          matchCount: comparison.summary.matchCount,
          mismatchCount: comparison.summary.mismatchCount,
          overallReviewIndicator: comparison.summary.overallReviewIndicator,
        },
      },
    });

    return updated;
  });

  return {
    statusCode: 201,
    success: true,
    message: "Document text extraction and comparison completed successfully.",
    extraction: completedExtraction,
  };
}
