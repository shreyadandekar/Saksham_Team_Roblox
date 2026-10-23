/**
 * src/validation/audit.ts
 * Zod validation schemas for the Milestone 8 audit log query endpoint.
 *
 * All filters are applied in the database. Client-supplied values are
 * strictly typed and bounded. institutionId is never accepted from the
 * client as proof of authorization — tenancy is derived server-side from
 * the authenticated user identity.
 */

import { z } from "zod";

/** Maximum number of events that can be requested in a single page. */
export const AUDIT_MAX_PAGE_SIZE = 100;

/** Default page size when not specified by the caller. */
export const AUDIT_DEFAULT_PAGE_SIZE = 25;

/**
 * Valid entity types present in the audit_events table.
 * This list intentionally mirrors what routes currently emit;
 * any new entity types must be added here when introduced.
 */
export const AUDIT_ENTITY_TYPES = ["Instrument", "Document", "User"] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/**
 * Query parameter schema for GET /api/audit.
 *
 * All fields are optional. Omitted fields produce no filter (i.e. match all).
 *
 * Fields the client MAY supply:
 *   page         — 1-indexed page number (default 1)
 *   limit        — results per page (default 25, max 100)
 *   entityType   — filter by entity type
 *   entityId     — filter by a specific entity ID (instrument ID, etc.)
 *   action       — substring match is deliberately excluded; exact action match only
 *   actorId      — filter by the user who performed the action
 *   from         — ISO-8601 lower bound on createdAt (inclusive)
 *   to           — ISO-8601 upper bound on createdAt (inclusive)
 *   institutionId — only honoured for SYSTEM_ADMIN; ignored/overridden for other roles
 */
export const auditQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int("page must be an integer")
      .min(1, "page must be at least 1")
      .optional()
      .default(1),

    limit: z.coerce
      .number()
      .int("limit must be an integer")
      .min(1, "limit must be at least 1")
      .max(
        AUDIT_MAX_PAGE_SIZE,
        `limit must not exceed ${AUDIT_MAX_PAGE_SIZE}`
      )
      .optional()
      .default(AUDIT_DEFAULT_PAGE_SIZE),

    entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),

    entityId: z
      .string()
      .trim()
      .min(1, "entityId must not be empty")
      .max(255)
      .optional(),

    action: z
      .string()
      .trim()
      .min(1, "action must not be empty")
      .max(100, "action must not exceed 100 characters")
      .regex(
        /^[A-Z_]+$/,
        "action must contain only uppercase letters and underscores"
      )
      .optional(),

    actorId: z
      .string()
      .trim()
      .min(1, "actorId must not be empty")
      .max(255)
      .optional(),

    from: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "from must be a valid ISO-8601 date-time string",
      })
      .optional(),

    to: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "to must be a valid ISO-8601 date-time string",
      })
      .optional(),

    /**
     * institutionId is accepted only from SYSTEM_ADMIN callers.
     * For all other roles it is derived from req.user server-side
     * and this field is silently ignored.
     */
    institutionId: z
      .string()
      .trim()
      .min(1, "institutionId must not be empty")
      .max(255)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: "from must not be later than to",
      path: ["from"],
    }
  );

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
