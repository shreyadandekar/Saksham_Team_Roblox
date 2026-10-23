/**
 * src/validation/release.ts
 * Zod validation schemas for Milestone 7: Release and Refund Processing.
 *
 * Three schemas cover the three distinct actions in the workflow:
 *   1. submitReleaseRequestSchema  — institution submits a release request
 *   2. releaseDecisionSchema       — officer approves or rejects
 *   3. confirmRefundSchema         — officer records bank payment reference
 */

import { z } from "zod";

// ── 1. Submit release request ────────────────────────────────────────────────

export const submitReleaseRequestSchema = z.object({
  reason: z
    .string({ required_error: "Reason for release is required" })
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(2000, "Reason must not exceed 2000 characters"),
});

export type SubmitReleaseRequestInput = z.infer<typeof submitReleaseRequestSchema>;

// ── 2. Officer release decision ──────────────────────────────────────────────
//
// Only two decisions are supported for release requests:
//   APPROVE — instrument transitions to RELEASED
//   REJECT  — instrument reverts to previousInstrumentStatus (ACTIVE or MATURED)
//
// REQUEST_CORRECTION is intentionally omitted: the ReleaseRequestStatus enum has
// no representation for a "pending correction" sub-state distinct from PENDING, so
// adding it would create an unrepresentable lifecycle step.  If the officer
// requires corrections they should REJECT the request and let the institution
// re-submit with an amended reason.

export const releaseDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"], {
    required_error: "Decision (APPROVE or REJECT) is required",
    invalid_type_error: "Decision must be APPROVE or REJECT",
  }),
  remarks: z
    .string({ required_error: "Officer remarks are required" })
    .trim()
    .min(5, "Remarks must be at least 5 characters")
    .max(2000, "Remarks must not exceed 2000 characters"),
});

export type ReleaseDecisionInput = z.infer<typeof releaseDecisionSchema>;

// ── 3. Confirm refund payment ────────────────────────────────────────────────
//
// Recorded separately from approval.  Approval signals regulatory consent;
// this action records evidence that the bank transfer actually occurred.
// Physical custody handover is tracked independently via the existing
// POST /api/instruments/:id/custody endpoint with CustodyEventType.ORIGINAL_RELEASED.

export const confirmRefundSchema = z.object({
  refundReference: z
    .string({ required_error: "Refund / payment reference is required" })
    .trim()
    .min(3, "Refund reference must be at least 3 characters")
    .max(255, "Refund reference must not exceed 255 characters"),
});

export type ConfirmRefundInput = z.infer<typeof confirmRefundSchema>;
