/**
 * server/src/utils/maturity.ts
 * Pure, deterministic maturity calculation and Attention Priority scoring engine.
 * Calibrated for SIH 2026 Problem Statement PS26265.
 *
 * All calendar-date calculations use the Asia/Kolkata timezone (UTC+05:30)
 * to avoid UTC boundary shifts.
 */

export type MaturityWindow = "MATURED" | "15_DAYS" | "30_DAYS" | "60_DAYS" | "90_DAYS" | null;

export type PriorityBand = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ScoreContribution {
  condition: string;
  points: number;
  detail: string;
}

export interface MaturityInput {
  maturityDate: Date | string;
  issueDate?: Date | string;
  status?: string;
  documentCount?: number;
  hasMissingMandatoryDocs?: boolean;
  unresolvedDiscrepanciesCount?: number; // high-severity findings
  hasOverdueAction?: boolean;
  daysBeyondSla?: number;
  verificationFailedOrIncomplete?: boolean;
}

export interface MaturityEvaluation {
  daysToMaturity: number;
  maturityCondition: string;
  applicableReminderWindow: MaturityWindow;
  urgencyContribution: number;
  attentionScore: number;
  priorityBand: PriorityBand;
  contributions: ScoreContribution[];
  explanation: string;
  referenceDateKolkata: string;
  maturityDateKolkata: string;
}

/**
 * Converts a Date or ISO string into a YYYY-MM-DD calendar date string
 * in the Asia/Kolkata (IST) timezone.
 */
export function toKolkataCalendarDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }

  // Format as YYYY-MM-DD in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Calculates calendar day difference between referenceDate and targetDate in Asia/Kolkata.
 * Positive value: targetDate is in the future.
 * 0: targetDate is today.
 * Negative value: targetDate is in the past (overdue).
 */
export function calculateCalendarDaysRemaining(
  targetDate: Date | string,
  referenceDate: Date | string = new Date()
): { days: number; refKolkata: string; targetKolkata: string } {
  const refKolkata = toKolkataCalendarDate(referenceDate);
  const targetKolkata = toKolkataCalendarDate(targetDate);

  // Parse midnight UTC timestamps for calendar date comparison
  const [refYear, refMonth, refDay] = refKolkata.split("-").map(Number);
  const [tgtYear, tgtMonth, tgtDay] = targetKolkata.split("-").map(Number);

  const refUtc = Date.UTC(refYear, refMonth - 1, refDay);
  const tgtUtc = Date.UTC(tgtYear, tgtMonth - 1, tgtDay);

  const diffMs = tgtUtc - refUtc;
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return { days, refKolkata, targetKolkata };
}

/**
 * Pure, deterministic calculation function for maturity condition and Attention Priority.
 *
 * @param input - Instrument particulars and optional discrepancy/SLA context.
 * @param referenceDate - Explicit date to compute relative to (defaults to current time).
 */
