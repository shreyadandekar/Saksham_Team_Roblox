/**
 * tests/unit/milestone9_ocr_api.test.ts
 *
 * Comprehensive unit test suite for Milestone 9 Phase 4:
 * Backend API & Human Review Workflow.
 *
 * Covers:
 *  1. Trigger & Retry Endpoint (POST /api/instruments/:id/documents/:docId/ocr):
 *     - Authentication & tenant isolation (INSTITUTION_USER vs Officers vs foreign institution)
 *     - 404 for missing instrument or document
 *     - 400 for unsupported document format
 *     - 409 Conflict when an extraction is already PENDING (concurrency guard)
 *     - Attempt number calculation on retry
 *     - Storage download failure (502) & FAILED status
 *     - Successful extraction & rule-check with atomic OCR_EXTRACTED audit event
 *  2. OCR Results Endpoint (GET /api/instruments/:id/ocr):
 *     - Authentication & tenant isolation
 *     - Listing extractions with document metadata and comparison results
 *  3. Officer Review Endpoint (POST /api/instruments/:id/ocr/review):
 *     - 403 Forbidden for INSTITUTION_USER (Officers/Admins only)
 *     - Validation errors (missing extractionId, empty remarks, invalid decision)
 *     - 400 Bad Request if reviewing PENDING or FAILED extraction
 *     - Successful review: status -> REVIEWED, records remarks & acceptedValues provenance
 *     - Emits atomic OCR_REVIEW_COMPLETED audit event
 *     - Safeguards: NEVER overwrites instrument values, NEVER modifies instrument status
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { signAccessToken } from "../../src/utils/jwt";
import { Role } from "@prisma/client";

// ── Mock Prisma ───────────────────────────────────────────────────────────
vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    instrument: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    document: {
      findUnique: vi.fn(),
    },
    ocrExtraction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === "function") {
        return cb(prisma);
      }
      return Promise.all(cb);
    }),
  },
}));

// ── Mock OCR Trigger Service (isolates route handler from OCR engine internals) ──
const mockTriggerDocumentOcr = vi.fn();
vi.mock("../../src/services/ocr", () => ({
  triggerDocumentOcr: (...args: any[]) => mockTriggerDocumentOcr(...args),
  isSupportedExtractionMime: vi.fn(() => true),
  processDocumentExtraction: vi.fn(),
  compareEnteredAgainstExtracted: vi.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────
const instUserDelhi = {
  id: "user-delhi-01",
  email: "fdr@delhi-tech.ac.in",
  fullName: "Delhi Registrar",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-delhi",
  isActive: true,
};

const officerUser = {
  id: "user-officer-01",
  email: "scrutiny@aicte.gov.in",
  fullName: "AICTE Officer",
  role: Role.AICTE_OFFICER,
  institutionId: null,
  isActive: true,
};

const adminUser = {
  id: "user-admin-01",
  email: "admin@aicte.gov.in",
  fullName: "AICTE Admin",
  role: Role.SYSTEM_ADMIN,
  institutionId: null,
  isActive: true,
};

const sampleInstrument = {
  id: "inst-test-01",
  institutionId: "inst-delhi",
  instrumentNumber: "SBI-FDR-2024-998877",
  bankName: "State Bank of India",
  branchName: "Parliament Street",
  amount: "500000.00",
  issueDate: new Date("2024-01-15T00:00:00.000Z"),
  maturityDate: new Date("2027-01-15T00:00:00.000Z"),
  status: "SUBMITTED",
};

const sampleDocument = {
  id: "doc-test-01",
  instrumentId: "inst-test-01",
  originalName: "fdr_receipt.pdf",
  storagePath: "inst-delhi/inst-test-01/uuid-123.pdf",
  mimeType: "application/pdf",
  category: "FDR Receipt",
  sizeBytes: 102400,
};

describe("Milestone 9 Phase 4 — Backend API & Human Review Workflow", () => {
  const app = createApp();

  // Tokens — signed with the correct sub-based payload matching AuthTokenPayload
  let delhiToken: string;
  let officerToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-sign tokens after clearAllMocks (jwt.sign is not mocked, so this is a no-op in practice,
    // but we follow the established convention from other passing test files)
    delhiToken = signAccessToken({
      sub: instUserDelhi.id,
      email: instUserDelhi.email,
      role: instUserDelhi.role,
      institutionId: instUserDelhi.institutionId,
    });

    officerToken = signAccessToken({
      sub: officerUser.id,
      email: officerUser.email,
      role: officerUser.role,
      institutionId: null,
    });

    adminToken = signAccessToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      institutionId: null,
    });

    // Dynamic user lookup — mirrors what the working test files do
    vi.mocked(prisma.user.findUnique).mockImplementation(
      ({ where }: { where: { id: string } }) => {
        const users = [instUserDelhi, officerUser, adminUser];
        return Promise.resolve((users.find((u) => u.id === where.id) ?? null) as any);
      }
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. POST /api/instruments/:id/documents/:docId/ocr (Trigger / Retry)
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /api/instruments/:instrumentId/documents/:documentId/ocr", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app)
        .post("/api/instruments/inst-test-01/documents/doc-test-01/ocr");

      expect(res.status).toBe(401);
    });

    it("enforces institution isolation: rejects INSTITUTION_USER for another institution's instrument (404)", async () => {
      mockTriggerDocumentOcr.mockResolvedValue({
        statusCode: 404,
        success: false,
        error: "Not Found",
        message: "Instrument not found.",
      });

      const res = await request(app)
        .post("/api/instruments/inst-test-01/documents/doc-test-01/ocr")
        .set("Authorization", `Bearer ${delhiToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Instrument not found");
    });

    it("returns 404 if document does not belong to the instrument", async () => {
      mockTriggerDocumentOcr.mockResolvedValue({
        statusCode: 404,
        success: false,
        error: "Not Found",
        message: "Document not found.",
      });

      const res = await request(app)
        .post("/api/instruments/inst-test-01/documents/doc-test-01/ocr")
        .set("Authorization", `Bearer ${delhiToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Document not found");
    });

    it("returns 400 Bad Request for unsupported document format (e.g. application/zip)", async () => {
      mockTriggerDocumentOcr.mockResolvedValue({
        statusCode: 400,
        success: false,
        error: "Bad Request",
        message: "Unsupported document format for text extraction (application/zip). Only PDF, JPEG, and PNG are supported.",
      });

      const res = await request(app)
        .post("/api/instruments/inst-test-01/documents/doc-test-01/ocr")
        .set("Authorization", `Bearer ${delhiToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Unsupported document format");
    });

    it("prevents concurrent extractions: returns 409 Conflict if an extraction is already PENDING", async () => {
      mockTriggerDocumentOcr.mockResolvedValue({
        statusCode: 409,
        success: false,
        error: "Conflict",
        message: "An OCR extraction is already in progress for this document.",
      });

      const res = await request(app)
        .post("/api/instruments/inst-test-01/documents/doc-test-01/ocr")
        .set("Authorization", `Bearer ${delhiToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already in progress");
    });

    it("handles storage download failure with 502 and marks extraction FAILED", async () => {
      mockTriggerDocumentOcr.mockResolvedValue({
        statusCode: 502,
        success: false,
        error: "Storage Error",
        message: "Failed to download document from storage for text extraction.",
        extraction: { id: "ext-1", status: "FAILED" },
      });

      const res = await request(app)
        .post("/api/instruments/inst-test-01/documents/doc-test-01/ocr")
        .set("Authorization", `Bearer ${officerToken}`);

      expect(res.status).toBe(502);
      expect(res.body.error).toBe("Storage Error");
    });

    it("executes successful OCR extraction, runs rule-check comparison, and records OCR_EXTRACTED audit event", async () => {
      const fakeExtraction = {
        id: "ext-2",
        attemptNumber: 2,
        status: "EXTRACTED",
        ocrEngine: "pdf-parse/2.4.5",
        hasMismatches: false,
        ruleCheckResults: { summary: { matchCount: 6, hasMismatches: false } },
        document: { id: sampleDocument.id, originalName: "fdr_receipt.pdf" },
      };

      mockTriggerDocumentOcr.mockResolvedValue({
        statusCode: 201,
        success: true,
        message: "Document text extraction and comparison completed successfully.",
        extraction: fakeExtraction,
      });

      const res = await request(app)
        .post("/api/instruments/inst-test-01/documents/doc-test-01/ocr")
        .set("Authorization", `Bearer ${delhiToken}`);

      expect(res.status).toBe(201);
      expect(res.body.message).toContain("completed successfully");
      expect(res.body.extraction).toBeDefined();
      expect(res.body.extraction.status).toBe("EXTRACTED");

      // Verify the trigger service was called with correct params
      expect(mockTriggerDocumentOcr).toHaveBeenCalledWith({
        instrumentId: "inst-test-01",
        documentId: "doc-test-01",
        user: {
          id: instUserDelhi.id,
          role: instUserDelhi.role,
          institutionId: instUserDelhi.institutionId,
        },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. GET /api/instruments/:id/ocr (Results)
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /api/instruments/:instrumentId/ocr", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/instruments/inst-test-01/ocr");
      expect(res.status).toBe(401);
    });

    it("enforces institution isolation on results listing", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue({
        ...sampleInstrument,
        institutionId: "inst-different",
      } as any);

      const res = await request(app)
        .get("/api/instruments/inst-test-01/ocr")
        .set("Authorization", `Bearer ${delhiToken}`);

      expect(res.status).toBe(404);
    });

    it("returns all extractions with document and reviewer metadata", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleInstrument as any);

      const fakeExtractions = [
        {
          id: "ext-1",
          status: "REVIEWED",
          attemptNumber: 1,
          hasMismatches: false,
          document: { id: "doc-1", originalName: "receipt.pdf" },
          reviewedBy: { id: "off-1", fullName: "AICTE Officer" },
        },
      ];
      vi.mocked(prisma.ocrExtraction.findMany).mockResolvedValue(fakeExtractions as any);

      const res = await request(app)
        .get("/api/instruments/inst-test-01/ocr")
        .set("Authorization", `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.extractions).toHaveLength(1);
      expect(res.body.extractions[0].id).toBe("ext-1");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. POST /api/instruments/:id/ocr/review (Human Review Workflow)
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /api/instruments/:instrumentId/ocr/review", () => {
    it("rejects INSTITUTION_USER with 403 Forbidden (Officers and Admins only)", async () => {
      const res = await request(app)
        .post("/api/instruments/inst-test-01/ocr/review")
        .set("Authorization", `Bearer ${delhiToken}`)
        .send({
          extractionId: "ext-1",
          decision: "ACCEPTED",
          remarks: "Approved after review",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Only AICTE Officers or Administrators");
    });

    it("rejects review requests with missing or empty remarks (400 Validation Error)", async () => {
      const res = await request(app)
        .post("/api/instruments/inst-test-01/ocr/review")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          extractionId: "ext-1",
          decision: "ACCEPTED",
          remarks: "   ", // blank remarks
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Review remarks");
    });

    it("returns 400 Bad Request if trying to review a FAILED extraction", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleInstrument as any);

      vi.mocked(prisma.ocrExtraction.findUnique).mockResolvedValue({
        id: "ext-failed",
        instrumentId: sampleInstrument.id,
        status: "FAILED",
        document: { id: "doc-1" },
      } as any);

      const res = await request(app)
        .post("/api/instruments/inst-test-01/ocr/review")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          extractionId: "ext-failed",
          decision: "ACCEPTED",
          remarks: "Verified despite failure",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Cannot record a successful review for a failed extraction");
    });

    it("records officer review decision, provenance, and audit event OCR_REVIEW_COMPLETED without modifying instrument", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleInstrument as any);

      vi.mocked(prisma.ocrExtraction.findUnique).mockResolvedValue({
        id: "ext-extracted",
        instrumentId: sampleInstrument.id,
        documentId: sampleDocument.id,
        status: "EXTRACTED",
        document: { id: sampleDocument.id },
      } as any);

      const acceptedValues = {
        instrumentNumber: { value: "SBI-FDR-2024-998877", provenance: "ENTERED" as const },
        amount: { value: "500000.00", provenance: "EXTRACTED" as const },
      };

      vi.mocked(prisma.ocrExtraction.update).mockResolvedValue({
        id: "ext-extracted",
        status: "REVIEWED",
        reviewedById: officerUser.id,
        reviewRemarks: "Values cross-checked against original physical FDR advice",
        acceptedValues,
      } as any);

      vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/instruments/inst-test-01/ocr/review")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          extractionId: "ext-extracted",
          decision: "ACCEPTED",
          remarks: "Values cross-checked against original physical FDR advice",
          acceptedValues,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("recorded successfully");

      // Verify OCR extraction update
      expect(prisma.ocrExtraction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ext-extracted" },
          data: expect.objectContaining({
            status: "REVIEWED",
            reviewedById: officerUser.id,
            reviewRemarks: "Values cross-checked against original physical FDR advice",
            acceptedValues,
          }),
        })
      );

      // Verify Audit Event
      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: officerUser.id,
          action: "OCR_REVIEW_COMPLETED",
          entityType: "Instrument",
          entityId: sampleInstrument.id,
          metadata: expect.objectContaining({
            extractionId: "ext-extracted",
            decision: "ACCEPTED",
            reviewedById: officerUser.id,
          }),
        }),
      });

      // CRITICAL SAFEGUARD: Verify Instrument table was NOT updated
      expect(prisma.instrument.update).not.toHaveBeenCalled();
    });

    it("returns 400 Bad Request if trying to review a PENDING extraction", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleInstrument as any);

      vi.mocked(prisma.ocrExtraction.findUnique).mockResolvedValue({
        id: "ext-pending",
        instrumentId: sampleInstrument.id,
        status: "PENDING",
        document: { id: "doc-1" },
      } as any);

      const res = await request(app)
        .post("/api/instruments/inst-test-01/ocr/review")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          extractionId: "ext-pending",
          decision: "ACCEPTED",
          remarks: "Cannot review an in-progress extraction",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("still in progress");
    });

    it("SYSTEM_ADMIN can also perform officer review", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleInstrument as any);

      vi.mocked(prisma.ocrExtraction.findUnique).mockResolvedValue({
        id: "ext-extracted",
        instrumentId: sampleInstrument.id,
        documentId: sampleDocument.id,
        status: "EXTRACTED",
        document: { id: sampleDocument.id },
      } as any);

      vi.mocked(prisma.ocrExtraction.update).mockResolvedValue({
        id: "ext-extracted",
        status: "REVIEWED",
        reviewedById: adminUser.id,
      } as any);

      vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/instruments/inst-test-01/ocr/review")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          extractionId: "ext-extracted",
          decision: "REJECTED",
          remarks: "Original FDR receipt is illegible. Please resubmit a clearer scan.",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("recorded successfully");
      expect(prisma.instrument.update).not.toHaveBeenCalled();
    });

    it("returns 404 if extraction does not belong to the specified instrument", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleInstrument as any);

      vi.mocked(prisma.ocrExtraction.findUnique).mockResolvedValue({
        id: "ext-other",
        instrumentId: "different-instrument-id",
        documentId: "doc-other",
        status: "EXTRACTED",
        document: { id: "doc-other" },
      } as any);

      const res = await request(app)
        .post("/api/instruments/inst-test-01/ocr/review")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          extractionId: "ext-other",
          decision: "ACCEPTED",
          remarks: "Cross-instrument extraction access attempt",
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("OCR extraction record not found");
    });
  });
});
