/**
 * server/src/routes/clearances.ts
 *
 * Dedicated Clearance Command Center API router for USP-2:
 * Intelligent FDR Release & Multi-Department Clearance Workflow.
 *
 * Endpoints:
 *   GET /api/clearances
 *     - Role-scoped system-wide view for AICTE Officers (Scrutiny, PGRC, Vigilance, Approver, Admin, Auditor)
 *     - Institution-isolated view for Institution Users
 *     - Returns summary counts + searchable/filterable cases
 *   GET /api/clearances/:releaseRequestId
 *     - Returns full detail for an individual clearance case, including documents, clearances, and audit history
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role, ReleaseRequestStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { evaluateAphCompliance } from "../services/aphComplianceEngine";
import { evaluateReleaseNocGuard } from "../services/releaseWorkflowService";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/clearances
 * Returns cases for the Clearance Command Center with live statistics.
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { stage, department, search, status } = req.query;

      const whereClause: Record<string, unknown> = {};

      // ── Institution isolation ─────────────────────────────────────────────
      if (user.role === Role.INSTITUTION_USER) {
        if (!user.institutionId) {
          res.status(200).json({
            cases: [],
            stats: {
              totalPending: 0,
              awaitingDocumentReview: 0,
              awaitingClearances: 0,
              readyForFinalDecision: 0,
              unresolvedObjections: 0,
              completedCases: 0,
            },
          });
          return;
        }
        whereClause["instrument"] = {
          institutionId: user.institutionId,
        };
      }

      // ── Filters ───────────────────────────────────────────────────────────
      if (status && typeof status === "string") {
        whereClause["status"] = status;
      }

      if (stage && typeof stage === "string" && stage !== "ALL") {
        whereClause["workflowStage"] = stage;
      }

      // Department filter (cases where the specified department is PENDING or OBJECTION_RAISED)
      if (department && typeof department === "string" && department !== "ALL") {
        whereClause["clearances"] = {
          some: {
            department: department,
            status: { in: ["PENDING", "OBJECTION_RAISED"] },
          },
        };
      }

      // Search filter (instrument number, bank, institution name/code)
      if (search && typeof search === "string" && search.trim()) {
        const query = search.trim();
        whereClause["OR"] = [
          { instrument: { instrumentNumber: { contains: query, mode: "insensitive" } } },
          { instrument: { bankName: { contains: query, mode: "insensitive" } } },
          { instrument: { institution: { name: { contains: query, mode: "insensitive" } } } },
          { instrument: { institution: { code: { contains: query, mode: "insensitive" } } } },
        ];
      }

      const releaseRequests = await (prisma.releaseRequest as any).findMany({
        where: whereClause,
        include: {
          instrument: {
            include: {
              institution: {
                select: { id: true, name: true, code: true, institutionType: true },
              },
            },
          },
          requestedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          decidedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          clearances: {
            include: {
              assignedOfficer: { select: { id: true, fullName: true, email: true, department: true } },
              decidedBy: { select: { id: true, fullName: true, email: true, department: true } },
            },
          },
          documentReviews: {
            include: {
              reviewedBy: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate aggregate statistics
      let totalPending = 0;
      let awaitingDocumentReview = 0;
      let awaitingClearances = 0;
      let readyForFinalDecision = 0;
      let unresolvedObjections = 0;
      let completedCases = 0;

      const cases = releaseRequests.map((reqItem: any) => {
        const stage = reqItem.workflowStage || "SUBMITTED";
        const isPending = reqItem.status === ReleaseRequestStatus.PENDING;
        const isApproved = reqItem.status === ReleaseRequestStatus.APPROVED || stage === "NOC_ISSUED";
        const isRefundConfirmed = reqItem.status === ReleaseRequestStatus.REFUND_CONFIRMED;

        if (isPending) {
          totalPending++;
          if (stage === "SUBMITTED" || stage === "DOCUMENT_REVIEW" || stage === "CORRECTION_REQUIRED") {
            awaitingDocumentReview++;
          } else if (stage === "CLEARANCES_PENDING") {
            awaitingClearances++;
          } else if (stage === "READY_FOR_FINAL_DECISION") {
            readyForFinalDecision++;
          } else if (stage === "ON_HOLD") {
            unresolvedObjections++;
          }
        }

        if (isApproved || isRefundConfirmed) {
          completedCases++;
        }

        // Determine pending department or next action
        let pendingAction = "In Review";
        const clearancesList = reqItem.clearances || [];
        const pendingDepts = clearancesList
          .filter((c: any) => c.status === "PENDING")
          .map((c: any) => c.department);
        const objectionDepts = clearancesList
          .filter((c: any) => c.status === "OBJECTION_RAISED")
          .map((c: any) => c.department);

        if (stage === "ON_HOLD") {
          pendingAction = objectionDepts.length > 0
            ? `Hold: Objection by ${objectionDepts.join(", ")}`
            : `Hold: ${reqItem.holdReason || "Administrative hold"}`;
        } else if (stage === "CORRECTION_REQUIRED") {
          pendingAction = "Correction Required from Institution";
        } else if (stage === "DOCUMENT_REVIEW" || stage === "SUBMITTED") {
          pendingAction = "Awaiting Document Scrutiny";
        } else if (stage === "CLEARANCES_PENDING") {
          pendingAction = pendingDepts.length > 0
            ? `Awaiting Clearance: ${pendingDepts.join(", ")}`
            : "Clearances in Progress";
        } else if (stage === "READY_FOR_FINAL_DECISION") {
          pendingAction = "Ready for Approval Bureau NOC";
        } else if (stage === "NOC_ISSUED" || reqItem.status === "APPROVED") {
          pendingAction = "NOC Issued (Awaiting Refund Confirmation)";
        } else if (reqItem.status === "REFUND_CONFIRMED") {
          pendingAction = "Refund Completed";
        } else if (reqItem.status === "REJECTED") {
          pendingAction = "Request Rejected";
        }

        // Quick APH compliance assessment
        const aphResult = evaluateAphCompliance({
          depositedAmountRupees: reqItem.instrument?.amount ? Number(reqItem.instrument.amount) : 0,
          premisesOwnership: "UNKNOWN",
        });

        return {
          id: reqItem.id,
          instrumentId: reqItem.instrumentId,
          instrumentNumber: reqItem.instrument?.instrumentNumber || "—",
          bankName: reqItem.instrument?.bankName || "—",
          branchName: reqItem.instrument?.branchName || "—",
          amount: reqItem.instrument?.amount ? Number(reqItem.instrument.amount) : 0,
          institutionId: reqItem.instrument?.institution?.id,
          institutionName: reqItem.instrument?.institution?.name || "—",
          institutionCode: reqItem.instrument?.institution?.code || "—",
          institutionType: reqItem.instrument?.institution?.institutionType,
          submissionDate: reqItem.createdAt,
          updatedAt: reqItem.updatedAt,
          currentStage: stage,
          status: reqItem.status,
          holdReason: reqItem.holdReason,
          pendingAction,
          pendingDepartments: pendingDepts,
          complianceStatus: aphResult.complianceStatus,
          requestedBy: reqItem.requestedBy,
          decidedBy: reqItem.decidedBy,
          clearances: reqItem.clearances,
          documentReviews: reqItem.documentReviews,
        };
      });

      res.status(200).json({
        stats: {
          totalPending,
          awaitingDocumentReview,
          awaitingClearances,
          readyForFinalDecision,
          unresolvedObjections,
          completedCases,
        },
        cases,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/clearances/:releaseRequestId
 * Returns full details for a clearance case, including guard evaluation and APH pre-check.
 */
