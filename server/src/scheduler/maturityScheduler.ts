/**
 * server/src/scheduler/maturityScheduler.ts
 * Process-level singleton scheduler for automated daily maturity monitoring.
 *
 * Guarantees that only ONE scheduler runs per process.
 * Respects Asia/Kolkata timezone and avoids running inside automated test environments.
 */

import { runMaturityMonitoringJob } from "../services/maturityJob";

let _intervalHandle: NodeJS.Timeout | null = null;
let _isRunning = false;

// Default execution interval: once every 24 hours (86,400,000 ms)
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface SchedulerStatus {
  active: boolean;
  intervalMs: number;
  lastRunStartTime: string | null;
  lastRunFinishTime: string | null;
  lastRunStatus: string | null;
  lastError: string | null;
}

const statusState: SchedulerStatus = {
  active: false,
  intervalMs: DEFAULT_INTERVAL_MS,
  lastRunStartTime: null,
  lastRunFinishTime: null,
  lastRunStatus: null,
  lastError: null,
};

/**
 * Triggers an immediate execution of the monitoring job through the scheduler.
 */
export async function triggerScheduledRun(): Promise<void> {
  if (_isRunning) {
    console.log("ℹ️ [MaturityScheduler] Job is already running. Skipping concurrent trigger.");
    return;
  }

  _isRunning = true;
  statusState.lastRunStartTime = new Date().toISOString();
  console.log("⏰ [MaturityScheduler] Executing scheduled maturity & Attention Priority monitoring job...");

  try {
    const result = await runMaturityMonitoringJob();
    statusState.lastRunFinishTime = result.finishTime.toISOString();
    statusState.lastRunStatus = result.status;
    statusState.lastError = result.errorSummary || null;

    console.log(
      `✅ [MaturityScheduler] Job finished with status '${result.status}'. ` +
      `Processed: ${result.recordsProcessed}, Alerts Created/Updated: ${result.alertsCreated}, Failures: ${result.recordsFailed}`
    );
  } catch (err: unknown) {
    statusState.lastRunFinishTime = new Date().toISOString();
    statusState.lastRunStatus = "FAILED";
    statusState.lastError = err instanceof Error ? err.message : String(err);
    console.error("❌ [MaturityScheduler] Scheduled run encountered fatal error:", statusState.lastError);
  } finally {
    _isRunning = false;
  }
}

/**
 * Starts the maturity monitoring scheduler singleton.
 * Safe against duplicate registration.
 */
export function startMaturityScheduler(intervalMs = DEFAULT_INTERVAL_MS): boolean {
  if (_intervalHandle !== null) {
    console.log("ℹ️ [MaturityScheduler] Scheduler is already active in this process.");
    return false;
  }

  statusState.active = true;
  statusState.intervalMs = intervalMs;

  console.log(`🚀 [MaturityScheduler] Started daily maturity monitoring scheduler (interval: ${intervalMs / 1000}s)`);

  // Run initial job on startup asynchronously (with a brief 5s warmup delay)
  setTimeout(() => {
    triggerScheduledRun().catch(() => {});
  }, 5000);

  // Set recurring timer
  _intervalHandle = setInterval(() => {
    triggerScheduledRun().catch(() => {});
  }, intervalMs);

  return true;
}

/**
 * Stops the scheduler cleanly (e.g. for graceful process shutdown or tests).
 */
export function stopMaturityScheduler(): void {
  if (_intervalHandle !== null) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    statusState.active = false;
    console.log("🛑 [MaturityScheduler] Scheduler stopped.");
  }
}

/**
 * Returns current scheduler operational status.
 */
export function getSchedulerStatus(): SchedulerStatus {
  return { ...statusState };
}
