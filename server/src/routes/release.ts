/**
 * src/routes/release.ts
 * Milestone 7 — Release and Refund Processing
 *
 * Routes (all mounted under /api/instruments/:instrumentId/release):
 *
 *   POST   /                — Submit a release request (institution user / system admin)
 *   GET    /                — List release requests for an instrument (role-scoped)
 *   POST   /decision        — Officer approves or rejects a pending release request
 *   POST   /confirm-refund  — Officer confirms bank payment after approval
 *
 * Lifecycle semantics:
 *   ACTIVE | MATURED → RELEASE_REQUESTED   on submit
 *   RELEASE_REQUESTED → RELEASED           on officer approval
 *   RELEASE_REQUESTED → <previousStatus>   on officer rejection
 *   ReleaseRequest.APPROVED → REFUND_CONFIRMED  on refund confirmation (instrument unchanged)
 *
 * Physical custody handover is tracked separately via the existing
 *   POST /api/instruments/:instrumentId/custody  (CustodyEventType.ORIGINAL_RELEASED)
 * and is NOT implied by any action in this file.
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role, InstrumentStatus, ReleaseRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { createChainedAuditEvent } from "../utils/auditChain";
import {
  submitReleaseRequestSchema,
  releaseDecisionSchema,
  confirmRefundSchema,
  reviewReleaseDocumentSchema,
  decideClearanceSchema,
  releaseHoldSchema,
  assignClearanceOfficerSchema,
} from "../validation/release";
import {
  MANDATORY_RELEASE_DOCUMENTS,
  MANDATORY_CLEARANCE_DEPARTMENTS,
  isOfficerAuthorizedForDepartmentClearance,
  evaluateReleaseNocGuard,
  generateReleasePreCheckReport,
} from "../services/releaseWorkflowService";

const router = Router({ mergeParams: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the instrument and enforce institution-level isolation.
 * Returns null (→ 404) for both "not found" and "wrong institution" to
 * avoid existence-leakage, following the pattern in instruments.ts and custody.ts.
 */
async function resolveInstrument(
  instrumentId: string,
  user: NonNullable<Request["user"]>
) {
  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    select: {
      id: true,
      instrumentNumber: true,
      institutionId: true,
      status: true,
    },
  });

  if (!instrument) return null;

  if (
    user.role === Role.INSTITUTION_USER &&
    instrument.institutionId !== user.institutionId
  ) {
    return null;
  }

  return instrument;
}

// ── A. POST / — Submit release request ───────────────────────────────────────

