/**
 * src/routes/audit.ts
 * Milestone 8: Global, searchable, paginated audit log endpoint.
 *
 * Authorization model:
 *   INSTITUTION_USER — may only see events for instruments belonging to their institution.
 *                      Tenancy is enforced server-side: the route first fetches the set of
 *                      instrument IDs belonging to the authenticated user's institution,
 *                      then constrains entityId to that set and entityType to 'Instrument'.
 *                      Any client-supplied institutionId is ignored.
 *   AICTE_OFFICER    — system-wide read access. A client-supplied institutionId is accepted
 *                      as an additional narrowing filter (translated to an instrument sub-query)
 *                      but never as proof of authorization.
 *   SYSTEM_ADMIN     — same as AICTE_OFFICER.
 *
 * Schema limitation (documented):
 *   AuditEvent rows where entityType != 'Instrument' (e.g. legacy 'Document' events emitted
 *   before the M8 fix) cannot be reliably associated with an institution without an explicit
 *   DB relation. For INSTITUTION_USER, such events are excluded. OFFICER and ADMIN can still
 *   see them by supplying entityType=Document (or omitting the entityType filter).
 *   Since M8, all document events are emitted with entityType='Instrument', so this only
 *   affects any legacy rows that may exist in the live database.
 *
 * Response shape:
 *   {
 *     events: AuditEvent[],
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   }
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { auditQuerySchema } from "../validation/audit";
import { verifyAuditChain } from "../utils/auditChain";

const router = Router();

/**
 * GET /api/audit
 * Returns a paginated, filtered audit event log.
 * Authorized: all authenticated roles (institution-scoped for INSTITUTION_USER).
 */
