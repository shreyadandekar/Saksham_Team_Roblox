/**
 * src/types/release.ts
 * Frontend type definitions for Milestone 7: Release and Refund Processing.
 */

import type { UserSummary, Instrument } from "./instrument";

export type ReleaseRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REFUND_CONFIRMED";

export interface ReleaseRequest {
  id: string;
  instrumentId: string;
  previousInstrumentStatus: string;
  requestedById: string;
  reason: string;
  status: ReleaseRequestStatus;
  decidedById: string | null;
  decidedAt: string | null;
  officerRemarks: string | null;
  refundReference: string | null;
  refundConfirmedAt: string | null;
  refundConfirmedById: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy?: UserSummary | null;
  decidedBy?: UserSummary | null;
  refundConfirmedBy?: UserSummary | null;
}

export interface SubmitReleaseRequestInput {
  reason: string;
}

export interface ReleaseDecisionInput {
  decision: "APPROVE" | "REJECT";
  remarks: string;
}

export interface ConfirmRefundInput {
  refundReference: string;
}

export interface ReleaseRequestListResponse {
  instrumentId: string;
  instrumentNumber: string;
  releaseRequests: ReleaseRequest[];
}

export interface ReleaseRequestActionResponse {
  message: string;
  releaseRequest: ReleaseRequest;
  instrument?: Instrument;
}
