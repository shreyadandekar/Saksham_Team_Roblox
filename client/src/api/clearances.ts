/**
 * src/api/clearances.ts
 *
 * Dedicated frontend API client for USP-2:
 * Intelligent FDR Release & Multi-Department Clearance Workflow.
 */

import type {
  ClearanceQueueResponse,
  ClearanceCaseDetailResponse,
} from "../types/clearance";

export interface ClearanceQueueParams {
  stage?: string;
  department?: string;
  search?: string;
  status?: string;
}

/**
 * Fetch the Clearance Command Center queue with statistics and case records.
 */
export async function getClearanceQueue(
  params: ClearanceQueueParams = {}
): Promise<ClearanceQueueResponse> {
  const query = new URLSearchParams();
  if (params.stage) query.set("stage", params.stage);
  if (params.department) query.set("department", params.department);
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);

  const url = `/api/clearances${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch clearance queue (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Fetch full case details, including guard results, documents, clearances, and audit history.
 */
export async function getClearanceCaseDetail(
  releaseRequestId: string
): Promise<ClearanceCaseDetailResponse> {
  const res = await fetch(`/api/clearances/${releaseRequestId}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch clearance case detail (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Scrutiny review of a mandatory release document.
 */
export async function reviewReleaseDocument(
  instrumentId: string,
  releaseRequestId: string,
  documentType: string,
  data: {
    status: "CONFIRMED" | "REJECTED" | "CORRECTION_REQUIRED";
    reviewRemarks?: string;
    documentId?: string;
  }
) {
  const res = await fetch(
    `/api/instruments/${instrumentId}/release/${releaseRequestId}/documents/${documentType}/review`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to record document review (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Record departmental clearance decision (PGRC, Vigilance, Other Bureau).
 */
export async function decideDepartmentClearance(
  instrumentId: string,
  releaseRequestId: string,
  department: string,
  data: {
    status: "CLEARED" | "OBJECTION_RAISED" | "NOT_APPLICABLE";
    decisionReason: string;
  }
) {
  const res = await fetch(
    `/api/instruments/${instrumentId}/release/${releaseRequestId}/clearances/${department}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to record ${department} clearance decision (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Place or lift a regulatory/financial hold on a release request.
 */
export async function toggleReleaseHold(
  instrumentId: string,
  releaseRequestId: string,
  action: "PLACE_HOLD" | "LIFT_HOLD",
  reason: string
) {
  const res = await fetch(
    `/api/instruments/${instrumentId}/release/${releaseRequestId}/hold`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ action, reason }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to ${action.toLowerCase().replace("_", " ")} (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Issue the final authorized FDR Release NOC (Approval Bureau - Role.APPROVER).
 * Strictly enforced by backend Final Decision Guard.
 */
export async function issueFinalNoc(
  instrumentId: string,
  releaseRequestId: string,
  remarks: string
) {
  const res = await fetch(
    `/api/instruments/${instrumentId}/release/${releaseRequestId}/noc`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ remarks }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(
      errorData.message || `Failed to issue FDR Release NOC (HTTP ${res.status})`
    );
    (error as any).blockers = errorData.blockers;
    throw error;
  }

  return res.json();
}
