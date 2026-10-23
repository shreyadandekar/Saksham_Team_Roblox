/**
 * src/routes/documents.ts
 * Secure document upload, listing, download (signed URL), and deletion endpoints.
 *
 * All endpoints enforce:
 *  - JWT authentication (requireAuth)
 *  - Institution-level ownership derived from req.user — never from client input
 *  - AICTE Officers and System Admins may list/download (read-only) for scrutiny
 *  - File type allowlist: PDF, JPEG, PNG only
 *  - File size cap: MAX_UPLOAD_BYTES (default 10 MB)
 *  - Server-generated storage paths: {institutionId}/{instrumentId}/{uuid}.{ext}
 *  - Short-lived signed URLs (60 s) for downloads — no permanent public access
 *  - Atomic cleanup: if DB insert fails after storage upload, the orphan is deleted
 */

import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_MIME_TYPES_LABEL,
  MIME_TO_EXT,
  uploadDocumentBodySchema,
} from "../validation/document";
import type { AllowedMimeType } from "../validation/document";
import { triggerDocumentOcr } from "../services/ocr";

const router = Router({ mergeParams: true }); // receives :instrumentId from parent mount

// ── Multer configuration ──────────────────────────────────────────────────
// memoryStorage: buffer is passed directly to Supabase; nothing touches disk.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as AllowedMimeType)) {
      cb(null, true);
    } else {
      // Produce a real MulterError so app.ts LIMIT_UNEXPECTED_FILE handler fires
      const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file");
      err.message = `Only ${ALLOWED_MIME_TYPES_LABEL} files are allowed.`;
      cb(err);
    }
  },
});

// ── Helper: resolve and authorise the parent instrument ───────────────────
async function resolveInstrument(
  instrumentId: string,
  user: NonNullable<Request["user"]>
) {
  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    select: { id: true, institutionId: true, status: true },
  });

  if (!instrument) return null;

  // Institution users are strictly scoped to their own institution.
  if (
    user.role === Role.INSTITUTION_USER &&
    instrument.institutionId !== user.institutionId
  ) {
    return null; // Return null to produce a 404 — do not reveal existence
  }

  // Officers and admins can access any instrument (read/download).
  return instrument;
}

