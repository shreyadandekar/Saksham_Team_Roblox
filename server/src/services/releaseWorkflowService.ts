/**
 * server/src/services/releaseWorkflowService.ts
 *
 * FDR Sentinel — SIH 2026 PS26265
 * USP-2: Intelligent FDR Release & Multi-Department Clearance Workflow
 *
 * Regulatory Basis:
 *   AICTE Approval Process Handbook (APH) 2024–2027, Section 6.46.
 *
 * Principles:
 *   1. Departmental clearances (PGRC, Vigilance, Regional/Other Bureaus) must be explicitly
 *      recorded and cannot be automatically bypassed or defaulted to NOT_APPLICABLE.
 *   2. Only officers explicitly assigned or departmental members may decide clearance.
 *   3. Strict four-eyes separation of duties: Approver cannot be requester or scrutinizer.
 *   4. Document checklist (Application Letter, Affidavit 6, Deposit Evidence, LoA/EoA) must
 *      be verified before clearance progression.
 *   5. Seamlessly integrates with USP-1 APH Compliance Engine for statutory pre-checks.
 */

import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";
import { evaluateAphCompliance, AphEvaluationResult } from "./aphComplianceEngine";

export const MANDATORY_RELEASE_DOCUMENTS = [
  "APPLICATION_LETTER",
  "AFFIDAVIT_6",
  "FDR_DEPOSIT_EVIDENCE",
  "LATEST_LOA_EOA",
] as const;

export type MandatoryDocumentType = typeof MANDATORY_RELEASE_DOCUMENTS[number];

export const MANDATORY_CLEARANCE_DEPARTMENTS = [
  "PGRC",
  "VIGILANCE",
  "OTHER_APPLICABLE_BUREAU",
] as const;

export type MandatoryDepartmentType = typeof MANDATORY_CLEARANCE_DEPARTMENTS[number];

export interface ClearanceDecisionActor {
  id: string;
  role: Role | string;
  department?: string | null;
}