router.get(
  "/",
  requireAuth,
  requireRoles(
    Role.INSTITUTION_USER,
    Role.SCRUTINY_OFFICER,
    Role.APPROVER,
    Role.ADMIN,
    Role.AUDITOR,
    Role.AICTE_OFFICER,
    Role.SYSTEM_ADMIN
  ),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;

      // ── 1. Validate query parameters ────────────────────────────────────────
      const validation = auditQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "One or more query parameters are invalid.",
          issues: validation.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        });
        return;
      }

      const {
        page,
        limit,
        entityType,
        entityId,
        action,
        actorId,
        from,
        to,
        institutionId: clientInstitutionId,
      } = validation.data;

      const skip = (page - 1) * limit;

      // ── 2. Determine tenant scope ────────────────────────────────────────────

      /**
       * allowedEntityIds: when non-null, restricts entityId to this set.
       * This is the mechanism for institution-level tenant isolation.
       */
      let allowedEntityIds: string[] | null = null;

      if (user.role === Role.INSTITUTION_USER) {
        // ── INSTITUTION_USER: restrict to own institution ────────────────────
        if (!user.institutionId) {
          // Account with no linked institution has no visible audit events
          res.status(200).json({
            events: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          });
          return;
        }

        // Reject an explicit request for non-Instrument entityType —
        // we cannot safely scope those without a DB relation.
        if (entityType && entityType !== "Instrument") {
          res.status(403).json({
            error: "Forbidden",
            message:
              "Institution users may only query audit events for Instrument entities.",
          });
          return;
        }

        // Fetch instrument IDs belonging to this institution.
        // This is a bounded query — institution instruments are naturally finite.
        const institutionInstruments = await prisma.instrument.findMany({
          where: { institutionId: user.institutionId },
          select: { id: true },
        });

        allowedEntityIds = institutionInstruments.map((i) => i.id);

        // If the institution has no instruments, there are no visible events
        if (allowedEntityIds.length === 0) {
          res.status(200).json({
            events: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          });
          return;
        }
      } else if (clientInstitutionId) {
        // ── AICTE_OFFICER / SYSTEM_ADMIN with optional institution narrowing ──
        // The caller wants to narrow results to a specific institution's instruments.
        // We honour this as a narrowing filter (not authorization).
        const institutionInstruments = await prisma.instrument.findMany({
          where: { institutionId: clientInstitutionId },
          select: { id: true },
        });
        allowedEntityIds = institutionInstruments.map((i) => i.id);

        if (allowedEntityIds.length === 0) {
          res.status(200).json({
            events: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          });
          return;
        }
      }

      // ── 3. Build the WHERE clause ────────────────────────────────────────────

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};

      // Institution users are always scoped to Instrument events
      if (user.role === Role.INSTITUTION_USER) {
        where.entityType = "Instrument";
      } else if (entityType) {
        where.entityType = entityType;
      } else if (clientInstitutionId) {
        // Institution narrowing for officers implies Instrument entityType
        where.entityType = "Instrument";
      }

      // entityId filter (combined with allowedEntityIds when set)
      if (entityId && allowedEntityIds) {
        // Both a specific entityId and a set of allowed IDs: intersect them.
        // If the requested entityId is not in the allowed set, return empty.
        if (!allowedEntityIds.includes(entityId)) {
          res.status(200).json({
            events: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          });
          return;
        }
        where.entityId = entityId;
      } else if (entityId) {
        where.entityId = entityId;
      } else if (allowedEntityIds) {
        where.entityId = { in: allowedEntityIds };
      }

      if (action) where.action = action;
      if (actorId) where.actorId = actorId;

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      // ── 4. Execute paginated query ───────────────────────────────────────────
      //
      // Stable ordering: primary createdAt DESC, secondary id DESC.
      // The id tie-breaker guarantees deterministic pagination when multiple
      // events share the exact same createdAt timestamp.

      const [total, events] = await prisma.$transaction([
        prisma.auditEvent.count({ where }),
        prisma.auditEvent.findMany({
          where,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            actorId: true,
            metadata: true,
            createdAt: true,
            actor: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],
          skip,
          take: limit,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Escapes a cell value for safe RFC 4180 CSV export.
 * Mitigates CSV Injection / Formula Injection by prefixing formula triggers with a single quote.
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = typeof val === "string" ? val : typeof val === "object" ? JSON.stringify(val) : String(val);

  // Prefix formula injection triggers (=, +, -, @, \t, \r) with '
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * GET /api/audit/chain-verify
 * Cryptographic hash-chain integrity verification.
 * Accessible to AUDITOR and ADMIN roles.
 */
router.get(
  "/chain-verify",
  requireAuth,
  requireRoles(Role.AUDITOR, Role.ADMIN, Role.SYSTEM_ADMIN),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await verifyAuditChain(prisma);
      res.status(200).json({
        message: result.verified
          ? "Audit chain verified successfully: No tampering or missing blocks detected."
          : "Audit chain verification failed: Potential tampering or break in chain continuity.",
        verification: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/audit/export
 * Exports filtered audit events as a structured CSV report.
 * Protected against CSV formula injection.
 * Restricted to AUDITOR and ADMIN.
 */
router.get(
  "/export",
  requireAuth,
  requireRoles(Role.AUDITOR, Role.ADMIN, Role.SYSTEM_ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, action, fromDate, toDate } = req.query;

      const whereClause: Record<string, unknown> = {};
      if (entityType && typeof entityType === "string") {
        whereClause.entityType = entityType;
      }
      if (action && typeof action === "string") {
        whereClause.action = action;
      }
      if (fromDate || toDate) {
        const createdAtFilter: Record<string, Date> = {};
        if (fromDate && typeof fromDate === "string") {
          createdAtFilter.gte = new Date(fromDate);
        }
        if (toDate && typeof toDate === "string") {
          createdAtFilter.lte = new Date(toDate);
        }
        whereClause.createdAt = createdAtFilter;
      }

      // Max 5000 rows to prevent unbounded memory exhaustion
      const events = await prisma.auditEvent.findMany({
        where: whereClause,
        include: {
          actor: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5000,
      });

      const headers = [
        "Event ID",
        "Timestamp",
        "Action",
        "Entity Type",
        "Entity ID",
        "Actor ID",
        "Actor Name",
        "Actor Email",
        "Actor Role",
        "Metadata",
      ];

      const csvRows: string[] = [headers.map(escapeCsvCell).join(",")];

      for (const evt of events) {
        const row = [
          evt.id,
          evt.createdAt.toISOString(),
          evt.action,
          evt.entityType,
          evt.entityId,
          evt.actorId || "",
          evt.actor?.fullName || "SYSTEM",
          evt.actor?.email || "",
          evt.actor?.role || "",
          evt.metadata ? JSON.stringify(evt.metadata) : "",
        ];
        csvRows.push(row.map(escapeCsvCell).join(","));
      }

      const csvContent = csvRows.join("\r\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="fdr_sentinel_audit_export_${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