/**
 * POST /api/instruments/:instrumentId/release
 *
 * Authorized: INSTITUTION_USER (own institution only), SYSTEM_ADMIN
 * Guard:      Instrument must be ACTIVE or MATURED
 *             No existing PENDING release request (application pre-check +
 *             DB partial unique index as concurrency backstop)
 *
 * On success: atomically creates ReleaseRequest (PENDING) and transitions
 *             instrument to RELEASE_REQUESTED, recording an audit event.
 */
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      // Only institution users and admins can submit release requests.
      // APPROVER / AICTE_OFFICER / SCRUTINY_OFFICER roles are not authorized.
      if (
        user.role !== Role.INSTITUTION_USER &&
        user.role !== Role.SYSTEM_ADMIN
      ) {
        res.status(403).json({
          error: "Forbidden",
          message: "AICTE Officers are not authorized to submit release requests. Only institution users may initiate a release.",
        });
        return;
      }

      if (user.role !== Role.SYSTEM_ADMIN && !user.institutionId) {
        res.status(403).json({
          error: "Forbidden",
          message: "User account is not linked to an accredited institution.",
        });
        return;
      }

      // Validate request body
      const parsed = submitReleaseRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Please correct the invalid fields.",
          issues: parsed.error.issues,
        });
        return;
      }

      const { reason } = parsed.data;

      // Resolve instrument with institution isolation
      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      // Eligibility: only ACTIVE or MATURED instruments may be released
      const eligibleStatuses: InstrumentStatus[] = [
        InstrumentStatus.ACTIVE,
        InstrumentStatus.MATURED,
      ];
      if (!eligibleStatuses.includes(instrument.status)) {
        res.status(400).json({
          error: "Invalid State Transition",
          message: `Cannot request release for an instrument in '${instrument.status}' status. Only ACTIVE or MATURED instruments may be submitted for release.`,
        });
        return;
      }

      // Application-level pre-check for existing PENDING request.
      // The DB partial unique index provides the concurrency backstop.
      const existingPending = await prisma.releaseRequest.findFirst({
        where: {
          instrumentId: instrument.id,
          status: ReleaseRequestStatus.PENDING,
        },
        select: { id: true },
      });

      if (existingPending) {
        res.status(409).json({
          error: "Conflict",
          message: "A pending release request already exists for this instrument. Please wait for the current request to be decided before submitting a new one.",
        });
        return;
      }

      // Atomic transaction: create release request + transition instrument + audit
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create the release request, capturing the current status for
        //    accurate restoration if the request is later rejected.
        const releaseRequest = await (tx.releaseRequest as any).create({
          data: {
            instrumentId: instrument.id,
            previousInstrumentStatus: instrument.status,
            requestedById: user.id,
            reason,
            status: ReleaseRequestStatus.PENDING,
            workflowStage: "SUBMITTED",
          },
        });

        // Initialize document reviews and departmental clearances if supported
        if (typeof (tx as any).releaseDocumentReview?.create === "function") {
          for (const docType of MANDATORY_RELEASE_DOCUMENTS) {
            await (tx as any).releaseDocumentReview.create({
              data: {
                releaseRequestId: releaseRequest.id,
                documentType: docType as any,
                status: "PENDING",
              },
            });
          }
        }

        if (typeof (tx as any).releaseClearance?.create === "function") {
          for (const dept of MANDATORY_CLEARANCE_DEPARTMENTS) {
            await (tx as any).releaseClearance.create({
              data: {
                releaseRequestId: releaseRequest.id,
                department: dept as any,
                status: "PENDING",
              },
            });
          }
        }

        // 2. Transition instrument to RELEASE_REQUESTED
        const updatedInstrument = await tx.instrument.update({
          where: { id: instrument.id },
          data: { status: InstrumentStatus.RELEASE_REQUESTED },
          select: {
            id: true,
            instrumentNumber: true,
            status: true,
            institutionId: true,
          },
        });

        // 3. Audit event
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: "RELEASE_REQUESTED",
            entityType: "Instrument",
            entityId: instrument.id,
            metadata: {
              releaseRequestId: releaseRequest.id,
              previousStatus: instrument.status,
              newStatus: InstrumentStatus.RELEASE_REQUESTED,
              reason,
            },
          },
        });

        return { releaseRequest, updatedInstrument };
      });

      res.status(201).json({
        message: "Release request submitted successfully. It will be reviewed by an AICTE Officer.",
        releaseRequest: result.releaseRequest,
        instrument: result.updatedInstrument,
      });
    } catch (error) {
      // Handle the DB-level partial unique index violation as a graceful 409
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error: "Conflict",
          message: "A pending release request already exists for this instrument (concurrent submission detected).",
        });
        return;
      }
      next(error);
    }
  }
);

// ── B. GET / — List release requests ─────────────────────────────────────────

/**
 * GET /api/instruments/:instrumentId/release
 *
 * Authorized: All authenticated users (institution-scoped for INSTITUTION_USER)
 *
 * Returns the full history of release requests for an instrument, ordered
 * newest first.  Institution users cannot see requests for other institutions.
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

      const releaseRequests = await (prisma.releaseRequest as any).findMany({
        where: { instrumentId: instrument.id },
        include: {
          requestedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          decidedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          refundConfirmedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          clearances: {
            include: {
              assignedOfficer: { select: { id: true, fullName: true, role: true, department: true } },
              decidedBy: { select: { id: true, fullName: true, role: true, department: true } },
            },
          },
          documentReviews: {
            include: {
              reviewedBy: { select: { id: true, fullName: true, role: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({
        instrumentId: instrument.id,
        instrumentNumber: instrument.instrumentNumber,
        releaseRequests,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── C. POST /decision — Officer decides a release request ─────────────────────

/**
 * POST /api/instruments/:instrumentId/release/decision
 *
 * Authorized: AICTE_OFFICER, SYSTEM_ADMIN
 * Guard:      Release request must be PENDING
 *             Instrument must be RELEASE_REQUESTED
 *
 * APPROVE:
 *   - Instrument: RELEASE_REQUESTED → RELEASED
 *   - ReleaseRequest: PENDING → APPROVED
 *   - Records decidedById, decidedAt, officerRemarks
 *   - Audit: RELEASE_APPROVED
 *
 * REJECT:
 *   - Instrument: RELEASE_REQUESTED → previousInstrumentStatus
 *   - ReleaseRequest: PENDING → REJECTED
 *   - Records decidedById, decidedAt, officerRemarks
 *   - Audit: RELEASE_REJECTED
 *
 * NOTE: Approval does not imply physical custody handover.  The instrument
 * transitions to RELEASED (regulatory consent granted) but CustodyStatus
 * remains unchanged.  Physical handover is recorded separately via
 * POST /api/instruments/:instrumentId/custody with ORIGINAL_RELEASED.
 */
