/**
 * server/src/services/maturityJob.ts
 * Scheduled and on-demand maturity monitoring and alert processing job.
 * Idempotent, concurrency-safe, and fully logged in PostgreSQL JobRun records.
 */

import { InstrumentStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { calculateMaturityAndPriority, type MaturityWindow } from "../utils/maturity";

export interface MaturityJobOptions {
  referenceDate?: Date;
  triggeredByUserId?: string;
}

export interface MaturityJobResult {
  jobRunId: string;
  status: string;
  recordsProcessed: number;
  alertsCreated: number;
  recordsFailed: number;
  startTime: Date;
  finishTime: Date;
  errorSummary?: string | null;
}

/**
 * Runs the maturity monitoring and Attention Priority alert evaluation job.
 * Idempotent: Repeated execution on the same date/window updates existing alerts
 * and does not create duplicates, enforced by the compound unique constraint
 * @@unique([instrumentId, alertType, window]).
 */
export async function runMaturityMonitoringJob(
  options: MaturityJobOptions = {}
): Promise<MaturityJobResult> {
  const startTime = new Date();
  const referenceDate = options.referenceDate || new Date();

  // Initialize JobRun entry
  const jobRun = await prisma.jobRun.create({
    data: {
      jobName: "DAILY_MATURITY_MONITORING",
      startTime,
      status: "RUNNING",
      metadata: {
        referenceDate: referenceDate.toISOString(),
        triggeredByUserId: options.triggeredByUserId || "SYSTEM_SCHEDULER",
      },
    },
  });

  let recordsProcessed = 0;
  let alertsCreated = 0;
  let recordsFailed = 0;
  const errors: string[] = [];

  try {
    // 1. Query eligible instruments for maturity monitoring
    // Instruments that are active, undergoing review, or matured
    const instruments = await prisma.instrument.findMany({
      where: {
        status: {
          in: [
            InstrumentStatus.ACTIVE,
            InstrumentStatus.SUBMITTED,
            InstrumentStatus.UNDER_SCRUTINY,
            InstrumentStatus.MATURED,
          ],
        },
      },
      include: {
        documents: { select: { id: true } },
        institution: { select: { id: true, code: true, name: true } },
      },
    });

    for (const inst of instruments) {
      recordsProcessed++;
      try {
        const evaluation = calculateMaturityAndPriority(
          {
            maturityDate: inst.maturityDate,
            issueDate: inst.issueDate,
            status: inst.status,
            documentCount: inst.documents.length,
          },
          referenceDate
        );

        // If instrument is in a maturity reminder window, record an alert
        if (evaluation.applicableReminderWindow) {
          const windowKey = evaluation.applicableReminderWindow;
          const alertType = windowKey === "MATURED" ? "MATURED_OVERDUE" : "MATURITY_REMINDER";

          const message = windowKey === "MATURED"
            ? `Instrument ${inst.instrumentNumber} has matured or is overdue (${evaluation.daysToMaturity === 0 ? "today" : `${Math.abs(evaluation.daysToMaturity)} days ago`}). Immediate settlement, renewal, or release required.`
            : `Instrument ${inst.instrumentNumber} will mature in ${evaluation.daysToMaturity} days (${windowKey.replace("_", " ")} threshold). Priority: ${evaluation.priorityBand}.`;

          // Upsert alert based on unique key [instrumentId, alertType, window]
          await prisma.maturityAlert.upsert({
            where: {
              instrumentId_alertType_window: {
                instrumentId: inst.id,
                alertType,
                window: windowKey,
              },
            },
            create: {
              instrumentId: inst.id,
              alertType,
              window: windowKey,
              referenceDate,
              score: evaluation.attentionScore,
              priorityBand: evaluation.priorityBand,
              message,
              isResolved: false,
            },
            update: {
              referenceDate,
              score: evaluation.attentionScore,
              priorityBand: evaluation.priorityBand,
              message,
            },
          });

          alertsCreated++;
        }
      } catch (itemErr: unknown) {
        recordsFailed++;
        const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
        errors.push(`Instrument ${inst.id}: ${msg}`);
        console.error(`Error processing instrument ${inst.id} in maturity job:`, msg);
      }
    }

    const finishTime = new Date();
    const finalStatus = recordsFailed === 0
      ? "COMPLETED"
      : recordsProcessed > recordsFailed
      ? "PARTIAL_SUCCESS"
      : "FAILED";

    const errorSummary = errors.length > 0 ? errors.slice(0, 10).join("; ") : null;

    // Update JobRun record
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        finishTime,
        status: finalStatus,
        recordsProcessed,
        alertsCreated,
        recordsFailed,
        errorSummary,
      },
    });

    return {
      jobRunId: jobRun.id,
      status: finalStatus,
      recordsProcessed,
      alertsCreated,
      recordsFailed,
      startTime,
      finishTime,
      errorSummary,
    };
  } catch (fatalErr: unknown) {
    const finishTime = new Date();
    const fatalMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);

    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        finishTime,
        status: "FAILED",
        recordsProcessed,
        alertsCreated,
        recordsFailed: recordsFailed + 1,
        errorSummary: `Fatal job failure: ${fatalMsg}`,
      },
    }).catch(() => {});

    throw fatalErr;
  }
}
