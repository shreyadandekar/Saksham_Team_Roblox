/**
 * src/types/custody.ts
 * Type definitions for physical custody status, events, and API payloads.
 */

export type CustodyStatus =
  | "PENDING_RECEIPT"
  | "IN_CUSTODY"
  | "RELEASED"
  | "TRANSFERRED"
  | "DISCREPANCY";

export type CustodyEventType =
  | "ORIGINAL_RECEIVED"
  | "LOCATION_UPDATED"
  | "CUSTODY_CONFIRMED"
  | "ORIGINAL_RELEASED"
  | "DISCREPANCY_FLAGGED"
  | "OTHER";

export interface CustodyEventUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface CustodyEvent {
  id: string;
  instrumentId: string;
  eventType: CustodyEventType;
  eventTimestamp: string;
  recordedByUserId: string;
  recordedByUser?: CustodyEventUser;
  physicalLocation: string | null;
  custodyStatusAfter: CustodyStatus;
  remarks: string | null;
  createdAt: string;
}

export interface CurrentCustodyState {
  custodyStatus: CustodyStatus;
  originalReceived: boolean;
  originalReceivedAt: string | null;
  physicalLocation: string | null;
  receivingOfficer: CustodyEventUser | null;
  mostRecentEvent: CustodyEvent | null;
}

export interface CustodyDetailsResponse {
  success: boolean;
  instrumentId: string;
  currentCustody: CurrentCustodyState;
  events: CustodyEvent[];
}

export interface RecordCustodyEventInput {
  eventType: CustodyEventType;
  physicalLocation?: string;
  remarks?: string;
}

export interface RecordCustodyEventResponse {
  success: boolean;
  message: string;
  event: CustodyEvent;
  currentCustody: CurrentCustodyState;
}