export function calculateMaturityAndPriority(
  input: MaturityInput,
  referenceDate: Date = new Date()
): MaturityEvaluation {
  const { days, refKolkata, targetKolkata } = calculateCalendarDaysRemaining(
    input.maturityDate,
    referenceDate
  );

  const contributions: ScoreContribution[] = [];

  // ── 1. Maturity Urgency Contribution (Mutually Exclusive, Descending Urgency) ──
  let maturityCondition: string;
  let applicableReminderWindow: MaturityWindow = null;
  let urgencyContribution = 0;

  if (days <= 0) {
    maturityCondition = days === 0 ? "MATURES_TODAY" : "OVERDUE_MATURED";
    applicableReminderWindow = "MATURED";
    urgencyContribution = 40;
    contributions.push({
      condition: "Matured or overdue maturity",
      points: 40,
      detail: days === 0 ? "FDR matures today" : `Matured ${Math.abs(days)} day(s) ago`,
    });
  } else if (days <= 15) {
    maturityCondition = "UPCOMING_15";
    applicableReminderWindow = "15_DAYS";
    urgencyContribution = 35;
    contributions.push({
      condition: "Maturity within 15 days",
      points: 35,
      detail: `${days} day(s) remaining until maturity`,
    });
  } else if (days <= 30) {
    maturityCondition = "UPCOMING_30";
    applicableReminderWindow = "30_DAYS";
    urgencyContribution = 28;
    contributions.push({
      condition: "Maturity within 30 days",
      points: 28,
      detail: `${days} day(s) remaining until maturity`,
    });
  } else if (days <= 60) {
    maturityCondition = "UPCOMING_60";
    applicableReminderWindow = "60_DAYS";
    urgencyContribution = 18;
    contributions.push({
      condition: "Maturity within 60 days",
      points: 18,
      detail: `${days} day(s) remaining until maturity`,
    });
  } else if (days <= 90) {
    maturityCondition = "UPCOMING_90";
    applicableReminderWindow = "90_DAYS";
    urgencyContribution = 8;
    contributions.push({
      condition: "Maturity within 90 days",
      points: 8,
      detail: `${days} day(s) remaining until maturity`,
    });
  } else {
    maturityCondition = "NORMAL";
    applicableReminderWindow = null;
    urgencyContribution = 0;
  }

  // ── 2. Additional Scoring Conditions ─────────────────────────────────────

  // Overdue required action (+20)
  if (input.hasOverdueAction) {
    contributions.push({
      condition: "Overdue required action",
      points: 20,
      detail: "Pending institution correction or officer scrutiny action is past regulatory deadline",
    });
  }

  // High-severity unresolved discrepancies (+10 each, capped at +20)
  if (input.unresolvedDiscrepanciesCount && input.unresolvedDiscrepanciesCount > 0) {
    const rawDiscPoints = input.unresolvedDiscrepanciesCount * 10;
    const discPoints = Math.min(20, rawDiscPoints);
    contributions.push({
      condition: "High-severity unresolved discrepancy",
      points: discPoints,
      detail: `${input.unresolvedDiscrepanciesCount} high-severity finding(s)${rawDiscPoints > 20 ? " (capped at +20)" : ""}`,
    });
  }

  // Missing mandatory field or document (+10)
  const isDocMissing = input.hasMissingMandatoryDocs ?? (input.documentCount !== undefined && input.documentCount === 0);
  if (isDocMissing) {
    contributions.push({
      condition: "Missing mandatory document",
      points: 10,
      detail: "No verified supporting deposit certificate or receipt attached",
    });
  }

  // Days beyond SLA (+1 per day, capped at +10)
  if (input.daysBeyondSla && input.daysBeyondSla > 0) {
    const slaPoints = Math.min(10, Math.floor(input.daysBeyondSla));
    contributions.push({
      condition: "Days beyond SLA",
      points: slaPoints,
      detail: `${input.daysBeyondSla} day(s) overdue beyond regulatory review SLA (capped at +10)`,
    });
  }

  // Failed or incomplete verification (+10)
  if (input.verificationFailedOrIncomplete) {
    contributions.push({
      condition: "Failed or incomplete verification",
      points: 10,
      detail: "Bank confirmation or security particulars failed cross-verification",
    });
  }

  // ── 3. Score Aggregation and Capping ──────────────────────────────────────
  const rawScore = contributions.reduce((sum, item) => sum + item.points, 0);
  const attentionScore = Math.min(100, Math.max(0, rawScore));

  // ── 4. Priority Bands ─────────────────────────────────────────────────────
  let priorityBand: PriorityBand;
  if (attentionScore >= 70) {
    priorityBand = "CRITICAL";
  } else if (attentionScore >= 40) {
    priorityBand = "HIGH";
  } else if (attentionScore >= 20) {
    priorityBand = "MEDIUM";
  } else {
    priorityBand = "LOW";
  }

  // ── 5. Human-Readable Explanation ─────────────────────────────────────────
  const explanation = contributions.length > 0
    ? contributions.map((c) => `${c.condition} (+${c.points})`).join(", ")
    : "Standard standing (no urgent conditions)";

  return {
    daysToMaturity: days,
    maturityCondition,
    applicableReminderWindow,
    urgencyContribution,
    attentionScore,
    priorityBand,
    contributions,
    explanation,
    referenceDateKolkata: refKolkata,
    maturityDateKolkata: targetKolkata,
  };
}