router.get(
  "/:releaseRequestId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const releaseRequestId = String(req.params.releaseRequestId);

      const releaseRequest = await (prisma.releaseRequest as any).findUnique({
        where: { id: releaseRequestId },
        include: {
          instrument: {
            include: {
              institution: true,
              documents: true,
            },
          },
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
              assignedOfficer: { select: { id: true, fullName: true, email: true, department: true } },
              decidedBy: { select: { id: true, fullName: true, email: true, department: true } },
            },
          },
          documentReviews: {
            include: {
              reviewedBy: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });

      if (!releaseRequest) {
        res.status(404).json({ error: "Not Found", message: "Clearance request not found." });
        return;
      }

      // Institution isolation
      if (
        user.role === Role.INSTITUTION_USER &&
        releaseRequest.instrument?.institutionId !== user.institutionId
      ) {
        res.status(404).json({ error: "Not Found", message: "Clearance request not found." });
        return;
      }

      // Evaluate Final Decision Guard
      const guardResult = await evaluateReleaseNocGuard(releaseRequestId, user, prisma);

      // Evaluate USP-1 APH Compliance
      const aphCompliance = evaluateAphCompliance({
        institutionId: releaseRequest.instrument?.institution?.id,
        institutionName: releaseRequest.instrument?.institution?.name,
        institutionType: releaseRequest.instrument?.institution?.institutionType,
        depositedAmountRupees: releaseRequest.instrument?.amount ? Number(releaseRequest.instrument.amount) : 0,
        premisesOwnership: "UNKNOWN",
        instruments: [
          {
            id: releaseRequest.instrument?.id,
            fdrNumber: releaseRequest.instrument?.instrumentNumber,
            amountRupees: releaseRequest.instrument?.amount ? Number(releaseRequest.instrument.amount) : 0,
            status: releaseRequest.instrument?.status,
          },
        ],
      });

      // Audit events associated with this release request
      const auditEvents = typeof prisma.auditEvent?.findMany === "function"
        ? await prisma.auditEvent.findMany({
            where: {
              OR: [
                { entityType: "ReleaseRequest", entityId: releaseRequestId },
                { entityType: "Instrument", entityId: releaseRequest.instrumentId },
                { entityType: "ReleaseClearance" },
                { entityType: "ReleaseDocumentReview" },
              ],
            },
            include: {
              actor: { select: { id: true, fullName: true, email: true, role: true, department: true } as any },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : [];

      res.status(200).json({
        releaseRequest,
        guardResult,
        aphCompliance,
        auditEvents,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
