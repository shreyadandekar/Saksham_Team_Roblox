/**
 * server/tests/unit/milestone5_monitoring_dashboard.test.ts
 * Integration tests for Scheduled Monitoring, Idempotency, and Real Database Dashboard.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { signAccessToken } from "../../src/utils/jwt";
import { Role, InstrumentStatus } from "@prisma/client";
import { runMaturityMonitoringJob } from "../../src/services/maturityJob";

// Mock Prisma
vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    instrument: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    maturityAlert: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    jobRun: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    custodyEvent: { findMany: vi.fn() },
    auditEvent: { create: vi.fn() },
  },
}));

const instUser = {
  id: "user-inst-01",
  email: "inst@delhi.ac.in",
  fullName: "Prof. Delhi",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-delhi-01",
  isActive: true,
};

const officerUser = {
  id: "officer-01",
  email: "officer@aicte.gov.in",
  fullName: "Officer Sharma",
  role: Role.AICTE_OFFICER,
  institutionId: null,
  isActive: true,
};

const adminUser = {
  id: "admin-01",
  email: "admin@aicte.gov.in",
  fullName: "Admin Patel",
  role: Role.SYSTEM_ADMIN,
  institutionId: null,
  isActive: true,
};

function bearerToken(user: { id: string; email: string; role: Role; institutionId: string | null }): string {
  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    institutionId: user.institutionId ?? undefined,
  });
  return `Bearer ${token}`;
}

describe("Milestone 5 — Scheduled Monitoring & Idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes eligible instruments, upserts alerts idempotently, and logs JobRun", async () => {
    const mockInstruments = [
      {
        id: "inst-1",
        instrumentNumber: "FDR-DELHI-001",
        status: InstrumentStatus.ACTIVE,
        maturityDate: new Date("2026-11-02T05:00:00Z"), // ~10 days away (+35)
        issueDate: new Date("2025-11-02T05:00:00Z"),
        documents: [{ id: "doc-1" }],
        institution: { id: "inst-delhi-01", code: "INST-DELHI-001", name: "Delhi Engg" },
      },
      {
        id: "inst-2",
        instrumentNumber: "FDR-DELHI-002",
        status: InstrumentStatus.UNDER_SCRUTINY,
        maturityDate: new Date("2027-05-01T05:00:00Z"), // >90 days (no alert window)
        issueDate: new Date("2026-05-01T05:00:00Z"),
        documents: [],
        institution: { id: "inst-delhi-01", code: "INST-DELHI-001", name: "Delhi Engg" },
      },
    ];

    vi.mocked(prisma.jobRun.create).mockResolvedValue({ id: "job-run-01" } as any);
    vi.mocked(prisma.jobRun.update).mockResolvedValue({ id: "job-run-01" } as any);
    vi.mocked(prisma.instrument.findMany).mockResolvedValue(mockInstruments as any);
    vi.mocked(prisma.maturityAlert.upsert).mockResolvedValue({ id: "alert-01" } as any);

    const refDate = new Date("2026-10-23T05:00:00Z");
    const result = await runMaturityMonitoringJob({ referenceDate: refDate });

    expect(result.status).toBe("COMPLETED");
    expect(result.recordsProcessed).toBe(2);
    expect(result.alertsCreated).toBe(1); // Only inst-1 is within a reminder window
    expect(result.recordsFailed).toBe(0);

    // Verify upsert was used with compound key for idempotency
    expect(prisma.maturityAlert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instrumentId_alertType_window: {
            instrumentId: "inst-1",
            alertType: "MATURITY_REMINDER",
            window: "15_DAYS",
          },
        },
      })
    );

    // Verify JobRun completed update
    expect(prisma.jobRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-run-01" },
        data: expect.objectContaining({
          status: "COMPLETED",
          recordsProcessed: 2,
          alertsCreated: 1,
        }),
      })
    );
  });

  it("records partial failure accurately without halting the overall monitoring run", async () => {
    const mockInstruments = [
      {
        id: "inst-bad",
        instrumentNumber: "FDR-BAD",
        status: InstrumentStatus.ACTIVE,
        maturityDate: "invalid-date", // triggers calculation exception
        issueDate: new Date(),
        documents: [],
        institution: { id: "inst-01", code: "CODE", name: "NAME" },
      },
      {
        id: "inst-good",
        instrumentNumber: "FDR-GOOD",
        status: InstrumentStatus.ACTIVE,
        maturityDate: new Date("2026-10-20T05:00:00Z"), // Matured
        issueDate: new Date(),
        documents: [],
        institution: { id: "inst-01", code: "CODE", name: "NAME" },
      },
    ];

    vi.mocked(prisma.jobRun.create).mockResolvedValue({ id: "job-run-02" } as any);
    vi.mocked(prisma.jobRun.update).mockResolvedValue({ id: "job-run-02" } as any);
    vi.mocked(prisma.instrument.findMany).mockResolvedValue(mockInstruments as any);
    vi.mocked(prisma.maturityAlert.upsert).mockResolvedValue({ id: "alert-02" } as any);

    const refDate = new Date("2026-10-23T05:00:00Z");
    const result = await runMaturityMonitoringJob({ referenceDate: refDate });

    expect(result.status).toBe("PARTIAL_SUCCESS");
    expect(result.recordsProcessed).toBe(2);
    expect(result.recordsFailed).toBe(1);
    expect(result.alertsCreated).toBe(1);
    expect(result.errorSummary).toContain("inst-bad");
  });
});

describe("Milestone 5 — Monitoring & Dashboard API Endpoints", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/monitoring/run-job allows SYSTEM_ADMIN to trigger job manually", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any);
    vi.mocked(prisma.jobRun.create).mockResolvedValue({ id: "job-manual-01" } as any);
    vi.mocked(prisma.jobRun.update).mockResolvedValue({ id: "job-manual-01" } as any);
    vi.mocked(prisma.instrument.findMany).mockResolvedValue([]);

    const res = await request(app)
      .post("/api/monitoring/run-job")
      .set("Authorization", bearerToken(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Maturity monitoring job executed successfully.");
    expect(res.body.result).toBeDefined();
  });

  it("POST /api/monitoring/run-job rejects non-admin users with 403 Forbidden", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(officerUser as any);

    const res = await request(app)
      .post("/api/monitoring/run-job")
      .set("Authorization", bearerToken(officerUser));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("GET /api/dashboard/metrics returns real database counts and Attention Priority distribution", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(officerUser as any);

    const mockInstruments = [
      {
        id: "inst-1",
        instrumentNumber: "FDR-DELHI-001",
        bankName: "State Bank of India",
        amount: 500000,
        status: InstrumentStatus.ACTIVE,
        maturityDate: new Date("2026-10-20T05:00:00Z"), // Matured (+40) + Missing docs (+10) = 50 (HIGH)
        issueDate: new Date("2025-10-20T05:00:00Z"),
        documents: [],
        institution: { id: "inst-delhi-01", code: "INST-DELHI-001", name: "Delhi Engg" },
      },
      {
        id: "inst-2",
        instrumentNumber: "FDR-PUNE-001",
        bankName: "Bank of Baroda",
        amount: 800000,
        status: InstrumentStatus.UNDER_SCRUTINY,
        maturityDate: new Date("2027-10-20T05:00:00Z"), // >90d (0) + 1 doc (0) = 0 (LOW)
        issueDate: new Date("2026-10-20T05:00:00Z"),
        documents: [{ id: "doc-1" }],
        institution: { id: "inst-pune-01", code: "INST-PUNE-001", name: "Pune College" },
      },
    ];

    vi.mocked(prisma.instrument.findMany).mockResolvedValue(mockInstruments as any);

    const res = await request(app)
      .get("/api/dashboard/metrics")
      .set("Authorization", bearerToken(officerUser));

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalInstruments).toBe(2);
    expect(res.body.metrics.activeInstruments).toBe(1);
    expect(res.body.metrics.underScrutinyCount).toBe(1);
    expect(res.body.priorityDistribution).toBeDefined();
    expect(res.body.priorityDistribution.HIGH).toBe(1);
    expect(res.body.priorityDistribution.LOW).toBe(1);
    expect(res.body.topPriorityInstruments).toHaveLength(2);
    expect(res.body.topPriorityInstruments[0].instrumentNumber).toBe("FDR-DELHI-001");
    expect(res.body.topPriorityInstruments[0].attention).toBeDefined();
    expect(res.body.topPriorityInstruments[0].attention.priorityBand).toBe("HIGH");
    expect(res.body.counts).toBeDefined();
    expect(res.body.counts.total).toBe(2);
    expect(res.body.priorityDistribution.high).toBe(1);
  });

  it("GET /api/dashboard/metrics enforces institution isolation for institution users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
    vi.mocked(prisma.instrument.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get("/api/dashboard/metrics")
      .set("Authorization", bearerToken(instUser));

    expect(res.status).toBe(200);
    // Verify query was filtered strictly by user.institutionId
    expect(prisma.instrument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { institutionId: "inst-delhi-01" },
      })
    );
  });
});
