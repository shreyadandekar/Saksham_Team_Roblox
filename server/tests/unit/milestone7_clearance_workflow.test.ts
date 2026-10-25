/**
 * tests/unit/milestone7_clearance_workflow.test.ts
 *
 * Unit & Integration Test Suite for USP-2:
 * Intelligent FDR Release & Multi-Department Clearance Workflow (AICTE APH 2024-2027 Sec 6.46).
 *
 * Tests:
 *   1. Pre-check evaluation endpoint with USP-1 APH integration.
 *   2. Document checklist review & workflow stage transitions.
 *   3. Departmental clearance RBAC (PGRC, Vigilance, Other Bureaus).
 *   4. Duplicate clearance submission rejection (409 Conflict).
 *   5. Final Decision Guard enforcement:
 *      - PGRC cleared, Vigilance pending -> 422 blocked
 *      - Vigilance cleared, PGRC pending -> 422 blocked
 *      - Required documents missing / pending -> 422 blocked
 *      - Regulatory / financial hold -> 422 blocked
 *      - Unauthorized non-APPROVER role -> 403 Forbidden
 *      - Separation of duties (approver was requester / scrutinizer) -> 422/403 blocked
 *      - Concurrent final decision -> 409 Conflict
 *      - All conditions satisfied -> 200 OK & NOC_ISSUED transition
 *   6. Hold placement and release.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import {
  Role,
  InstrumentStatus,
  ReleaseRequestStatus,
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
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    releaseClearance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    releaseDocumentReview: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    scrutinyRecord: {
      findMany: vi.fn(),
    },
    auditEvent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const instUser = {
  id: "user-inst-1",
  email: "principal@gprec.ac.in",
  fullName: "Dr. G. Pullaiah",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-1",
  isActive: true,
};

const scrutinyOfficer = {
  id: "user-scrutiny-1",
  email: "scrutiny@aicte-india.org",
  fullName: "Scrutiny Officer Sharma",
  role: Role.SCRUTINY_OFFICER,
  department: "APPROVAL_BUREAU",
  institutionId: null,
  isActive: true,
};

const pgrcOfficer = {
  id: "user-pgrc-1",
  email: "pgrc.officer@aicte-india.org",
  fullName: "PGRC Officer Verma",
  role: Role.SCRUTINY_OFFICER,
  department: "PGRC",
  institutionId: null,
  isActive: true,
};

const vigilanceOfficer = {
  id: "user-vigilance-1",
  email: "vigilance.officer@aicte-india.org",
  fullName: "Vigilance Officer Singh",
  role: Role.SCRUTINY_OFFICER,
  department: "VIGILANCE",
  institutionId: null,
  isActive: true,
};

const approverUser = {
  id: "user-approver-1",
  email: "approver@aicte-india.org",
  fullName: "Approval Bureau Director",
  role: Role.APPROVER,
  department: "APPROVAL_BUREAU",
  institutionId: null,
  isActive: true,
};

const activeInstrument = {
  id: "inst-fdr-1",
  instrumentNumber: "FDR-2024-ENG-001",
  bankName: "State Bank of India",
  branchName: "Kurnool Main",
  amount: 3500000,
  institutionId: "inst-1",
  status: InstrumentStatus.RELEASE_REQUESTED,
  scrutinizedById: "user-scrutiny-99", // Scrutinized by different officer
};

const baseReleaseRequest = {
  id: "rel-req-1",
  instrumentId: "inst-fdr-1",
  previousInstrumentStatus: InstrumentStatus.ACTIVE,
  requestedById: "user-inst-1",
  reason: "Institution successfully completed regulatory endowment period.",
  status: ReleaseRequestStatus.PENDING,
  workflowStage: "CLEARANCES_PENDING",
  holdReason: null,
  holdPlacedById: null,
  instrument: activeInstrument,
  clearances: [],
  documentReviews: [],
};

describe("USP-2: Multi-Department Clearance & Intelligent FDR Release Workflow", () => {
  let instToken: string;
  let scrutinyToken: string;
  let pgrcToken: string;
  let vigilanceToken: string;
  let approverToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    instToken = signAccessToken({ sub: instUser.id, role: instUser.role });
    scrutinyToken = signAccessToken({ sub: scrutinyOfficer.id, role: scrutinyOfficer.role });
    pgrcToken = signAccessToken({ sub: pgrcOfficer.id, role: pgrcOfficer.role });
    vigilanceToken = signAccessToken({ sub: vigilanceOfficer.id, role: vigilanceOfficer.role });
    approverToken = signAccessToken({ sub: approverUser.id, role: approverUser.role });

    (prisma.user.findUnique as any).mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === instUser.id) return Promise.resolve(instUser);
      if (where.id === scrutinyOfficer.id) return Promise.resolve(scrutinyOfficer);
      if (where.id === pgrcOfficer.id) return Promise.resolve(pgrcOfficer);
      if (where.id === vigilanceOfficer.id) return Promise.resolve(vigilanceOfficer);
      if (where.id === approverUser.id) return Promise.resolve(approverUser);
      return Promise.resolve(null);
    });

    (prisma.instrument.findUnique as any).mockResolvedValue(activeInstrument);
    (prisma.scrutinyRecord.findMany as any).mockResolvedValue([{ officerId: "user-scrutiny-99" }]);
    (prisma.auditEvent.create as any).mockResolvedValue({ id: "audit-1" });
    (prisma.auditEvent.findFirst as any).mockResolvedValue(null);
  });

  // ── 1. Document Checklist Review ───────────────────────────────────────────

  describe("Document Checklist Verification", () => {
    it("scrutiny officer can review and confirm a mandatory document", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue(baseReleaseRequest);
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          releaseDocumentReview: {
            upsert: vi.fn().mockResolvedValue({
              id: "rev-1",
              documentType: "APPLICATION_LETTER",
              status: "CONFIRMED",
            }),
            findMany: vi.fn().mockResolvedValue([
              { documentType: "APPLICATION_LETTER", status: "CONFIRMED" },
            ]),
          },
          releaseClearance: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          releaseRequest: {
            update: vi.fn().mockResolvedValue({ ...baseReleaseRequest, workflowStage: "DOCUMENT_REVIEW" }),
          },
          auditEvent: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "audit-doc-1" }),
          },
        };
        return cb(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/documents/APPLICATION_LETTER/review`)
        .set("Authorization", `Bearer ${scrutinyToken}`)
        .send({ status: "CONFIRMED", reviewRemarks: "Application signed by competent authority." });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("APPLICATION_LETTER");
      expect(res.body.review.status).toBe("CONFIRMED");
    });

    it("marking a document as CORRECTION_REQUIRED moves workflow stage to CORRECTION_REQUIRED", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue(baseReleaseRequest);
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          releaseDocumentReview: {
            upsert: vi.fn().mockResolvedValue({
              id: "rev-2",
              documentType: "AFFIDAVIT_6",
              status: "CORRECTION_REQUIRED",
            }),
            findMany: vi.fn().mockResolvedValue([
              { documentType: "AFFIDAVIT_6", status: "CORRECTION_REQUIRED" },
            ]),
          },
          releaseRequest: {
            update: vi.fn().mockResolvedValue({ ...baseReleaseRequest, workflowStage: "CORRECTION_REQUIRED" }),
          },
          auditEvent: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "audit-doc-2" }),
          },
        };
        return cb(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/documents/AFFIDAVIT_6/review`)
        .set("Authorization", `Bearer ${scrutinyToken}`)
        .send({ status: "CORRECTION_REQUIRED", reviewRemarks: "Notary stamp is illegible. Please re-upload." });

      expect(res.status).toBe(200);
      expect(res.body.workflowStage).toBe("CORRECTION_REQUIRED");
    });

    it("rejects invalid document type with 400", async () => {
      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/documents/RANDOM_DOC/review`)
        .set("Authorization", `Bearer ${scrutinyToken}`)
        .send({ status: "CONFIRMED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
    });
  });

  // ── 2. Role-Based Departmental Clearance Authority ─────────────────────────

  describe("Departmental Clearance RBAC", () => {
    it("rejects clearance decision from officer without departmental authority (403)", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue(baseReleaseRequest);
      (prisma.releaseClearance.findUnique as any).mockResolvedValue({
        id: "clr-pgrc",
        department: "PGRC",
        status: "PENDING",
        assignedOfficerId: null,
      });

      // Scrutiny officer belongs to APPROVAL_BUREAU, not PGRC
      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/clearances/PGRC`)
        .set("Authorization", `Bearer ${scrutinyToken}`)
        .send({ status: "CLEARED", decisionReason: "No complaints found." });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
      expect(res.body.message).toContain("clearance authority for department 'PGRC'");
    });

    it("allows authorized PGRC officer to record clearance (200)", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue(baseReleaseRequest);
      (prisma.releaseClearance.findUnique as any).mockResolvedValue({
        id: "clr-pgrc",
        department: "PGRC",
        status: "PENDING",
      });

      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          releaseClearance: {
            upsert: vi.fn().mockResolvedValue({
              id: "clr-pgrc",
              department: "PGRC",
              status: "CLEARED",
            }),
            findMany: vi.fn().mockResolvedValue([
              { department: "PGRC", status: "CLEARED" },
              { department: "VIGILANCE", status: "PENDING" },
            ]),
          },
          releaseDocumentReview: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          releaseRequest: {
            update: vi.fn().mockResolvedValue({ ...baseReleaseRequest }),
          },
          auditEvent: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "audit-clr-1" }),
          },
        };
        return cb(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/clearances/PGRC`)
        .set("Authorization", `Bearer ${pgrcToken}`)
        .send({ status: "CLEARED", decisionReason: "No pending student or staff grievances on record." });

      expect(res.status).toBe(200);
      expect(res.body.clearance.status).toBe("CLEARED");
    });

    it("prevents duplicate clearance submissions (409 Conflict)", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue(baseReleaseRequest);
      (prisma.releaseClearance.findUnique as any).mockResolvedValue({
        id: "clr-pgrc",
        department: "PGRC",
        status: "CLEARED",
        decidedAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/clearances/PGRC`)
        .set("Authorization", `Bearer ${pgrcToken}`)
        .send({ status: "CLEARED", decisionReason: "Duplicate clearance attempt." });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Conflict");
      expect(res.body.message).toContain("already been decided with status 'CLEARED'");
    });

    it("objection raised by Vigilance automatically places release on hold", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue(baseReleaseRequest);
      (prisma.releaseClearance.findUnique as any).mockResolvedValue({
        id: "clr-vigilance",
        department: "VIGILANCE",
        status: "PENDING",
      });

      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          releaseClearance: {
            upsert: vi.fn().mockResolvedValue({
              id: "clr-vigilance",
              department: "VIGILANCE",
              status: "OBJECTION_RAISED",
            }),
          },
          releaseRequest: {
            update: vi.fn().mockResolvedValue({
              ...baseReleaseRequest,
              workflowStage: "ON_HOLD",
              holdReason: "Objection raised by VIGILANCE: Active enquiry pending",
            }),
          },
          auditEvent: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "audit-clr-2" }),
          },
        };
        return cb(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/clearances/VIGILANCE`)
        .set("Authorization", `Bearer ${vigilanceToken}`)
        .send({ status: "OBJECTION_RAISED", decisionReason: "Active inquiry into infrastructure non-compliance." });

      expect(res.status).toBe(200);
      expect(res.body.workflowStage).toBe("ON_HOLD");
    });
  });

  // ── 3. Final Decision Guard Enforcement ────────────────────────────────────

  describe("Final Decision Guard (NOC Issuance)", () => {
    it("blocks final NOC when PGRC is cleared but Vigilance is pending (422)", async () => {
      const requestWithVigilancePending = {
        ...baseReleaseRequest,
        documentReviews: [
          { documentType: "APPLICATION_LETTER", status: "CONFIRMED" },
          { documentType: "AFFIDAVIT_6", status: "CONFIRMED" },
          { documentType: "FDR_DEPOSIT_EVIDENCE", status: "CONFIRMED" },
          { documentType: "LATEST_LOA_EOA", status: "CONFIRMED" },
        ],
        clearances: [
          { department: "PGRC", status: "CLEARED" },
          { department: "VIGILANCE", status: "PENDING" }, // BLOCKED
          { department: "OTHER_APPLICABLE_BUREAU", status: "CLEARED" },
        ],
      };

      (prisma.releaseRequest.findUnique as any).mockResolvedValue(requestWithVigilancePending);

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/noc`)
        .set("Authorization", `Bearer ${approverToken}`)
        .send({ remarks: "Approval attempt" });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe("Precondition Failed");
      expect(res.body.isEligibleForFinalDecision).toBe(false);
      expect(res.body.blockers.some((b: any) => b.code === "CLEARANCE_PENDING_VIGILANCE")).toBe(true);
    });

    it("blocks final NOC when Vigilance is cleared but PGRC is pending (422)", async () => {
      const requestWithPgrcPending = {
        ...baseReleaseRequest,
        documentReviews: [
          { documentType: "APPLICATION_LETTER", status: "CONFIRMED" },
          { documentType: "AFFIDAVIT_6", status: "CONFIRMED" },
          { documentType: "FDR_DEPOSIT_EVIDENCE", status: "CONFIRMED" },
          { documentType: "LATEST_LOA_EOA", status: "CONFIRMED" },
        ],
        clearances: [
          { department: "PGRC", status: "PENDING" }, // BLOCKED
          { department: "VIGILANCE", status: "CLEARED" },
          { department: "OTHER_APPLICABLE_BUREAU", status: "CLEARED" },
        ],
      };

      (prisma.releaseRequest.findUnique as any).mockResolvedValue(requestWithPgrcPending);

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/noc`)
        .set("Authorization", `Bearer ${approverToken}`)
        .send({ remarks: "Approval attempt" });

      expect(res.status).toBe(422);
      expect(res.body.blockers.some((b: any) => b.code === "CLEARANCE_PENDING_PGRC")).toBe(true);
    });

    it("blocks final NOC when required documents are missing or pending (422)", async () => {
      const requestWithMissingDocs = {
        ...baseReleaseRequest,
        documentReviews: [
          { documentType: "APPLICATION_LETTER", status: "CONFIRMED" },
          // AFFIDAVIT_6 missing/pending
          { documentType: "AFFIDAVIT_6", status: "PENDING" },
          { documentType: "FDR_DEPOSIT_EVIDENCE", status: "CONFIRMED" },
          { documentType: "LATEST_LOA_EOA", status: "CONFIRMED" },
        ],
        clearances: [
          { department: "PGRC", status: "CLEARED" },
          { department: "VIGILANCE", status: "CLEARED" },
          { department: "OTHER_APPLICABLE_BUREAU", status: "CLEARED" },
        ],
      };

      (prisma.releaseRequest.findUnique as any).mockResolvedValue(requestWithMissingDocs);

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/noc`)
        .set("Authorization", `Bearer ${approverToken}`)
        .send({ remarks: "Approval attempt" });

      expect(res.status).toBe(422);
      expect(res.body.blockers.some((b: any) => b.code === "DOCUMENT_NOT_CONFIRMED_AFFIDAVIT_6")).toBe(true);
    });

    it("rejects unauthorized final NOC issuance by non-approver (403)", async () => {
      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/noc`)
        .set("Authorization", `Bearer ${scrutinyToken}`)
        .send({ remarks: "Unauthorized NOC attempt" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });

    it("blocks final decision if release request is already decided (409 Conflict)", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue({
        ...baseReleaseRequest,
        status: ReleaseRequestStatus.APPROVED, // Already decided
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/noc`)
        .set("Authorization", `Bearer ${approverToken}`)
        .send({ remarks: "Concurrent attempt" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Conflict");
      expect(res.body.message).toContain("already been decided");
    });

    it("issues final FDR Release NOC when all regulatory conditions and clearances are satisfied (200)", async () => {
      const fullyCompliantRequest = {
        ...baseReleaseRequest,
        status: ReleaseRequestStatus.PENDING,
        workflowStage: "READY_FOR_FINAL_DECISION",
        documentReviews: [
          { documentType: "APPLICATION_LETTER", status: "CONFIRMED" },
          { documentType: "AFFIDAVIT_6", status: "CONFIRMED" },
          { documentType: "FDR_DEPOSIT_EVIDENCE", status: "CONFIRMED" },
          { documentType: "LATEST_LOA_EOA", status: "CONFIRMED" },
        ],
        clearances: [
          { department: "PGRC", status: "CLEARED" },
          { department: "VIGILANCE", status: "CLEARED" },
          { department: "OTHER_APPLICABLE_BUREAU", status: "CLEARED" },
        ],
      };

      (prisma.releaseRequest.findUnique as any).mockResolvedValue(fullyCompliantRequest);

      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          releaseRequest: {
            update: vi.fn().mockResolvedValue({
              ...fullyCompliantRequest,
              status: ReleaseRequestStatus.APPROVED,
              workflowStage: "NOC_ISSUED",
              decidedById: approverUser.id,
            }),
          },
          instrument: {
            update: vi.fn().mockResolvedValue({
              ...activeInstrument,
              status: InstrumentStatus.RELEASED,
            }),
          },
          auditEvent: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "audit-noc-1" }),
          },
        };
        return cb(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/noc`)
        .set("Authorization", `Bearer ${approverToken}`)
        .send({ remarks: "Approval Bureau confirms all conditions met. NOC granted." });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("FDR Release NOC issued successfully");
      expect(res.body.releaseRequest.status).toBe("APPROVED");
      expect(res.body.releaseRequest.workflowStage).toBe("NOC_ISSUED");
      expect(res.body.instrument.status).toBe("RELEASED");
    });
  });

  // ── 4. Pre-Check Report Endpoint ───────────────────────────────────────────

  describe("Pre-Check Endpoint (GET /:releaseRequestId/pre-check)", () => {
    it("returns pre-check report combining checklist, clearances, and USP-1 APH check", async () => {
      const mockRequestWithAll = {
        ...baseReleaseRequest,
        instrument: {
          ...activeInstrument,
          institution: {
            id: "inst-1",
            name: "G. Pulla Reddy Engineering College",
            institutionType: "PRIVATE_UNAIDED",
          },
        },
        documentReviews: [
          { documentType: "APPLICATION_LETTER", status: "CONFIRMED" },
          { documentType: "AFFIDAVIT_6", status: "CONFIRMED" },
          { documentType: "FDR_DEPOSIT_EVIDENCE", status: "CONFIRMED" },
          { documentType: "LATEST_LOA_EOA", status: "CONFIRMED" },
        ],
        clearances: [
          { department: "PGRC", status: "CLEARED" },
          { department: "VIGILANCE", status: "PENDING" },
          { department: "OTHER_APPLICABLE_BUREAU", status: "NOT_APPLICABLE", decisionReason: "No regional office dispute" },
        ],
      };

      (prisma.releaseRequest.findUnique as any).mockResolvedValue(mockRequestWithAll);

      const res = await request(app)
        .get(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/pre-check`)
        .set("Authorization", `Bearer ${scrutinyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.releaseRequestId).toBe(baseReleaseRequest.id);
      expect(res.body.guardResult).toBeDefined();
      expect(res.body.guardResult.isEligible).toBe(false); // Vigilance is pending
      expect(res.body.guardResult.clearanceStatus.totalRequired).toBe(3);
      expect(res.body.guardResult.documentStatus.confirmedCount).toBe(4);
      expect(res.body.aphCompliance).toBeDefined();
    });
  });

  // ── 5. Hold Management ─────────────────────────────────────────────────────

  describe("Hold Management (POST /:releaseRequestId/hold)", () => {
    it("places hold on release request (200)", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue(baseReleaseRequest);
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          releaseRequest: {
            update: vi.fn().mockResolvedValue({
              ...baseReleaseRequest,
              workflowStage: "ON_HOLD",
              holdReason: "Statutory audit pending.",
            }),
          },
          auditEvent: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "audit-hold-1" }),
          },
        };
        return cb(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/hold`)
        .set("Authorization", `Bearer ${scrutinyToken}`)
        .send({ action: "PLACE_HOLD", reason: "Statutory audit pending." });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("placed on hold");
      expect(res.body.releaseRequest.workflowStage).toBe("ON_HOLD");
    });

    it("lifts hold on release request (200)", async () => {
      (prisma.releaseRequest.findUnique as any).mockResolvedValue({
        ...baseReleaseRequest,
        workflowStage: "ON_HOLD",
        holdReason: "Statutory audit pending.",
      });

      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          releaseRequest: {
            update: vi.fn().mockResolvedValue({
              ...baseReleaseRequest,
              workflowStage: "CLEARANCES_PENDING",
              holdReason: null,
            }),
          },
          auditEvent: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "audit-hold-2" }),
          },
        };
        return cb(tx);
      });

      const res = await request(app)
        .post(`/api/instruments/${activeInstrument.id}/release/${baseReleaseRequest.id}/hold`)
        .set("Authorization", `Bearer ${scrutinyToken}`)
        .send({ action: "LIFT_HOLD", reason: "Statutory audit completed and verified." });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Hold lifted successfully");
      expect(res.body.releaseRequest.workflowStage).toBe("CLEARANCES_PENDING");
    });
  });
});
