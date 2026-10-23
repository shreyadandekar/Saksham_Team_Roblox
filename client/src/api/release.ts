/**
 * src/api/release.ts
 * Frontend API client for Milestone 7: Release and Refund Processing.
 */

import type {
  ReleaseRequestListResponse,
  ReleaseRequestActionResponse,
  SubmitReleaseRequestInput,
  ReleaseDecisionInput,
  ConfirmRefundInput,
} from "../types/release";

/**
 * Fetch all release requests for an instrument, newest first.
 * For institution users, isolation is enforced on the backend.
 */
export async function getReleaseRequests(
  instrumentId: string
): Promise<ReleaseRequestListResponse> {
  const res = await fetch(`/api/instruments/${instrumentId}/release`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch release requests (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Submit a release request for an eligible ACTIVE or MATURED deposit.
 * Restricted to institution users (own institution) and admins.
 */
export async function submitReleaseRequest(
  instrumentId: string,
  input: SubmitReleaseRequestInput
): Promise<ReleaseRequestActionResponse> {
  const res = await fetch(`/api/instruments/${instrumentId}/release`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to submit release request (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Record an AICTE Officer decision (APPROVE or REJECT) for a pending release request.
 * Restricted to AICTE Officers and Admins.
 */
export async function submitReleaseDecision(
  instrumentId: string,
  input: ReleaseDecisionInput
): Promise<ReleaseRequestActionResponse> {
  const res = await fetch(`/api/instruments/${instrumentId}/release/decision`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to record release decision (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Confirm refund bank transfer for an APPROVED release request.
 * Records the bank transaction / UTR reference.
 * Note: Approval must have been granted first, and physical custody handover is tracked separately.
 */
export async function confirmRefund(
  instrumentId: string,
  input: ConfirmRefundInput
): Promise<ReleaseRequestActionResponse> {
  const res = await fetch(
    `/api/instruments/${instrumentId}/release/confirm-refund`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to confirm refund payment (HTTP ${res.status})`
    );
  }

  return res.json();
}
