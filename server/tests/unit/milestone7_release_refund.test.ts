/**
 * tests/unit/milestone7_release_refund.test.ts
 *
 * Comprehensive Vitest suite for Milestone 7: Release and Refund Processing.
 *
 * All Prisma operations are mocked.  Tests cover:
 *   - Validation (valid/invalid payloads)
 *   - Authorization (unauthorized roles, institution isolation)
 *   - Instrument eligibility (status guards)
 *   - Duplicate PENDING request prevention (application-level and DB-constraint paths)
 *   - Atomic submit, decision, and confirm-refund transactions
 *   - Approval and rejection lifecycle transitions
 *   - previousInstrumentStatus restoration on rejection
 *   - Refund confirmation gate (only after APPROVED)
 *   - Refund confirmation with missing reference
 *   - Separation of refund confirmation from custody handover
 *   - Repeated / conflicting decisions (no PENDING request found)
 *
 * NOTE ON CONCURRENCY TESTING:
 *   The partial unique index (release_requests_instrumentId_pending_unique WHERE status = 'PENDING')
 *   that prevents concurrent duplicate submissions exists at the PostgreSQL database level.
 *   Unit tests that mock Prisma cannot exercise database constraints; instead, one test
 *   simulates the Prisma P2002 error that the real constraint would produce and verifies
 *   that the application handles it with a 409 Conflict rather than an unhandled 500.
 *   True concurrency safety is guaranteed by the database index itself, not by this test suite.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import {
  Role,
  InstrumentStatus,
  ReleaseRequestStatus,
  Prisma,
} from "@prisma/client";
import { signAccessToken } from "../../src/utils/jwt";

const app = createApp();

// ── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    instrument: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    releaseRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const institutionUser = {
  id: "user-inst-1",
  email: "principal@gprec.ac.in",
  fullName: "Dr. G. Pullaiah",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-1",
  isActive: true,
};

const otherInstitutionUser = {
  id: "user-inst-2",
  email: "principal@other.ac.in",
  fullName: "Dr. Other",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-2",
  isActive: true,
};

const officerUser = {
  id: "user-officer-1",
  email: "officer@aicte-india.org",
  fullName: "Shri A. K. Sharma",
  role: Role.AICTE_OFFICER,
  institutionId: null,
  isActive: true,
};

const adminUser = {
  id: "user-admin-1",
  email: "admin@aicte-india.org",
  fullName: "System Administrator",
  role: Role.SYSTEM_ADMIN,
  institutionId: null,
  isActive: true,
};

const activeInstrument = {
  id: "inst-active-1",
  instrumentNumber: "FDR-BOB-2026-802",
  institutionId: "inst-1",
  status: InstrumentStatus.ACTIVE,
};

const maturedInstrument = {
  id: "inst-matured-1",
  instrumentNumber: "FDR-BOB-2025-100",
  institutionId: "inst-1",
  status: InstrumentStatus.MATURED,
};

const releaseRequestedInstrument = {
  id: "inst-active-1",
  instrumentNumber: "FDR-BOB-2026-802",
  institutionId: "inst-1",
  status: InstrumentStatus.RELEASE_REQUESTED,
};

const releasedInstrument = {
  id: "inst-active-1",
  instrumentNumber: "FDR-BOB-2026-802",
  institutionId: "inst-1",
  status: InstrumentStatus.RELEASED,
};

const pendingReleaseRequest = {
  id: "rr-pending-1",
  instrumentId: "inst-active-1",
  previousInstrumentStatus: InstrumentStatus.ACTIVE,
  requestedById: "user-inst-1",
  reason: "Institution has fulfilled all AICTE obligations and is closing operations.",
  status: ReleaseRequestStatus.PENDING,
  decidedById: null,
  decidedAt: null,
  officerRemarks: null,
  refundReference: null,
  refundConfirmedAt: null,
  refundConfirmedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const approvedReleaseRequest = {
  ...pendingReleaseRequest,
  id: "rr-approved-1",
  status: ReleaseRequestStatus.APPROVED,
  decidedById: "user-officer-1",
  decidedAt: new Date(),
  officerRemarks: "All records verified. Release approved.",
};

// Token helpers
let instToken: string;
let otherInstToken: string;
let officerToken: string;
let adminToken: string;

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  instToken = signAccessToken({
    sub: institutionUser.id,
    email: institutionUser.email,
    role: institutionUser.role,
    institutionId: institutionUser.institutionId,
  });
  otherInstToken = signAccessToken({
    sub: otherInstitutionUser.id,
    email: otherInstitutionUser.email,
    role: otherInstitutionUser.role,
    institutionId: otherInstitutionUser.institutionId,
  });
  officerToken = signAccessToken({
    sub: officerUser.id,
    email: officerUser.email,
    role: officerUser.role,
    institutionId: undefined,
  });
  adminToken = signAccessToken({
    sub: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    institutionId: undefined,
  });

  // Default user resolution for all authenticated calls
  (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
    ({ where }: { where: { id: string } }) => {
      const users = [institutionUser, otherInstitutionUser, officerUser, adminUser];
      return Promise.resolve(users.find((u) => u.id === where.id) ?? null);
    }
  );
});

// ── A. Submit Release Request ─────────────────────────────────────────────────

describe("POST /api/instruments/:instrumentId/release — Submit Release Request", () => {
  const validPayload = {
    reason: "Institution has fulfilled all AICTE compliance obligations and is requesting security deposit release.",
  };

  // ─ Authentication ─

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .send(validPayload);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  // ─ Authorization ─

  it("returns 403 when an AICTE officer tries to submit a release request", async () => {
    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(validPayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
    expect(res.body.message).toContain("AICTE Officers are not authorized");
  });

  it("returns 404 for cross-institution access attempt (institution isolation)", async () => {
    // Instrument belongs to inst-1; caller is inst-2
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${otherInstToken}`)
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not Found");
  });

  // ─ Validation ─

  it("returns 400 when reason is missing", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation Error");
  });

  it("returns 400 when reason is too short (< 10 characters)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send({ reason: "Short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation Error");
  });

  // ─ Instrument eligibility ─

  it("returns 400 when instrument is in DRAFT status", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeInstrument,
      status: InstrumentStatus.DRAFT,
    });

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid State Transition");
    expect(res.body.message).toContain("Only ACTIVE or MATURED");
  });

  it("returns 400 when instrument is in SUBMITTED status", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeInstrument,
      status: InstrumentStatus.SUBMITTED,
    });

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid State Transition");
  });

  it("returns 400 when instrument is already in RELEASE_REQUESTED status", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      releaseRequestedInstrument
    );

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid State Transition");
  });

  // ─ Duplicate prevention (application-level) ─

  it("returns 409 when a PENDING release request already exists (application-level check)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(pendingReleaseRequest);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Conflict");
    expect(res.body.message).toContain("pending release request already exists");
  });

  // ─ Concurrent duplicate (DB partial unique index path) ─
  //
  // NOTE: This test simulates a race condition where two requests pass the
  // application-level check simultaneously, and the second one is caught by
  // the database-level partial unique index (P2002).  Since Prisma is mocked,
  // the constraint itself is not exercised — the test verifies that the route
  // handles the resulting P2002 error gracefully with a 409 rather than 500.

  it("returns 409 gracefully when the DB partial unique index fires a P2002 on concurrent submission", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null); // passes pre-check

    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`instrumentId`)",
      { code: "P2002", clientVersion: "6.19.3", meta: { target: ["instrumentId"] } }
    );

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(p2002Error);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Conflict");
    expect(res.body.message).toContain("concurrent submission detected");
  });

  // ─ Successful submissions ─

  it("atomically creates PENDING release request, transitions instrument to RELEASE_REQUESTED, and writes audit event (ACTIVE source)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const createdRequest = {
      ...pendingReleaseRequest,
      previousInstrumentStatus: InstrumentStatus.ACTIVE,
    };

    let instrumentUpdatedToReleaseRequested = false;

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: {
            create: vi.fn().mockResolvedValue(createdRequest),
          },
          instrument: {
            update: vi.fn().mockImplementation(({ data }: { data: { status: InstrumentStatus } }) => {
              if (data.status === InstrumentStatus.RELEASE_REQUESTED) {
                instrumentUpdatedToReleaseRequested = true;
              }
              return { ...releaseRequestedInstrument };
            }),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-1" }),
          },
        };
        return callback(tx);
      }
    );

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toContain("Release request submitted successfully");
    expect(res.body.releaseRequest.status).toBe("PENDING");
    expect(res.body.releaseRequest.previousInstrumentStatus).toBe(InstrumentStatus.ACTIVE);
    expect(instrumentUpdatedToReleaseRequested).toBe(true);
  });

  it("correctly captures MATURED as previousInstrumentStatus when requesting release for a matured instrument", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(maturedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const createdRequest = {
      ...pendingReleaseRequest,
      instrumentId: maturedInstrument.id,
      previousInstrumentStatus: InstrumentStatus.MATURED,
    };

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: { create: vi.fn().mockResolvedValue(createdRequest) },
          instrument: { update: vi.fn().mockResolvedValue({ ...maturedInstrument, status: InstrumentStatus.RELEASE_REQUESTED }) },
          auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-2" }) },
        };
        return callback(tx);
      }
    );

    const res = await request(app)
      .post(`/api/instruments/${maturedInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.releaseRequest.previousInstrumentStatus).toBe(InstrumentStatus.MATURED);
  });

  it("system admin can submit a release request", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const createdRequest = { ...pendingReleaseRequest };

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: { create: vi.fn().mockResolvedValue(createdRequest) },
          instrument: { update: vi.fn().mockResolvedValue(releaseRequestedInstrument) },
          auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-3" }) },
        };
        return callback(tx);
      }
    );

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validPayload);

    expect(res.status).toBe(201);
  });
});

// ── B. List Release Requests ──────────────────────────────────────────────────

describe("GET /api/instruments/:instrumentId/release — List Release Requests", () => {
  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app).get(`/api/instruments/${activeInstrument.id}/release`);

    expect(res.status).toBe(401);
  });

  it("returns 404 for cross-institution read attempt (institution isolation)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);

    const res = await request(app)
      .get(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${otherInstToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not Found");
  });

  it("returns 200 with release request list for institution user (own institution)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);
    (prisma.releaseRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...pendingReleaseRequest, requestedBy: { id: "user-inst-1", fullName: "Dr. G. Pullaiah", email: "principal@gprec.ac.in", role: "INSTITUTION_USER" }, decidedBy: null, refundConfirmedBy: null },
    ]);

    const res = await request(app)
      .get(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`);

    expect(res.status).toBe(200);
    expect(res.body.releaseRequests).toHaveLength(1);
    expect(res.body.releaseRequests[0].status).toBe("PENDING");
    expect(res.body.instrumentNumber).toBe(activeInstrument.instrumentNumber);
  });

  it("returns 200 with empty array when no release requests exist", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);
    (prisma.releaseRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${instToken}`);

    expect(res.status).toBe(200);
    expect(res.body.releaseRequests).toHaveLength(0);
  });

  it("officer can list release requests for any institution instrument", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);
    (prisma.releaseRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/instruments/${activeInstrument.id}/release`)
      .set("Authorization", `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
  });
});

// ── C. Officer Release Decision ───────────────────────────────────────────────

describe("POST /api/instruments/:instrumentId/release/decision — Officer Decision", () => {
  const approvePayload = {
    decision: "APPROVE",
    remarks: "All compliance records verified. Security deposit release approved.",
  };

  const rejectPayload = {
    decision: "REJECT",
    remarks: "Outstanding fee dues detected. Release denied pending clearance.",
  };

  // ─ Authentication and Authorization ─

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .send(approvePayload);

    expect(res.status).toBe(401);
  });

  it("returns 403 when institution user attempts a release decision", async () => {
    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(approvePayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  // ─ Validation ─

  it("returns 400 when decision field is missing", async () => {
    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ remarks: "Some remarks here." });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation Error");
  });

  it("returns 400 when remarks are too short", async () => {
    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ decision: "APPROVE", remarks: "OK" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation Error");
  });

  it("returns 400 for an unsupported decision value", async () => {
    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ decision: "REQUEST_CORRECTION", remarks: "Please fix the documents." });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation Error");
  });

  // ─ Instrument status guard ─

  it("returns 400 when instrument is ACTIVE (not RELEASE_REQUESTED)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(approvePayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid State Transition");
    expect(res.body.message).toContain("RELEASE_REQUESTED");
  });

  // ─ No PENDING request found (already decided) ─

  it("returns 404 when there is no PENDING release request (e.g. already decided — prevents repeated decisions)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releaseRequestedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(approvePayload);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not Found");
    expect(res.body.message).toContain("No pending release request");
  });

  // ─ Approval ─

  it("approval atomically transitions instrument to RELEASED, marks request APPROVED, and records RELEASE_APPROVED audit event", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releaseRequestedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: pendingReleaseRequest.id,
      previousInstrumentStatus: InstrumentStatus.ACTIVE,
    });

    let requestUpdatedToApproved = false;
    let instrumentUpdatedToReleased = false;
    let auditActionCorrect = false;

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: {
            update: vi.fn().mockImplementation(({ data }: { data: { status: ReleaseRequestStatus } }) => {
              if (data.status === ReleaseRequestStatus.APPROVED) requestUpdatedToApproved = true;
              return { ...approvedReleaseRequest };
            }),
          },
          instrument: {
            update: vi.fn().mockImplementation(({ data }: { data: { status: InstrumentStatus } }) => {
              if (data.status === InstrumentStatus.RELEASED) instrumentUpdatedToReleased = true;
              return { ...releasedInstrument };
            }),
          },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: { data: { action: string } }) => {
              if (data.action === "RELEASE_APPROVED") auditActionCorrect = true;
              return { id: "audit-approve-1" };
            }),
          },
        };
        return callback(tx);
      }
    );

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(approvePayload);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("approved successfully");
    expect(res.body.releaseRequest.status).toBe(ReleaseRequestStatus.APPROVED);
    expect(res.body.instrument.status).toBe(InstrumentStatus.RELEASED);
    expect(requestUpdatedToApproved).toBe(true);
    expect(instrumentUpdatedToReleased).toBe(true);
    expect(auditActionCorrect).toBe(true);
  });

  // ─ Rejection — restores previousInstrumentStatus ─

  it("rejection restores ACTIVE as instrument status when previousInstrumentStatus was ACTIVE", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releaseRequestedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: pendingReleaseRequest.id,
      previousInstrumentStatus: InstrumentStatus.ACTIVE,  // snapshot from submission time
    });

    let restoredStatus: InstrumentStatus | null = null;
    let requestUpdatedToRejected = false;
    let auditActionCorrect = false;

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: {
            update: vi.fn().mockImplementation(({ data }: { data: { status: ReleaseRequestStatus } }) => {
              if (data.status === ReleaseRequestStatus.REJECTED) requestUpdatedToRejected = true;
              return { ...pendingReleaseRequest, status: ReleaseRequestStatus.REJECTED };
            }),
          },
          instrument: {
            update: vi.fn().mockImplementation(({ data }: { data: { status: InstrumentStatus } }) => {
              restoredStatus = data.status;
              return { ...activeInstrument, status: data.status };
            }),
          },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: { data: { action: string } }) => {
              if (data.action === "RELEASE_REJECTED") auditActionCorrect = true;
              return { id: "audit-reject-1" };
            }),
          },
        };
        return callback(tx);
      }
    );

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(rejectPayload);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("rejected successfully");
    expect(restoredStatus).toBe(InstrumentStatus.ACTIVE);
    expect(requestUpdatedToRejected).toBe(true);
    expect(auditActionCorrect).toBe(true);
  });

  it("rejection restores MATURED as instrument status when previousInstrumentStatus was MATURED", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releaseRequestedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: pendingReleaseRequest.id,
      previousInstrumentStatus: InstrumentStatus.MATURED,  // was matured before request
    });

    let restoredStatus: InstrumentStatus | null = null;

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: { update: vi.fn().mockResolvedValue({ status: ReleaseRequestStatus.REJECTED }) },
          instrument: {
            update: vi.fn().mockImplementation(({ data }: { data: { status: InstrumentStatus } }) => {
              restoredStatus = data.status;
              return { status: data.status };
            }),
          },
          auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-4" }) },
        };
        return callback(tx);
      }
    );

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(rejectPayload);

    expect(res.status).toBe(200);
    expect(restoredStatus).toBe(InstrumentStatus.MATURED);
  });

  // ─ Audit metadata ─

  it("approval audit event metadata explicitly states regulatory-only intent (not custody handover)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releaseRequestedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: pendingReleaseRequest.id,
      previousInstrumentStatus: InstrumentStatus.ACTIVE,
    });

    let capturedAuditMetadata: Record<string, unknown> | null = null;

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: { update: vi.fn().mockResolvedValue(approvedReleaseRequest) },
          instrument: { update: vi.fn().mockResolvedValue(releasedInstrument) },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: { data: { metadata: Record<string, unknown> } }) => {
              capturedAuditMetadata = data.metadata as Record<string, unknown>;
              return { id: "audit-5" };
            }),
          },
        };
        return callback(tx);
      }
    );

    await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/decision`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(approvePayload);

    expect(capturedAuditMetadata).not.toBeNull();
    // The route explicitly adds a note that approval is regulatory only
    expect(capturedAuditMetadata!["note"]).toContain("Regulatory approval");
    expect(capturedAuditMetadata!["note"]).toContain("Physical custody handover");
  });
});

// ── D. Confirm Refund ─────────────────────────────────────────────────────────

describe("POST /api/instruments/:instrumentId/release/confirm-refund — Confirm Refund", () => {
  const validRefundPayload = {
    refundReference: "NEFT/UTR-2026-ABC-123456",
  };

  // ─ Authentication and Authorization ─

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app)
      .post(`/api/instruments/${releasedInstrument.id}/release/confirm-refund`)
      .send(validRefundPayload);

    expect(res.status).toBe(401);
  });

  it("returns 403 when institution user attempts to confirm refund", async () => {
    const res = await request(app)
      .post(`/api/instruments/${releasedInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${instToken}`)
      .send(validRefundPayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  // ─ Validation ─

  it("returns 400 when refundReference is missing", async () => {
    const res = await request(app)
      .post(`/api/instruments/${releasedInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation Error");
  });

  it("returns 400 when refundReference is empty string", async () => {
    const res = await request(app)
      .post(`/api/instruments/${releasedInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ refundReference: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation Error");
  });

  // ─ State gates ─

  it("returns 400 when instrument is RELEASE_REQUESTED (approval not yet done)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releaseRequestedInstrument);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(validRefundPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid State Transition");
    expect(res.body.message).toContain("release request must be approved first");
  });

  it("returns 400 when instrument is ACTIVE (refund cannot be confirmed before release)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeInstrument);

    const res = await request(app)
      .post(`/api/instruments/${activeInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(validRefundPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid State Transition");
  });

  it("returns 404 when instrument is RELEASED but no APPROVED release request exists (data inconsistency path)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releasedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/instruments/${releasedInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(validRefundPayload);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not Found");
    expect(res.body.message).toContain("No approved release request found");
  });

  // ─ Successful refund confirmation ─

  it("successfully transitions APPROVED request to REFUND_CONFIRMED, recording reference and timestamps", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releasedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: approvedReleaseRequest.id,
    });

    let capturedRefundReference: string | null = null;
    let capturedStatus: ReleaseRequestStatus | null = null;

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: {
            update: vi.fn().mockImplementation(({ data }: { data: { status: ReleaseRequestStatus; refundReference: string } }) => {
              capturedStatus = data.status;
              capturedRefundReference = data.refundReference;
              return {
                ...approvedReleaseRequest,
                status: ReleaseRequestStatus.REFUND_CONFIRMED,
                refundReference: data.refundReference,
                refundConfirmedById: "user-officer-1",
                refundConfirmedAt: new Date(),
              };
            }),
          },
          auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-refund-1" }) },
        };
        return callback(tx);
      }
    );

    const res = await request(app)
      .post(`/api/instruments/${releasedInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(validRefundPayload);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("Refund confirmed successfully");
    expect(capturedStatus).toBe(ReleaseRequestStatus.REFUND_CONFIRMED);
    expect(capturedRefundReference).toBe(validRefundPayload.refundReference);
  });

  // ─ Separation from custody handover ─

  it("does NOT update instrument status or custody fields during refund confirmation (instrument remains RELEASED)", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releasedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: approvedReleaseRequest.id,
    });

    let instrumentUpdateCalled = false;

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: {
            update: vi.fn().mockResolvedValue({
              ...approvedReleaseRequest,
              status: ReleaseRequestStatus.REFUND_CONFIRMED,
            }),
          },
          instrument: {
            // This should never be called during refund confirmation
            update: vi.fn().mockImplementation(() => {
              instrumentUpdateCalled = true;
              return releasedInstrument;
            }),
          },
          auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-6" }) },
        };
        return callback(tx);
      }
    );

    const res = await request(app)
      .post(`/api/instruments/${releasedInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(validRefundPayload);

    expect(res.status).toBe(200);
    // The route must NOT call instrument.update — physical custody is separate
    expect(instrumentUpdateCalled).toBe(false);
  });

  it("refund confirmation audit event mentions custody handover as a separate action", async () => {
    (prisma.instrument.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(releasedInstrument);
    (prisma.releaseRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: approvedReleaseRequest.id,
    });

    let capturedAuditMetadata: Record<string, unknown> | null = null;

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          releaseRequest: { update: vi.fn().mockResolvedValue({ status: ReleaseRequestStatus.REFUND_CONFIRMED }) },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: { data: { metadata: Record<string, unknown> } }) => {
              capturedAuditMetadata = data.metadata as Record<string, unknown>;
              return { id: "audit-7" };
            }),
          },
        };
        return callback(tx);
      }
    );

    await request(app)
      .post(`/api/instruments/${releasedInstrument.id}/release/confirm-refund`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send(validRefundPayload);

    expect(capturedAuditMetadata).not.toBeNull();
    // The route's audit metadata explicitly references the custody endpoint
    expect(capturedAuditMetadata!["note"]).toContain("Physical custody handover");
    expect(capturedAuditMetadata!["note"]).toContain("ORIGINAL_RELEASED");
  });
});
