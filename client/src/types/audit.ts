/**
 * src/types/audit.ts
 * Type definitions and action registry for Milestone 8: Audit & Reporting.
 */

export interface AuditActorSummary {
  id: string;
  fullName: string;
  email: string;
  role?: string;
}

export interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuditEventItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: AuditActorSummary | null;
}

export interface AuditFilterParams {
  page?: number;
  limit?: number;
  entityType?: "Instrument" | "Document" | "User";
  entityId?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
  institutionId?: string;
}

export interface AuditResponse {
  events: AuditEventItem[];
  pagination: AuditPagination;
}

export type AuditCategory =
  | "REGISTRATION"
  | "SCRUTINY"
  | "DOCUMENT"
  | "CUSTODY"
  | "LIFECYCLE"
  | "RELEASE_REFUND"
  | "SECURITY"
  | "OTHER";

export interface ActionMeta {
  label: string;
  category: AuditCategory;
  categoryLabel: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
}

export const ACTION_REGISTRY: Record<string, ActionMeta> = {
  // ── Registration ───────────────────────────────────────────────────────────
  INSTRUMENT_CREATED: {
    label: "Draft FDR Created",
    category: "REGISTRATION",
    categoryLabel: "Registration",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    dotClass: "bg-blue-600 ring-blue-100",
    borderClass: "border-blue-200",
  },
  INSTRUMENT_SUBMITTED: {
    label: "FDR Submitted for Scrutiny",
    category: "REGISTRATION",
    categoryLabel: "Registration",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    dotClass: "bg-indigo-600 ring-indigo-100",
    borderClass: "border-indigo-200",
  },

  // ── Scrutiny ───────────────────────────────────────────────────────────────
  SCRUTINY_STARTED: {
    label: "Scrutiny Started",
    category: "SCRUTINY",
    categoryLabel: "Scrutiny",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500 ring-amber-100",
    borderClass: "border-amber-200",
  },
  SCRUTINY_APPROVE: {
    label: "Scrutiny Approved (Active)",
    category: "SCRUTINY",
    categoryLabel: "Scrutiny",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-600 ring-emerald-100",
    borderClass: "border-emerald-200",
  },
  SCRUTINY_REQUEST_CORRECTION: {
    label: "Correction Requested",
    category: "SCRUTINY",
    categoryLabel: "Scrutiny",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    dotClass: "bg-orange-500 ring-orange-100",
    borderClass: "border-orange-200",
  },
  SCRUTINY_REJECT: {
    label: "Scrutiny Rejected",
    category: "SCRUTINY",
    categoryLabel: "Scrutiny",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    dotClass: "bg-rose-600 ring-rose-100",
    borderClass: "border-rose-200",
  },

  // ── Document Operations ────────────────────────────────────────────────────
  DOCUMENT_UPLOADED: {
    label: "Document Uploaded",
    category: "DOCUMENT",
    categoryLabel: "Document",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    dotClass: "bg-sky-600 ring-sky-100",
    borderClass: "border-sky-200",
  },
  DOCUMENT_DELETED: {
    label: "Document Deleted",
    category: "DOCUMENT",
    categoryLabel: "Document",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    dotClass: "bg-slate-500 ring-slate-100",
    borderClass: "border-slate-200",
  },
  OCR_EXTRACTED: {
    label: "OCR Extraction Processed",
    category: "DOCUMENT",
    categoryLabel: "Document Intelligence",
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
    dotClass: "bg-violet-600 ring-violet-100",
    borderClass: "border-violet-200",
  },
  OCR_REVIEW_COMPLETED: {
    label: "OCR Human Review Completed",
    category: "SCRUTINY",
    categoryLabel: "Regulatory Review",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    dotClass: "bg-indigo-600 ring-indigo-100",
    borderClass: "border-indigo-200",
  },

  // ── Physical Custody ───────────────────────────────────────────────────────
  CUSTODY_EVENT_RECORDED: {
    label: "Custody Event Recorded",
    category: "CUSTODY",
    categoryLabel: "Custody",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    dotClass: "bg-teal-600 ring-teal-100",
    borderClass: "border-teal-200",
  },

  // ── Lifecycle: Renewal / Replacement ───────────────────────────────────────
  RENEWAL_INITIATED: {
    label: "Renewal Initiated",
    category: "LIFECYCLE",
    categoryLabel: "Lifecycle",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    dotClass: "bg-cyan-600 ring-cyan-100",
    borderClass: "border-cyan-200",
  },
  RENEWAL_SUBMITTED: {
    label: "Renewal Submitted",
    category: "LIFECYCLE",
    categoryLabel: "Lifecycle",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    dotClass: "bg-cyan-600 ring-cyan-100",
    borderClass: "border-cyan-200",
  },
  REPLACEMENT_INITIATED: {
    label: "Replacement Initiated",
    category: "LIFECYCLE",
    categoryLabel: "Lifecycle",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    dotClass: "bg-blue-600 ring-blue-100",
    borderClass: "border-blue-200",
  },
  REPLACEMENT_SUBMITTED: {
    label: "Replacement Submitted",
    category: "LIFECYCLE",
    categoryLabel: "Lifecycle",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    dotClass: "bg-blue-600 ring-blue-100",
    borderClass: "border-blue-200",
  },
  INSTRUMENT_SUPERSEDED: {
    label: "Instrument Superseded",
    category: "LIFECYCLE",
    categoryLabel: "Lifecycle",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-400 ring-slate-100",
    borderClass: "border-slate-200",
  },

  // ── Security Deposit Release & Refund ──────────────────────────────────────
  RELEASE_REQUESTED: {
    label: "Release Requested",
    category: "RELEASE_REFUND",
    categoryLabel: "Release & Refund",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    dotClass: "bg-purple-600 ring-purple-100",
    borderClass: "border-purple-200",
  },
  RELEASE_APPROVED: {
    label: "Release Approved",
    category: "RELEASE_REFUND",
    categoryLabel: "Release & Refund",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-600 ring-emerald-100",
    borderClass: "border-emerald-200",
  },
  RELEASE_REJECTED: {
    label: "Release Rejected",
    category: "RELEASE_REFUND",
    categoryLabel: "Release & Refund",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    dotClass: "bg-rose-600 ring-rose-100",
    borderClass: "border-rose-200",
  },
  REFUND_CONFIRMED: {
    label: "Refund Payment Confirmed",
    category: "RELEASE_REFUND",
    categoryLabel: "Release & Refund",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    dotClass: "bg-green-600 ring-green-100",
    borderClass: "border-green-200",
  },

  // ── Security & Authentication ──────────────────────────────────────────────
  LOGIN_SUCCESS: {
    label: "Login Successful",
    category: "SECURITY",
    categoryLabel: "Security",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500 ring-emerald-100",
    borderClass: "border-emerald-200",
  },
  LOGIN_FAILED: {
    label: "Login Failed",
    category: "SECURITY",
    categoryLabel: "Security",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    dotClass: "bg-rose-500 ring-rose-100",
    borderClass: "border-rose-200",
  },
  LOGOUT: {
    label: "Session Terminated (Logout)",
    category: "SECURITY",
    categoryLabel: "Security",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-500 ring-slate-100",
    borderClass: "border-slate-200",
  },
};

/**
 * Return action metadata with fallback for custom or unforeseen actions.
 */
export function getActionMeta(action: string): ActionMeta {
  if (ACTION_REGISTRY[action]) {
    return ACTION_REGISTRY[action];
  }

  // Fallback: format SNAKE_CASE string nicely
  const humanized = action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

  return {
    label: humanized,
    category: "OTHER",
    categoryLabel: "Other",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    dotClass: "bg-blue-600 ring-blue-100",
    borderClass: "border-slate-200",
  };
}
