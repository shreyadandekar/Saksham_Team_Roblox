/**
 * src/routes/instruments.ts
 * Instruments endpoint with institution-level access control, lifecycle workflows,
 * audit event persistence, and validation.
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role, InstrumentStatus, Prisma, InstrumentRelationshipType, RelationshipStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { createInstrumentSchema } from "../validation/instrument";
import { renewOrReplaceSchema, scrutinyDecisionSchema } from "../validation/relationship";

const router = Router();

/**
 * GET /api/instruments
 * Protected endpoint returning instruments according to the user's role policy:
 * - INSTITUTION_USER: restricted strictly to their authenticated institutionId.
 * - AICTE_OFFICER: system-wide view for regulatory scrutiny.
 * - SYSTEM_ADMIN: system-wide view for administrative oversight.
 */
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { status, search, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      const whereClause: Record<string, unknown> = {};

      if (user.role === Role.INSTITUTION_USER) {
        // Institution ID MUST originate from authenticated identity, NEVER from client input
        if (!user.institutionId) {
          res.status(200).json({ instruments: [], meta: { totalCount: 0 } });
          return;
        }
        whereClause.institutionId = user.institutionId;
      } else if (
        user.role === Role.AICTE_OFFICER ||
        user.role === Role.SYSTEM_ADMIN
      ) {
        // Officer & Admin system-wide policy
      } else {
        res.status(403).json({
          error: "Forbidden",
          message: "Role not authorized to access instruments.",
        });
        return;
      }

      if (status && typeof status === "string") {
        if (Object.values(InstrumentStatus).includes(status as InstrumentStatus)) {
          whereClause.status = status as InstrumentStatus;
        }
      }

      if (search && typeof search === "string" && search.trim()) {
        const query = search.trim();
        const searchConditions: Record<string, unknown>[] = [
          { instrumentNumber: { contains: query, mode: "insensitive" } },
          { bankName: { contains: query, mode: "insensitive" } },
          { branchName: { contains: query, mode: "insensitive" } },
        ];

        // Officer / admin can also search by institution name or code
        if (user.role !== Role.INSTITUTION_USER) {
          searchConditions.push(
            { institution: { name: { contains: query, mode: "insensitive" } } },
            { institution: { code: { contains: query, mode: "insensitive" } } }
          );
        }

        whereClause.OR = searchConditions;
      }

      const validSortFields = [
        "createdAt",
        "updatedAt",
        "amount",
        "maturityDate",
        "issueDate",
        "status",
      ];
      const sortField =
        typeof sortBy === "string" && validSortFields.includes(sortBy)
          ? sortBy
          : "createdAt";
      const order = sortOrder === "asc" ? "asc" : "desc";

      const instruments = await prisma.instrument.findMany({
        where: whereClause,
        include: {
          institution: {
            select: { id: true, name: true, code: true, institutionType: true },
          },
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { [sortField]: order },
      });

      const totalCount = instruments.length;
      let draftCount = 0;
      let submittedCount = 0;
      let underScrutinyCount = 0;
      let activeCount = 0;

      for (const inst of instruments) {
        if (inst.status === InstrumentStatus.DRAFT) draftCount++;
        else if (inst.status === InstrumentStatus.SUBMITTED) submittedCount++;
        else if (inst.status === InstrumentStatus.UNDER_SCRUTINY) underScrutinyCount++;
        else if (inst.status === InstrumentStatus.ACTIVE) activeCount++;
      }

      res.status(200).json({
        instruments,
        meta: {
          totalCount,
          draftCount,
          submittedCount,
          underScrutinyCount,
          activeCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/instruments/:id
 * Protected endpoint returning an individual instrument and its audit event log.
 * Strictly prevents cross-institution data leakage.
 */
router.get(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const id = String(req.params.id);

      const instrument = await prisma.instrument.findUnique({
        where: { id },
        include: {
          institution: {
            select: { id: true, name: true, code: true, institutionType: true },
          },
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument record not found.",
        });
        return;
      }

      // Enforce institution-level isolation: Institution users may only see their own instruments
      if (
        user.role === Role.INSTITUTION_USER &&
        instrument.institutionId !== user.institutionId
      ) {
        // Return 404 to avoid leaking existence of another institution's record
        res.status(404).json({
          error: "Not Found",
          message: "Instrument record not found.",
        });
        return;
      }

      // Fetch audit history for this instrument
      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          entityType: "Instrument",
          entityId: instrument.id,
        },
        include: {
          actor: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Milestone 6: Fetch predecessor relationships (where this instrument is the successor)
      // and successor relationships (where this instrument is the original)
      const [predecessors, successors] = await Promise.all([
        prisma.instrumentRelationship.findMany({
          where: { targetInstrumentId: instrument.id },
          include: {
            sourceInstrument: {
              select: {
                id: true,
                instrumentNumber: true,
                bankName: true,
                amount: true,
                status: true,
                maturityDate: true,
              },
            },
            initiatedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.instrumentRelationship.findMany({
          where: { sourceInstrumentId: instrument.id },
          include: {
            targetInstrument: {
              select: {
                id: true,
                instrumentNumber: true,
                bankName: true,
                amount: true,
                status: true,
                maturityDate: true,
              },
            },
            initiatedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      res.status(200).json({
        instrument,
        auditEvents,
        relationships: {
          predecessors,
          successors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments
 * Creates a new FDR Instrument draft (or submits immediately if requested).
 * Server-side RBAC:
 * - Must be authenticated.
 * - Institution is assigned strictly from authenticated user's institutionId.
 * - Institution user cannot specify another institution's ID or arbitrary status.
 */
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Ensure user belongs to an institution if creating an instrument
      let institutionId = user.institutionId;
      if (user.role === Role.INSTITUTION_USER) {
        if (!institutionId) {
          res.status(403).json({
            error: "Forbidden",
            message: "User account is not linked to an accredited institution.",
          });
          return;
        }
      } else if (user.role === Role.SYSTEM_ADMIN) {
        // System admin may provide institutionId in body if testing/administering
        const candidateId = req.body.institutionId;
        if (typeof candidateId === "string" && candidateId.trim()) {
          institutionId = candidateId.trim();
        } else if (!institutionId) {
          res.status(400).json({
            error: "Bad Request",
            message: "Institution ID is required for administrative instrument registration.",
          });
          return;
        }
      } else {
        res.status(403).json({
          error: "Forbidden",
          message: "AICTE officers cannot register FDR instruments directly.",
        });
        return;
      }

      // Validate request body
      const parsed = createInstrumentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Please correct the invalid fields.",
          issues: parsed.error.issues,
        });
        return;
      }

      const data = parsed.data;
      const initialStatus = data.submitImmediately
        ? InstrumentStatus.SUBMITTED
        : InstrumentStatus.DRAFT;

      // Atomic transaction: create instrument record + audit log
      const result = await prisma.$transaction(async (tx) => {
        const instrument = await tx.instrument.create({
          data: {
            instrumentNumber: data.instrumentNumber,
            bankName: data.bankName,
            branchName: data.branchName,
            amount: new Prisma.Decimal(data.amount),
            issueDate: new Date(data.issueDate),
            maturityDate: new Date(data.maturityDate),
            favouringDetails: data.favouringDetails,
            status: initialStatus,
            documentMetadata: data.documentMetadata ? (data.documentMetadata as Prisma.InputJsonValue) : Prisma.JsonNull,
            institutionId: institutionId!,
            createdById: user.id,
          },
          include: {
            institution: {
              select: { id: true, name: true, code: true, institutionType: true },
            },
            createdBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        });

        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: data.submitImmediately ? "INSTRUMENT_SUBMITTED" : "INSTRUMENT_CREATED",
            entityType: "Instrument",
            entityId: instrument.id,
            metadata: {
              previousStatus: null,
              newStatus: initialStatus,
              instrumentNumber: instrument.instrumentNumber,
              bankName: instrument.bankName,
              amount: data.amount,
              status: initialStatus,
              documentMetadata: data.documentMetadata || null,
            },
          },
        });

        return instrument;
      });

      res.status(201).json({
        message: data.submitImmediately
          ? "FDR instrument created and submitted for scrutiny."
          : "FDR instrument draft saved successfully.",
        instrument: result,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error: "Conflict",
          message:
            "An instrument with this reference number already exists for your institution.",
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:id/submit
 * Submits an existing DRAFT instrument for scrutiny.
 * Strictly checks that:
 * - Caller belongs to the owning institution (or is SYSTEM_ADMIN).
 * - Current status is DRAFT.
 */
router.post(
  "/:id/submit",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const id = String(req.params.id);

      const instrument = await prisma.instrument.findUnique({
        where: { id },
      });

      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      // Check ownership
      if (
        user.role === Role.INSTITUTION_USER &&
        instrument.institutionId !== user.institutionId
      ) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      // Check lifecycle transition eligibility
      if (instrument.status !== InstrumentStatus.DRAFT) {
        res.status(400).json({
          error: "Invalid State Transition",
          message: `Cannot submit instrument in '${instrument.status}' status. Only DRAFT instruments can be submitted.`,
        });
        return;
      }

      // Atomic transition + audit log
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.instrument.update({
          where: { id },
          data: {
            status: InstrumentStatus.SUBMITTED,
          },
          include: {
            institution: {
              select: { id: true, name: true, code: true },
            },
          },
        });

        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: "INSTRUMENT_SUBMITTED",
            entityType: "Instrument",
            entityId: id,
            metadata: {
              previousStatus: InstrumentStatus.DRAFT,
              newStatus: InstrumentStatus.SUBMITTED,
              instrumentNumber: instrument.instrumentNumber,
            },
          },
        });

        return result;
      });

      res.status(200).json({
        message: "Instrument successfully submitted for scrutiny.",
        instrument: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:id/start-scrutiny
 * Officer-only action: Marks a SUBMITTED instrument as UNDER_SCRUTINY.
 */
router.post(
  "/:id/start-scrutiny",
  requireAuth,
  requireRoles(Role.AICTE_OFFICER, Role.SYSTEM_ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const id = String(req.params.id);

      const instrument = await prisma.instrument.findUnique({
        where: { id },
      });

      if (!instrument) {
        res.status(404).json({
          error: "Not Found",
          message: "Instrument not found.",
        });
        return;
      }

      if (instrument.status !== InstrumentStatus.SUBMITTED) {
        res.status(400).json({
          error: "Invalid State Transition",
          message: `Cannot start scrutiny for instrument in '${instrument.status}' status. Expected SUBMITTED.`,
        });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.instrument.update({
          where: { id },
          data: {
            status: InstrumentStatus.UNDER_SCRUTINY,
          },
          include: {
            institution: {
              select: { id: true, name: true, code: true },
            },
          },
        });

        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: "SCRUTINY_STARTED",
            entityType: "Instrument",
            entityId: id,
            metadata: {
              previousStatus: InstrumentStatus.SUBMITTED,
              newStatus: InstrumentStatus.UNDER_SCRUTINY,
              officerEmail: user.email,
            },
          },
        });

        return result;
      });

      res.status(200).json({
        message: "Instrument scrutiny initiated successfully.",
        instrument: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:id/renew-or-replace
 * Initiates a renewal or replacement submission linked to an existing instrument.
 * Rules:
 * - Must be authenticated institution user belonging to the owning institution (or SYSTEM_ADMIN).
 * - Source instrument must be in an eligible state (ACTIVE or MATURED).
 * - Source instrument cannot be DRAFT, REJECTED, or RELEASED.
 * - Prevents multiple pending renewal/replacements for the same source instrument.
 * - Source instrument cannot link to itself or create a circular link.
 * - Atomic transaction creates successor instrument, links relationship, and creates audit events.
 * - Original instrument remains active/unchanged until the successor is formally approved.
 */
router.post(
  "/:id/renew-or-replace",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const sourceId = String(req.params.id);

      // Fetch source instrument
      const source = await prisma.instrument.findUnique({
        where: { id: sourceId },
      });

      if (!source) {
        res.status(404).json({
          error: "Not Found",
          message: "Original instrument not found.",
        });
        return;
      }

      // Check ownership
      if (
        user.role === Role.INSTITUTION_USER &&
        source.institutionId !== user.institutionId
      ) {
        res.status(404).json({
          error: "Not Found",
          message: "Original instrument not found.",
        });
        return;
      }

      // Eligibility check on original instrument
      const eligibleStatuses: InstrumentStatus[] = [
        InstrumentStatus.ACTIVE,
        InstrumentStatus.MATURED,
      ];
      if (!eligibleStatuses.includes(source.status)) {
        res.status(400).json({
          error: "Invalid State Transition",
          message: `Cannot renew or replace instrument in '${source.status}' status. Only ACTIVE or MATURED instruments can be renewed/replaced.`,
        });
        return;
      }

      // Check for existing pending renewal/replacement
      const activePendingRelationship = await prisma.instrumentRelationship.findFirst({
        where: {
          sourceInstrumentId: sourceId,
          status: RelationshipStatus.PENDING,
        },
        include: {
          targetInstrument: {
            select: { id: true, instrumentNumber: true, status: true },
          },
        },
      });

      if (activePendingRelationship) {
        res.status(409).json({
          error: "Conflict",
          message: `A pending ${activePendingRelationship.relationshipType.toLowerCase()} (${activePendingRelationship.targetInstrument.instrumentNumber}) is already under scrutiny for this instrument.`,
        });
        return;
      }

      // Validate request body
      const parsed = renewOrReplaceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Please correct the invalid fields.",
          issues: parsed.error.issues,
        });
        return;
      }

      const data = parsed.data;

      // Prevent duplicate instrument number for this institution
      if (data.instrumentNumber.trim().toUpperCase() === source.instrumentNumber.trim().toUpperCase()) {
        res.status(400).json({
          error: "Validation Error",
          message: "The replacement instrument must have a distinct reference number from the original instrument.",
        });
        return;
      }

      const initialStatus = data.submitImmediately
        ? InstrumentStatus.SUBMITTED
        : InstrumentStatus.DRAFT;

      // Atomic creation of successor instrument + relationship + audit logs
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create successor instrument
        const successor = await tx.instrument.create({
          data: {
            instrumentNumber: data.instrumentNumber,
            bankName: data.bankName,
            branchName: data.branchName,
            amount: new Prisma.Decimal(data.amount),
            issueDate: new Date(data.issueDate),
            maturityDate: new Date(data.maturityDate),
            favouringDetails: data.favouringDetails,
            status: initialStatus,
            documentMetadata: data.documentMetadata ? (data.documentMetadata as Prisma.InputJsonValue) : Prisma.JsonNull,
            institutionId: source.institutionId,
            createdById: user.id,
          },
          include: {
            institution: {
              select: { id: true, name: true, code: true },
            },
          },
        });

        // 2. Create relationship record
        const relationship = await tx.instrumentRelationship.create({
          data: {
            sourceInstrumentId: source.id,
            targetInstrumentId: successor.id,
            relationshipType: data.relationshipType,
            status: RelationshipStatus.PENDING,
            initiatedById: user.id,
            remarks: data.remarks || null,
          },
        });

        // 3. Log audit event on successor
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: `${data.relationshipType}_SUBMITTED`,
            entityType: "Instrument",
            entityId: successor.id,
            metadata: {
              previousStatus: null,
              newStatus: initialStatus,
              predecessorInstrumentId: source.id,
              predecessorInstrumentNumber: source.instrumentNumber,
              relationshipType: data.relationshipType,
              status: initialStatus,
              remarks: data.remarks || null,
            },
          },
        });

        // 4. Log audit event on original instrument (preserving original state)
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: `${data.relationshipType}_INITIATED`,
            entityType: "Instrument",
            entityId: source.id,
            metadata: {
              previousStatus: source.status,
              newStatus: source.status,
              successorInstrumentId: successor.id,
              successorInstrumentNumber: successor.instrumentNumber,
              relationshipType: data.relationshipType,
              successorStatus: initialStatus,
            },
          },
        });

        return { successor, relationship };
      });

      res.status(201).json({
        message: `${data.relationshipType} request recorded and submitted for regulatory scrutiny.`,
        successor: result.successor,
        relationship: result.relationship,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error: "Conflict",
          message: "An instrument with this reference number already exists for your institution.",
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/instruments/:id/relationships
 * Returns relationship chain (predecessors and successors) for an instrument.
 */
router.get(
  "/:id/relationships",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const id = String(req.params.id);

      const instrument = await prisma.instrument.findUnique({
        where: { id },
      });

      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      if (user.role === Role.INSTITUTION_USER && instrument.institutionId !== user.institutionId) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const [predecessors, successors] = await Promise.all([
        prisma.instrumentRelationship.findMany({
          where: { targetInstrumentId: id },
          include: {
            sourceInstrument: {
              select: {
                id: true,
                instrumentNumber: true,
                bankName: true,
                branchName: true,
                amount: true,
                status: true,
                maturityDate: true,
                issueDate: true,
              },
            },
            initiatedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.instrumentRelationship.findMany({
          where: { sourceInstrumentId: id },
          include: {
            targetInstrument: {
              select: {
                id: true,
                instrumentNumber: true,
                bankName: true,
                branchName: true,
                amount: true,
                status: true,
                maturityDate: true,
                issueDate: true,
              },
            },
            initiatedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      res.status(200).json({
        instrumentId: id,
        predecessors,
        successors,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/instruments/:id/scrutiny-decision
 * Regulatory officer action to decide on an instrument under scrutiny.
 * Supported decisions:
 * - APPROVE:
 *     - Transitions instrument to ACTIVE.
 *     - If this instrument is a successor in a PENDING relationship:
 *         - Marks relationship as APPROVED.
 *         - Atomically supersedes original instrument (marks predecessor as MATURED if not already, and logs SUPERSEDED audit event).
 * - REQUEST_CORRECTION:
 *     - Transitions instrument to CORRECTION_REQUIRED.
 *     - Preserves original instrument untouched.
 * - REJECT:
 *     - Transitions instrument to REJECTED.
 *     - If in a pending relationship, marks relationship as REJECTED.
 *     - Preserves original instrument untouched.
 */
router.post(
  "/:id/scrutiny-decision",
  requireAuth,
  requireRoles(Role.AICTE_OFFICER, Role.SYSTEM_ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const id = String(req.params.id);

      const parsed = scrutinyDecisionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation Error",
          message: "Invalid scrutiny decision payload.",
          issues: parsed.error.issues,
        });
        return;
      }

      const { decision, remarks } = parsed.data;

      const instrument = await prisma.instrument.findUnique({
        where: { id },
      });

      if (!instrument) {
        res.status(404).json({ error: "Not Found", message: "Instrument not found." });
        return;
      }

      const acceptableCurrentStatuses: InstrumentStatus[] = [
        InstrumentStatus.SUBMITTED,
        InstrumentStatus.UNDER_SCRUTINY,
      ];
      if (!acceptableCurrentStatuses.includes(instrument.status)) {
        res.status(400).json({
          error: "Invalid State Transition",
          message: `Cannot record scrutiny decision for instrument in '${instrument.status}' status. Expected SUBMITTED or UNDER_SCRUTINY.`,
        });
        return;
      }

      // Check if this instrument is a successor in any pending relationship
      const pendingRelationship = await prisma.instrumentRelationship.findFirst({
        where: {
          targetInstrumentId: id,
          status: RelationshipStatus.PENDING,
        },
        include: {
          sourceInstrument: true,
        },
      });

      const updated = await prisma.$transaction(async (tx) => {
        let newStatus: InstrumentStatus;

        if (decision === "APPROVE") {
          newStatus = InstrumentStatus.ACTIVE;
        } else if (decision === "REQUEST_CORRECTION") {
          newStatus = InstrumentStatus.CORRECTION_REQUIRED;
        } else {
          newStatus = InstrumentStatus.REJECTED;
        }

        // 1. Update target instrument status
        const targetResult = await tx.instrument.update({
          where: { id },
          data: { status: newStatus },
          include: {
            institution: { select: { id: true, name: true, code: true } },
          },
        });

        // 2. Audit event on target instrument
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            action: `SCRUTINY_${decision}`,
            entityType: "Instrument",
            entityId: id,
            metadata: {
              previousStatus: instrument.status,
              newStatus,
              decision,
              remarks,
              officerEmail: user.email,
              hasPredecessorRelationship: Boolean(pendingRelationship),
            },
          },
        });

        // 3. Handle predecessor relationship transitions if applicable
        if (pendingRelationship) {
          if (decision === "APPROVE") {
            // Update relationship to APPROVED
            await tx.instrumentRelationship.update({
              where: { id: pendingRelationship.id },
              data: { status: RelationshipStatus.APPROVED },
            });

            // Mark predecessor as superseded/matured if still active
            const source = pendingRelationship.sourceInstrument;
            if (source.status === InstrumentStatus.ACTIVE) {
              await tx.instrument.update({
                where: { id: source.id },
                data: { status: InstrumentStatus.MATURED },
              });
            }

            // Log audit event on superseded original instrument
            await tx.auditEvent.create({
              data: {
                actorId: user.id,
                action: "INSTRUMENT_SUPERSEDED",
                entityType: "Instrument",
                entityId: source.id,
                metadata: {
                  previousStatus: source.status,
                  newStatus: source.status === InstrumentStatus.ACTIVE ? InstrumentStatus.MATURED : source.status,
                  supersededByInstrumentId: id,
                  supersededByInstrumentNumber: instrument.instrumentNumber,
                  relationshipType: pendingRelationship.relationshipType,
                  officerRemarks: remarks,
                },
              },
            });
          } else if (decision === "REJECT") {
            // Update relationship to REJECTED (original instrument remains untouched)
            await tx.instrumentRelationship.update({
              where: { id: pendingRelationship.id },
              data: { status: RelationshipStatus.REJECTED },
            });
          }
          // Note: On REQUEST_CORRECTION, relationship remains PENDING while successor is revised
        }

        return targetResult;
      });

      res.status(200).json({
        message: `Scrutiny decision '${decision}' successfully applied.`,
        instrument: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
