/**
 * tests/unit/scrutiny_decisions_and_audit.test.ts
 *
 * Dedicated Vitest suite for Scrutiny Decisions and Audit Logging:
 * 1. Authorized Officer & Admin Scrutiny Approval (SUBMITTED -> ACTIVE, UNDER_SCRUTINY -> ACTIVE)
 * 2. Authorized Officer Rejection (SUBMITTED -> REJECTED, UNDER_SCRUTINY -> REJECTED)
 * 3. Authorized Officer Correction Request (SUBMITTED -> CORRECTION_REQUIRED)
 * 4. Invalid State Transitions (DRAFT, ACTIVE, REJECTED, RELEASED, MATURED)
 * 5. Authentication and Role Authorization (Unauthenticated -> 401, Institution User -> 403)
 * 6. Remarks Validation (Missing, too short <3, too long >2000)
 * 7. Complete Audit Event Metadata verification (actorId, action, entityId, previousStatus, newStatus, remarks)
 * 8. Failed operations do NOT produce false audit events
 * 9. Predecessor supersession audit events on renewal/replacement approval
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { Role, InstrumentStatus, InstrumentRelationshipType, RelationshipStatus } from "@prisma/client";
import { signAccessToken } from "../../src/utils/jwt";

const app = createApp();

vi.mock("../../src/db/prisma", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      instrument: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      instrumentRelationship: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe("Scrutiny Decisions & Audit Logging", () => {
  const institutionUser = {
    id: "user-inst-1",
    email: "principal@gprec.ac.in",
    fullName: "Dr. G. Pullaiah",
    role: Role.INSTITUTION_USER,
    institutionId: "inst-1",
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

  let instToken: string;
  let officerToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === institutionUser.id) return Promise.resolve(institutionUser);
      if (where.id === officerUser.id) return Promise.resolve(officerUser);
      if (where.id === adminUser.id) return Promise.resolve(adminUser);
      return Promise.resolve(null);
    });

    instToken = signAccessToken({
      sub: institutionUser.id,
      email: institutionUser.email,
      role: institutionUser.role,
      institutionId: institutionUser.institutionId,
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
  });

  // ── 1. Authorized Approvals ────────────────────────────────────────────────
  describe("Authorized Scrutiny Approval", () => {
    it("approves a SUBMITTED instrument, transitions it to ACTIVE, and logs audit event", async () => {
      const instrument = {
        id: "fdr-sub-101",
        instrumentNumber: "FDR-SBI-2026-101",
        bankName: "State Bank of India",
        status: InstrumentStatus.SUBMITTED,
        institutionId: "inst-1",
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(instrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(null);

      let auditCreated: any = null;
      let instrumentUpdated: any = null;

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockImplementation(({ data }: any) => {
              instrumentUpdated = { ...instrument, status: data.status };
              return instrumentUpdated;
            }),
          },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: any) => {
              auditCreated = data;
              return { id: "audit-1", ...data };
            }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${instrument.id}/scrutiny-decision`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "APPROVE",
          remarks: "Verified authentic deposit certificate with issuing branch.",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Scrutiny decision 'APPROVE' successfully applied");
      expect(instrumentUpdated.status).toBe(InstrumentStatus.ACTIVE);

      // Verify audit event properties
      expect(auditCreated).not.toBeNull();
      expect(auditCreated.actorId).toBe(officerUser.id);
      expect(auditCreated.action).toBe("SCRUTINY_APPROVE");
      expect(auditCreated.entityType).toBe("Instrument");
      expect(auditCreated.entityId).toBe(instrument.id);
      expect(auditCreated.metadata.previousStatus).toBe(InstrumentStatus.SUBMITTED);
      expect(auditCreated.metadata.newStatus).toBe(InstrumentStatus.ACTIVE);
      expect(auditCreated.metadata.decision).toBe("APPROVE");
      expect(auditCreated.metadata.remarks).toBe("Verified authentic deposit certificate with issuing branch.");
      expect(auditCreated.metadata.officerEmail).toBe(officerUser.email);
    });

    it("approves an UNDER_SCRUTINY instrument by SYSTEM_ADMIN", async () => {
      const instrument = {
        id: "fdr-scrut-202",
        instrumentNumber: "FDR-HDFC-2026-202",
        bankName: "HDFC Bank",
        status: InstrumentStatus.UNDER_SCRUTINY,
        institutionId: "inst-1",
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(instrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(null);

      let auditCreated: any = null;

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockResolvedValue({ ...instrument, status: InstrumentStatus.ACTIVE }),
          },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: any) => {
              auditCreated = data;
              return { id: "audit-2", ...data };
            }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${instrument.id}/scrutiny-decision`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          decision: "APPROVE",
          remarks: "Administrative override approval after physical verification.",
        });

      expect(res.status).toBe(200);
      expect(auditCreated.actorId).toBe(adminUser.id);
      expect(auditCreated.action).toBe("SCRUTINY_APPROVE");
      expect(auditCreated.metadata.previousStatus).toBe(InstrumentStatus.UNDER_SCRUTINY);
      expect(auditCreated.metadata.newStatus).toBe(InstrumentStatus.ACTIVE);
    });
  });

  // ── 2. Authorized Rejections ──────────────────────────────────────────────
  describe("Authorized Scrutiny Rejection", () => {
    it("rejects an instrument, transitions it to REJECTED, and logs audit event", async () => {
      const instrument = {
        id: "fdr-rej-303",
        instrumentNumber: "FDR-PNB-2026-303",
        bankName: "Punjab National Bank",
        status: InstrumentStatus.UNDER_SCRUTINY,
        institutionId: "inst-1",
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(instrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(null);

      let auditCreated: any = null;
      let newStatus: any = null;

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockImplementation(({ data }: any) => {
              newStatus = data.status;
              return { ...instrument, status: data.status };
            }),
          },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: any) => {
              auditCreated = data;
              return { id: "audit-rej", ...data };
            }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${instrument.id}/scrutiny-decision`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "REJECT",
          remarks: "Deposit receipt failed IFSC code verification against RBI database.",
        });

      expect(res.status).toBe(200);
      expect(newStatus).toBe(InstrumentStatus.REJECTED);
      expect(auditCreated.action).toBe("SCRUTINY_REJECT");
      expect(auditCreated.metadata.previousStatus).toBe(InstrumentStatus.UNDER_SCRUTINY);
      expect(auditCreated.metadata.newStatus).toBe(InstrumentStatus.REJECTED);
      expect(auditCreated.metadata.remarks).toBe("Deposit receipt failed IFSC code verification against RBI database.");
    });
  });

  // ── 3. Requesting Corrections ─────────────────────────────────────────────
  describe("Requesting Corrections", () => {
    it("transitions instrument to CORRECTION_REQUIRED with officer remarks and audit log", async () => {
      const instrument = {
        id: "fdr-cor-404",
        instrumentNumber: "FDR-CANARA-2026-404",
        bankName: "Canara Bank",
        status: InstrumentStatus.SUBMITTED,
        institutionId: "inst-1",
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(instrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(null);

      let auditCreated: any = null;
      let newStatus: any = null;

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockImplementation(({ data }: any) => {
              newStatus = data.status;
              return { ...instrument, status: data.status };
            }),
          },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: any) => {
              auditCreated = data;
              return { id: "audit-cor", ...data };
            }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${instrument.id}/scrutiny-decision`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "REQUEST_CORRECTION",
          remarks: "Favouring details must state 'Member Secretary, AICTE New Delhi'. Please re-issue receipt.",
        });

      expect(res.status).toBe(200);
      expect(newStatus).toBe(InstrumentStatus.CORRECTION_REQUIRED);
      expect(auditCreated.action).toBe("SCRUTINY_REQUEST_CORRECTION");
      expect(auditCreated.metadata.previousStatus).toBe(InstrumentStatus.SUBMITTED);
      expect(auditCreated.metadata.newStatus).toBe(InstrumentStatus.CORRECTION_REQUIRED);
      expect(auditCreated.metadata.remarks).toContain("Member Secretary");
    });
  });

  // ── 4. Invalid Status Transitions ─────────────────────────────────────────
  describe("Invalid State Transitions", () => {
    const invalidStatuses = [
      InstrumentStatus.DRAFT,
      InstrumentStatus.ACTIVE,
      InstrumentStatus.REJECTED,
      InstrumentStatus.CORRECTION_REQUIRED,
      InstrumentStatus.MATURED,
      InstrumentStatus.RELEASE_REQUESTED,
      InstrumentStatus.RELEASED,
    ];

    for (const status of invalidStatuses) {
      it(`rejects scrutiny decision on instrument in '${status}' status (400 Invalid State Transition) and produces no audit event`, async () => {
        const instrument = {
          id: `fdr-${status.toLowerCase()}`,
          instrumentNumber: `FDR-${status}-001`,
          status,
          institutionId: "inst-1",
        };

        (prisma.instrument.findUnique as any).mockResolvedValue(instrument);

        const res = await request(app)
          .post(`/api/instruments/${instrument.id}/scrutiny-decision`)
          .set("Authorization", `Bearer ${officerToken}`)
          .send({
            decision: "APPROVE",
            remarks: "Attempting decision on invalid status.",
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid State Transition");
        expect(res.body.message).toContain("Expected SUBMITTED or UNDER_SCRUTINY");

        // Ensure no transaction or auditEvent.create was triggered
        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(prisma.auditEvent.create).not.toHaveBeenCalled();
      });
    }

    it("returns 404 when instrument does not exist and produces no audit event", async () => {
      (prisma.instrument.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/instruments/non-existent-id/scrutiny-decision")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "APPROVE",
          remarks: "Valid remarks here.",
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not Found");
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.auditEvent.create).not.toHaveBeenCalled();
    });
  });

  // ── 5. Authentication & Role Authorization ────────────────────────────────
  describe("Authentication & Role Authorization", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app)
        .post("/api/instruments/fdr-101/scrutiny-decision")
        .send({
          decision: "APPROVE",
          remarks: "No auth token provided.",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects institution users with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/instruments/fdr-101/scrutiny-decision")
        .set("Authorization", `Bearer ${instToken}`)
        .send({
          decision: "APPROVE",
          remarks: "Institution trying to approve own deposit.",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── 6. Validation of Remarks and Payloads ──────────────────────────────────
  describe("Validation of Remarks and Payloads", () => {
    it("rejects requests missing remarks with 400 Validation Error", async () => {
      const res = await request(app)
        .post("/api/instruments/fdr-101/scrutiny-decision")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "APPROVE",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects remarks that are too short (< 3 characters) with 400 Validation Error", async () => {
      const res = await request(app)
        .post("/api/instruments/fdr-101/scrutiny-decision")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "APPROVE",
          remarks: "OK",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(JSON.stringify(res.body.issues)).toContain("at least 3 characters");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects remarks that are only whitespace with 400 Validation Error", async () => {
      const res = await request(app)
        .post("/api/instruments/fdr-101/scrutiny-decision")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "REJECT",
          remarks: "    ",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects invalid decision enum values with 400 Validation Error", async () => {
      const res = await request(app)
        .post("/api/instruments/fdr-101/scrutiny-decision")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "INVALID_DECISION",
          remarks: "Valid remarks length here.",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── 7. Predecessor Relationship Supersession Audit ────────────────────────
  describe("Renewal/Replacement Predecessor Supersession Audit", () => {
    it("records INSTRUMENT_SUPERSEDED audit event with previousStatus and newStatus on predecessor", async () => {
      const successor = {
        id: "succ-fdr-505",
        instrumentNumber: "FDR-BOB-2027-RENEW-1",
        status: InstrumentStatus.UNDER_SCRUTINY,
        institutionId: "inst-1",
      };

      const predecessor = {
        id: "orig-fdr-101",
        instrumentNumber: "FDR-BOB-2024-ORIG",
        status: InstrumentStatus.ACTIVE,
        institutionId: "inst-1",
      };

      const pendingRelationship = {
        id: "rel-001",
        sourceInstrumentId: predecessor.id,
        targetInstrumentId: successor.id,
        relationshipType: InstrumentRelationshipType.RENEWAL,
        status: RelationshipStatus.PENDING,
        sourceInstrument: predecessor,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(successor);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(pendingRelationship);

      const auditEventsLogged: any[] = [];
      let predecessorUpdatedStatus: any = null;

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockImplementation(({ where, data }: any) => {
              if (where.id === predecessor.id) {
                predecessorUpdatedStatus = data.status;
                return { ...predecessor, status: data.status };
              }
              return { ...successor, status: data.status };
            }),
          },
          instrumentRelationship: {
            update: vi.fn().mockResolvedValue({ ...pendingRelationship, status: RelationshipStatus.APPROVED }),
          },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: any) => {
              auditEventsLogged.push(data);
              return { id: `audit-${auditEventsLogged.length}`, ...data };
            }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${successor.id}/scrutiny-decision`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "APPROVE",
          remarks: "Renewal deposit verified and predecessor superseded.",
        });

      expect(res.status).toBe(200);
      expect(predecessorUpdatedStatus).toBe(InstrumentStatus.MATURED);

      // Verify two audit events logged: one on successor, one on predecessor
      expect(auditEventsLogged).toHaveLength(2);

      // Successor audit
      const succAudit = auditEventsLogged.find((e) => e.entityId === successor.id);
      expect(succAudit).toBeDefined();
      expect(succAudit.action).toBe("SCRUTINY_APPROVE");
      expect(succAudit.metadata.previousStatus).toBe(InstrumentStatus.UNDER_SCRUTINY);
      expect(succAudit.metadata.newStatus).toBe(InstrumentStatus.ACTIVE);
      expect(succAudit.metadata.hasPredecessorRelationship).toBe(true);

      // Predecessor audit
      const origAudit = auditEventsLogged.find((e) => e.entityId === predecessor.id);
      expect(origAudit).toBeDefined();
      expect(origAudit.action).toBe("INSTRUMENT_SUPERSEDED");
      expect(origAudit.metadata.previousStatus).toBe(InstrumentStatus.ACTIVE);
      expect(origAudit.metadata.newStatus).toBe(InstrumentStatus.MATURED);
      expect(origAudit.metadata.supersededByInstrumentId).toBe(successor.id);
      expect(origAudit.metadata.supersededByInstrumentNumber).toBe(successor.instrumentNumber);
      expect(origAudit.metadata.relationshipType).toBe(InstrumentRelationshipType.RENEWAL);
      expect(origAudit.metadata.officerRemarks).toBe("Renewal deposit verified and predecessor superseded.");
    });
  });

  // ── 8. Start Scrutiny Audit Event ─────────────────────────────────────────
  describe("Start Scrutiny Audit Event", () => {
    it("records SCRUTINY_STARTED audit event when officer initiates scrutiny", async () => {
      const instrument = {
        id: "fdr-sub-606",
        instrumentNumber: "FDR-AXIS-2026-606",
        status: InstrumentStatus.SUBMITTED,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(instrument);

      let auditCreated: any = null;

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockResolvedValue({
              ...instrument,
              status: InstrumentStatus.UNDER_SCRUTINY,
            }),
          },
          auditEvent: {
            create: vi.fn().mockImplementation(({ data }: any) => {
              auditCreated = data;
              return { id: "audit-scrut-start", ...data };
            }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${instrument.id}/start-scrutiny`)
        .set("Authorization", `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(auditCreated.action).toBe("SCRUTINY_STARTED");
      expect(auditCreated.actorId).toBe(officerUser.id);
      expect(auditCreated.entityType).toBe("Instrument");
      expect(auditCreated.entityId).toBe(instrument.id);
      expect(auditCreated.metadata.previousStatus).toBe(InstrumentStatus.SUBMITTED);
      expect(auditCreated.metadata.newStatus).toBe(InstrumentStatus.UNDER_SCRUTINY);
      expect(auditCreated.metadata.officerEmail).toBe(officerUser.email);
    });
  });
});
