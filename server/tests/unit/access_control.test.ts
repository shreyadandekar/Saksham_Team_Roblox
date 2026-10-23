import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { signAccessToken } from "../../src/utils/jwt";
import { Role } from "@prisma/client";

vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    instrument: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/instruments - Institution Access Control", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/instruments");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("should strictly scope institution user queries to their own institutionId", async () => {
    const instId = "inst-engineering-college-01";
    const token = signAccessToken({
      sub: "user-inst-01",
      email: "user@college1.edu",
      role: Role.INSTITUTION_USER,
      institutionId: instId,
    });

    // Mock DB user lookup
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-inst-01",
      fullName: "Inst Officer 1",
      email: "user@college1.edu",
      role: Role.INSTITUTION_USER,
      institutionId: instId,
      isActive: true,
    });

    // Mock DB instruments result
    (prisma.instrument.findMany as any).mockResolvedValue([
      {
        id: "inst-record-1",
        instrumentNumber: "FDR-2026-001",
        institutionId: instId,
      },
    ]);

    // Send request with query parameter attempting to access institution B!
    const res = await request(app)
      .get("/api/instruments?institutionId=inst-different-college-02")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Verify Prisma findMany was called with the authenticated user's institutionId, NOT the query param
    expect(prisma.instrument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { institutionId: instId },
      })
    );
  });

  it("should allow AICTE_OFFICER system-wide access without institution filter", async () => {
    const token = signAccessToken({
      sub: "officer-01",
      email: "officer@aicte.gov.in",
      role: Role.AICTE_OFFICER,
      institutionId: null,
    });

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "officer-01",
      fullName: "AICTE Verifier",
      email: "officer@aicte.gov.in",
      role: Role.AICTE_OFFICER,
      institutionId: null,
      isActive: true,
    });

    (prisma.instrument.findMany as any).mockResolvedValue([
      { id: "inst-1", institutionId: "inst-engineering-01" },
      { id: "inst-2", institutionId: "inst-pharmacy-02" },
    ]);

    const res = await request(app)
      .get("/api/instruments")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(prisma.instrument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {}, // System-wide: empty where clause
      })
    );
    expect(res.body.instruments).toHaveLength(2);
  });

  it("should allow SYSTEM_ADMIN system-wide access", async () => {
    const token = signAccessToken({
      sub: "admin-01",
      email: "admin@fdr-sentinel.gov.in",
      role: Role.SYSTEM_ADMIN,
      institutionId: null,
    });

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "admin-01",
      fullName: "System Admin",
      email: "admin@fdr-sentinel.gov.in",
      role: Role.SYSTEM_ADMIN,
      institutionId: null,
      isActive: true,
    });

    (prisma.instrument.findMany as any).mockResolvedValue([]);

    const res = await request(app)
      .get("/api/instruments")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(prisma.instrument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });
});
