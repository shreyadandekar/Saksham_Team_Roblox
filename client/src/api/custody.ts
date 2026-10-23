/**
 * src/api/custody.ts
 * Frontend API client for Physical Custody tracking and event recording.
 */

import type {
  CustodyDetailsResponse,
  RecordCustodyEventInput,
  RecordCustodyEventResponse,
} from "../types/custody";

/**
 * Fetch current custody status and full historical custody events for an instrument.
 */
export async function getCustody(instrumentId: string): Promise<CustodyDetailsResponse> {
  const res = await fetch(`/api/instruments/${instrumentId}/custody`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch custody records (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Record a new physical custody event (restricted to AICTE_OFFICER and SYSTEM_ADMIN).
 */
export async function recordCustodyEvent(
  instrumentId: string,
  input: RecordCustodyEventInput
): Promise<RecordCustodyEventResponse> {
  const res = await fetch(`/api/instruments/${instrumentId}/custody`, {
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
    throw new Error(errorData.message || `Failed to record custody event (HTTP ${res.status})`);
  }

  return res.json();
}
