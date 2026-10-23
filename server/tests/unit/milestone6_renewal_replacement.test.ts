/**
 * tests/unit/milestone6_renewal_replacement.test.ts
 * Comprehensive Vitest suite for Milestone 6: Renewal and Replacement Workflows,
 * Relationship Tracking, Lifecycle State Safety, and Scrutiny Decisions.
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
      },
      instrumentRelationship: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditEvent: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe("Milestone 6 — Renewal & Replacement Workflows", () => {
  const institutionUser = {
    id: "user-inst-1",
    email: "principal@gprec.ac.in",
    role: Role.INSTITUTION_USER,
    institutionId: "inst-1",
    isActive: true,
  };

  const otherInstitutionUser = {
    id: "user-inst-2",
    email: "principal@other.ac.in",
    role: Role.INSTITUTION_USER,
    institutionId: "inst-2",
    isActive: true,
  };

  const officerUser = {
    id: "user-officer-1",
    email: "officer@aicte-india.org",
    role: Role.AICTE_OFFICER,
    institutionId: null,
    isActive: true,
  };

  let instToken: string;
  let otherInstToken: string;
  let officerToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === institutionUser.id) return Promise.resolve(institutionUser);
      if (where.id === otherInstitutionUser.id) return Promise.resolve(otherInstitutionUser);
      if (where.id === officerUser.id) return Promise.resolve(officerUser);
      return Promise.resolve(null);
    });

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
  });

  describe("POST /api/instruments/:id/renew-or-replace", () => {
    const validRenewalPayload = {
      relationshipType: "RENEWAL",
      instrumentNumber: "FDR-BOB-2027-RENEWAL-1",
      bankName: "Bank of Baroda",
      branchName: "Kurnool Main Branch",
      amount: 1000000,
      issueDate: "2026-10-01",
      maturityDate: "2027-10-01",
      favouringDetails: "Member Secretary, AICTE, New Delhi",
      remarks: "Annual renewal of mandatory security deposit",
      submitImmediately: true,
    };

    it("successfully creates a renewal successor and pending relationship in a transaction", async () => {
      const originalInstrument = {
        id: "orig-123",
        instrumentNumber: "FDR-BOB-2026-802",
        institutionId: "inst-1",
        status: InstrumentStatus.ACTIVE,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(originalInstrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(null);

      const createdSuccessor = {
        id: "succ-456",
        instrumentNumber: validRenewalPayload.instrumentNumber,
        status: InstrumentStatus.SUBMITTED,
        institutionId: "inst-1",
        institution: { id: "inst-1", name: "G. Pulla Reddy Engineering College", code: "1-12345" },
      };

      const createdRelationship = {
        id: "rel-789",
        sourceInstrumentId: "orig-123",
        targetInstrumentId: "succ-456",
        relationshipType: InstrumentRelationshipType.RENEWAL,
        status: RelationshipStatus.PENDING,
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            create: vi.fn().mockResolvedValue(createdSuccessor),
          },
          instrumentRelationship: {
            create: vi.fn().mockResolvedValue(createdRelationship),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-1" }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${originalInstrument.id}/renew-or-replace`)
        .set("Authorization", `Bearer ${instToken}`)
        .send(validRenewalPayload);

      expect(res.status).toBe(201);
      expect(res.body.message).toContain("RENEWAL request recorded and submitted for regulatory scrutiny");
      expect(res.body.successor.id).toBe("succ-456");
      expect(res.body.relationship.status).toBe("PENDING");
    });

    it("rejects cross-institution access attempt with 404 (tenant isolation)", async () => {
      const originalInstrument = {
        id: "orig-123",
        instrumentNumber: "FDR-BOB-2026-802",
        institutionId: "inst-1", // Owned by inst-1
        status: InstrumentStatus.ACTIVE,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(originalInstrument);

      const res = await request(app)
        .post(`/api/instruments/${originalInstrument.id}/renew-or-replace`)
        .set("Authorization", `Bearer ${otherInstToken}`) // inst-2 caller
        .send(validRenewalPayload);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not Found");
    });

    it("rejects renewal if original instrument is not in ACTIVE or MATURED status (e.g. DRAFT)", async () => {
      const draftInstrument = {
        id: "orig-draft",
        instrumentNumber: "FDR-DRAFT-1",
        institutionId: "inst-1",
        status: InstrumentStatus.DRAFT,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(draftInstrument);

      const res = await request(app)
        .post(`/api/instruments/${draftInstrument.id}/renew-or-replace`)
        .set("Authorization", `Bearer ${instToken}`)
        .send(validRenewalPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid State Transition");
      expect(res.body.message).toContain("Only ACTIVE or MATURED instruments can be renewed/replaced");
    });

    it("prevents multiple pending replacement/renewal submissions on the same instrument", async () => {
      const activeInstrument = {
        id: "orig-123",
        instrumentNumber: "FDR-BOB-2026-802",
        institutionId: "inst-1",
        status: InstrumentStatus.ACTIVE,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(activeInstrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue({
        id: "rel-existing",
        relationshipType: "RENEWAL",
        targetInstrument: { id: "succ-existing", instrumentNumber: "FDR-PENDING-99", status: "SUBMITTED" },
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/renew-or-replace`)
        .set("Authorization", `Bearer ${instToken}`)
        .send(validRenewalPayload);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Conflict");
      expect(res.body.message).toContain("already under scrutiny");
    });

    it("rejects successor with identical reference number as original instrument", async () => {
      const activeInstrument = {
        id: "orig-123",
        instrumentNumber: "FDR-BOB-2026-802",
        institutionId: "inst-1",
        status: InstrumentStatus.ACTIVE,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(activeInstrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/renew-or-replace`)
        .set("Authorization", `Bearer ${instToken}`)
        .send({
          ...validRenewalPayload,
          instrumentNumber: "FDR-BOB-2026-802", // Identical to original
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.message).toContain("distinct reference number");
    });
  });

  describe("POST /api/instruments/:id/scrutiny-decision", () => {
    it("officer approval of successor atomically transitions successor to ACTIVE, marks relationship APPROVED, and supersedes predecessor to MATURED", async () => {
      const successorInstrument = {
        id: "succ-456",
        instrumentNumber: "FDR-BOB-2027-RENEWAL-1",
        status: InstrumentStatus.UNDER_SCRUTINY,
        institutionId: "inst-1",
      };

      const originalInstrument = {
        id: "orig-123",
        instrumentNumber: "FDR-BOB-2026-802",
        status: InstrumentStatus.ACTIVE,
        institutionId: "inst-1",
      };

      const pendingRelationship = {
        id: "rel-789",
        sourceInstrumentId: "orig-123",
        targetInstrumentId: "succ-456",
        relationshipType: InstrumentRelationshipType.RENEWAL,
        status: RelationshipStatus.PENDING,
        sourceInstrument: originalInstrument,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(successorInstrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(pendingRelationship);

      const updatedSuccessor = {
        ...successorInstrument,
        status: InstrumentStatus.ACTIVE,
      };

      let sourceUpdated = false;
      let relUpdated = false;

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockImplementation(({ where, data }: any) => {
              if (where.id === "succ-456") return { ...successorInstrument, status: data.status };
              if (where.id === "orig-123") {
                sourceUpdated = true;
                return { ...originalInstrument, status: data.status };
              }
            }),
          },
          instrumentRelationship: {
            update: vi.fn().mockImplementation(({ data }: any) => {
              relUpdated = true;
              return { ...pendingRelationship, status: data.status };
            }),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-ev" }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${successorInstrument.id}/scrutiny-decision`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "APPROVE",
          remarks: "Verified authentic renewal deposit certificate and bank confirmation.",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Scrutiny decision 'APPROVE' successfully applied");
      expect(sourceUpdated).toBe(true);
      expect(relUpdated).toBe(true);
    });

    it("officer rejection of successor marks relationship REJECTED and leaves predecessor untouched", async () => {
      const successorInstrument = {
        id: "succ-456",
        instrumentNumber: "FDR-BOB-2027-RENEWAL-1",
        status: InstrumentStatus.UNDER_SCRUTINY,
        institutionId: "inst-1",
      };

      const originalInstrument = {
        id: "orig-123",
        instrumentNumber: "FDR-BOB-2026-802",
        status: InstrumentStatus.ACTIVE,
        institutionId: "inst-1",
      };

      const pendingRelationship = {
        id: "rel-789",
        sourceInstrumentId: "orig-123",
        targetInstrumentId: "succ-456",
        relationshipType: InstrumentRelationshipType.RENEWAL,
        status: RelationshipStatus.PENDING,
        sourceInstrument: originalInstrument,
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(successorInstrument);
      (prisma.instrumentRelationship.findFirst as any).mockResolvedValue(pendingRelationship);

      let sourceUpdated = false;
      let relUpdatedToRejected = false;

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          instrument: {
            update: vi.fn().mockImplementation(({ where, data }: any) => {
              if (where.id === "succ-456") return { ...successorInstrument, status: data.status };
              if (where.id === "orig-123") sourceUpdated = true;
            }),
          },
          instrumentRelationship: {
            update: vi.fn().mockImplementation(({ data }: any) => {
              if (data.status === RelationshipStatus.REJECTED) relUpdatedToRejected = true;
              return { ...pendingRelationship, status: data.status };
            }),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-ev" }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${successorInstrument.id}/scrutiny-decision`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({
          decision: "REJECT",
          remarks: "Bank branch stamp does not match accredited jurisdiction.",
        });

      expect(res.status).toBe(200);
      expect(sourceUpdated).toBe(false); // Predecessor was NOT updated or superseded
      expect(relUpdatedToRejected).toBe(true);
    });

    it("denies institution users from executing scrutiny decisions (403 Forbidden)", async () => {
      const res = await request(app)
        .post("/api/instruments/succ-456/scrutiny-decision")
        .set("Authorization", `Bearer ${instToken}`)
        .send({
          decision: "APPROVE",
          remarks: "I want to approve my own deposit.",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });
  });

  describe("GET /api/instruments/:id/relationships", () => {
    it("returns predecessor and successor relationship lists for authorized caller", async () => {
      const instrument = {
        id: "inst-target",
        instrumentNumber: "FDR-BOB-2027-RENEWAL-1",
        institutionId: "inst-1",
      };

      (prisma.instrument.findUnique as any).mockResolvedValue(instrument);
      (prisma.instrumentRelationship.findMany as any)
        .mockResolvedValueOnce([
          {
            id: "rel-1",
            relationshipType: "RENEWAL",
            status: "APPROVED",
            sourceInstrument: { instrumentNumber: "FDR-BOB-2026-802" },
          },
        ]) // Predecessors
        .mockResolvedValueOnce([]); // Successors

      const res = await request(app)
        .get(`/api/instruments/${instrument.id}/relationships`)
        .set("Authorization", `Bearer ${instToken}`);

      expect(res.status).toBe(200);
      expect(res.body.predecessors).toHaveLength(1);
      expect(res.body.predecessors[0].sourceInstrument.instrumentNumber).toBe("FDR-BOB-2026-802");
    });
  });
});
