/**
 * src/validation/document.ts
 * Zod schema and constants for document upload validation.
 */

import { z } from "zod";

/** Explicit MIME-type allowlist for FDR supporting documents. */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Human-readable list for error messages. */
export const ALLOWED_MIME_TYPES_LABEL = "PDF, JPEG, or PNG";

/** Friendly extension map used for generating safe storage paths. */
export const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Valid document category values. */
export const DOCUMENT_CATEGORIES = [
  "FDR Receipt",
  "Bank Confirmation Letter",
  "Institution Authorisation Letter",
  "AICTE Correspondence",
  "Other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

/** Query-string schema for listing documents (strict, no injection). */
export const listDocumentsSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
});

/** Body schema for the optional category field on upload. */
export const uploadDocumentBodySchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES).optional().default("FDR Receipt"),
});

export type UploadDocumentBody = z.infer<typeof uploadDocumentBodySchema>;
