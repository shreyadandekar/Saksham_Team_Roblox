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
import {
  submitReleaseRequestSchema,
  releaseDecisionSchema,
  confirmRefundSchema,
} from "../validation/release";

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

      // AICTE officers cannot submit release requests on behalf of institutions
      if (user.role === Role.AICTE_OFFICER) {
        res.status(403).json({
          error: "Forbidden",
          message: "AICTE Officers are not authorized to submit release requests.",
        });
        return;
      }

      // Institution users must belong to an institution
      if (user.role === Role.INSTITUTION_USER && !user.institutionId) {
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
        const releaseRequest = await tx.releaseRequest.create({
          data: {
            instrumentId: instrument.id,
            previousInstrumentStatus: instrument.status,
            requestedById: user.id,
            reason,
            status: ReleaseRequestStatus.PENDING,
          },
        });

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

      const releaseRequests = await prisma.releaseRequest.findMany({
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
  requireRoles(Role.AICTE_OFFICER, Role.SYSTEM_ADMIN),
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

      // Officers have system-wide access; no institution-scope filtering needed.
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
        select: { id: true, instrumentNumber: true, status: true, institutionId: true },
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

      // Find the PENDING release request.  Use findFirst with a status filter
      // rather than findUnique, as the partial unique index guarantees at most
      // one PENDING record per instrument — this is consistent and safe.
      const pendingRequest = await prisma.releaseRequest.findFirst({
        where: {
          instrumentId: instrument.id,
          status: ReleaseRequestStatus.PENDING,
        },
        select: {
          id: true,
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
        const updatedRequest = await tx.releaseRequest.update({
          where: { id: pendingRequest.id },
          data: {
            status: newRequestStatus,
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
              officerEmail: user.email,
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
 * Authorized: AICTE_OFFICER, SYSTEM_ADMIN
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
  requireRoles(Role.AICTE_OFFICER, Role.SYSTEM_ADMIN),
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

export default router;
