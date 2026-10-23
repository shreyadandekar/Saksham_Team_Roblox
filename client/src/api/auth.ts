/**
 * src/api/auth.ts
 * Authentication API calls using secure HttpOnly cookies.
 * Does NOT place or read tokens from localStorage/sessionStorage.
 */

import type { User, AuthResponse, InstrumentSummary } from "../types/auth";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as any).message ||
      (data as any).error ||
      `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Receives and attaches HttpOnly fdr_token cookie
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function logoutUser(): Promise<{ message: string }> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include", // Clears HttpOnly cookie on server
  });
  return handleResponse<{ message: string }>(res);
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });

    if (res.status === 401) {
      return null;
    }

    const data = await handleResponse<{ user: User }>(res);
    return data.user;
  } catch {
    return null;
  }
}

export async function fetchInstruments(): Promise<InstrumentSummary[]> {
  const res = await fetch("/api/instruments", {
    method: "GET",
    credentials: "include",
  });
  const data = await handleResponse<{ instruments: InstrumentSummary[] }>(res);
  return data.instruments;
}