// ── POST /api/instruments/:instrumentId/documents ─────────────────────────
// Upload a document for the given instrument.
// Only INSTITUTION_USER who owns the instrument may upload.
router.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      // Only institution users may upload documents
      if (user.role !== Role.INSTITUTION_USER) {
        res.status(403).json({
          error: "Forbidden",
          message: "Only institution users may upload documents.",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          error: "Bad Request",
          message: "No file attached. Include the file as multipart/form-data field 'file'.",
        });
        return;
      }

      // Validate optional category field in the body
      const bodyParsed = uploadDocumentBodySchema.safeParse(req.body);
      if (!bodyParsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid request body.",
          issues: bodyParsed.error.issues,
        });
        return;
      }

      const { category } = bodyParsed.data;

      // Resolve the instrument and check ownership
      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      // Generate a safe, server-controlled storage path
      const ext = MIME_TO_EXT[req.file.mimetype as AllowedMimeType];
      const objectName = uuidv4();
      const storagePath = `${instrument.institutionId}/${instrument.id}/${objectName}.${ext}`;
      const bucket = env.SUPABASE_STORAGE_BUCKET!;

      // Upload to Supabase Storage using the service-role admin client
      let supabase;
      try {
        supabase = getSupabaseAdmin();
      } catch (err: unknown) {
        res.status(503).json({
          error: "Storage Service Unavailable",
          message: err instanceof Error ? err.message : "Cloud storage is not configured.",
        });
        return;
      }

      const { error: storageError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (storageError) {
        console.error("Supabase Storage upload failed:", storageError.message);
        res.status(502).json({
          error: "Storage Error",
          message: "Failed to upload document to storage. Please try again.",
        });
        return;
      }

      // Persist metadata to PostgreSQL and record audit event in a single transaction.
      // On failure, remove the orphan from storage.
      let document;
      try {
        const result = await prisma.$transaction(async (tx) => {
          const doc = await tx.document.create({
            data: {
              instrumentId: instrument.id,
              uploadedById: user.id,
              originalName: req.file!.originalname,
              storagePath,
              mimeType: req.file!.mimetype,
              sizeBytes: req.file!.size,
              category,
            },
          });

          // Audit event: scoped to the Instrument entity so it appears in the per-instrument
          // timeline (GET /api/instruments/:id returns events WHERE entityType='Instrument').
          // documentId is preserved in metadata for traceability.
          // storagePath, signed URLs, and credentials are never logged.
          await tx.auditEvent.create({
            data: {
              actorId: user.id,
              action: "DOCUMENT_UPLOADED",
              entityType: "Instrument",
              entityId: instrument.id,
              metadata: {
                documentId: doc.id,
                originalName: req.file!.originalname,
                mimeType: req.file!.mimetype,
                sizeBytes: req.file!.size,
                category,
              },
            },
          });

          return doc;
        });
        document = result;
      } catch (dbError) {
        // Best-effort cleanup: delete the orphaned storage object
        await supabase.storage.from(bucket).remove([storagePath]).catch(() => {
          console.error("Failed to clean up orphaned storage object:", storagePath);
        });
        throw dbError;
      }

      res.status(201).json({
        message: "Document uploaded successfully.",
        document: {
          id: document.id,
          instrumentId: document.instrumentId,
          originalName: document.originalName,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          category: document.category,
          createdAt: document.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── GET /api/instruments/:instrumentId/documents ──────────────────────────
// List all documents for an instrument.
// Institution users see only their own; officers/admins see all.
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      const documents = await prisma.document.findMany({
        where: { instrumentId: instrument.id },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          category: true,
          createdAt: true,
          uploadedBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ documents });
    } catch (error) {
      next(error);
    }
  }
);

// ── GET /api/instruments/:instrumentId/documents/:documentId/download ─────
// Returns a short-lived signed URL (60 seconds) for secure download.
// No permanent public URL is ever created or returned.
router.get(
  "/:documentId/download",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, documentId } = req.params as {
        instrumentId: string;
        documentId: string;
      };

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, instrumentId: true, storagePath: true, originalName: true, mimeType: true },
      });

      if (!document || document.instrumentId !== instrument.id) {
        res.status(404).json({ error: "Not Found", message: "Document not found." });
        return;
      }

      let supabase;
      try {
        supabase = getSupabaseAdmin();
      } catch (err: unknown) {
        res.status(503).json({
          error: "Storage Service Unavailable",
          message: err instanceof Error ? err.message : "Cloud storage is not configured.",
        });
        return;
      }
      const bucket = env.SUPABASE_STORAGE_BUCKET!;

      const { data, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(document.storagePath, 60); // 60-second window

      if (signError || !data?.signedUrl) {
        console.error("Failed to create signed URL:", signError?.message);
        res.status(502).json({
          error: "Storage Error",
          message: "Failed to generate a download link. Please try again.",
        });
        return;
      }

      res.status(200).json({
        signedUrl: data.signedUrl,
        expiresInSeconds: 60,
        originalName: document.originalName,
        mimeType: document.mimeType,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── DELETE /api/instruments/:instrumentId/documents/:documentId ───────────
// Deletes a document from storage and database.
// Only the owning institution user (or SYSTEM_ADMIN) may delete.
// Deletion is only permitted when the instrument is still in DRAFT status
// (documents cannot be removed once submitted for regulatory scrutiny).
router.delete(
  "/:documentId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, documentId } = req.params as {
        instrumentId: string;
        documentId: string;
      };

      // Only institution users and admins may delete
      if (
        user.role !== Role.INSTITUTION_USER &&
        user.role !== Role.SYSTEM_ADMIN
      ) {
        res.status(403).json({
          error: "Forbidden",
          message: "Only instrument owners may delete documents.",
        });
        return;
      }

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      // Prevent deletion after submission (preserve regulatory evidence)
      if (instrument.status !== "DRAFT") {
        res.status(400).json({
          error: "Invalid Operation",
          message:
            "Documents cannot be deleted once the instrument has been submitted. " +
            "Contact your AICTE officer if a document was attached in error.",
        });
        return;
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, instrumentId: true, storagePath: true },
      });

      if (!document || document.instrumentId !== instrument.id) {
        res.status(404).json({ error: "Not Found", message: "Document not found." });
        return;
      }

      // Remove from Supabase Storage first
      let supabase;
      try {
        supabase = getSupabaseAdmin();
      } catch (err: unknown) {
        res.status(503).json({
          error: "Storage Service Unavailable",
          message: err instanceof Error ? err.message : "Cloud storage is not configured.",
        });
        return;
      }
      const bucket = env.SUPABASE_STORAGE_BUCKET!;
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove([document.storagePath]);

      if (removeError) {
        console.error("Supabase Storage deletion failed:", removeError.message);
        res.status(502).json({
          error: "Storage Error",
          message: "Failed to delete document from storage. Please try again.",
        });
        return;
      }

      // Remove metadata from database and create audit event atomically
      await prisma.$transaction(async (tx) => {
        await tx.document.delete({ where: { id: documentId } });

        // Audit event: scoped to the Instrument entity for timeline visibility.
        // documentId is preserved in metadata; storagePath is never logged.
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: "DOCUMENT_DELETED",
            entityType: "Instrument",
            entityId: instrument.id,
            metadata: { documentId },
          },
        });
      });

      res.status(200).json({ message: "Document deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

// ── POST /api/instruments/:instrumentId/documents/:documentId/ocr ─────────
// Triggers or retries deterministic OCR extraction & entered-vs-extracted comparison.
router.post(
  "/:documentId/ocr",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId, documentId } = req.params as {
        instrumentId: string;
        documentId: string;
      };

      const result = await triggerDocumentOcr({
        instrumentId,
        documentId,
        user: {
          id: user.id,
          role: user.role,
          institutionId: user.institutionId,
        },
      });

      if (!result.success) {
        res.status(result.statusCode).json({
          error: result.error,
          message: result.message,
          extraction: result.extraction,
        });
        return;
      }

      res.status(result.statusCode).json({
        message: result.message,
        extraction: result.extraction,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
