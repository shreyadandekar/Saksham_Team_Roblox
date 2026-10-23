/**
 * server/src/routes/dashboard.ts
 * Real database-backed dashboard metrics API.
 * Enforces strict role-based institution isolation and calculates dynamic Attention Priority distributions.
 */

import { Router, Request, Response, NextFunction } from "express";
import { Role, InstrumentStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { calculateMaturityAndPriority } from "../utils/maturity";

const router = Router();

/**
 * GET /api/dashboard/metrics
 * Comprehensive real database-backed metrics for the authenticated user.
 */
router.get(
  "/metrics",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const whereClause: Record<string, unknown> = {};

      if (user.role === Role.INSTITUTION_USER) {
        if (!user.institutionId) {
          res.status(403).json({ error: "Forbidden", message: "Account has no linked institution." });
          return;
        }
        whereClause.institutionId = user.institutionId;
      }

      // 1. Fetch instruments scoped by institution
      const instruments = await prisma.instrument.findMany({
        where: whereClause,
        include: {
          institution: { select: { id: true, code: true, name: true } },
          documents: { select: { id: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      const now = new Date();

      // 2. Aggregate counts
      let total = 0;
      let drafts = 0;
      let submitted = 0;
      let underScrutiny = 0;
      let active = 0;
      let pendingRelease = 0;
      let released = 0;
      let maturedOrOverdue = 0;
      let upcomingMaturitiesCount = 0;

      const priorityCounts = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };

      interface EnrichedItem {
        id: string;
        instrumentNumber: string;
        bankName: string;
        branchName: string;
        amount: number;
        status: string;
        maturityDate: string;
        institution: {
          id: string;
          name: string;
          code: string;
        };
        institutionName: string;
        institutionCode: string;
        attentionScore: number;
        priorityBand: string;
        daysToMaturity: number;
        explanation: string;
        attention: {
          daysRemaining: number;
          condition: string;
          reminderWindow: string | null;
          urgencyContribution: number;
          additionalConditions: { condition: string; points: number }[];
          finalScore: number;
          priorityBand: string;
          explanation: string;
        };
      }

      const scoredInstruments: EnrichedItem[] = [];

      for (const inst of instruments) {
        total++;
        if (inst.status === InstrumentStatus.DRAFT) drafts++;
        else if (inst.status === InstrumentStatus.SUBMITTED) submitted++;
        else if (inst.status === InstrumentStatus.UNDER_SCRUTINY) underScrutiny++;
        else if (inst.status === InstrumentStatus.ACTIVE) active++;
        else if (inst.status === InstrumentStatus.RELEASE_REQUESTED) pendingRelease++;
        else if (inst.status === InstrumentStatus.RELEASED) released++;

        // Calculate Attention Priority
        const evaluation = calculateMaturityAndPriority(
          {
            maturityDate: inst.maturityDate,
            issueDate: inst.issueDate,
            status: inst.status,
            documentCount: inst.documents.length,
          },
          now
        );

        priorityCounts[evaluation.priorityBand]++;

        if (evaluation.daysToMaturity <= 0 || inst.status === InstrumentStatus.MATURED) {
          maturedOrOverdue++;
        } else if (evaluation.daysToMaturity <= 90) {
          upcomingMaturitiesCount++;
        }

        scoredInstruments.push({
          id: inst.id,
          instrumentNumber: inst.instrumentNumber,
          bankName: inst.bankName,
          branchName: inst.branchName || "",
          amount: Number(inst.amount),
          status: inst.status,
          maturityDate: inst.maturityDate.toISOString(),
          institution: {
            id: inst.institution.id,
            name: inst.institution.name,
            code: inst.institution.code,
          },
          institutionName: inst.institution.name,
          institutionCode: inst.institution.code,
          attentionScore: evaluation.attentionScore,
          priorityBand: evaluation.priorityBand,
          daysToMaturity: evaluation.daysToMaturity,
          explanation: evaluation.explanation,
          attention: {
            daysRemaining: evaluation.daysToMaturity,
            condition: evaluation.maturityCondition,
            reminderWindow: evaluation.applicableReminderWindow,
            urgencyContribution: evaluation.urgencyContribution,
            additionalConditions: evaluation.contributions.map((c) => ({
              condition: c.condition,
              points: c.points,
            })),
            finalScore: evaluation.attentionScore,
            priorityBand: evaluation.priorityBand,
            explanation: evaluation.explanation,
          },
        });
      }

      // Top priority items (descending score, highest urgency first)
      const topPriorityInstruments = [...scoredInstruments]
        .sort((a, b) => b.attentionScore - a.attentionScore)
        .slice(0, 5);

      // Upcoming maturities (soonest first)
      const upcomingMaturities = [...scoredInstruments]
        .filter((i) => i.daysToMaturity > 0 && i.daysToMaturity <= 90)
        .sort((a, b) => a.daysToMaturity - b.daysToMaturity)
        .slice(0, 5);

      const counts = {
        total,
        active,
        underScrutiny: submitted + underScrutiny,
        submitted,
        activeReview: underScrutiny,
        drafts,
        pendingReleaseRequests: pendingRelease,
        released,
        maturedOrOverdue,
        upcomingMaturities: upcomingMaturitiesCount,
        openDiscrepancies: 0,
      };

      const metricsObj = {
        totalInstruments: total,
        activeInstruments: active,
        underScrutinyCount: submitted + underScrutiny,
        submittedCount: submitted,
        activeReviewCount: underScrutiny,
        draftCount: drafts,
        pendingReleaseCount: pendingRelease,
        releasedCount: released,
        maturedOrOverdueCount: maturedOrOverdue,
        upcomingMaturitiesCount,
        openDiscrepanciesCount: 0,
      };

      const priorityDistribution = {
        CRITICAL: priorityCounts.CRITICAL,
        HIGH: priorityCounts.HIGH,
        MEDIUM: priorityCounts.MEDIUM,
        LOW: priorityCounts.LOW,
        critical: priorityCounts.CRITICAL,
        high: priorityCounts.HIGH,
        medium: priorityCounts.MEDIUM,
        low: priorityCounts.LOW,
      };

      res.status(200).json({
        success: true,
        role: user.role,
        institutionId: user.institutionId,
        counts,
        metrics: metricsObj,
        priorityDistribution,
        topPriorityInstruments,
        upcomingMaturities,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
