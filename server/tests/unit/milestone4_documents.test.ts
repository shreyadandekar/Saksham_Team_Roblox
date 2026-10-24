/**
 * tests/unit/milestone4_documents.test.ts
 * Unit tests for Milestone 4: Secure Document Upload and Storage.
 *
 * Supabase Storage is mocked via vi.mock so no real network calls are made.
 * The prisma client is mocked via the existing convention (vi.mock "../../src/db/prisma").
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
    instrument: { findUnique: vi.fn() },
    document: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn((cb) =>
      typeof cb === "function" ? cb(prisma) : Promise.all(cb)
    ),
  },
}));

// ── Mock Supabase ─────────────────────────────────────────────────────────
const mockStorageUpload = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageSignedUrl = vi.fn();
const mockGetSupabaseAdmin = vi.fn(() => ({
  storage: {
    from: () => ({
      upload: mockStorageUpload,
      remove: mockStorageRemove,
      createSignedUrl: mockStorageSignedUrl,
    }),
  },
}));

vi.mock("../../src/lib/supabase", () => ({
  getSupabaseAdmin: () => mockGetSupabaseAdmin(),
  _resetSupabaseClient: vi.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────
const institutionUserId = "user-delhi-01";
const institutionId = "inst-delhi-01";
const instrumentId = "instrument-test-01";
const documentId = "document-test-01";

const instUser = {
  id: institutionUserId,
  fullName: "Dr. Rajesh Verma",
  email: "inst.delhi@demo.fdr-sentinel.gov.in",
  role: Role.INSTITUTION_USER,
  institutionId,
  isActive: true,
};

const officerUser = {
  id: "officer-01",
  fullName: "Anil Sharma",
  email: "officer@demo.fdr-sentinel.gov.in",
  role: Role.AICTE_OFFICER,
  institutionId: null,
  isActive: true,
};

const otherInstUser = {
  id: "user-pune-02",
  fullName: "Prof. Sunita Deshmukh",
  email: "inst.pune@demo.fdr-sentinel.gov.in",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-pune-02",
  isActive: true,
};

const mockInstrument = {
  id: instrumentId,
  institutionId,
  status: "DRAFT",
};

const mockDocument = {
  id: documentId,
  instrumentId,
  uploadedById: institutionUserId,
  originalName: "receipt.pdf",
  storagePath: `${institutionId}/${instrumentId}/some-uuid.pdf`,
  mimeType: "application/pdf",
  sizeBytes: 512 * 1024,
  category: "FDR Receipt",
  createdAt: new Date("2026-10-23T12:00:00Z"),
};

function bearerToken(user: typeof instUser | typeof officerUser | typeof otherInstUser) {
  return `Bearer ${signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    institutionId: "institutionId" in user ? (user.institutionId ?? undefined) : undefined,
  })}`;
}

// ── Tests ─────────────────────────────────────────────────────────────────
describe("Milestone 4 — Document Upload and Storage API", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();

    // Restore Supabase client mock after clearAllMocks wipes implementations
    mockGetSupabaseAdmin.mockReturnValue({
      storage: {
        from: () => ({
          upload: mockStorageUpload,
          remove: mockStorageRemove,
          createSignedUrl: mockStorageSignedUrl,
        }),
      },
    });

    // Default: Supabase upload succeeds
    mockStorageUpload.mockResolvedValue({ data: { path: mockDocument.storagePath }, error: null });
    mockStorageRemove.mockResolvedValue({ data: {}, error: null });
    mockStorageSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.supabase.co/signed-url?token=abc" },
      error: null,
    });
  });

  // ── 1. Unauthenticated upload ─────────────────────────────────────────
  describe("POST /api/instruments/:id/documents", () => {
    it("rejects unauthenticated upload with 401", async () => {
      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .attach("file", Buffer.from("fake pdf"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("allows an authenticated institution user to upload a PDF to their own instrument", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.document.create).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as any);

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(instUser))
        .attach("file", Buffer.from("%PDF-1.4 test"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        })
        .field("category", "FDR Receipt");

      expect(res.status).toBe(201);
      expect(res.body.document).toBeDefined();
      expect(res.body.document.mimeType).toBe("application/pdf");
      expect(mockStorageUpload).toHaveBeenCalledOnce();
      expect(prisma.document.create).toHaveBeenCalledOnce();
    });

    it("rejects an invalid file type (e.g. .txt) with 415", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(instUser))
        .attach("file", Buffer.from("plain text"), {
          filename: "notes.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(415);
      expect(res.body.error).toBe("Unsupported Media Type");
    });

    it("rejects an oversized file with 413", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);

      // 11 MB buffer — exceeds default 10 MB cap
      const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 0);

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(instUser))
        .attach("file", bigBuffer, {
          filename: "large.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(413);
      expect(res.body.error).toBe("File Too Large");
    });

    it("prevents cross-institution upload: institution B cannot upload to institution A's instrument", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(otherInstUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any); // owned by institutionA

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(otherInstUser))
        .attach("file", Buffer.from("%PDF"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(404);
    });

    it("rejects upload for a non-existent instrument with 404", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/instruments/nonexistent-id/documents`)
        .set("Authorization", bearerToken(instUser))
        .attach("file", Buffer.from("%PDF"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(404);
    });

    it("AICTE officers cannot upload documents (403)", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(officerUser as any);

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(officerUser))
        .attach("file", Buffer.from("%PDF"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(403);
    });

    it("handles Supabase Storage failure gracefully and does NOT leave a DB orphan", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      mockStorageUpload.mockResolvedValue({ data: null, error: { message: "Bucket not found" } });

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(instUser))
        .attach("file", Buffer.from("%PDF"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(502);
      expect(prisma.document.create).not.toHaveBeenCalled();
    });

    it("cleans up orphaned storage object if DB insert fails after successful upload", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      mockStorageUpload.mockResolvedValue({ data: { path: "some/path.pdf" }, error: null });
      vi.mocked(prisma.document.create).mockRejectedValue(new Error("DB constraint failed"));
      vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as any);

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(instUser))
        .attach("file", Buffer.from("%PDF"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        });

      // 500 from global error handler
      expect(res.status).toBe(500);
      // Cleanup was attempted
      expect(mockStorageRemove).toHaveBeenCalledOnce();
    });

    it("returns 503 when Supabase Storage is not configured", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      mockGetSupabaseAdmin.mockImplementationOnce(() => {
        throw new Error("Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env.");
      });

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(instUser))
        .attach("file", Buffer.from("%PDF"), {
          filename: "receipt.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe("Storage Service Unavailable");
    });
  });

  // ── 2. List documents ─────────────────────────────────────────────────
  describe("GET /api/instruments/:id/documents", () => {
    it("returns an empty array for an instrument with no documents", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(instUser));

      expect(res.status).toBe(200);
      expect(res.body.documents).toEqual([]);
    });

    it("returns documents for the authenticated institution user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument as any]);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(instUser));

      expect(res.status).toBe(200);
      expect(res.body.documents).toHaveLength(1);
      expect(res.body.documents[0].originalName).toBe("receipt.pdf");
    });

    it("allows AICTE officers to list documents for scrutiny", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(officerUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument as any]);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(officerUser));

      expect(res.status).toBe(200);
      expect(res.body.documents).toHaveLength(1);
    });

    it("prevents cross-institution document listing with 404", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(otherInstUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/documents`)
        .set("Authorization", bearerToken(otherInstUser));

      expect(res.status).toBe(404);
    });
  });

  // ── 3. Download (signed URL) ──────────────────────────────────────────
  describe("GET /api/instruments/:id/documents/:docId/download", () => {
    it("returns a signed URL for an authenticated institution user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/documents/${documentId}/download`)
        .set("Authorization", bearerToken(instUser));

      expect(res.status).toBe(200);
      expect(res.body.signedUrl).toBeDefined();
      expect(res.body.expiresInSeconds).toBe(60);
    });

    it("returns 404 when document does not belong to the instrument", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.document.findUnique).mockResolvedValue({
        ...mockDocument,
        instrumentId: "different-instrument",
      } as any);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/documents/${documentId}/download`)
        .set("Authorization", bearerToken(instUser));

      expect(res.status).toBe(404);
    });
  });

  // ── 4. Delete ─────────────────────────────────────────────────────────
  describe("DELETE /api/instruments/:id/documents/:docId", () => {
    it("allows institution user to delete a document from a DRAFT instrument", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.document.delete).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as any);

      const res = await request(app)
        .delete(`/api/instruments/${instrumentId}/documents/${documentId}`)
        .set("Authorization", bearerToken(instUser));

      expect(res.status).toBe(200);
      expect(mockStorageRemove).toHaveBeenCalledOnce();
      expect(prisma.document.delete).toHaveBeenCalledOnce();
    });

    it("rejects deletion for a SUBMITTED instrument with 400", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue({
        ...mockInstrument,
        status: "SUBMITTED",
      } as any);

      const res = await request(app)
        .delete(`/api/instruments/${instrumentId}/documents/${documentId}`)
        .set("Authorization", bearerToken(instUser));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid Operation");
    });

    it("prevents cross-institution document deletion with 404", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(otherInstUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);

      const res = await request(app)
        .delete(`/api/instruments/${instrumentId}/documents/${documentId}`)
        .set("Authorization", bearerToken(otherInstUser));

      expect(res.status).toBe(404);
    });
  });
});
