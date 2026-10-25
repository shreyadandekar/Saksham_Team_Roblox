/**
 * src/types/clearance.ts
 *
 * Frontend TypeScript definitions for USP-2:
 * Intelligent FDR Release & Multi-Department Clearance Workflow (AICTE APH Section 6.46).
 */

import type { UserSummary } from "./instrument";

export type ClearanceDepartment =
  | "PGRC"
  | "VIGILANCE"
  | "OTHER_APPLICABLE_BUREAU";

export type ClearanceStatus =
  | "PENDING"
  | "CLEARED"
  | "OBJECTION_RAISED"
  | "NOT_APPLICABLE";

export type ReleaseWorkflowStage =
  | "SUBMITTED"
  | "DOCUMENT_REVIEW"
  | "CORRECTION_REQUIRED"
  | "CLEARANCES_PENDING"
  | "READY_FOR_FINAL_DECISION"
  | "NOC_ISSUED"
  | "REJECTED"
  | "ON_HOLD";

export type ReleaseDocumentType =
  | "APPLICATION_LETTER"
  | "AFFIDAVIT_6"
  | "FDR_DEPOSIT_EVIDENCE"
  | "LATEST_LOA_EOA";

export type DocumentReviewStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CORRECTION_REQUIRED";

export interface ReleaseClearanceRecord {
  id: string;
  releaseRequestId: string;
  department: ClearanceDepartment;
  status: ClearanceStatus;
  assignedOfficerId: string | null;
  decidedById: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedOfficer?: (UserSummary & { department?: string | null }) | null;
  decidedBy?: (UserSummary & { department?: string | null }) | null;
}

export interface ReleaseDocumentReviewRecord {
  id: string;
  releaseRequestId: string;
  documentType: ReleaseDocumentType;
  documentId: string | null;
  status: DocumentReviewStatus;
  reviewedById: string | null;
  reviewRemarks: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: UserSummary | null;
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

export interface AphComplianceResult {
  complianceStatus: "COMPLIANT" | "DEFICIENT" | "INSUFFICIENT_DATA" | "NEEDS_MANUAL_REVIEW";
  calculatedRequirement: number | null;
  applicableBaseAmount: number | null;
  applicableMultiplier: number | null;
  amountBeingCompared: number;
  shortfallOrExcess: number | null;
  ruleId: string | null;
  regulatoryVersion: string;
  plainLanguageExplanation: string;
  missingInputs: string[];
  isManualReviewRequired: boolean;
  manualReviewReasons: string[];
  programmeBreakdown: Array<{
    programme: string;
    academicLevel: string;
    ruleKey: string | null;
    baseAmountRupees: number | null;
    multiplier: number | null;
    calculatedRequirementRupees: number | null;
    status: string;
    explanation: string;
  }>;
}

export interface ClearanceQueueStats {
  totalPending: number;
  awaitingDocumentReview: number;
  awaitingClearances: number;
  readyForFinalDecision: number;
  unresolvedObjections: number;
  completedCases: number;
}

export interface ClearanceCaseSummary {
  id: string;
  instrumentId: string;
  instrumentNumber: string;
  bankName: string;
  branchName: string;
  amount: number;
  institutionId?: string;
  institutionName: string;
  institutionCode: string;
  institutionType?: string;
  submissionDate: string;
  updatedAt: string;
  currentStage: ReleaseWorkflowStage;
  status: string;
  holdReason: string | null;
  pendingAction: string;
  pendingDepartments: string[];
  complianceStatus: string;
  requestedBy?: UserSummary | null;
  decidedBy?: UserSummary | null;
  clearances: ReleaseClearanceRecord[];
  documentReviews: ReleaseDocumentReviewRecord[];
}

export interface ClearanceQueueResponse {
  stats: ClearanceQueueStats;
  cases: ClearanceCaseSummary[];
}

export interface ClearanceCaseDetailResponse {
  releaseRequest: any;
  guardResult: NocGuardEvaluationResult;
  aphCompliance: AphComplianceResult | null;
  auditEvents: any[];
}
