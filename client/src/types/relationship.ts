/**
 * src/types/relationship.ts
 * Type definitions for Instrument Renewal and Replacement relationships.
 */

export type InstrumentRelationshipType = "RENEWAL" | "REPLACEMENT";

export type RelationshipStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface RelatedInstrumentSummary {
  id: string;
  instrumentNumber: string;
  bankName: string;
  branchName?: string;
  amount: number | string;
  status: string;
  maturityDate: string;
  issueDate?: string;
}

export interface InstrumentRelationshipItem {
  id: string;
  sourceInstrumentId: string;
  targetInstrumentId: string;
  relationshipType: InstrumentRelationshipType;
  status: RelationshipStatus;
  initiatedById: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  sourceInstrument?: RelatedInstrumentSummary;
  targetInstrument?: RelatedInstrumentSummary;
  initiatedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface InstrumentRelationshipsResponse {
  instrumentId: string;
  predecessors: InstrumentRelationshipItem[];
  successors: InstrumentRelationshipItem[];
}

export interface RenewOrReplacePayload {
  relationshipType: InstrumentRelationshipType;
  instrumentNumber: string;
  bankName: string;
  branchName: string;
  amount: number;
  issueDate: string;
  maturityDate: string;
  favouringDetails: string;
  remarks?: string;
  submitImmediately?: boolean;
  documentMetadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    category?: string;
    notes?: string;
  } | null;
}

export interface ScrutinyDecisionPayload {
  decision: "APPROVE" | "REJECT" | "REQUEST_CORRECTION";
  remarks: string;
}
