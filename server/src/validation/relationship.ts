/**
 * src/validation/relationship.ts
 * Zod validation schema for FDR Instrument renewals, replacements, and scrutiny decisions.
 */

import { z } from "zod";
import { InstrumentRelationshipType } from "@prisma/client";

export const renewOrReplaceSchema = z
  .object({
    relationshipType: z.nativeEnum(InstrumentRelationshipType, {
      required_error: "Relationship type (RENEWAL or REPLACEMENT) is required",
    }),
    instrumentNumber: z
      .string({ required_error: "New instrument reference number is required" })
      .trim()
      .min(3, "Reference number must be at least 3 characters")
      .max(50, "Reference number must not exceed 50 characters"),
    bankName: z
      .string({ required_error: "Bank name is required" })
      .trim()
      .min(2, "Bank name must be at least 2 characters"),
    branchName: z
      .string({ required_error: "Branch name is required" })
      .trim()
      .min(2, "Branch name must be at least 2 characters"),
    amount: z.coerce
      .number({ required_error: "Principal amount is required" })
      .positive("Principal amount must be greater than zero")
      .max(1_000_000_000, "Amount exceeds permissible limit (Rs. 100 Crore)"),
    issueDate: z
      .string({ required_error: "Issue date is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid issue date format",
      }),
    maturityDate: z
      .string({ required_error: "Maturity date is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid maturity date format",
      }),
    favouringDetails: z
      .string({ required_error: "Favouring details are required" })
      .trim()
      .min(3, "Favouring details must be at least 3 characters"),
    remarks: z.string().trim().max(1000).optional(),
    submitImmediately: z.boolean().optional().default(true),
    documentMetadata: z
      .object({
        fileName: z.string().min(1, "Document file name is required"),
        fileSize: z.number().nonnegative(),
        fileType: z.string().min(1),
        category: z.string().default("FDR Receipt"),
        uploadedAt: z.string().optional(),
        notes: z.string().optional(),
      })
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      const issue = new Date(data.issueDate);
      const maturity = new Date(data.maturityDate);
      return maturity >= issue;
    },
    {
      message: "Maturity date cannot be earlier than issue date",
      path: ["maturityDate"],
    }
  );

export type RenewOrReplaceInput = z.infer<typeof renewOrReplaceSchema>;

export const scrutinyDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_CORRECTION"], {
    required_error: "Scrutiny decision (APPROVE, REJECT, or REQUEST_CORRECTION) is required",
  }),
  remarks: z.string().trim().min(3, "Observation / remarks must be at least 3 characters").max(2000),
});

export type ScrutinyDecisionInput = z.infer<typeof scrutinyDecisionSchema>;
