/**
 * src/api/instruments.ts
 * Frontend API client for FDR instruments, lifecycle transitions, and scrutiny queue.
 */

import type {
  Instrument,
  InstrumentsListResponse,
  ScrutinyQueueResponse,
  InstrumentDetailResponse,
  CreateInstrumentInput,
} from "../types/instrument";

/**
 * Fetch instruments matching query filters.
 * Institution users are scoped automatically to their institution by the backend.
 */
export async function getInstruments(params?: {
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<InstrumentsListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.sortBy) query.set("sortBy", params.sortBy);
  if (params?.sortOrder) query.set("sortOrder", params.sortOrder);

  const queryString = query.toString();
  const url = queryString ? `/api/instruments?${queryString}` : "/api/instruments";

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch instruments (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch a single instrument and its audit timeline by ID.
 */
export async function getInstrumentById(id: string): Promise<InstrumentDetailResponse> {
  const res = await fetch(`/api/instruments/${id}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch instrument (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Register a new FDR instrument (draft or direct submission).
 */
export async function createInstrument(
  data: CreateInstrumentInput
): Promise<{ message: string; instrument: Instrument }> {
  const res = await fetch("/api/instruments", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (responseData.issues && Array.isArray(responseData.issues)) {
      const messages = responseData.issues.map((i: { message: string }) => i.message).join(", ");
      throw new Error(messages || responseData.message || "Validation failed.");
    }
    throw new Error(responseData.message || `Registration failed (HTTP ${res.status})`);
  }

  return responseData;
}

/**
 * Submit an existing draft FDR instrument for AICTE scrutiny.
 */
export async function submitInstrument(
  id: string
): Promise<{ message: string; instrument: Instrument }> {
  const res = await fetch(`/api/instruments/${id}/submit`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const responseData = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(responseData.message || `Submission failed (HTTP ${res.status})`);
  }

  return responseData;
}

/**
 * Fetch the AICTE Scrutiny Queue (Officer & Admin only).
 */
export async function getScrutinyQueue(params?: {
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<ScrutinyQueueResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.sortBy) query.set("sortBy", params.sortBy);
  if (params?.sortOrder) query.set("sortOrder", params.sortOrder);

  const queryString = query.toString();
  const url = queryString ? `/api/scrutiny?${queryString}` : "/api/scrutiny";

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch scrutiny queue (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Mark a submitted instrument as UNDER_SCRUTINY (Officer only).
 */
export async function startScrutiny(
  id: string
): Promise<{ message: string; instrument: Instrument }> {
  const res = await fetch(`/api/instruments/${id}/start-scrutiny`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const responseData = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(responseData.message || `Failed to start scrutiny (HTTP ${res.status})`);
  }

  return responseData;
}

/**
 * Submit an official regulatory scrutiny decision (Officer / Admin only).
 * Re-exported from api/relationships for unified instrument API access.
 */
export { submitScrutinyDecision } from "./relationships";
