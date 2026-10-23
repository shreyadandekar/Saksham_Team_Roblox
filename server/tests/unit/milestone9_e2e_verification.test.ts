/**
 * tests/unit/milestone9_e2e_verification.test.ts
 *
 * End-to-End Verification & Security Review Test Suite for Milestone 9:
 * OCR Document Intelligence, Rule-Based Comparison, Human Review, and Audit Trail.
 *
 * Covers:
 *  1. Complete Pipeline: Trigger -> Storage Download -> Text Extraction -> Rule Comparison -> Persistence -> Audit.
 *  2. Tenant Isolation & Cross-Institution Access Controls.
 *  3. Cross-Instrument Document and Extraction Boundary Checks.
 *  4. Role Enforcement: Only AICTE_OFFICER and SYSTEM_ADMIN may review.
 *  5. Concurrency & Race Condition Safeguards (P2002 DB unique constraint).
 *  6. Storage Retrieval and Corrupt File Error Recovery with Audit Trail.
 *  7. Provenance & Instrument Immutability: Status and entered values are NEVER modified.
 *  8. Real Calendar Date Validation (Leap years, 30/31-day months, impossible dates).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { signAccessToken } from "../../src/utils/jwt";
import { Role, Prisma } from "@prisma/client";
import { triggerDocumentOcr } from "../../src/services/ocr/ocrTriggerService";
import { parseDateCandidate, isValidCalendarDate } from "../../src/services/ocr/candidateExtractor";
import * as supabaseLib from "../../src/lib/supabase";

// ── Mock Prisma ─────────────────────────────────────────────────────────────
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

// ── Mock Supabase Storage ───────────────────────────────────────────────────
const mockStorageDownload = vi.fn();
vi.mock("../../src/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        download: (...args: any[]) => mockStorageDownload(...args),
      })),
    },
  })),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────
const instUserDelhi = {
  id: "user-delhi-01",
  email: "fdr@delhi-tech.ac.in",
  fullName: "Delhi Registrar",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-delhi",
  isActive: true,
};

const instUserMumbai = {
  id: "user-mumbai-01",
  email: "fdr@mumbai-tech.ac.in",
  fullName: "Mumbai Registrar",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-mumbai",
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

const sampleDelhiInstrument = {
  id: "inst-delhi-100",
  institutionId: "inst-delhi",
  instrumentNumber: "SBI-FDR-2024-998877",
  bankName: "State Bank of India",
  branchName: "Parliament Street",
  amount: "500000.00",
  issueDate: new Date("2024-01-15T00:00:00.000Z"),
  maturityDate: new Date("2027-01-15T00:00:00.000Z"),
  status: "SUBMITTED",
};

const sampleDelhiDocument = {
  id: "doc-delhi-100",
  instrumentId: "inst-delhi-100",
  originalName: "sbi_fdr_receipt.pdf",
  storagePath: "inst-delhi/inst-delhi-100/sample.pdf",
  mimeType: "application/pdf",
  category: "FDR Receipt",
  sizeBytes: 2048,
};

/**
 * Creates a minimal valid text PDF buffer for end-to-end OCR testing.
 */
function createTestPdfBuffer(lines: string[]): Buffer {
  const textCmds = lines
    .map((l, i) => (i === 0 ? `72 712 Td (${l.replace(/([\\()])/g, "\\$1")}) Tj` : `0 -18 Td (${l.replace(/([\\()])/g, "\\$1")}) Tj`))
    .join("\n");
  const content = `BT\n/F1 12 Tf\n${textCmds}\nET`;
  const streamLen = content.length;
  const pdf = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
    "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    `5 0 obj<</Length ${streamLen}>>stream`,
    content,
    "endstream\nendobj",
    "xref",
    "0 6",
    "0000000000 65535 f",
    "0000000009 00000 n",
    "0000000052 00000 n",
    "0000000101 00000 n",
    "0000000212 00000 n",
    "0000000282 00000 n",
    "trailer<</Size 6/Root 1 0 R>>",
    "startxref",
    "380",
    "%%EOF",
  ].join("\n");
  return Buffer.from(pdf, "binary");
}

