/**
 * server/src/validation/custody.ts
 * Zod validation schema for physical custody event recording.
 */

import { z } from "zod";
import { CustodyEventType, CustodyStatus } from "@prisma/client";

export const recordCustodyEventSchema = z.object({
  eventType: z.nativeEnum(CustodyEventType, {
    errorMap: () => ({ message: "Invalid custody event type." }),
  }),
  custodyStatus: z.nativeEnum(CustodyStatus).optional(),
  physicalLocation: z.string().trim().max(255).optional(),
  remarks: z.string().trim().max(1000).optional(),
  eventTimestamp: z.string().datetime().optional(),
}).refine((data) => {
  // If event is LOCATION_UPDATED, a physicalLocation is required
  if (data.eventType === CustodyEventType.LOCATION_UPDATED && (!data.physicalLocation || !data.physicalLocation.trim())) {
    return false;
  }
  return true;
}, {
  message: "Physical location is required when recording a LOCATION_UPDATED event.",
  path: ["physicalLocation"],
});

export type RecordCustodyEventInput = z.infer<typeof recordCustodyEventSchema>;
