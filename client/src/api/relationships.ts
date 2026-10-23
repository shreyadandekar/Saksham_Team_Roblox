/**
 * src/api/relationships.ts
 * Frontend API client for Instrument Renewals, Replacements, and Scrutiny Decisions.
 */

import type {
  InstrumentRelationshipsResponse,
  RenewOrReplacePayload,
  ScrutinyDecisionPayload,
} from "../types/relationship";
import type { Instrument } from "../types/instrument";

/**
 * Fetch relationship history (predecessors & successors) for an instrument.
 */
export async function getInstrumentRelationships(
  instrumentId: string
): Promise<InstrumentRelationshipsResponse> {
  const res = await fetch(`/api/instruments/${instrumentId}/relationships`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch relationships (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Submit a renewal or replacement linked to an active or matured instrument.
 */
export async function submitRenewOrReplace(
  instrumentId: string,
  payload: RenewOrReplacePayload
): Promise<{ message: string; successor: Instrument }> {
  const res = await fetch(`/api/instruments/${instrumentId}/renew-or-replace`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(responseData.message || `Renewal/Replacement submission failed (HTTP ${res.status})`);
  }

  return responseData;
}

/**
 * Submit an official regulatory scrutiny decision (Officer / Admin only).
 */
export async function submitScrutinyDecision(
  instrumentId: string,
  payload: ScrutinyDecisionPayload
): Promise<{ message: string; instrument: Instrument }> {
  const res = await fetch(`/api/instruments/${instrumentId}/scrutiny-decision`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (responseData.issues && Array.isArray(responseData.issues)) {
      const messages = responseData.issues.map((i: { message: string }) => i.message).join(", ");
      throw new Error(messages || responseData.message || "Validation failed.");
    }
    throw new Error(responseData.message || responseData.error || `Scrutiny decision failed (HTTP ${res.status})`);
  }

  return responseData;
}
