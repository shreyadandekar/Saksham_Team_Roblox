/**
 * src/routes/scrutiny.ts
 * Scrutiny Queue router for AICTE Officers and System Administrators.
 * Restricted strictly by RBAC: Institution users are rejected with 403 Forbidden.
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role, InstrumentStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

// Scrutiny queue requires SCRUTINY_OFFICER (or legacy AICTE_OFFICER) or read-only AUDITOR
router.use(
  requireAuth,
  requireRoles(Role.SCRUTINY_OFFICER, Role.AICTE_OFFICER, Role.AUDITOR)
);

/**
 * GET /api/scrutiny
 * Returns instruments submitted across all institutions waiting for or undergoing scrutiny.
 * Supports status filter (e.g. SUBMITTED, UNDER_SCRUTINY) and search query.
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, search, sortBy = "updatedAt", sortOrder = "desc" } = req.query;

      const whereClause: Record<string, unknown> = {};

      if (status && typeof status === "string") {
        if (Object.values(InstrumentStatus).includes(status as InstrumentStatus)) {
          whereClause.status = status as InstrumentStatus;
        }
      } else {
        // Default to instruments requiring officer attention
        whereClause.status = {
          in: [InstrumentStatus.SUBMITTED, InstrumentStatus.UNDER_SCRUTINY],
        };
      }

      if (search && typeof search === "string" && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { instrumentNumber: { contains: query, mode: "insensitive" } },
          { bankName: { contains: query, mode: "insensitive" } },
          { branchName: { contains: query, mode: "insensitive" } },
          { institution: { name: { contains: query, mode: "insensitive" } } },
          { institution: { code: { contains: query, mode: "insensitive" } } },
        ];
      }

      const validSortFields = ["createdAt", "updatedAt", "amount", "maturityDate", "issueDate"];
      const sortField = typeof sortBy === "string" && validSortFields.includes(sortBy)
        ? sortBy
        : "updatedAt";
      const order = sortOrder === "asc" ? "asc" : "desc";

      const [instruments, totalCount, pendingCount, underScrutinyCount] = await Promise.all([
        prisma.instrument.findMany({
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
        }),
        prisma.instrument.count({ where: whereClause }),
        prisma.instrument.count({
          where: { status: InstrumentStatus.SUBMITTED },
        }),
        prisma.instrument.count({
          where: { status: InstrumentStatus.UNDER_SCRUTINY },
        }),
      ]);

      res.status(200).json({
        instruments,
        meta: {
          totalCount,
          pendingCount,
          underScrutinyCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
