/**
 * src/validation/ocr.ts
 * Validation schemas for Milestone 9 Phase 4: OCR Review and Document Processing.
 */

import { z } from "zod";

export const reviewOcrSchema = z.object({
  extractionId: z.string({ required_error: "Extraction ID is required" }).min(1),
  decision: z.enum(["ACCEPTED", "REJECTED", "OVERRIDDEN"], {
    required_error: "Review decision must be ACCEPTED, REJECTED, or OVERRIDDEN",
  }),
  remarks: z
    .string({ required_error: "Review remarks are required" })
    .trim()
    .min(3, "Review remarks must be at least 3 characters")
    .max(1000, "Review remarks must not exceed 1000 characters"),
  acceptedValues: z
    .record(
      z.object({
        value: z.string().nullable().optional(),
        provenance: z.enum(["ENTERED", "EXTRACTED", "OVERRIDE"], {
          required_error: "Provenance must be ENTERED, EXTRACTED, or OVERRIDE",
        }),
      })
    )
    .optional(),
});

export type ReviewOcrInput = z.infer<typeof reviewOcrSchema>;
