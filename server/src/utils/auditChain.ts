/**
 * src/utils/auditChain.ts
 * Cryptographic hash-chain utility for tamper-evident audit history.
 * Uses SHA-256 with canonical JSON serialization to guarantee deterministic hashing.
 */

import crypto from "crypto";
import { Prisma } from "@prisma/client";

export interface CanonicalAuditData {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
  previousHash: string | null;
}

/**
 * Deterministically serialize an object by recursively sorting its keys.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return "null";
  }
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalJsonStringify).join(",")}]`;
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJsonStringify(record[key])}`
  );
  return `{${pairs.join(",")}}`;
}

/**
 * Compute SHA-256 hex digest of canonical audit event payload.
 */
export function computeEventHash(data: CanonicalAuditData): string {
  const canonicalString = canonicalJsonStringify({
    action: data.action,
    actorId: data.actorId,
    createdAt: data.createdAt,
    entityId: data.entityId,
    entityType: data.entityType,
    metadata: data.metadata,
    previousHash: data.previousHash,
  });

  return crypto.createHash("sha256").update(canonicalString, "utf8").digest("hex");
}

export type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Persists an audit event with cryptographic linkage to the preceding event.
 * Must be executed within a transaction where relevant mutations take place.
 */
export async function createChainedAuditEvent(
  tx: PrismaTransactionClient,
  data: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
    createdAt?: Date;
  }
) {
  const eventCreatedAt = data.createdAt || new Date();

  let previousHash: string | null = null;
  if (typeof tx.auditEvent?.findFirst === "function") {
    const lastEvent = await tx.auditEvent.findFirst({
      orderBy: { createdAt: "desc" },
      select: { eventHash: true },
    });
    previousHash = lastEvent?.eventHash || null;
  }

  const eventHash = computeEventHash({
    actorId: data.actorId || null,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    metadata: data.metadata || null,
    createdAt: eventCreatedAt.toISOString(),
    previousHash,
  });

  return tx.auditEvent.create({
    data: {
      actorId: data.actorId || null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: (data.metadata as Prisma.InputJsonValue) || undefined,
      createdAt: eventCreatedAt,
      previousHash,
      eventHash,
    },
  });
}

export interface ChainVerificationResult {
  verified: boolean;
  totalEvents: number;
  compromisedEventId?: string;
  reason?: string;
}

/**
 * Verifies the integrity of the audit hash chain across all persisted events.
 */
export async function verifyAuditChain(
  db: { auditEvent: { findMany: typeof import("../db/prisma").prisma.auditEvent.findMany } }
): Promise<ChainVerificationResult> {
  const events = await db.auditEvent.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  if (events.length === 0) {
    return { verified: true, totalEvents: 0 };
  }

  let expectedPreviousHash: string | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // If legacy event before hash chaining was enabled, skip or initialize chain head
    if (!event.eventHash) {
      expectedPreviousHash = null;
      continue;
    }

    // 1. Verify previous hash linkage
    if (expectedPreviousHash !== null && event.previousHash !== expectedPreviousHash) {
      return {
        verified: false,
        totalEvents: events.length,
        compromisedEventId: event.id,
        reason: `Broken chain link at index ${i}: expected previousHash '${expectedPreviousHash}', found '${event.previousHash}'`,
      };
    }

    // 2. Recompute current event hash from canonical payload
    const recomputedHash = computeEventHash({
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      previousHash: event.previousHash,
    });

    if (recomputedHash !== event.eventHash) {
      return {
        verified: false,
        totalEvents: events.length,
        compromisedEventId: event.id,
        reason: `Hash mismatch at event ${event.id}: event content altered`,
      };
    }

    expectedPreviousHash = event.eventHash;
  }

  return {
    verified: true,
    totalEvents: events.length,
  };
}
