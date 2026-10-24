/**
 * server/tests/unit/database_repair_and_rbac_regression.test.ts
 * Regression tests for database repair, demo authentication, 5-role RBAC enforcement,
 * rate limit recovery, four-eyes release separation of duties, and audit chain integrity.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { Role, InstrumentStatus, ReleaseRequestStatus } from "@prisma/client";
import { signAccessToken } from "../../src/utils/jwt";
import { hashPassword } from "../../src/utils/password";
import { matchesRole } from "../../src/middleware/auth";
import {
  createLoginRateLimiter,
  clearLoginAttempt,
  resetLoginRateLimiter,
} from "../../src/middleware/rateLimit";
import {
  computeEventHash,
  verifyAuditChain,
  canonicalJsonStringify,
} from "../../src/utils/auditChain";

vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    instrument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    releaseRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    scrutinyRecord: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    auditEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "audit-evt-1" }),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

describe("Database Repair & 5-Role RBAC Regression Tests", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({ id: "audit-evt-1" } as any);
    resetLoginRateLimiter();
  });

  describe("Role Equivalence and Authorization Matching", () => {
    it("should correctly validate active roles and legacy aliases via matchesRole", () => {
      // Direct matches
      expect(matchesRole(Role.INSTITUTION_USER, Role.INSTITUTION_USER)).toBe(true);
      expect(matchesRole(Role.SCRUTINY_OFFICER, Role.SCRUTINY_OFFICER)).toBe(true);
      expect(matchesRole(Role.APPROVER, Role.APPROVER)).toBe(true);
      expect(matchesRole(Role.ADMIN, Role.ADMIN)).toBe(true);
      expect(matchesRole(Role.AUDITOR, Role.AUDITOR)).toBe(true);

      // Legacy aliases
      expect(matchesRole(Role.AICTE_OFFICER, Role.SCRUTINY_OFFICER)).toBe(true);
      expect(matchesRole(Role.SCRUTINY_OFFICER, Role.AICTE_OFFICER)).toBe(true);
      expect(matchesRole(Role.SYSTEM_ADMIN, Role.ADMIN)).toBe(true);
      expect(matchesRole(Role.ADMIN, Role.SYSTEM_ADMIN)).toBe(true);

      // Cross-role boundaries must be strictly rejected
      expect(matchesRole(Role.INSTITUTION_USER, Role.SCRUTINY_OFFICER)).toBe(false);
      expect(matchesRole(Role.SCRUTINY_OFFICER, Role.APPROVER)).toBe(false);
      expect(matchesRole(Role.ADMIN, Role.APPROVER)).toBe(false);
      expect(matchesRole(Role.AUDITOR, Role.ADMIN)).toBe(false);
      expect(matchesRole(Role.AUDITOR, Role.INSTITUTION_USER)).toBe(false);
    });
  });

  describe("Authentication Rate Limiting and Recovery", () => {
    it("should clear failed login counter on successful authentication", async () => {
      const hashedPassword = await hashPassword("ValidPassword123");
      const mockUser = {
        id: "user-test-1",
        fullName: "Test User",
        email: "test@demo.fdr-sentinel.gov.in",
        passwordHash: hashedPassword,
        role: Role.INSTITUTION_USER,
        institutionId: "inst-1",
        isActive: true,
      };

      // 4 failed attempts
      (prisma.user.findUnique as any).mockResolvedValue(null);
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .send({ email: "test@demo.fdr-sentinel.gov.in", password: "Wrong" });
        expect(res.status).toBe(401);
      }

      // 5th attempt succeeds with right password
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      const successRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@demo.fdr-sentinel.gov.in", password: "ValidPassword123" });
      expect(successRes.status).toBe(200);

      // Subsequent attempt should NOT be blocked with 429
      const subsequentRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@demo.fdr-sentinel.gov.in", password: "ValidPassword123" });
      expect(subsequentRes.status).toBe(200);
    });
  });

  describe("Four-Eyes Separation of Duties in Release Processing", () => {
    it("should reject release approval if approver is the release requester", async () => {
      const approverToken = signAccessToken({
        sub: "approver-user-1",
        email: "approver.verma@demo.fdr-sentinel.gov.in",
        role: Role.APPROVER,
        institutionId: null,
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "approver-user-1",
        email: "approver.verma@demo.fdr-sentinel.gov.in",
        role: Role.APPROVER,
        institutionId: null,
        isActive: true,
      });

      (prisma.instrument.findUnique as any).mockResolvedValue({
        id: "inst-101",
        instrumentNumber: "FDR-101",
        status: InstrumentStatus.RELEASE_REQUESTED,
        institutionId: "inst-scope-1",
        scrutinizedById: "other-officer-99",
      });

      (prisma.releaseRequest.findFirst as any).mockResolvedValue({
        id: "req-101",
        instrumentId: "inst-101",
        requestedById: "approver-user-1", // Self-requested!
        previousInstrumentStatus: InstrumentStatus.ACTIVE,
        status: ReleaseRequestStatus.PENDING,
      });

      const res = await request(app)
        .post("/api/instruments/inst-101/release/decision")
        .set("Authorization", `Bearer ${approverToken}`)
        .send({ decision: "APPROVE", remarks: "Approved" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/separation of duties/i);
    });

    it("should reject release approval if approver participated in scrutiny", async () => {
      const approverToken = signAccessToken({
        sub: "approver-user-2",
        email: "approver.verma@demo.fdr-sentinel.gov.in",
        role: Role.APPROVER,
        institutionId: null,
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "approver-user-2",
        email: "approver.verma@demo.fdr-sentinel.gov.in",
        role: Role.APPROVER,
        institutionId: null,
        isActive: true,
      });

      (prisma.instrument.findUnique as any).mockResolvedValue({
        id: "inst-102",
        instrumentNumber: "FDR-102",
        status: InstrumentStatus.RELEASE_REQUESTED,
        institutionId: "inst-scope-1",
        scrutinizedById: "approver-user-2", // Approver was the scrutinizer!
      });

      (prisma.releaseRequest.findFirst as any).mockResolvedValue({
        id: "req-102",
        instrumentId: "inst-102",
        requestedById: "institution-requester-7",
        previousInstrumentStatus: InstrumentStatus.ACTIVE,
        status: ReleaseRequestStatus.PENDING,
      });

      const res = await request(app)
        .post("/api/instruments/inst-102/release/decision")
        .set("Authorization", `Bearer ${approverToken}`)
        .send({ decision: "APPROVE", remarks: "Approved" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/officer who scrutinized this instrument cannot approve/i);
    });
  });

  describe("Audit Chain Verification & Integrity", () => {
    it("should verify cryptographic integrity of consecutive hashed audit events", async () => {
      const date1 = new Date("2026-10-24T10:00:00Z");
      const hash1 = computeEventHash({
        actorId: "actor-1",
        action: "INSTRUMENT_CREATED",
        entityType: "Instrument",
        entityId: "inst-1",
        metadata: { amount: 500000 },
        createdAt: date1.toISOString(),
        previousHash: null,
      });

      const date2 = new Date("2026-10-24T10:05:00Z");
      const hash2 = computeEventHash({
        actorId: "actor-2",
        action: "INSTRUMENT_SUBMITTED",
        entityType: "Instrument",
        entityId: "inst-1",
        metadata: { status: "SUBMITTED" },
        createdAt: date2.toISOString(),
        previousHash: hash1,
      });

      const mockDb = {
        auditEvent: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "evt-1",
              actorId: "actor-1",
              action: "INSTRUMENT_CREATED",
              entityType: "Instrument",
              entityId: "inst-1",
              metadata: { amount: 500000 },
              createdAt: date1,
              previousHash: null,
              eventHash: hash1,
            },
            {
              id: "evt-2",
              actorId: "actor-2",
              action: "INSTRUMENT_SUBMITTED",
              entityType: "Instrument",
              entityId: "inst-1",
              metadata: { status: "SUBMITTED" },
              createdAt: date2,
              previousHash: hash1,
              eventHash: hash2,
            },
          ]),
        },
      };

      const result = await verifyAuditChain(mockDb as any);
      expect(result.verified).toBe(true);
      expect(result.totalEvents).toBe(2);
    });

    it("should detect tampering when audit event metadata is altered", async () => {
      const date1 = new Date("2026-10-24T10:00:00Z");
      const hash1 = computeEventHash({
        actorId: "actor-1",
        action: "INSTRUMENT_CREATED",
        entityType: "Instrument",
        entityId: "inst-1",
        metadata: { amount: 500000 },
        createdAt: date1.toISOString(),
        previousHash: null,
      });

      const mockDb = {
        auditEvent: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "evt-1",
              actorId: "actor-1",
              action: "INSTRUMENT_CREATED",
              entityType: "Instrument",
              entityId: "inst-1",
              metadata: { amount: 999999 }, // TAMPERED METADATA!
              createdAt: date1,
              previousHash: null,
              eventHash: hash1,
            },
          ]),
        },
      };

      const result = await verifyAuditChain(mockDb as any);
      expect(result.verified).toBe(false);
      expect(result.compromisedEventId).toBe("evt-1");
      expect(result.reason).toMatch(/event content altered/i);
    });
  });

  describe("CSV Formula Injection Protection", () => {
    it("should sanitize formula triggers in exported audit CSV data", async () => {
      const auditorToken = signAccessToken({
        sub: "auditor-1",
        email: "auditor.patel@demo.fdr-sentinel.gov.in",
        role: Role.AUDITOR,
        institutionId: null,
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "auditor-1",
        email: "auditor.patel@demo.fdr-sentinel.gov.in",
        role: Role.AUDITOR,
        institutionId: null,
        isActive: true,
      });

      (prisma.auditEvent.findMany as any).mockResolvedValue([
        {
          id: "=cmd|' /C calc'!A0", // Malicious formula in entityId
          createdAt: new Date("2026-10-24T12:00:00Z"),
          action: "+@PAYLOAD", // Malicious formula in action
          entityType: "Instrument",
          entityId: "-DDE(\"cmd\";\"/C calc\";\"!A0\")",
          actorId: "actor-hacker",
          actor: {
            fullName: "@HYPERLINK(\"http://evil.com\")",
            email: "hacker@evil.com",
            role: "INSTITUTION_USER",
          },
          metadata: { note: "=2+5" },
        },
      ]);

      const res = await request(app)
        .get("/api/audit/export")
        .set("Authorization", `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      const csv = res.text;

      // Ensure every formula cell starts with single quote before formula character
      expect(csv).toContain("\"'=cmd|' /C calc'!A0\"");
      expect(csv).toContain("\"'+@PAYLOAD\"");
      expect(csv).toContain("\"'-DDE(\"\"cmd\"\";\"\"/C calc\"\";\"\"!A0\"\")\"");
      expect(csv).toContain("\"'@HYPERLINK(\"\"http://evil.com\"\")\"");
    });
  });
});
