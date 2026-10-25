/**
 * src/types/auth.ts
 * Frontend authentication types mirroring the backend contract.
 */

export type Role =
  | "INSTITUTION_USER"
  | "SCRUTINY_OFFICER"
  | "APPROVER"
  | "ADMIN"
  | "AUDITOR"
  | "AICTE_OFFICER"
  | "SYSTEM_ADMIN";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  institutionId: string | null;
  department?: string | null;
  institution?: {
    id: string;
    name: string;
    aicteId: string;
  } | null;
}

export interface AuthResponse {
  message: string;
  token?: string;
  user: User;
}

export interface InstrumentSummary {
  id: string;
  instrumentNumber: string;
  bankName: string;
  branchName: string;
  amount: string | number;
  issueDate: string;
  maturityDate: string;
  favouringDetails: string;
  status: string;
  institutionId: string;
  institution?: {
    id: string;
    name: string;
    code: string;
  };
}
