/**
 * src/routes/ocr.ts
 * Dedicated OCR inspection and human-review router for FDR Sentinel.
 *
 * Endpoints:
 *  GET  /api/instruments/:instrumentId/ocr         - List all OCR extractions & rule-check results for instrument
 *  POST /api/instruments/:instrumentId/ocr/review  - Officer human-review decision recording
 *  POST /api/instruments/:instrumentId/ocr/documents/:documentId - Trigger/retry OCR for a document
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { reviewOcrSchema } from "../validation/ocr";

const router = Router({ mergeParams: true });

/**
 * Helper: Resolve and authorize instrument access for the authenticated user.
 */
async function resolveInstrument(
  instrumentId: string,
  user: NonNullable<Request["user"]>
) {
  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    select: {
      id: true,
      institutionId: true,
      status: true,
      instrumentNumber: true,
      bankName: true,
      branchName: true,
      amount: true,
      issueDate: true,
      maturityDate: true,
    },
  });

  if (!instrument) return null;

  // Institution isolation
  if (
    user.role === Role.INSTITUTION_USER &&
    instrument.institutionId !== user.institutionId
  ) {
    return null;
  }

  return instrument;
}

/**
 * GET /api/instruments/:instrumentId/ocr
 * Returns all OCR extraction records and rule check comparison summaries for an instrument.
 */
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      const extractions = await prisma.ocrExtraction.findMany({
        where: { instrumentId: instrument.id },
        include: {
          document: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              category: true,
              sizeBytes: true,
              createdAt: true,
            },
          },
          reviewedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: [{ createdAt: "desc" }, { attemptNumber: "desc" }],
      });

      // Role-aware sanitization: Institution users receive only high-level status
      // and extracted values needed for correction, but NOT internal reviewer identities,
      // officer remarks, raw full text, or internal confidence scores.
      const sanitizedExtractions = user.role === Role.INSTITUTION_USER
        ? extractions.map((ext) => ({
            id: ext.id,
            documentId: ext.documentId,
            instrumentId: ext.instrumentId,
            attemptNumber: ext.attemptNumber,
            status: ext.status,
            extractedFdrNumber: ext.extractedFdrNumber,
            extractedBankName: ext.extractedBankName,
            extractedBranchName: ext.extractedBranchName,
            extractedAmount: ext.extractedAmount,
            extractedIssueDate: ext.extractedIssueDate,
            extractedMaturityDate: ext.extractedMaturityDate,
            hasMismatches: ext.hasMismatches,
            createdAt: ext.createdAt,
            document: ext.document,
          }))
        : extractions;

      res.status(200).json({ extractions: sanitizedExtractions });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:instrumentId/ocr/review
 * Human review workflow for OCR extractions.
 *
 * Safeguards:
 *  - Only Scrutiny Officers (SCRUTINY_OFFICER / AICTE_OFFICER) may review.
 *  - Requires non-empty review remarks.
 *  - Records field-by-field provenance in acceptedValues.
 *  - NEVER overwrites original institution-entered instrument values.
 *  - NEVER advances instrument lifecycle status.
 *  - Atomically writes review decision and audit event OCR_REVIEW_COMPLETED.
 */
router.post(
  "/review",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      // 1. Role verification: Only Scrutiny Officers and Administrators may review OCR extractions
      if (
        user.role !== Role.SCRUTINY_OFFICER &&
        user.role !== Role.AICTE_OFFICER &&
        user.role !== Role.SYSTEM_ADMIN &&
        user.role !== Role.ADMIN
      ) {
        res.status(403).json({
          error: "Forbidden",
          message: "Only AICTE Officers or Administrators can record review decisions.",
        });
        return;
      }

      // 2. Validate input
      const validation = reviewOcrSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: "Validation Error",
          message: validation.error.errors.map((e) => e.message).join(", "),
          details: validation.error.flatten(),
        });
        return;
      }

      const { extractionId, decision, remarks, acceptedValues } = validation.data;

      // 3. Resolve instrument
      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      // 4. Resolve OCR extraction
      const extraction = await prisma.ocrExtraction.findUnique({
        where: { id: extractionId },
        include: {
          document: {
            select: { id: true, originalName: true, mimeType: true },
          },
        },
      });

      if (!extraction || extraction.instrumentId !== instrument.id) {
        res.status(404).json({
          error: "Not Found",
          message: "OCR extraction record not found for this instrument.",
        });
        return;
      }

      if (extraction.status === "PENDING") {
        res.status(400).json({
          error: "Bad Request",
          message: "Cannot review an OCR extraction that is still in progress.",
        });
        return;
      }

      if (extraction.status === "FAILED") {
        res.status(400).json({
          error: "Bad Request",
          message: "Cannot record a successful review for a failed extraction.",
        });
        return;
      }

      // 5. Update extraction record and record audit event atomically
      const reviewedExtraction = await prisma.$transaction(async (tx) => {
        const updated = await tx.ocrExtraction.update({
          where: { id: extraction.id },
          data: {
            status: "REVIEWED",
            reviewedById: user.id,
            reviewedAt: new Date(),
            reviewRemarks: remarks.trim(),
            acceptedValues: acceptedValues as any,
          },
          include: {
            document: {
              select: { id: true, originalName: true, mimeType: true, category: true },
            },
            reviewedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        });

        // Record Audit Event: OCR_REVIEW_COMPLETED
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: "OCR_REVIEW_COMPLETED",
            entityType: "Instrument",
            entityId: instrument.id,
            metadata: {
              extractionId: extraction.id,
              documentId: extraction.documentId,
              decision,
              remarks: remarks.trim(),
              reviewedById: user.id,
              acceptedValuesCount: acceptedValues ? Object.keys(acceptedValues).length : 0,
              provenanceSummary: acceptedValues
                ? Object.entries(acceptedValues).map(([k, v]: any) => `${k}:${v?.provenance}`)
                : [],
            },
          },
        });

        return updated;
      });

      res.status(200).json({
        message: "OCR review decision recorded successfully.",
        extraction: reviewedExtraction,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
