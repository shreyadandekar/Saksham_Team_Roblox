import type { InstrumentSummary } from "../types/auth";
import { CLOSED_STATUSES } from "./status";
import { daysUntil, toAmount } from "./format";

export type MaturityBucket = "overdue" | "within30" | "within90" | "within365" | "later" | "closed";

export const BUCKET_META: Record<MaturityBucket, { label: string; description: string }> = {
  overdue: { label: "Past maturity", description: "Maturity date has passed and the deposit is still held." },
  within30: { label: "Within 30 days", description: "Due soon. Confirm renewal or release plans." },
  within90: { label: "31 to 90 days", description: "Approaching maturity this quarter." },
  within365: { label: "91 days to 1 year", description: "Maturing within the next twelve months." },
  later: { label: "Beyond 1 year", description: "No near-term action expected." },
  closed: { label: "Closed", description: "Released or rejected. Maturity no longer applies." },
};

export function maturityBucket(i: InstrumentSummary): MaturityBucket {
  if (CLOSED_STATUSES.includes(i.status)) return "closed";
  const d = daysUntil(i.maturityDate);
  if (d < 0) return "overdue";
  if (d <= 30) return "within30";
  if (d <= 90) return "within90";
  if (d <= 365) return "within365";
  return "later";
}

export function sumAmount(list: InstrumentSummary[]): number {
  return list.reduce((acc, i) => acc + toAmount(i.amount), 0);
}

export const ATTENTION_STATUSES = ["CORRECTION_REQUIRED", "RELEASE_REQUESTED", "SUBMITTED", "UNDER_SCRUTINY"];
