/**
 * src/types/instrument.ts
 * Type definitions for FDR instruments, lifecycle statuses, and audit history.
 */

export type InstrumentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_SCRUTINY"
  | "CORRECTION_REQUIRED"
  | "ACTIVE"
  | "REJECTED"
  | "MATURED"
  | "RELEASE_REQUESTED"
  | "RELEASED";

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  category?: string;
  uploadedAt?: string;
  notes?: string;
}

export interface InstitutionSummary {
  id: string;
  name: string;
  code: string;
  institutionType?: string;
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role?: string;
}

export interface Instrument {
  id: string;
  instrumentNumber: string;
  bankName: string;
  branchName: string;
  amount: number | string;
  issueDate: string;
  maturityDate: string;
  favouringDetails: string;
  status: InstrumentStatus;
  documentMetadata?: DocumentMetadata | null;
  institutionId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  institution?: InstitutionSummary;
  createdBy?: UserSummary;
}

export interface AuditEvent {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: UserSummary | null;
}

export interface CreateInstrumentInput {
  instrumentNumber: string;
  bankName: string;
  branchName: string;
  amount: number;
  issueDate: string;
  maturityDate: string;
  favouringDetails: string;
  submitImmediately?: boolean;
  documentMetadata?: DocumentMetadata | null;
}

export interface InstrumentsListResponse {
  instruments: Instrument[];
  meta: {
    totalCount: number;
    draftCount?: number;
    submittedCount?: number;
    underScrutinyCount?: number;
    activeCount?: number;
  };
}

export interface ScrutinyQueueResponse {
  instruments: Instrument[];
  meta: {
    totalCount: number;
    pendingCount: number;
    underScrutinyCount: number;
  };
}

export interface InstrumentDetailResponse {
  instrument: Instrument;
  auditEvents: AuditEvent[];
}
