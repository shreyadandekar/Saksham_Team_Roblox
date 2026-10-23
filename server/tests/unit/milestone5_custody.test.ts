/**
 * server/tests/unit/milestone5_custody.test.ts
 * Integration tests for Milestone 5 Physical Custody Management.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { signAccessToken } from "../../src/utils/jwt";
import { Role, CustodyStatus, CustodyEventType } from "@prisma/client";

// Mock Prisma
vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    instrument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    custodyEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn((cb) =>
      cb({
        instrument: { update: vi.fn() },
        custodyEvent: { create: vi.fn() },
        auditEvent: { create: vi.fn() },
      })
    ),
  },
}));

// Fixtures
const institutionId = "inst-pune-01";
const instrumentId = "instrument-pune-01";

const instUser = {
  id: "user-inst-01",
  email: "inst@pune.ac.in",
  fullName: "Prof. Pune",
  role: Role.INSTITUTION_USER,
  institutionId,
  isActive: true,
};

const otherInstUser = {
  id: "user-inst-02",
  email: "inst@mumbai.ac.in",
  fullName: "Prof. Mumbai",
  role: Role.INSTITUTION_USER,
  institutionId: "inst-other",
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

const mockInstrument = {
  id: instrumentId,
  instrumentNumber: "FDR-BOB-2026-802",
  institutionId,
  status: "UNDER_SCRUTINY",
  custodyStatus: CustodyStatus.NOT_RECEIVED,
  originalReceived: false,
  originalReceivedAt: null,
  physicalLocation: null,
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

describe("Milestone 5 — Physical Custody Management API", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/instruments/:instrumentId/custody", () => {
    it("allows institution user to view custody of their own instrument", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.custodyEvent.findMany).mockResolvedValue([
        {
          id: "event-01",
          instrumentId,
          eventType: CustodyEventType.ORIGINAL_RECEIVED,
          custodyStatus: CustodyStatus.IN_OFFICE_CUSTODY,
          recordedLocation: "Vault A, Shelf 2",
          remarks: "Physical FDR receipt deposited by courier",
          eventTimestamp: new Date(),
          createdAt: new Date(),
          recordedBy: { id: "officer-01", fullName: "Officer Sharma", email: "officer@aicte.gov.in", role: Role.AICTE_OFFICER },
        },
      ] as any);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/custody`)
        .set("Authorization", bearerToken(instUser));

      expect(res.status).toBe(200);
      expect(res.body.currentCustody).toBeDefined();
      expect(res.body.currentCustody.custodyStatus).toBe(CustodyStatus.NOT_RECEIVED);
      expect(res.body.events).toHaveLength(1);
      expect(res.body.events[0].recordedLocation).toBe("Vault A, Shelf 2");
    });

    it("prevents cross-institution custody access with 404 Not Found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(otherInstUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/custody`)
        .set("Authorization", bearerToken(otherInstUser));

      expect(res.status).toBe(404);
      expect(prisma.custodyEvent.findMany).not.toHaveBeenCalled();
    });

    it("allows AICTE Officer to view custody for any instrument", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(officerUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);
      vi.mocked(prisma.custodyEvent.findMany).mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/instruments/${instrumentId}/custody`)
        .set("Authorization", bearerToken(officerUser));

      expect(res.status).toBe(200);
      expect(res.body.currentCustody).toBeDefined();
      expect(res.body.events).toEqual([]);
    });
  });

  describe("POST /api/instruments/:instrumentId/custody", () => {
    it("denies institution user from recording custody events with 403 Forbidden", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(instUser as any);

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/custody`)
        .set("Authorization", bearerToken(instUser))
        .send({
          eventType: "ORIGINAL_RECEIVED",
          physicalLocation: "Room 101",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects LOCATION_UPDATED event missing physicalLocation with 400 Validation Error", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(officerUser as any);

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/custody`)
        .set("Authorization", bearerToken(officerUser))
        .send({
          eventType: "LOCATION_UPDATED",
          physicalLocation: "   ", // empty string
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("allows AICTE Officer to record ORIGINAL_RECEIVED event and updates custody atomically", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(officerUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue(mockInstrument as any);

      const mockEvent = {
        id: "event-rec-01",
        instrumentId,
        eventType: CustodyEventType.ORIGINAL_RECEIVED,
        custodyStatus: CustodyStatus.IN_OFFICE_CUSTODY,
        recordedLocation: "HQ Vault 3, Locker 12",
        remarks: "Hard copy received via registered post",
        recordedById: officerUser.id,
        createdAt: new Date(),
        recordedBy: officerUser,
      };

      const mockUpdated = {
        id: instrumentId,
        custodyStatus: CustodyStatus.IN_OFFICE_CUSTODY,
        originalReceived: true,
        originalReceivedAt: new Date(),
        physicalLocation: "HQ Vault 3, Locker 12",
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return {
          event: mockEvent,
          updatedInstrument: mockUpdated,
        };
      });

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/custody`)
        .set("Authorization", bearerToken(officerUser))
        .send({
          eventType: "ORIGINAL_RECEIVED",
          physicalLocation: "HQ Vault 3, Locker 12",
          remarks: "Hard copy received via registered post",
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Custody event successfully recorded.");
      expect(res.body.currentCustody.custodyStatus).toBe(CustodyStatus.IN_OFFICE_CUSTODY);
      expect(res.body.currentCustody.originalReceived).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it("allows SYSTEM_ADMIN to record LOCATION_UPDATED event", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any);
      vi.mocked(prisma.instrument.findUnique).mockResolvedValue({
        ...mockInstrument,
        custodyStatus: CustodyStatus.IN_OFFICE_CUSTODY,
        originalReceived: true,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return {
          event: {
            id: "event-loc-02",
            eventType: CustodyEventType.LOCATION_UPDATED,
            recordedLocation: "Regional Strongroom Cabinet 5",
          },
          updatedInstrument: {
            id: instrumentId,
            physicalLocation: "Regional Strongroom Cabinet 5",
          },
        };
      });

      const res = await request(app)
        .post(`/api/instruments/${instrumentId}/custody`)
        .set("Authorization", bearerToken(adminUser))
        .send({
          eventType: "LOCATION_UPDATED",
          physicalLocation: "Regional Strongroom Cabinet 5",
          remarks: "Transferred from HQ to regional strongroom",
        });

      expect(res.status).toBe(201);
      expect(res.body.currentCustody.physicalLocation).toBe("Regional Strongroom Cabinet 5");
    });
  });
});
