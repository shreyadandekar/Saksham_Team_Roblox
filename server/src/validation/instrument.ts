/**
 * src/validation/instrument.ts
 * Zod validation schema for FDR Instrument creation and submission.
 */

import { z } from "zod";

export const createInstrumentSchema = z
  .object({
    instrumentNumber: z
      .string({ required_error: "Instrument reference number is required" })
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
    submitImmediately: z.boolean().optional().default(false),
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

export type CreateInstrumentInput = z.infer<typeof createInstrumentSchema>;
