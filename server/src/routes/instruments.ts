/**
 * src/routes/instruments.ts
 * Instruments endpoint with institution-level access control.
 * Enforces server-side isolation: institution users only see their own instruments.
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";

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

      let whereClause = {};

      if (user.role === Role.INSTITUTION_USER) {
        // Institution ID MUST originate from the authenticated identity, NEVER from client input
        if (!user.institutionId) {
          res.status(200).json({ instruments: [] });
          return;
        }
        whereClause = { institutionId: user.institutionId };
      } else if (
        user.role === Role.AICTE_OFFICER ||
        user.role === Role.SYSTEM_ADMIN
      ) {
        // Officer & Admin system-wide policy
        whereClause = {};
      } else {
        res.status(403).json({
          error: "Forbidden",
          message: "Role not authorized to access instruments.",
        });
        return;
      }

      const instruments = await prisma.instrument.findMany({
        where: whereClause,
        include: {
          institution: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ instruments });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