router.post(
  "/decision",
  requireAuth,
  requireRoles(Role.APPROVER),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      const parsed = releaseDecisionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid decision payload.",
          issues: parsed.error.issues,
        });
        return;
      }

      const { decision, remarks } = parsed.data;

      // Approvers have system-wide regulatory jurisdiction
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
        select: {
          id: true,
          instrumentNumber: true,
          status: true,
          institutionId: true,
          scrutinizedById: true,
        },
      });

      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      if (instrument.status !== InstrumentStatus.RELEASE_REQUESTED) {
        res.status(400).json({
          error: "Invalid State Transition",
          message: `Cannot record a release decision for an instrument in '${instrument.status}' status. Expected RELEASE_REQUESTED.`,
        });
        return;
      }

      // Find the PENDING release request.
      const pendingRequest = await prisma.releaseRequest.findFirst({
        where: {
          instrumentId: instrument.id,
          status: ReleaseRequestStatus.PENDING,
        },
        select: {
          id: true,
          requestedById: true,
          previousInstrumentStatus: true,
        },
      });

      if (!pendingRequest) {
        res.status(404).json({
          error: "Not Found",
          message: "No pending release request found for this instrument.",
        });
        return;
      }

      // ── Four-Eyes Separation of Duties Validation ───────────────────────────
      // 1. Approver cannot be the release requester
      if (pendingRequest.requestedById === user.id) {
        await prisma.auditEvent.create({
          data: {
            actorId: user.id,
            action: "SECURITY_SOD_VIOLATION_DENIED",
            entityType: "ReleaseRequest",
            entityId: pendingRequest.id,
            metadata: {
              violation: "APPROVER_WAS_REQUESTER",
              reason: "Requester attempted to approve own release request",
              instrumentId: instrument.id,
            },
          },
        });
        res.status(403).json({
          error: "Forbidden",
          message: "Separation of duties violation: You cannot approve a release request you submitted.",
        });
        return;
      }

      // 2. Fetch all scrutiny history across ScrutinyRecords, AuditEvents, and scrutinizedById
      const [scrutinyRecords, scrutinyAuditEvents] = await Promise.all([
        typeof prisma.scrutinyRecord?.findMany === "function"
          ? prisma.scrutinyRecord.findMany({
              where: { instrumentId: instrument.id },
              select: { officerId: true },
            })
          : Promise.resolve([]),
        typeof prisma.auditEvent?.findMany === "function"
          ? prisma.auditEvent.findMany({
              where: {
                entityType: "Instrument",
                entityId: instrument.id,
                action: { startsWith: "SCRUTINY_" },
              },
              select: { actorId: true },
            })
          : Promise.resolve([]),
      ]);

      const scrutinizingOfficerIds = new Set<string>();
      if (instrument.scrutinizedById) {
        scrutinizingOfficerIds.add(instrument.scrutinizedById);
      }
      (scrutinyRecords || []).forEach((r) => scrutinizingOfficerIds.add(r.officerId));
      (scrutinyAuditEvents || []).forEach((a) => {
        if (a?.actorId) scrutinizingOfficerIds.add(a.actorId);
      });

      // 3. Approver cannot have participated in any scrutiny of this instrument
      if (scrutinizingOfficerIds.has(user.id)) {
        await prisma.auditEvent.create({
          data: {
            actorId: user.id,
            action: "SECURITY_SOD_VIOLATION_DENIED",
            entityType: "ReleaseRequest",
            entityId: pendingRequest.id,
            metadata: {
              violation: "APPROVER_WAS_SCRUTINIZER",
              reason: "Scrutinizing officer attempted to approve release",
              instrumentId: instrument.id,
            },
          },
        });
        res.status(403).json({
          error: "Forbidden",
          message: "Separation of duties violation: An officer who scrutinized this instrument cannot approve its release.",
        });
        return;
      }

      // 4. Missing scrutiny history must fail closed
      if (scrutinizingOfficerIds.size === 0) {
        await prisma.auditEvent.create({
          data: {
            actorId: user.id,
            action: "SECURITY_SOD_VIOLATION_DENIED",
            entityType: "ReleaseRequest",
            entityId: pendingRequest.id,
            metadata: {
              violation: "MISSING_SCRUTINY_HISTORY",
              reason: "Release decision attempted without verified scrutiny history",
              instrumentId: instrument.id,
            },
          },
        });
        res.status(403).json({
          error: "Forbidden",
          message: "Release request cannot be decided without verified scrutiny history.",
        });
        return;
      }

      // 5. Final Decision Guard for Approvals (APH Section 6.46)
      if (decision === "APPROVE") {
        const recordedClearances = typeof (prisma as any).releaseClearance?.findMany === "function"
          ? await (prisma as any).releaseClearance.findMany({ where: { releaseRequestId: pendingRequest.id } })
          : [];

        if (recordedClearances.length > 0) {
          const guardResult = await evaluateReleaseNocGuard(pendingRequest.id, user, prisma);
          if (!guardResult.isEligible) {
            res.status(422).json({
              error: "Precondition Failed",
              message: "Cannot issue FDR release NOC due to unsatisfied regulatory prerequisites.",
              isEligibleForFinalDecision: false,
              blockers: guardResult.blockers,
            });
            return;
          }
        }
      }

      const now = new Date();
      const isApproval = decision === "APPROVE";

      const newInstrumentStatus = isApproval
        ? InstrumentStatus.RELEASED
        : (pendingRequest.previousInstrumentStatus as InstrumentStatus);

      const newRequestStatus = isApproval
        ? ReleaseRequestStatus.APPROVED
        : ReleaseRequestStatus.REJECTED;

      // Atomic transaction: update request + instrument + audit
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update the release request
        const updatedRequest = await (tx.releaseRequest as any).update({
          where: { id: pendingRequest.id },
          data: {
            status: newRequestStatus,
            workflowStage: isApproval ? "NOC_ISSUED" : "REJECTED",
            decidedById: user.id,
            decidedAt: now,
            officerRemarks: remarks,
          },
        });

        // 2. Transition the instrument
        const updatedInstrument = await tx.instrument.update({
          where: { id: instrument.id },
          data: { status: newInstrumentStatus },
          select: {
            id: true,
            instrumentNumber: true,
            status: true,
            institutionId: true,
          },
        });

        // 3. Audit event
        const auditAction = isApproval ? "RELEASE_APPROVED" : "RELEASE_REJECTED";
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: auditAction,
            entityType: "Instrument",
            entityId: instrument.id,
            metadata: {
              releaseRequestId: pendingRequest.id,
              decision,
              previousStatus: InstrumentStatus.RELEASE_REQUESTED,
              newStatus: newInstrumentStatus,
              officerRemarks: remarks,
              approverEmail: user.email,
              // Explicitly note that this approval is regulatory only
              ...(isApproval && {
                note: "Regulatory approval granted. Physical custody handover and refund confirmation are separate subsequent actions.",
              }),
            },
          },
        });

        return { updatedRequest, updatedInstrument };
      });

      res.status(200).json({
        message: `Release request ${isApproval ? "approved" : "rejected"} successfully.`,
        releaseRequest: result.updatedRequest,
        instrument: result.updatedInstrument,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── D. POST /confirm-refund — Record bank payment ─────────────────────────────

/**
 * POST /api/instruments/:instrumentId/release/confirm-refund
 *
 * Authorized: APPROVER
 * Guard:      Release request must be in APPROVED status (instrument already RELEASED)
 *
 * Records evidence that the refund/bank transfer has physically occurred.
 * This is explicitly SEPARATE from:
 *   - Regulatory approval (handled by POST /decision)
 *   - Physical document handover (handled by POST /custody with ORIGINAL_RELEASED)
 *
 * On success: transitions ReleaseRequest from APPROVED → REFUND_CONFIRMED.
 * Instrument status remains RELEASED unchanged.
 */
router.post(
  "/confirm-refund",
  requireAuth,
  requireRoles(Role.APPROVER),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      const parsed = confirmRefundSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid refund confirmation payload.",
          issues: parsed.error.issues,
        });
        return;
      }

      const { refundReference } = parsed.data;

      // Officers have system-wide access
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
        select: { id: true, instrumentNumber: true, status: true },
      });

      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      // Instrument must already be RELEASED (approval must precede refund confirmation)
      if (instrument.status !== InstrumentStatus.RELEASED) {
        res.status(400).json({
          error: "Invalid State Transition",
          message: `Cannot confirm refund for an instrument in '${instrument.status}' status. The release request must be approved first (instrument must be in RELEASED status).`,
        });
        return;
      }

      // Find the APPROVED release request
      const approvedRequest = await prisma.releaseRequest.findFirst({
        where: {
          instrumentId: instrument.id,
          status: ReleaseRequestStatus.APPROVED,
        },
        select: { id: true },
      });

      if (!approvedRequest) {
        res.status(404).json({
          error: "Not Found",
          message: "No approved release request found for this instrument. A release request must be approved before confirming the refund.",
        });
        return;
      }

      const now = new Date();

      // Atomic: update release request + audit event (instrument is NOT modified)
      const result = await prisma.$transaction(async (tx) => {
        const updatedRequest = await tx.releaseRequest.update({
          where: { id: approvedRequest.id },
          data: {
            status: ReleaseRequestStatus.REFUND_CONFIRMED,
            refundReference,
            refundConfirmedAt: now,
            refundConfirmedById: user.id,
          },
        });

        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: "REFUND_CONFIRMED",
            entityType: "Instrument",
            entityId: instrument.id,
            metadata: {
              releaseRequestId: approvedRequest.id,
              refundReference,
              confirmedByEmail: user.email,
              note: "Refund payment confirmed. Physical custody handover, if not already recorded, should be confirmed separately via the custody endpoint with event type ORIGINAL_RELEASED.",
            },
          },
        });

        return updatedRequest;
      });

      res.status(200).json({
        message: "Refund confirmed successfully. Physical custody handover, if applicable, should be recorded separately.",
        releaseRequest: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── D. USP-2: Intelligent Multi-Department Clearance & NOC Endpoints ───────────

/**
 * GET /api/instruments/:instrumentId/release/:releaseRequestId/pre-check
 * Evaluates document checklist, departmental clearances, holds, and USP-1 APH compliance.
 */
router.get(
  "/:releaseRequestId/pre-check",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, releaseRequestId } = req.params as {
        instrumentId: string;
        releaseRequestId: string;
      };

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const report = await generateReleasePreCheckReport(releaseRequestId, user, prisma);
      if (!report.releaseRequest) {
        res.status(404).json({ error: "Not Found", message: "Release request not found." });
        return;
      }

      res.status(200).json({
        instrumentId: instrument.id,
        instrumentNumber: instrument.instrumentNumber,
        releaseRequestId,
        ...report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:instrumentId/release/:releaseRequestId/documents/:documentType/review
 * Scrutinizer or Approver reviews a mandatory release document.
 */
router.post(
  "/:releaseRequestId/documents/:documentType/review",
  requireAuth,
  requireRoles(Role.SCRUTINY_OFFICER, Role.APPROVER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, releaseRequestId, documentType } = req.params as {
        instrumentId: string;
        releaseRequestId: string;
        documentType: string;
      };

      if (!MANDATORY_RELEASE_DOCUMENTS.includes(documentType as any)) {
        res.status(400).json({
          error: "Validation Error",
          message: `Invalid document type '${documentType}'. Must be one of: ${MANDATORY_RELEASE_DOCUMENTS.join(", ")}`,
        });
        return;
      }

      const parsed = reviewReleaseDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid review payload.",
          issues: parsed.error.issues,
        });
        return;
      }

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const releaseRequest = await prisma.releaseRequest.findUnique({
        where: { id: releaseRequestId },
      });

      if (!releaseRequest || releaseRequest.instrumentId !== instrument.id) {
        res.status(404).json({ error: "Not Found", message: "Release request not found." });
        return;
      }

      if (releaseRequest.status !== ReleaseRequestStatus.PENDING) {
        res.status(400).json({
          error: "Invalid State",
          message: `Cannot review documents for release request in status '${releaseRequest.status}'.`,
        });
        return;
      }

      const now = new Date();
      const result = await prisma.$transaction(async (tx) => {
        const review = await (tx as any).releaseDocumentReview.upsert({
          where: {
            releaseRequestId_documentType: {
              releaseRequestId,
              documentType: documentType as any,
            },
          },
          update: {
            status: parsed.data.status,
            reviewedById: user.id,
            reviewRemarks: parsed.data.reviewRemarks || null,
            documentId: parsed.data.documentId || null,
            reviewedAt: now,
          },
          create: {
            releaseRequestId,
            documentType: documentType as any,
            status: parsed.data.status,
            reviewedById: user.id,
            reviewRemarks: parsed.data.reviewRemarks || null,
            documentId: parsed.data.documentId || null,
            reviewedAt: now,
          },
        });

        // Determine workflow transition
        let nextStage: string = "DOCUMENT_REVIEW";
        if (parsed.data.status === "CORRECTION_REQUIRED") {
          nextStage = "CORRECTION_REQUIRED";
        } else {
          // Check all documents
          const allReviews = await (tx as any).releaseDocumentReview.findMany({
            where: { releaseRequestId },
          });
          const allConfirmed =
            MANDATORY_RELEASE_DOCUMENTS.every(
              (dt) => allReviews.find((r: any) => r.documentType === dt)?.status === "CONFIRMED"
            );

          if (allConfirmed) {
            // Check clearances
            const allClearances = await (tx as any).releaseClearance.findMany({
              where: { releaseRequestId },
            });
            const allSatisfied =
              MANDATORY_CLEARANCE_DEPARTMENTS.every(
                (dept) =>
                  ["CLEARED", "NOT_APPLICABLE"].includes(
                    allClearances.find((c: any) => c.department === dept)?.status
                  )
              );
            nextStage = allSatisfied ? "READY_FOR_FINAL_DECISION" : "CLEARANCES_PENDING";
          }
        }

        await (tx.releaseRequest as any).update({
          where: { id: releaseRequestId },
          data: { workflowStage: nextStage },
        });

        await createChainedAuditEvent(tx, {
          actorId: user.id,
          action: "RELEASE_DOCUMENT_REVIEWED",
          entityType: "ReleaseDocumentReview",
          entityId: review.id,
          metadata: {
            releaseRequestId,
            documentType,
            status: parsed.data.status,
            remarks: parsed.data.reviewRemarks,
            nextStage,
          },
        });

        return { review, nextStage };
      });

      res.status(200).json({
        message: `Document review for '${documentType}' saved successfully.`,
        review: result.review,
        workflowStage: result.nextStage,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:instrumentId/release/:releaseRequestId/clearances/:department
 * Authorized department officer records departmental clearance (PGRC, VIGILANCE, OTHER_APPLICABLE_BUREAU).
 */
router.post(
  "/:releaseRequestId/clearances/:department",
  requireAuth,
  requireRoles(Role.SCRUTINY_OFFICER, Role.APPROVER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, releaseRequestId, department } = req.params as {
        instrumentId: string;
        releaseRequestId: string;
        department: string;
      };

      if (!MANDATORY_CLEARANCE_DEPARTMENTS.includes(department as any)) {
        res.status(400).json({
          error: "Validation Error",
          message: `Invalid clearance department '${department}'. Must be one of: ${MANDATORY_CLEARANCE_DEPARTMENTS.join(", ")}`,
        });
        return;
      }

      const parsed = decideClearanceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid clearance decision payload.",
          issues: parsed.error.issues,
        });
        return;
      }

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const releaseRequest = await prisma.releaseRequest.findUnique({
        where: { id: releaseRequestId },
      });

      if (!releaseRequest || releaseRequest.instrumentId !== instrument.id) {
        res.status(404).json({ error: "Not Found", message: "Release request not found." });
        return;
      }

      if (releaseRequest.status !== ReleaseRequestStatus.PENDING) {
        res.status(400).json({
          error: "Invalid State",
          message: `Cannot decide clearance for release request in status '${releaseRequest.status}'.`,
        });
        return;
      }

      // Check existing clearance record
      const existingClearance = typeof (prisma as any).releaseClearance?.findUnique === "function"
        ? await (prisma as any).releaseClearance.findUnique({
            where: {
              releaseRequestId_department: {
                releaseRequestId,
                department: department as any,
              },
            },
          })
        : null;

      // ── RBAC Department Authorization Check ──────────────────────────────
      // User must be explicitly authorized for this department
      const userWithDept: any = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, department: true } as any,
      });

      const isAuthorized = isOfficerAuthorizedForDepartmentClearance(
        {
          id: user.id,
          role: user.role,
          department: userWithDept?.department,
        },
        department,
        existingClearance?.assignedOfficerId
      );

      if (!isAuthorized) {
        await prisma.auditEvent.create({
          data: {
            actorId: user.id,
            action: "SECURITY_UNAUTHORIZED_CLEARANCE_DENIED",
            entityType: "ReleaseClearance",
            entityId: existingClearance?.id || `${releaseRequestId}-${department}`,
            metadata: {
              department,
              userDepartment: userWithDept?.department,
              assignedOfficerId: existingClearance?.assignedOfficerId,
              reason: "Officer attempted clearance decision without departmental authorization",
            },
          },
        });

        res.status(403).json({
          error: "Forbidden",
          message: `You do not have clearance authority for department '${department}'. Only assigned officers or members of '${department}' may record this decision.`,
        });
        return;
      }

      // Duplicate submission guard: prevent identical re-decision
      if (existingClearance && existingClearance.status === parsed.data.status && existingClearance.decidedAt) {
        res.status(409).json({
          error: "Conflict",
          message: `Clearance for '${department}' has already been decided with status '${existingClearance.status}'.`,
        });
        return;
      }

      const now = new Date();
      const result = await prisma.$transaction(async (tx) => {
        const clearance = await (tx as any).releaseClearance.upsert({
          where: {
            releaseRequestId_department: {
              releaseRequestId,
              department: department as any,
            },
          },
          update: {
            status: parsed.data.status,
            decisionReason: parsed.data.decisionReason,
            decidedById: user.id,
            decidedAt: now,
          },
          create: {
            releaseRequestId,
            department: department as any,
            status: parsed.data.status,
            decisionReason: parsed.data.decisionReason,
            decidedById: user.id,
            decidedAt: now,
          },
        });

        // Workflow transition
        let nextStage: string = (releaseRequest as any).workflowStage || "SUBMITTED";
        let holdReason: string | null = (releaseRequest as any).holdReason || null;

        if (parsed.data.status === "OBJECTION_RAISED") {
          nextStage = "ON_HOLD";
          holdReason = `Objection raised by ${department}: ${parsed.data.decisionReason}`;
        } else {
          // Check if all clearances satisfied
          const allClearances = await (tx as any).releaseClearance.findMany({
            where: { releaseRequestId },
          });
          const allSatisfied =
            MANDATORY_CLEARANCE_DEPARTMENTS.every((dept) =>
              ["CLEARED", "NOT_APPLICABLE"].includes(
                allClearances.find((c: any) => c.department === dept)?.status
              )
            );

          const allReviews = await (tx as any).releaseDocumentReview.findMany({
            where: { releaseRequestId },
          });
          const allDocsConfirmed =
            MANDATORY_RELEASE_DOCUMENTS.every(
              (dt) => allReviews.find((r: any) => r.documentType === dt)?.status === "CONFIRMED"
            );

          if (allSatisfied && allDocsConfirmed) {
            nextStage = "READY_FOR_FINAL_DECISION";
          } else {
            nextStage = "CLEARANCES_PENDING";
          }
        }

        await (tx.releaseRequest as any).update({
          where: { id: releaseRequestId },
          data: { workflowStage: nextStage, holdReason },
        });

        await createChainedAuditEvent(tx, {
          actorId: user.id,
          action: "CLEARANCE_DECIDED",
          entityType: "ReleaseClearance",
          entityId: clearance.id,
          metadata: {
            releaseRequestId,
            department,
            status: parsed.data.status,
            reason: parsed.data.decisionReason,
            nextStage,
          },
        });

        return { clearance, nextStage };
      });

      res.status(200).json({
        message: `Clearance decision for '${department}' recorded successfully as '${parsed.data.status}'.`,
        clearance: result.clearance,
        workflowStage: result.nextStage,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:instrumentId/release/:releaseRequestId/clearances/:department/assign
 * Assign an officer to a specific departmental clearance.
 */
router.post(
  "/:releaseRequestId/clearances/:department/assign",
  requireAuth,
  requireRoles(Role.ADMIN, Role.APPROVER),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, releaseRequestId, department } = req.params as {
        instrumentId: string;
        releaseRequestId: string;
        department: string;
      };

      const parsed = assignClearanceOfficerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid assignment payload.",
          issues: parsed.error.issues,
        });
        return;
      }

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const targetOfficer = await prisma.user.findUnique({
        where: { id: parsed.data.assignedOfficerId },
      });

      if (!targetOfficer || !targetOfficer.isActive) {
        res.status(404).json({ error: "Not Found", message: "Assigned officer not found or inactive." });
        return;
      }

      const clearance = await (prisma as any).releaseClearance.upsert({
        where: {
          releaseRequestId_department: {
            releaseRequestId,
            department: department as any,
          },
        },
        update: { assignedOfficerId: targetOfficer.id },
        create: {
          releaseRequestId,
          department: department as any,
          status: "PENDING",
          assignedOfficerId: targetOfficer.id,
        },
      });

      await createChainedAuditEvent(prisma as any, {
        actorId: user.id,
        action: "CLEARANCE_ASSIGNED",
        entityType: "ReleaseClearance",
        entityId: clearance.id,
        metadata: {
          releaseRequestId,
          department,
          assignedOfficerId: targetOfficer.id,
          assignedOfficerEmail: targetOfficer.email,
        },
      });

      res.status(200).json({
        message: `Officer ${targetOfficer.fullName} successfully assigned to ${department} clearance.`,
        clearance,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:instrumentId/release/:releaseRequestId/hold
 * Places or lifts a regulatory/financial hold on a release request.
 */
router.post(
  "/:releaseRequestId/hold",
  requireAuth,
  requireRoles(Role.SCRUTINY_OFFICER, Role.APPROVER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, releaseRequestId } = req.params as {
        instrumentId: string;
        releaseRequestId: string;
      };

      const parsed = releaseHoldSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid hold payload.",
          issues: parsed.error.issues,
        });
        return;
      }

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const releaseRequest = await prisma.releaseRequest.findUnique({
        where: { id: releaseRequestId },
      });

      if (!releaseRequest || releaseRequest.instrumentId !== instrument.id) {
        res.status(404).json({ error: "Not Found", message: "Release request not found." });
        return;
      }

      const { action, reason } = parsed.data;

      const result = await prisma.$transaction(async (tx) => {
        let nextStage: string;
        let holdReason: string | null;
        let holdPlacedById: string | null;
        let auditAction: string;

        if (action === "PLACE_HOLD") {
          nextStage = "ON_HOLD";
          holdReason = reason;
          holdPlacedById = user.id;
          auditAction = "RELEASE_HOLD_PLACED";
        } else {
          // LIFT_HOLD
          nextStage = "CLEARANCES_PENDING";
          holdReason = null;
          holdPlacedById = null;
          auditAction = "RELEASE_HOLD_LIFTED";
        }

        const updated = await (tx.releaseRequest as any).update({
          where: { id: releaseRequestId },
          data: {
            workflowStage: nextStage,
            holdReason,
            holdPlacedById,
          },
        });

        await createChainedAuditEvent(tx, {
          actorId: user.id,
          action: auditAction,
          entityType: "ReleaseRequest",
          entityId: releaseRequestId,
          metadata: {
            action,
            reason,
            nextStage,
          },
        });

        return updated;
      });

      res.status(200).json({
        message: action === "PLACE_HOLD" ? "Release request placed on hold." : "Hold lifted successfully.",
        releaseRequest: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:instrumentId/release/:releaseRequestId/noc
 * Final authorized NOC issuance by the Approval Bureau (Role.APPROVER).
 * Enforces the strict Final Decision Guard.
 */
router.post(
  "/:releaseRequestId/noc",
  requireAuth,
  requireRoles(Role.APPROVER),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, releaseRequestId } = req.params as {
        instrumentId: string;
        releaseRequestId: string;
      };

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const releaseRequest = await prisma.releaseRequest.findUnique({
        where: { id: releaseRequestId },
      });

      if (!releaseRequest || releaseRequest.instrumentId !== instrument.id) {
        res.status(404).json({ error: "Not Found", message: "Release request not found." });
        return;
      }

      // Concurrency guard: already decided
      if (releaseRequest.status !== ReleaseRequestStatus.PENDING) {
        res.status(409).json({
          error: "Conflict",
          message: `Release request has already been decided with status '${releaseRequest.status}'. Concurrent decision prevented.`,
        });
        return;
      }

      // Strict Final Decision Guard
      const guardResult = await evaluateReleaseNocGuard(releaseRequestId, user, prisma);
      if (!guardResult.isEligible) {
        res.status(422).json({
          error: "Precondition Failed",
          message: "Cannot issue FDR release NOC due to unsatisfied regulatory prerequisites.",
          isEligibleForFinalDecision: false,
          blockers: guardResult.blockers,
        });
        return;
      }

      const now = new Date();
      const remarks = req.body.remarks || "All departmental clearances and statutory documents verified. FDR Release NOC granted.";

      const result = await prisma.$transaction(async (tx) => {
        const updatedRequest = await (tx.releaseRequest as any).update({
          where: { id: releaseRequestId },
          data: {
            status: ReleaseRequestStatus.APPROVED,
            workflowStage: "NOC_ISSUED",
            decidedById: user.id,
            decidedAt: now,
            officerRemarks: remarks,
          },
        });

        const updatedInstrument = await tx.instrument.update({
          where: { id: instrument.id },
          data: { status: InstrumentStatus.RELEASED },
          select: {
            id: true,
            instrumentNumber: true,
            status: true,
            institutionId: true,
          },
        });

        await createChainedAuditEvent(tx, {
          actorId: user.id,
          action: "RELEASE_NOC_ISSUED",
          entityType: "ReleaseRequest",
          entityId: releaseRequestId,
          metadata: {
            instrumentId: instrument.id,
            instrumentNumber: instrument.instrumentNumber,
            nocDecision: "APPROVED",
            remarks,
            approvedByEmail: user.email,
          },
        });

        return { updatedRequest, updatedInstrument };
      });

      res.status(200).json({
        message: "FDR Release NOC issued successfully by Approval Bureau.",
        releaseRequest: result.updatedRequest,
        instrument: result.updatedInstrument,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