export interface NocBlocker {
  category: "DOCUMENT" | "CLEARANCE" | "REGULATORY_HOLD" | "AUTHORIZATION" | "SEPARATION_OF_DUTIES" | "STATUS";
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface NocGuardEvaluationResult {
  isEligible: boolean;
  blockers: NocBlocker[];
  documentStatus: {
    totalRequired: number;
    confirmedCount: number;
    pendingCount: number;
    items: Array<{ type: string; status: string; remarks?: string | null }>;
  };
  clearanceStatus: {
    totalRequired: number;
    satisfiedCount: number;
    items: Array<{ department: string; status: string; decidedBy?: string | null; reason?: string | null }>;
  };
  holdStatus: {
    isOnHold: boolean;
    reason?: string | null;
  };
}

/**
 * Validates whether an authenticated actor has explicit authority to decide
 * a given departmental clearance.
 *
 * Rule:
 *  - Must be an officer role (not an institution user).
 *  - Must be either explicitly assigned to this clearance record, or
 *    their user account belongs to that department (e.g. department === "PGRC").
 *  - General SCRUTINY_OFFICER or ADMIN role does NOT automatically confer
 *    blanket clearance authority across departments without explicit assignment.
 */
export function isOfficerAuthorizedForDepartmentClearance(
  actor: ClearanceDecisionActor,
  department: string,
  assignedOfficerId?: string | null
): boolean {
  const isOfficer =
    actor.role === Role.SCRUTINY_OFFICER ||
    actor.role === Role.APPROVER ||
    actor.role === Role.ADMIN ||
    actor.role === Role.AICTE_OFFICER ||
    actor.role === Role.SYSTEM_ADMIN;

  if (!isOfficer) {
    return false;
  }

  // 1. Explicit direct assignment to this clearance record
  if (assignedOfficerId && actor.id === assignedOfficerId) {
    return true;
  }

  // 2. Department membership match (case-insensitive)
  if (actor.department) {
    const userDeptClean = actor.department.trim().toUpperCase();
    const targetDeptClean = department.trim().toUpperCase();

    if (userDeptClean === targetDeptClean || userDeptClean === "ALL") {
      return true;
    }
  }

  return false;
}

/**
 * Ensures all mandatory document review and clearance records are initialized for a release request.
 */
export async function initializeReleaseWorkflowRecords(
  tx: typeof prisma | any,
  releaseRequestId: string
): Promise<void> {
  // 1. Initialize Document Review records
  if (typeof tx.releaseDocumentReview?.upsert === "function") {
    for (const docType of MANDATORY_RELEASE_DOCUMENTS) {
      await tx.releaseDocumentReview.upsert({
        where: {
          releaseRequestId_documentType: {
            releaseRequestId,
            documentType: docType as any,
          },
        },
        update: {},
        create: {
          releaseRequestId,
          documentType: docType as any,
          status: "PENDING",
        },
      });
    }
  }

  // 2. Initialize Department Clearance records
  if (typeof tx.releaseClearance?.upsert === "function") {
    for (const dept of MANDATORY_CLEARANCE_DEPARTMENTS) {
      await tx.releaseClearance.upsert({
        where: {
          releaseRequestId_department: {
            releaseRequestId,
            department: dept as any,
          },
        },
        update: {},
        create: {
          releaseRequestId,
          department: dept as any,
          status: "PENDING",
        },
      });
    }
  }
}

/**
 * Strict final decision guard: evaluates whether an authorised FDR release NOC
 * can legally be issued under APH Section 6.46.
 */
export async function evaluateReleaseNocGuard(
  releaseRequestId: string,
  actor: { id: string; role: Role | string },
  db: typeof prisma | any = prisma
): Promise<NocGuardEvaluationResult> {
  const blockers: NocBlocker[] = [];

  // Fetch release request with instrument, clearances, document reviews, and scrutiny history
  const releaseRequest: any = await (db.releaseRequest as any).findUnique({
    where: { id: releaseRequestId },
    include: {
      instrument: {
        select: {
          id: true,
          status: true,
          instrumentNumber: true,
          scrutinizedById: true,
          institutionId: true,
        },
      },
      clearances: true,
      documentReviews: true,
    },
  });

  if (!releaseRequest) {
    return {
      isEligible: false,
      blockers: [
        {
          category: "STATUS",
          code: "RELEASE_REQUEST_NOT_FOUND",
          message: "Release request not found.",
        },
      ],
      documentStatus: { totalRequired: 4, confirmedCount: 0, pendingCount: 4, items: [] },
      clearanceStatus: { totalRequired: 3, satisfiedCount: 0, items: [] },
      holdStatus: { isOnHold: false },
    };
  }

  // 1. Check Regulatory / Financial Hold
  const isOnHold =
    releaseRequest.workflowStage === "ON_HOLD" ||
    (typeof releaseRequest.holdReason === "string" && releaseRequest.holdReason.trim().length > 0);

  if (isOnHold) {
    blockers.push({
      category: "REGULATORY_HOLD",
      code: "RELEASE_ON_HOLD",
      message: `Release is currently on regulatory/financial hold: ${releaseRequest.holdReason || "Unresolved objection"}`,
      details: { holdReason: releaseRequest.holdReason },
    });
  }

  // 2. Check Document Review Checklist
  const docReviews = releaseRequest.documentReviews || [];
  const docItems: NocGuardEvaluationResult["documentStatus"]["items"] = [];
  let confirmedDocsCount = 0;

  for (const docType of MANDATORY_RELEASE_DOCUMENTS) {
    const review = docReviews.find((r: any) => r.documentType === docType);
    const status = review?.status || "PENDING";
    docItems.push({
      type: docType,
      status,
      remarks: review?.reviewRemarks,
    });

    if (status === "CONFIRMED") {
      confirmedDocsCount++;
    } else {
      blockers.push({
        category: "DOCUMENT",
        code: `DOCUMENT_NOT_CONFIRMED_${docType}`,
        message: `Mandatory release document '${docType}' is not confirmed (status: ${status}).`,
        details: { documentType: docType, currentStatus: status },
      });
    }
  }

  // 3. Check Departmental Clearances
  const clearances = releaseRequest.clearances || [];
  const clearanceItems: NocGuardEvaluationResult["clearanceStatus"]["items"] = [];
  let satisfiedClearanceCount = 0;

  for (const dept of MANDATORY_CLEARANCE_DEPARTMENTS) {
    const clr = clearances.find((c: any) => c.department === dept);
    const status = clr?.status || "PENDING";

    clearanceItems.push({
      department: dept,
      status,
      decidedBy: clr?.decidedById,
      reason: clr?.decisionReason,
    });

    if (status === "CLEARED" || status === "NOT_APPLICABLE") {
      satisfiedClearanceCount++;
    } else if (status === "OBJECTION_RAISED") {
      blockers.push({
        category: "CLEARANCE",
        code: `CLEARANCE_OBJECTION_${dept}`,
        message: `Clearance objection raised by ${dept}: ${clr?.decisionReason || "Objection recorded"}`,
        details: { department: dept, status, reason: clr?.decisionReason },
      });
    } else {
      blockers.push({
        category: "CLEARANCE",
        code: `CLEARANCE_PENDING_${dept}`,
        message: `Departmental clearance from ${dept} is pending.`,
        details: { department: dept, status },
      });
    }
  }

  // 4. Separation of Duties and Authorization
  // Only APPROVER can issue final NOC
  const isApproverRole =
    actor.role === Role.APPROVER ||
    actor.role === "APPROVER";

  if (!isApproverRole) {
    blockers.push({
      category: "AUTHORIZATION",
      code: "ACTOR_NOT_APPROVER",
      message: "Only an authorized Approval Bureau officer (Role: APPROVER) may issue an FDR Release NOC.",
    });
  }

  // Requester cannot approve own release request
  if (releaseRequest.requestedById === actor.id) {
    blockers.push({
      category: "SEPARATION_OF_DUTIES",
      code: "APPROVER_WAS_REQUESTER",
      message: "Separation of duties violation: The requesting officer cannot issue the final NOC.",
    });
  }

  // Scrutinizer cannot approve release request
  const scrutinizerIds = new Set<string>();
  if (releaseRequest.instrument?.scrutinizedById) {
    scrutinizerIds.add(releaseRequest.instrument.scrutinizedById);
  }

  if (typeof db.scrutinyRecord?.findMany === "function") {
    const scrutinyRecords = await db.scrutinyRecord.findMany({
      where: { instrumentId: releaseRequest.instrumentId },
      select: { officerId: true },
    });
    (scrutinyRecords || []).forEach((r: any) => scrutinizerIds.add(r.officerId));
  }

  if (scrutinizerIds.has(actor.id)) {
    blockers.push({
      category: "SEPARATION_OF_DUTIES",
      code: "APPROVER_WAS_SCRUTINIZER",
      message: "Separation of duties violation: An officer who scrutinized this instrument cannot issue its release NOC.",
    });
  }

  return {
    isEligible: blockers.length === 0,
    blockers,
    documentStatus: {
      totalRequired: MANDATORY_RELEASE_DOCUMENTS.length,
      confirmedCount: confirmedDocsCount,
      pendingCount: MANDATORY_RELEASE_DOCUMENTS.length - confirmedDocsCount,
      items: docItems,
    },
    clearanceStatus: {
      totalRequired: MANDATORY_CLEARANCE_DEPARTMENTS.length,
      satisfiedCount: satisfiedClearanceCount,
      items: clearanceItems,
    },
    holdStatus: {
      isOnHold,
      reason: releaseRequest.holdReason,
    },
  };
}

/**
 * Pre-Check report combining the Final Decision Guard with USP-1 APH Compliance Engine.
 */
export async function generateReleasePreCheckReport(
  releaseRequestId: string,
  actor: { id: string; role: Role | string },
  db: typeof prisma | any = prisma
): Promise<{
  guardResult: NocGuardEvaluationResult;
  aphCompliance: AphEvaluationResult | null;
  releaseRequest: any;
}> {
  const releaseRequest: any = await (db.releaseRequest as any).findUnique({
    where: { id: releaseRequestId },
    include: {
      instrument: {
        include: {
          institution: true,
        },
      },
      clearances: true,
      documentReviews: true,
    },
  });

  const guardResult = await evaluateReleaseNocGuard(releaseRequestId, actor, db);

  let aphCompliance: AphEvaluationResult | null = null;
  if (releaseRequest?.instrument) {
    const inst = releaseRequest.instrument;
    const institution = inst.institution;

    // Run USP-1 pure engine
    aphCompliance = evaluateAphCompliance({
      institutionId: institution?.id,
      institutionName: institution?.name,
      institutionType: institution?.institutionType,
      depositedAmountRupees: inst.amount ? Number(inst.amount) : 0,
      premisesOwnership: "UNKNOWN", // Flags manual review if not recorded on institution
      instruments: [
        {
          id: inst.id,
          fdrNumber: inst.instrumentNumber,
          amountRupees: inst.amount ? Number(inst.amount) : 0,
          status: inst.status,
        },
      ],
    });
  }

  return {
    guardResult,
    aphCompliance,
    releaseRequest,
  };
}
