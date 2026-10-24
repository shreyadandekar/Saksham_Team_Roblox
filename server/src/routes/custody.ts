/**
 * server/src/routes/custody.ts
 * Physical custody management router.
 *
 * Endpoints:
 *  GET  /api/instruments/:instrumentId/custody  - Read current custody state & event history
 *  POST /api/instruments/:instrumentId/custody  - Record an authorized custody event (Officer/Admin only)
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role, CustodyStatus, CustodyEventType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { recordCustodyEventSchema } from "../validation/custody";

const router = Router({ mergeParams: true });

/**
 * Helper: Resolve and authorize instrument access for the authenticated user.
 */
async function resolveInstrument(
  instrumentId: string,
  user: NonNullable<Request["user"]>
) {
  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    select: {
      id: true,
      institutionId: true,
      status: true,
      custodyStatus: true,
      originalReceived: true,
      originalReceivedAt: true,
      physicalLocation: true,
    },
  });

  if (!instrument) return null;

  // Institution isolation
  if (
    user.role === Role.INSTITUTION_USER &&
    instrument.institutionId !== user.institutionId
  ) {
    return null;
  }

  return instrument;
}

/**
 * GET /api/instruments/:instrumentId/custody
 * Returns current custody state and historical timeline.
 */
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const events = await prisma.custodyEvent.findMany({
        where: { instrumentId: instrument.id },
        include: {
          recordedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: { eventTimestamp: "desc" },
      });

      res.status(200).json({
        currentCustody: {
          custodyStatus: instrument.custodyStatus,
          originalReceived: instrument.originalReceived,
          originalReceivedAt: instrument.originalReceivedAt,
          physicalLocation: instrument.physicalLocation,
        },
        events,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:instrumentId/custody
 * Records an authorized custody event.
 * Strictly restricted to AICTE_OFFICER and SYSTEM_ADMIN.
 */
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { instrumentId } = req.params as { instrumentId: string };

      // Role check: Scrutiny Officers, legacy AICTE Officers, and Admins may record physical custody events
      if (
        user.role !== Role.SCRUTINY_OFFICER &&
        user.role !== Role.AICTE_OFFICER &&
        user.role !== Role.SYSTEM_ADMIN
      ) {
        res.status(403).json({
          error: "Forbidden",
          message: "Only Scrutiny Officers are authorized to update physical custody records.",
        });
        return;
      }

      const parsed = recordCustodyEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid custody event particulars.",
          issues: parsed.error.issues,
        });
        return;
      }

      const instrument = await resolveInstrument(instrumentId, user);
      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const { eventType, physicalLocation, remarks } = parsed.data;
      const eventTimestamp = parsed.data.eventTimestamp ? new Date(parsed.data.eventTimestamp) : new Date();

      // Determine new custody status
      let newCustodyStatus: CustodyStatus;
      if (parsed.data.custodyStatus) {
        newCustodyStatus = parsed.data.custodyStatus;
      } else {
        switch (eventType) {
          case CustodyEventType.ORIGINAL_RECEIVED:
            newCustodyStatus = CustodyStatus.IN_OFFICE_CUSTODY;
            break;
          case CustodyEventType.LOCATION_UPDATED:
          case CustodyEventType.CUSTODY_CONFIRMED:
            newCustodyStatus = instrument.custodyStatus === CustodyStatus.NOT_RECEIVED
              ? CustodyStatus.IN_OFFICE_CUSTODY
              : instrument.custodyStatus;
            break;
          case CustodyEventType.ORIGINAL_RELEASED:
            newCustodyStatus = CustodyStatus.PERMANENTLY_RELEASED;
            break;
          default:
            newCustodyStatus = instrument.custodyStatus;
        }
      }

      // Atomic update of Instrument, CustodyEvent, and AuditEvent
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create CustodyEvent
        const event = await tx.custodyEvent.create({
          data: {
            instrumentId: instrument.id,
            eventType,
            eventTimestamp,
            recordedById: user.id,
            recordedLocation: physicalLocation || instrument.physicalLocation,
            custodyStatus: newCustodyStatus,
            remarks,
          },
          include: {
            recordedBy: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
        });

        // 2. Update Instrument
        const updatedInstrument = await tx.instrument.update({
          where: { id: instrument.id },
          data: {
            custodyStatus: newCustodyStatus,
            originalReceived: eventType === CustodyEventType.ORIGINAL_RECEIVED
              ? true
              : instrument.originalReceived,
            originalReceivedAt: eventType === CustodyEventType.ORIGINAL_RECEIVED
              ? (instrument.originalReceivedAt || eventTimestamp)
              : instrument.originalReceivedAt,
            physicalLocation: physicalLocation !== undefined
              ? physicalLocation
              : instrument.physicalLocation,
          },
          select: {
            id: true,
            custodyStatus: true,
            originalReceived: true,
            originalReceivedAt: true,
            physicalLocation: true,
          },
        });

        // 3. Record AuditEvent
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: "CUSTODY_EVENT_RECORDED",
            entityType: "Instrument",
            entityId: instrument.id,
            metadata: {
              custodyEventId: event.id,
              eventType,
              previousStatus: instrument.custodyStatus,
              newStatus: newCustodyStatus,
              physicalLocation: physicalLocation || instrument.physicalLocation,
              remarks,
            },
          },
        });

        return { event, updatedInstrument };
      });

      res.status(201).json({
        message: "Custody event successfully recorded.",
        custodyEvent: result.event,
        currentCustody: result.updatedInstrument,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
