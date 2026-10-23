/**
 * server/src/routes/monitoring.ts
 * Monitoring router for maturity alerts, scheduler status, and administrator manual job execution.
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { runMaturityMonitoringJob } from "../services/maturityJob";
import { getSchedulerStatus } from "../scheduler/maturityScheduler";

const router = Router();

/**
 * GET /api/monitoring/alerts
 * Returns active maturity alerts.
 * Institution users only see alerts for their own institution.
 * Officers and Admins see system-wide alerts.
 */
router.get(
  "/alerts",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const whereClause: Record<string, unknown> = { isResolved: false };

      if (user.role === Role.INSTITUTION_USER) {
        if (!user.institutionId) {
          res.status(403).json({ error: "Forbidden", message: "Account has no linked institution." });
          return;
        }
        whereClause.instrument = { institutionId: user.institutionId };
      }

      const alerts = await prisma.maturityAlert.findMany({
        where: whereClause,
        include: {
          instrument: {
            select: {
              id: true,
              instrumentNumber: true,
              bankName: true,
              amount: true,
              maturityDate: true,
              status: true,
              institution: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        take: 100,
      });

      res.status(200).json({ alerts });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/monitoring/status
 * Returns current scheduler status and last 10 JobRun executions.
 * Accessible to AICTE_OFFICER and SYSTEM_ADMIN.
 */
router.get(
  "/status",
  requireAuth,
  requireRoles(Role.AICTE_OFFICER, Role.SYSTEM_ADMIN),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schedulerStatus = getSchedulerStatus();
      const recentJobRuns = await prisma.jobRun.findMany({
        orderBy: { startTime: "desc" },
        take: 10,
      });

      res.status(200).json({
        scheduler: schedulerStatus,
        recentRuns: recentJobRuns,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/monitoring/run-job
 * Manually triggers the maturity monitoring job.
 * Strictly restricted to SYSTEM_ADMIN.
 */
router.post(
  "/run-job",
  requireAuth,
  requireRoles(Role.SYSTEM_ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const result = await runMaturityMonitoringJob({
        triggeredByUserId: user.id,
      });

      res.status(200).json({
        message: "Maturity monitoring job executed successfully.",
        result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
