/**
 * src/services/ocr/textExtractor.ts
 * Deterministic document text extraction service.
 * Supports:
 *   - application/pdf via pdf-parse (v2)
 *   - image/jpeg and image/png via tesseract.js (v7)
 *
 * Fully deterministic, offline-capable, and preserves original file buffers intact.
 */

import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";
import type { OcrRawExtractionResult } from "./types";

export const SUPPORTED_EXTRACTION_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type SupportedExtractionMime = (typeof SUPPORTED_EXTRACTION_MIMES)[number];

export function isSupportedExtractionMime(mimeType: string): mimeType is SupportedExtractionMime {
  return (SUPPORTED_EXTRACTION_MIMES as readonly string[]).includes(mimeType);
}

/**
 * Normalizes extracted text:
 *  - Replaces Windows CRLF with LF
 *  - Strips non-printable ASCII/control characters except newlines and tabs
 *  - Collapses excessive consecutive blank lines to at most two
 *  - Trims outer whitespace
 */
export function normalizeExtractedText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts raw textual content from document buffer deterministically.
 * Does not mutate or retain the buffer.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<OcrRawExtractionResult> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Cannot extract text from empty document buffer");
  }

  if (!isSupportedExtractionMime(mimeType)) {
    throw new Error(`Unsupported document MIME type for text extraction: ${mimeType}`);
  }

  const startTime = Date.now();

  if (mimeType === "application/pdf") {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: buffer });
      const res = await parser.getText();
      const rawText = normalizeExtractedText(res.text || "");
      const durationMs = Date.now() - startTime;
      return {
        rawText,
        engine: "pdf-parse/2.4.5",
        durationMs,
        pageCount: res.total || 1,
      };
    } catch (err: any) {
      const safeMsg = (err?.message || "Corrupt or unreadable PDF document")
        .replace(/(\/[\w\.-]+)+/g, "[path]")
        .replace(/([a-zA-Z]:\\[\w\.\-\\]+)/g, "[path]");
      throw new Error(`PDF text extraction failed: ${safeMsg}`);
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  // image/jpeg or image/png
  try {
    const res = await Tesseract.recognize(buffer, "eng");
    const rawText = normalizeExtractedText(res.data?.text || "");
    const durationMs = Date.now() - startTime;
    return {
      rawText,
      engine: "tesseract.js/7.0.0",
      durationMs,
      pageCount: 1,
    };
  } catch (err: any) {
    const safeMsg = (err?.message || "Corrupt or unreadable image document")
      .replace(/(\/[\w\.-]+)+/g, "[path]")
      .replace(/([a-zA-Z]:\\[\w\.\-\\]+)/g, "[path]");
    throw new Error(`Image OCR text extraction failed: ${safeMsg}`);
  }
}
