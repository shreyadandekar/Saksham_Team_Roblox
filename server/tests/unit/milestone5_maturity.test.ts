/**
 * server/tests/unit/milestone5_maturity.test.ts
 * Comprehensive unit tests for Milestone 5 Maturity Engine and Attention Priority.
 */

import { describe, it, expect } from "vitest";
import {
  calculateMaturityAndPriority,
  calculateCalendarDaysRemaining,
  toKolkataCalendarDate,
} from "../../src/utils/maturity";

describe("Maturity Engine — Calendar Days and Timezone Handling (Asia/Kolkata)", () => {
  it("formats dates properly into Asia/Kolkata calendar dates", () => {
    // 2026-10-23T18:30:00Z is 2026-10-24 00:00:00 in IST (+05:30)
    const utcDate = new Date("2026-10-23T18:30:00.000Z");
    expect(toKolkataCalendarDate(utcDate)).toBe("2026-10-24");
  });

  it("calculates exact calendar day differences regardless of UTC time offsets", () => {
    const ref = new Date("2026-10-23T06:00:00.000Z"); // 2026-10-23 in IST
    const matSameDay = new Date("2026-10-23T12:00:00.000Z"); // Same calendar day
    const matTomorrow = new Date("2026-10-24T02:00:00.000Z"); // Tomorrow in IST
    const matYesterday = new Date("2026-10-22T20:00:00.000Z"); // Yesterday in IST (2026-10-23 01:30 IST) -> wait 20:00Z on 22nd is 01:30 on 23rd!
    const mat2DaysAgo = new Date("2026-10-21T02:00:00.000Z"); // 2026-10-21 in IST

    expect(calculateCalendarDaysRemaining(matSameDay, ref).days).toBe(0);
    expect(calculateCalendarDaysRemaining(matTomorrow, ref).days).toBe(1);
    expect(calculateCalendarDaysRemaining(mat2DaysAgo, ref).days).toBe(-2);
  });
});