describe("Milestone 9 Phase 6 — End-to-End Verification & Security Review", () => {
  const app = createApp();

  let delhiToken: string;
  let mumbaiToken: string;
  let officerToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    delhiToken = signAccessToken({
      sub: instUserDelhi.id,
      email: instUserDelhi.email,
      role: instUserDelhi.role,
      institutionId: instUserDelhi.institutionId,
    });

    mumbaiToken = signAccessToken({
      sub: instUserMumbai.id,
      email: instUserMumbai.email,
      role: instUserMumbai.role,
      institutionId: instUserMumbai.institutionId,
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

    vi.mocked(prisma.user.findUnique).mockImplementation(
      ({ where }: { where: { id: string } }) => {
        const users = [instUserDelhi, instUserMumbai, officerUser, adminUser];
        return Promise.resolve((users.find((u) => u.id === where.id) ?? null) as any);
      }
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Calendar Date Validation Engine
  // ─────────────────────────────────────────────────────────────────────────
  describe("Calendar Date Validation & Edge Cases", () => {
    it("accepts valid calendar dates in standard formats", () => {
      expect(parseDateCandidate("15/01/2026")).toBe("2026-01-15");
      expect(parseDateCandidate("2026-06-30")).toBe("2026-06-30");
      expect(parseDateCandidate("15-Aug-2026")).toBe("2026-08-15");
    });

    it("correctly handles leap year dates", () => {
      // 2024 was a leap year: Feb 29 is valid
      expect(isValidCalendarDate(2024, 2, 29)).toBe(true);
      expect(parseDateCandidate("29/02/2024")).toBe("2024-02-29");

      // 2025 is not a leap year: Feb 29 is invalid
      expect(isValidCalendarDate(2025, 2, 29)).toBe(false);
      expect(parseDateCandidate("29/02/2025")).toBeNull();
    });

    it("rejects impossible days for 30-day months and February", () => {
      // April has 30 days; 31st is invalid
      expect(isValidCalendarDate(2026, 4, 31)).toBe(false);
      expect(parseDateCandidate("31/04/2026")).toBeNull();

      // February 30th and 31st are always invalid
      expect(isValidCalendarDate(2026, 2, 30)).toBe(false);
      expect(parseDateCandidate("30/02/2026")).toBeNull();
      expect(parseDateCandidate("31/02/2026")).toBeNull();
    });

    it("rejects dates outside acceptable regulatory range (1990 - 2099)", () => {
      expect(isValidCalendarDate(1985, 1, 15)).toBe(false);
      expect(isValidCalendarDate(2150, 1, 15)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Cross-Institution Tenant Isolation
  // ─────────────────────────────────────────────────────────────────────────
  describe("Tenant Isolation & Cross-Institution Access", () => {
    it("rejects institution user attempting to trigger OCR on another institution's instrument", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);

      // Mumbai user attempts to trigger OCR on Delhi instrument
      const result = await triggerDocumentOcr({
        instrumentId: "inst-delhi-100",
        documentId: "doc-delhi-100",
        user: {
          id: instUserMumbai.id,
          role: instUserMumbai.role,
          institutionId: instUserMumbai.institutionId,
        },
      });

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Instrument not found");
    });

    it("rejects institution user attempting to view OCR results of another institution's instrument", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);

      const res = await request(app)
        .get("/api/instruments/inst-delhi-100/ocr")
        .set("Authorization", `Bearer ${mumbaiToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Instrument not found");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Document and Extraction Boundary Integrity
  // ─────────────────────────────────────────────────────────────────────────
  describe("Document and Extraction Boundary Integrity", () => {
    it("rejects OCR trigger when document does not belong to the target instrument", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);
      vi.mocked(prisma.document.findUnique).mockResolvedValue({
        ...sampleDelhiDocument,
        instrumentId: "different-instrument-id", // belongs to a different instrument
      } as any);

      const result = await triggerDocumentOcr({
        instrumentId: "inst-delhi-100",
        documentId: "doc-delhi-100",
        user: {
          id: instUserDelhi.id,
          role: instUserDelhi.role,
          institutionId: instUserDelhi.institutionId,
        },
      });

      expect(result.statusCode).toBe(404);
      expect(result.message).toContain("Document not found");
    });

    it("rejects review requests targeting an extraction of another instrument", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);
      vi.mocked(prisma.ocrExtraction.findUnique).mockResolvedValue({
        id: "ext-different",
        instrumentId: "different-instrument-id", // mismatched instrument
        status: "EXTRACTED",
        document: { id: "doc-1" },
      } as any);

      const res = await request(app)
        .post("/api/instruments/inst-delhi-100/ocr/review")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          extractionId: "ext-different",
          decision: "ACCEPTED",
          remarks: "Cross-instrument extraction review attempt",
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("OCR extraction record not found for this instrument");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Role Authorization Enforcement
  // ─────────────────────────────────────────────────────────────────────────
  describe("Role Authorization Enforcement on Review Endpoint", () => {
    it("strictly rejects INSTITUTION_USER from submitting OCR reviews (403)", async () => {
      const res = await request(app)
        .post("/api/instruments/inst-delhi-100/ocr/review")
        .set("Authorization", `Bearer ${delhiToken}`)
        .send({
          extractionId: "ext-100",
          decision: "ACCEPTED",
          remarks: "Unauthorized institution review",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Only AICTE Officers or Administrators");
    });

    it("allows AICTE_OFFICER to submit valid review", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);
      vi.mocked(prisma.ocrExtraction.findUnique).mockResolvedValue({
        id: "ext-100",
        instrumentId: sampleDelhiInstrument.id,
        status: "EXTRACTED",
        document: { id: sampleDelhiDocument.id },
      } as any);
      vi.mocked(prisma.ocrExtraction.update).mockResolvedValue({
        id: "ext-100",
        status: "REVIEWED",
        reviewedById: officerUser.id,
      } as any);

      const res = await request(app)
        .post("/api/instruments/inst-delhi-100/ocr/review")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          extractionId: "ext-100",
          decision: "ACCEPTED",
          remarks: "Verified against original bank advice",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("recorded successfully");
      expect(prisma.instrument.update).not.toHaveBeenCalled();
    });

    it("allows SYSTEM_ADMIN to submit valid review", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);
      vi.mocked(prisma.ocrExtraction.findUnique).mockResolvedValue({
        id: "ext-100",
        instrumentId: sampleDelhiInstrument.id,
        status: "EXTRACTED",
        document: { id: sampleDelhiDocument.id },
      } as any);
      vi.mocked(prisma.ocrExtraction.update).mockResolvedValue({
        id: "ext-100",
        status: "REVIEWED",
        reviewedById: adminUser.id,
      } as any);

      const res = await request(app)
        .post("/api/instruments/inst-delhi-100/ocr/review")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          extractionId: "ext-100",
          decision: "OVERRIDDEN",
          remarks: "Admin verified with bank phone confirmation",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("recorded successfully");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Concurrency & Race Condition Guard
  // ─────────────────────────────────────────────────────────────────────────
  describe("Concurrency & Race Condition Handling", () => {
    it("returns 409 Conflict if an active PENDING extraction already exists", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);
      vi.mocked(prisma.document.findUnique).mockResolvedValue(sampleDelhiDocument as any);
      vi.mocked(prisma.ocrExtraction.findFirst).mockResolvedValue({
        id: "ext-active-pending",
        status: "PENDING",
      } as any);

      const result = await triggerDocumentOcr({
        instrumentId: "inst-delhi-100",
        documentId: "doc-delhi-100",
        user: {
          id: instUserDelhi.id,
          role: instUserDelhi.role,
          institutionId: instUserDelhi.institutionId,
        },
      });

      expect(result.statusCode).toBe(409);
      expect(result.error).toBe("Conflict");
      expect(result.message).toContain("already in progress");
    });

    it("catches Prisma P2002 unique constraint race condition and returns 409 Conflict", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);
      vi.mocked(prisma.document.findUnique).mockResolvedValue(sampleDelhiDocument as any);
      vi.mocked(prisma.ocrExtraction.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.ocrExtraction.count).mockResolvedValue(0);

      // Simulate concurrent insert hitting the database partial unique index
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on ocr_extractions_documentId_pending_unique",
        { code: "P2002", clientVersion: "5.0.0" }
      );
      vi.mocked(prisma.ocrExtraction.create).mockRejectedValueOnce(p2002Error);

      const result = await triggerDocumentOcr({
        instrumentId: "inst-delhi-100",
        documentId: "doc-delhi-100",
        user: {
          id: instUserDelhi.id,
          role: instUserDelhi.role,
          institutionId: instUserDelhi.institutionId,
        },
      });

      expect(result.statusCode).toBe(409);
      expect(result.error).toBe("Conflict");
      expect(result.message).toContain("already in progress");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Complete End-to-End Extraction Pipeline
  // ─────────────────────────────────────────────────────────────────────────
  describe("Complete Pipeline Execution (Trigger -> Extraction -> Rule Check -> Audit)", () => {
    it("successfully extracts real PDF buffer, runs rules, stores results, and emits audit event", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);
      vi.mocked(prisma.document.findUnique).mockResolvedValue(sampleDelhiDocument as any);
      vi.mocked(prisma.ocrExtraction.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.ocrExtraction.count).mockResolvedValue(0);

      const realPdfBuffer = createTestPdfBuffer([
        "STATE BANK OF INDIA",
        "PARLIAMENT STREET BRANCH",
        "FIXED DEPOSIT RECEIPT",
        "FDR Number: SBI-FDR-2024-998877",
        "Principal Amount: Rs. 5,00,000.00",
        "Date of Issue: 15/01/2024",
        "Date of Maturity: 15/01/2027",
      ]);

      mockStorageDownload.mockResolvedValue({
        data: {
          arrayBuffer: async () => realPdfBuffer.buffer,
        },
        error: null,
      });

      vi.mocked(prisma.ocrExtraction.create).mockResolvedValue({
        id: "ext-created-1",
        attemptNumber: 1,
        status: "PENDING",
      } as any);

      vi.mocked(prisma.ocrExtraction.update).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: "ext-created-1",
          attemptNumber: 1,
          ...data,
          document: { id: sampleDelhiDocument.id, originalName: sampleDelhiDocument.originalName },
        } as any);
      });

      vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as any);

      const result = await triggerDocumentOcr({
        instrumentId: "inst-delhi-100",
        documentId: "doc-delhi-100",
        user: {
          id: instUserDelhi.id,
          role: instUserDelhi.role,
          institutionId: instUserDelhi.institutionId,
        },
      });

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.extraction).toBeDefined();
      expect(result.extraction.status).toBe("EXTRACTED");
      expect(result.extraction.extractedBankName).toBe("State Bank of India");
      expect(result.extraction.extractedFdrNumber).toBe("SBI-FDR-2024-998877");
      expect(result.extraction.hasMismatches).toBe(false);

      // Verify audit event OCR_EXTRACTED
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "OCR_EXTRACTED",
            actorId: instUserDelhi.id,
            entityType: "Instrument",
            entityId: sampleDelhiInstrument.id,
            metadata: expect.objectContaining({
              documentId: sampleDelhiDocument.id,
              attemptNumber: 1,
              hasMismatches: false,
              matchCount: expect.any(Number),
            }),
          }),
        })
      );

      // Verify instrument table remains untouched
      expect(prisma.instrument.update).not.toHaveBeenCalled();
    });

    it("records OCR_EXTRACTION_FAILED audit event when storage download fails", async () => {
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(sampleDelhiInstrument as any);
      vi.mocked(prisma.document.findUnique).mockResolvedValue(sampleDelhiDocument as any);
      vi.mocked(prisma.ocrExtraction.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.ocrExtraction.count).mockResolvedValue(0);

      mockStorageDownload.mockResolvedValue({
        data: null,
        error: { message: "Object not found in storage bucket" },
      });

      vi.mocked(prisma.ocrExtraction.create).mockResolvedValue({
        id: "ext-storage-fail",
        attemptNumber: 1,
        status: "PENDING",
      } as any);

      vi.mocked(prisma.ocrExtraction.update).mockResolvedValue({
        id: "ext-storage-fail",
        status: "FAILED",
        errorMessage: "Storage retrieval failed: Object not found in storage bucket",
      } as any);

      vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as any);

      const result = await triggerDocumentOcr({
        instrumentId: "inst-delhi-100",
        documentId: "doc-delhi-100",
        user: {
          id: officerUser.id,
          role: officerUser.role,
        },
      });

      expect(result.statusCode).toBe(502);
      expect(result.error).toBe("Storage Error");
      expect(result.extraction.status).toBe("FAILED");

      // Verify failure audit event was created
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "OCR_EXTRACTION_FAILED",
            actorId: officerUser.id,
            entityType: "Instrument",
            entityId: sampleDelhiInstrument.id,
          }),
        })
      );
    });
  });
});
