import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { signAccessToken } from "../../src/utils/jwt";
import { Role, InstrumentStatus, Prisma } from "@prisma/client";

vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    instrument: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    instrumentRelationship: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn((callback) => callback({
      instrument: {
        create: vi.fn(),
        update: vi.fn(),
      },
      auditEvent: {
        create: vi.fn(),
      },
    })),
  },
}));

describe("Milestone 3 — FDR Registry and Submission Workflow API", () => {
  const app = createApp();

  const instUserDelhi = {
    id: "user-delhi-01",
    fullName: "Dr. Rajesh Verma",
    email: "inst.delhi@demo.fdr-sentinel.gov.in",
    role: Role.INSTITUTION_USER,
    institutionId: "inst-delhi-01",
    isActive: true,
  };

  const instUserPune = {
    id: "user-pune-02",
    fullName: "Prof. Sunita Deshmukh",
    email: "inst.pune@demo.fdr-sentinel.gov.in",
    role: Role.INSTITUTION_USER,
    institutionId: "inst-pune-02",
    isActive: true,
  };

  const officerSharma = {
    id: "officer-sharma-03",
    fullName: "Anil Sharma",
    email: "officer.sharma@demo.fdr-sentinel.gov.in",
    role: Role.AICTE_OFFICER,
    institutionId: null,
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Create Instrument ────────────────────────────────────────────────
  describe("POST /api/instruments", () => {
    it("rejects unauthenticated creation requests with 401", async () => {
      const res = await request(app).post("/api/instruments").send({
        instrumentNumber: "FDR-DELHI-001",
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("rejects creation if maturity date is earlier than issue date", async () => {
      const token = signAccessToken({
        sub: instUserDelhi.id,
        email: instUserDelhi.email,
        role: instUserDelhi.role,
        institutionId: instUserDelhi.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserDelhi);

      const res = await request(app)
        .post("/api/instruments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          instrumentNumber: "FDR-DELHI-001",
          bankName: "State Bank of India",
          branchName: "Dwarka Sector 14",
          amount: 500000,
          issueDate: "2026-06-01T00:00:00.000Z",
          maturityDate: "2025-06-01T00:00:00.000Z", // Invalid: before issueDate
          favouringDetails: "Member Secretary, AICTE",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.issues[0].message).toContain("Maturity date cannot be earlier than issue date");
    });

    it("rejects creation with negative or zero amount", async () => {
      const token = signAccessToken({
        sub: instUserDelhi.id,
        email: instUserDelhi.email,
        role: instUserDelhi.role,
        institutionId: instUserDelhi.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserDelhi);

      const res = await request(app)
        .post("/api/instruments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          instrumentNumber: "FDR-DELHI-001",
          bankName: "State Bank of India",
          branchName: "Dwarka Sector 14",
          amount: -500, // Invalid
          issueDate: "2025-04-01T00:00:00.000Z",
          maturityDate: "2030-04-01T00:00:00.000Z",
          favouringDetails: "Member Secretary, AICTE",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
    });

    it("successfully creates a draft instrument with audit trail and document metadata", async () => {
      const token = signAccessToken({
        sub: instUserDelhi.id,
        email: instUserDelhi.email,
        role: instUserDelhi.role,
        institutionId: instUserDelhi.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserDelhi);

      const mockCreated = {
        id: "inst-new-001",
        instrumentNumber: "FDR-DELHI-2026-101",
        bankName: "State Bank of India",
        branchName: "Dwarka",
        amount: new Prisma.Decimal(500000),
        status: InstrumentStatus.DRAFT,
        institutionId: instUserDelhi.institutionId,
        createdById: instUserDelhi.id,
        documentMetadata: {
          fileName: "sbi_fixed_deposit_receipt.pdf",
          fileSize: 245000,
          fileType: "application/pdf",
          category: "FDR Receipt",
        },
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            create: vi.fn().mockResolvedValue(mockCreated),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-01" }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post("/api/instruments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          instrumentNumber: "FDR-DELHI-2026-101",
          bankName: "State Bank of India",
          branchName: "Dwarka",
          amount: 500000,
          issueDate: "2025-04-01T00:00:00.000Z",
          maturityDate: "2030-04-01T00:00:00.000Z",
          favouringDetails: "Member Secretary, AICTE",
          documentMetadata: {
            fileName: "sbi_fixed_deposit_receipt.pdf",
            fileSize: 245000,
            fileType: "application/pdf",
            category: "FDR Receipt",
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.instrument.id).toBe("inst-new-001");
      expect(res.body.instrument.status).toBe(InstrumentStatus.DRAFT);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("rejects duplicate reference numbers with 409 Conflict", async () => {
      const token = signAccessToken({
        sub: instUserDelhi.id,
        email: instUserDelhi.email,
        role: instUserDelhi.role,
        institutionId: instUserDelhi.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserDelhi);

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`institutionId`,`instrumentNumber`)",
        {
          code: "P2002",
          clientVersion: "6.19.3",
        }
      );

      (prisma.$transaction as any).mockRejectedValue(p2002Error);

      const res = await request(app)
        .post("/api/instruments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          instrumentNumber: "FDR-DELHI-DUPLICATE",
          bankName: "State Bank of India",
          branchName: "Dwarka",
          amount: 500000,
          issueDate: "2025-04-01T00:00:00.000Z",
          maturityDate: "2030-04-01T00:00:00.000Z",
          favouringDetails: "Member Secretary, AICTE",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Conflict");
      expect(res.body.message).toContain("already exists for your institution");
    });
  });

  // ── 2. Submit Draft for Scrutiny ─────────────────────────────────────────
  describe("POST /api/instruments/:id/submit", () => {
    it("successfully transitions eligible DRAFT to SUBMITTED", async () => {
      const token = signAccessToken({
        sub: instUserDelhi.id,
        email: instUserDelhi.email,
        role: instUserDelhi.role,
        institutionId: instUserDelhi.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserDelhi);

      const existingDraft = {
        id: "fdr-101",
        instrumentNumber: "FDR-SBI-101",
        status: InstrumentStatus.DRAFT,
        institutionId: instUserDelhi.institutionId,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(existingDraft);

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockResolvedValue({
              ...existingDraft,
              status: InstrumentStatus.SUBMITTED,
            }),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-submit-01" }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post("/api/instruments/fdr-101/submit")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.instrument.status).toBe(InstrumentStatus.SUBMITTED);
      expect(res.body.message).toContain("successfully submitted for scrutiny");
    });

    it("prevents Institution Pune from submitting Institution Delhi's instrument (cross-tenant protection)", async () => {
      const tokenPune = signAccessToken({
        sub: instUserPune.id,
        email: instUserPune.email,
        role: instUserPune.role,
        institutionId: instUserPune.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserPune);

      // Instrument belongs to Delhi
      (prisma.instrument.findUnique as any).mockResolvedValue({
        id: "delhi-instrument-id",
        instrumentNumber: "FDR-DELHI-001",
        status: InstrumentStatus.DRAFT,
        institutionId: "inst-delhi-01", // Not Pune!
      });

      const res = await request(app)
        .post("/api/instruments/delhi-instrument-id/submit")
        .set("Authorization", `Bearer ${tokenPune}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not Found");
    });

    it("rejects repeated submission if instrument is already SUBMITTED or ACTIVE", async () => {
      const token = signAccessToken({
        sub: instUserDelhi.id,
        email: instUserDelhi.email,
        role: instUserDelhi.role,
        institutionId: instUserDelhi.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserDelhi);

      // Already submitted
      (prisma.instrument.findUnique as any).mockResolvedValue({
        id: "fdr-already-submitted",
        instrumentNumber: "FDR-SBI-101",
        status: InstrumentStatus.SUBMITTED,
        institutionId: instUserDelhi.institutionId,
      });

      const res = await request(app)
        .post("/api/instruments/fdr-already-submitted/submit")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid State Transition");
    });
  });

  // ── 3. Detail Endpoint & Isolation ───────────────────────────────────────
  describe("GET /api/instruments/:id", () => {
    it("returns 404 when Institution Pune requests Institution Delhi's record", async () => {
      const tokenPune = signAccessToken({
        sub: instUserPune.id,
        email: instUserPune.email,
        role: instUserPune.role,
        institutionId: instUserPune.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserPune);

      (prisma.instrument.findUnique as any).mockResolvedValue({
        id: "delhi-record-id",
        instrumentNumber: "FDR-DELHI-999",
        institutionId: "inst-delhi-01",
      });

      const res = await request(app)
        .get("/api/instruments/delhi-record-id")
        .set("Authorization", `Bearer ${tokenPune}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not Found");
    });

    it("allows AICTE Officer to view any institution's record along with audit trail", async () => {
      const tokenOfficer = signAccessToken({
        sub: officerSharma.id,
        email: officerSharma.email,
        role: officerSharma.role,
        institutionId: officerSharma.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(officerSharma);

      const delhiRecord = {
        id: "delhi-record-id",
        instrumentNumber: "FDR-DELHI-999",
        status: InstrumentStatus.SUBMITTED,
        institutionId: "inst-delhi-01",
        institution: { id: "inst-delhi-01", name: "Delhi Institute" },
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(delhiRecord);
      (prisma.auditEvent.findMany as any).mockResolvedValue([
        {
          id: "audit-01",
          action: "INSTRUMENT_SUBMITTED",
          createdAt: new Date(),
          actor: { fullName: "Dr. Verma", role: Role.INSTITUTION_USER },
        },
      ]);

      const res = await request(app)
        .get("/api/instruments/delhi-record-id")
        .set("Authorization", `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(200);
      expect(res.body.instrument.id).toBe("delhi-record-id");
      expect(res.body.auditEvents).toHaveLength(1);
    });
  });

  // ── 4. Scrutiny Queue Endpoint ───────────────────────────────────────────
  describe("GET /api/scrutiny", () => {
    it("rejects Institution User from accessing scrutiny queue with 403 Forbidden", async () => {
      const token = signAccessToken({
        sub: instUserDelhi.id,
        email: instUserDelhi.email,
        role: instUserDelhi.role,
        institutionId: instUserDelhi.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserDelhi);

      const res = await request(app)
        .get("/api/scrutiny")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });

    it("allows AICTE Officer to inspect submitted instruments across all institutions", async () => {
      const token = signAccessToken({
        sub: officerSharma.id,
        email: officerSharma.email,
        role: officerSharma.role,
        institutionId: officerSharma.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(officerSharma);

      (prisma.instrument.findMany as any).mockResolvedValue([
        {
          id: "inst-1",
          instrumentNumber: "FDR-DELHI-001",
          status: InstrumentStatus.SUBMITTED,
          institution: { name: "Delhi Institute" },
        },
        {
          id: "inst-2",
          instrumentNumber: "FDR-PUNE-002",
          status: InstrumentStatus.SUBMITTED,
          institution: { name: "Maharashtra Institute" },
        },
      ]);

      (prisma.instrument.count as any).mockResolvedValue(2);

      const res = await request(app)
        .get("/api/scrutiny")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.instruments).toHaveLength(2);
      expect(res.body.meta.totalCount).toBe(2);
    });
  });

  // ── 5. Officer Starts Scrutiny ───────────────────────────────────────────
  describe("POST /api/instruments/:id/start-scrutiny", () => {
    it("rejects Institution User from starting scrutiny with 403 Forbidden", async () => {
      const token = signAccessToken({
        sub: instUserDelhi.id,
        email: instUserDelhi.email,
        role: instUserDelhi.role,
        institutionId: instUserDelhi.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(instUserDelhi);

      const res = await request(app)
        .post("/api/instruments/fdr-101/start-scrutiny")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });

    it("allows AICTE Officer to start scrutiny on SUBMITTED instrument", async () => {
      const token = signAccessToken({
        sub: officerSharma.id,
        email: officerSharma.email,
        role: officerSharma.role,
        institutionId: officerSharma.institutionId,
      });

      (prisma.user.findUnique as any).mockResolvedValue(officerSharma);

      const submittedRecord = {
        id: "fdr-101",
        instrumentNumber: "FDR-SBI-101",
        status: InstrumentStatus.SUBMITTED,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(submittedRecord);

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockResolvedValue({
              ...submittedRecord,
              status: InstrumentStatus.UNDER_SCRUTINY,
            }),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-scrutiny-01" }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post("/api/instruments/fdr-101/start-scrutiny")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.instrument.status).toBe(InstrumentStatus.UNDER_SCRUTINY);
      expect(res.body.message).toContain("scrutiny initiated");
    });
  });
});
