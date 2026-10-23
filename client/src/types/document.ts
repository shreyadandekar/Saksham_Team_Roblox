/**
 * src/types/document.ts
 * Client-side type definitions for the Document Upload feature (Milestone 4).
 */

export interface Document {
  id: string;
  instrumentId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface DocumentListResponse {
  documents: Document[];
}

export interface DocumentUploadResponse {
  message: string;
  document: Document;
}

export interface SignedUrlResponse {
  signedUrl: string;
  expiresInSeconds: number;
  originalName: string;
  mimeType: string;
}

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const ALLOWED_EXTENSIONS_LABEL = "PDF, JPEG, or PNG";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — must match server default

export const DOCUMENT_CATEGORIES = [
  "FDR Receipt",
  "Bank Confirmation Letter",
  "Institution Authorisation Letter",
  "AICTE Correspondence",
  "Other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