describe("Maturity Engine — Boundary Conditions", () => {
  const refDate = new Date("2026-10-23T05:00:00.000Z"); // Calendar day 2026-10-23 in IST

  it("evaluates > 90 days until maturity (e.g. 91 days)", () => {
    // 91 days from 2026-10-23 is 2027-01-22
    const maturity = new Date("2027-01-22T05:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBe(91);
    expect(result.maturityCondition).toBe("NORMAL");
    expect(result.applicableReminderWindow).toBeNull();
    expect(result.urgencyContribution).toBe(0);
  });

  it("evaluates exactly 90 days until maturity", () => {
    const maturity = new Date("2027-01-21T05:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBe(90);
    expect(result.maturityCondition).toBe("UPCOMING_90");
    expect(result.applicableReminderWindow).toBe("90_DAYS");
    expect(result.urgencyContribution).toBe(8);
  });

  it("evaluates exactly 60 days until maturity", () => {
    const maturity = new Date("2026-12-22T05:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBe(60);
    expect(result.maturityCondition).toBe("UPCOMING_60");
    expect(result.applicableReminderWindow).toBe("60_DAYS");
    expect(result.urgencyContribution).toBe(18);
  });

  it("evaluates exactly 30 days until maturity", () => {
    const maturity = new Date("2026-11-22T05:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBe(30);
    expect(result.maturityCondition).toBe("UPCOMING_30");
    expect(result.applicableReminderWindow).toBe("30_DAYS");
    expect(result.urgencyContribution).toBe(28);
  });

  it("evaluates exactly 15 days until maturity", () => {
    const maturity = new Date("2026-11-07T05:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBe(15);
    expect(result.maturityCondition).toBe("UPCOMING_15");
    expect(result.applicableReminderWindow).toBe("15_DAYS");
    expect(result.urgencyContribution).toBe(35);
  });

  it("evaluates 1 day before maturity", () => {
    const maturity = new Date("2026-10-24T05:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBe(1);
    expect(result.maturityCondition).toBe("UPCOMING_15");
    expect(result.applicableReminderWindow).toBe("15_DAYS");
    expect(result.urgencyContribution).toBe(35);
  });

  it("evaluates exact maturity date (0 days remaining)", () => {
    const maturity = new Date("2026-10-23T10:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBe(0);
    expect(result.maturityCondition).toBe("MATURES_TODAY");
    expect(result.applicableReminderWindow).toBe("MATURED");
    expect(result.urgencyContribution).toBe(40);
  });

  it("evaluates 1 day after maturity (overdue by 1 day)", () => {
    const maturity = new Date("2026-10-22T05:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBe(-1);
    expect(result.maturityCondition).toBe("OVERDUE_MATURED");
    expect(result.applicableReminderWindow).toBe("MATURED");
    expect(result.urgencyContribution).toBe(40);
  });

  it("evaluates substantially overdue instrument (e.g. 180 days past maturity)", () => {
    const maturity = new Date("2026-04-26T05:00:00.000Z");
    const result = calculateMaturityAndPriority({ maturityDate: maturity }, refDate);

    expect(result.daysToMaturity).toBeLessThan(-150);
    expect(result.maturityCondition).toBe("OVERDUE_MATURED");
    expect(result.urgencyContribution).toBe(40);
  });
});

describe("Attention Priority Scoring Rules", () => {
  const refDate = new Date("2026-10-23T05:00:00.000Z");

  it("applies exactly one maturity window in descending order (e.g. 10 days gets +35, not stacked)", () => {
    const maturity = new Date("2026-11-02T05:00:00.000Z"); // 10 days
    const result = calculateMaturityAndPriority(
      { maturityDate: maturity, documentCount: 1 },
      refDate
    );

    expect(result.daysToMaturity).toBe(10);
    expect(result.urgencyContribution).toBe(35);
    expect(result.attentionScore).toBe(35);
    expect(result.priorityBand).toBe("MEDIUM");
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0].condition).toBe("Maturity within 15 days");
  });

  it("caps high-severity unresolved discrepancies at +20 (+10 per finding)", () => {
    const maturity = new Date("2027-02-01T05:00:00.000Z"); // >90 days (0 urgency)

    // 1 discrepancy: +10
    const res1 = calculateMaturityAndPriority(
      { maturityDate: maturity, documentCount: 1, unresolvedDiscrepanciesCount: 1 },
      refDate
    );
    expect(res1.attentionScore).toBe(10);
    expect(res1.priorityBand).toBe("LOW");

    // 2 discrepancies: +20
    const res2 = calculateMaturityAndPriority(
      { maturityDate: maturity, documentCount: 1, unresolvedDiscrepanciesCount: 2 },
      refDate
    );
    expect(res2.attentionScore).toBe(20);
    expect(res2.priorityBand).toBe("MEDIUM");

    // 5 discrepancies: capped at +20
    const res5 = calculateMaturityAndPriority(
      { maturityDate: maturity, documentCount: 1, unresolvedDiscrepanciesCount: 5 },
      refDate
    );
    expect(res5.attentionScore).toBe(20);
  });

  it("caps days beyond SLA at +10 (+1 per day)", () => {
    const maturity = new Date("2027-02-01T05:00:00.000Z");

    const res5 = calculateMaturityAndPriority(
      { maturityDate: maturity, documentCount: 1, daysBeyondSla: 5 },
      refDate
    );
    expect(res5.attentionScore).toBe(5);

    const res25 = calculateMaturityAndPriority(
      { maturityDate: maturity, documentCount: 1, daysBeyondSla: 25 },
      refDate
    );
    expect(res25.attentionScore).toBe(10);
  });

  it("awards +10 for missing mandatory document", () => {
    const maturity = new Date("2027-02-01T05:00:00.000Z");
    const resNoDocs = calculateMaturityAndPriority(
      { maturityDate: maturity, documentCount: 0 },
      refDate
    );
    expect(resNoDocs.attentionScore).toBe(10);
    expect(resNoDocs.contributions[0].condition).toBe("Missing mandatory document");
  });

  it("correctly sums multiple independent conditions (e.g. 15d + overdue action + discrepancy)", () => {
    const maturity = new Date("2026-11-02T05:00:00.000Z"); // +35 (within 15 days)
    const result = calculateMaturityAndPriority(
      {
        maturityDate: maturity,
        hasOverdueAction: true, // +20
        unresolvedDiscrepanciesCount: 1, // +10
        documentCount: 0, // +10 (missing document)
      },
      refDate
    );

    // 35 + 20 + 10 + 10 = 75
    expect(result.attentionScore).toBe(75);
    expect(result.priorityBand).toBe("CRITICAL");
    expect(result.contributions).toHaveLength(4);
    expect(result.explanation).toContain("Maturity within 15 days (+35)");
    expect(result.explanation).toContain("Overdue required action (+20)");
    expect(result.explanation).toContain("High-severity unresolved discrepancy (+10)");
    expect(result.explanation).toContain("Missing mandatory document (+10)");
  });

  it("caps overall Attention Priority score at 100", () => {
    const maturity = new Date("2026-10-20T05:00:00.000Z"); // +40 (matured)
    const result = calculateMaturityAndPriority(
      {
        maturityDate: maturity,
        hasOverdueAction: true, // +20
        unresolvedDiscrepanciesCount: 4, // +20 (capped)
        documentCount: 0, // +10
        daysBeyondSla: 15, // +10 (capped)
        verificationFailedOrIncomplete: true, // +10
      },
      refDate
    );

    // Raw sum = 40 + 20 + 20 + 10 + 10 + 10 = 110, capped at 100
    expect(result.attentionScore).toBe(100);
    expect(result.priorityBand).toBe("CRITICAL");
  });

  it("verifies all Priority Band thresholds", () => {
    const maturity = new Date("2027-05-01T05:00:00.000Z"); // 0 urgency

    // Low: 0 - 19
    expect(calculateMaturityAndPriority({ maturityDate: maturity, documentCount: 1 }, refDate).priorityBand).toBe("LOW"); // 0
    expect(calculateMaturityAndPriority({ maturityDate: maturity, documentCount: 0 }, refDate).priorityBand).toBe("LOW"); // 10

    // Medium: 20 - 39
    expect(calculateMaturityAndPriority({ maturityDate: maturity, hasOverdueAction: true, documentCount: 1 }, refDate).priorityBand).toBe("MEDIUM"); // 20
    expect(calculateMaturityAndPriority({ maturityDate: maturity, hasOverdueAction: true, documentCount: 0, daysBeyondSla: 5 }, refDate).priorityBand).toBe("MEDIUM"); // 35

    // High: 40 - 69
    expect(calculateMaturityAndPriority({ maturityDate: new Date("2026-10-23T05:00:00Z"), documentCount: 1 }, refDate).priorityBand).toBe("HIGH"); // 40 (matured)
    expect(calculateMaturityAndPriority({ maturityDate: new Date("2026-11-02T05:00:00Z"), hasOverdueAction: true, documentCount: 1, daysBeyondSla: 10 }, refDate).priorityBand).toBe("HIGH"); // 35+20+10 = 65

    // Critical: 70 - 100
    expect(calculateMaturityAndPriority({ maturityDate: new Date("2026-10-20T05:00:00Z"), hasOverdueAction: true, documentCount: 0 }, refDate).priorityBand).toBe("CRITICAL"); // 40+20+10 = 70
  });
});
