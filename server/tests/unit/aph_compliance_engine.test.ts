/**
 * server/tests/unit/aph_compliance_engine.test.ts
 *
 * Mandatory Unit Tests for USP-1: APH-Aware Security Deposit Rules Engine.
 * Covers all 13 required scenarios from Task 1 + domain edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateAphCompliance,
  AphEvaluationContext,
} from "../../src/services/aphComplianceEngine";
import {
  findAphRule,
  normalizeProgrammeKey,
  normalizeAcademicLevel,
  CURRENT_APH_VERSION,
} from "../../src/services/aphRules";

describe("APH 2024–2027 Security Deposit Compliance Engine", () => {
  // ── 1. UG Engineering, owned: ₹35 lakh ────────────────────────────────────
  it("Scenario 1: UG Engineering, owned premises -> ₹35 lakh requirement", () => {
    const ctx: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      depositedAmountRupees: 35_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(35_00_000);
    expect(res.applicableBaseAmount).toBe(35_00_000);
    expect(res.applicableMultiplier).toBe(1.0);
    expect(res.amountBeingCompared).toBe(35_00_000);
    expect(res.shortfallOrExcess).toBe(0);
    expect(res.ruleId).toBe("APH_2024_ENG_TECH_UG");
    expect(res.regulatoryVersion).toBe(CURRENT_APH_VERSION);
    expect(res.isManualReviewRequired).toBe(false);
  });

  // ── 2. UG Engineering, privately leased: ₹70 lakh ─────────────────────────
  it("Scenario 2: UG Engineering, privately leased -> double requirement (₹70 lakh)", () => {
    const ctx: AphEvaluationContext = {
      programme: "ENGINEERING_TECHNOLOGY",
      academicLevel: "UG",
      premisesOwnership: "LEASED_PRIVATE",
      depositedAmountRupees: 70_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(70_00_000);
    expect(res.applicableBaseAmount).toBe(35_00_000);
    expect(res.applicableMultiplier).toBe(2.0);
    expect(res.amountBeingCompared).toBe(70_00_000);
    expect(res.shortfallOrExcess).toBe(0);
    expect(res.isManualReviewRequired).toBe(false);

    // Also verify deficient case when only base ₹35 lakh is deposited
    const deficientRes = evaluateAphCompliance({
      ...ctx,
      depositedAmountRupees: 35_00_000,
    });
    expect(deficientRes.complianceStatus).toBe("DEFICIENT");
    expect(deficientRes.calculatedRequirement).toBe(70_00_000);
    expect(deficientRes.shortfallOrExcess).toBe(-35_00_000);
  });

  // ── 3. PG Engineering, owned: ₹15 lakh ────────────────────────────────────
  it("Scenario 3: PG Engineering, owned premises -> ₹15 lakh requirement", () => {
    const ctx: AphEvaluationContext = {
      programme: "Engineering and Technology",
      academicLevel: "PG",
      premisesOwnership: "OWNED",
      depositedAmountRupees: 15_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(15_00_000);
    expect(res.applicableBaseAmount).toBe(15_00_000);
    expect(res.applicableMultiplier).toBe(1.0);
    expect(res.ruleId).toBe("APH_2024_ENG_TECH_PG");
  });

  // ── 4. UG Management, owned: ₹5 lakh ──────────────────────────────────────
  it("Scenario 4: UG Management (BBA/BMS), owned premises -> ₹5 lakh requirement", () => {
    const ctx: AphEvaluationContext = {
      programme: "Management",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      depositedAmountRupees: 5_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(5_00_000);
    expect(res.applicableBaseAmount).toBe(5_00_000);
    expect(res.applicableMultiplier).toBe(1.0);
    expect(res.ruleId).toBe("APH_2024_MANAGEMENT_UG");
  });

  // ── 5. UG Management, privately leased: ₹10 lakh ──────────────────────────
  it("Scenario 5: UG Management, privately leased -> double requirement (₹10 lakh)", () => {
    const ctx: AphEvaluationContext = {
      programme: "Management",
      academicLevel: "UG",
      premisesOwnership: "LEASED_PRIVATE",
      depositedAmountRupees: 10_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(10_00_000);
    expect(res.applicableBaseAmount).toBe(5_00_000);
    expect(res.applicableMultiplier).toBe(2.0);
  });

  // ── 6. UG Computer Applications, owned: ₹5 lakh ───────────────────────────
  it("Scenario 6: UG Computer Applications (BCA), owned premises -> ₹5 lakh requirement", () => {
    const ctx: AphEvaluationContext = {
      programme: "Computer Applications",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      depositedAmountRupees: 5_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(5_00_000);
    expect(res.applicableBaseAmount).toBe(5_00_000);
    expect(res.applicableMultiplier).toBe(1.0);
    expect(res.ruleId).toBe("APH_2024_COMP_APP_UG");
  });

  // ── 7. Missing premises ownership: insufficient data ──────────────────────
  it("Scenario 7: Missing premises ownership -> INSUFFICIENT_DATA status", () => {
    const ctxWithoutOwnership: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      // premisesOwnership omitted
      depositedAmountRupees: 35_00_000,
    };

    const res1 = evaluateAphCompliance(ctxWithoutOwnership);
    expect(res1.complianceStatus).toBe("INSUFFICIENT_DATA");
    expect(res1.calculatedRequirement).toBeNull();
    expect(res1.missingInputs).toContain("premisesOwnership");

    const ctxUnknownOwnership: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      premisesOwnership: "UNKNOWN",
      depositedAmountRupees: 35_00_000,
    };

    const res2 = evaluateAphCompliance(ctxUnknownOwnership);
    expect(res2.complianceStatus).toBe("INSUFFICIENT_DATA");
    expect(res2.calculatedRequirement).toBeNull();
    expect(res2.missingInputs).toContain("premisesOwnership");
  });

  // ── 8. Unknown programme: manual review ────────────────────────────────────
  it("Scenario 8: Unknown programme -> NEEDS_MANUAL_REVIEW, never defaulted to ₹0", () => {
    const ctx: AphEvaluationContext = {
      programme: "Aeronautics Special Advanced Studies",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      depositedAmountRupees: 50_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("NEEDS_MANUAL_REVIEW");
    expect(res.calculatedRequirement).toBeNull();
    expect(res.isManualReviewRequired).toBe(true);
    expect(res.manualReviewReasons.some((r) => r.includes("not recognized"))).toBe(true);
    // Explicitly verify requirement is NOT 0
    expect(res.calculatedRequirement).not.toBe(0);
  });

  // ── 9. Applicable exemption without complete proof: manual review ─────────
  it("Scenario 9: Exemption without complete verified proof -> NEEDS_MANUAL_REVIEW", () => {
    // Government claimed without verified proof
    const govCtx: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      institutionType: "GOVERNMENT",
      isGovernmentOrAided: true,
      governmentExemptionVerified: false, // Proof not verified
      depositedAmountRupees: 0,
    };

    const govRes = evaluateAphCompliance(govCtx);
    expect(govRes.complianceStatus).toBe("NEEDS_MANUAL_REVIEW");
    expect(govRes.isManualReviewRequired).toBe(true);
    expect(govRes.manualReviewReasons.some((r) => r.includes("exemption claimed without verified"))).toBe(true);

    // Minority concession claimed without verified proof
    const minorityCtx: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      isMinorityInstitution: true,
      concessionProofVerified: false,
      depositedAmountRupees: 28_00_000,
    };

    const minRes = evaluateAphCompliance(minorityCtx);
    expect(minRes.complianceStatus).toBe("NEEDS_MANUAL_REVIEW");
    expect(minRes.isManualReviewRequired).toBe(true);
  });

  // ── 10. Multiple programmes: combined obligation ──────────────────────────
  it("Scenario 10: Multiple programmes -> evaluates combined statutory obligation", () => {
    // Institution running UG Engineering (₹35L) + PG Engineering (₹15L) on owned premises
    const ctx: AphEvaluationContext = {
      programmes: [
        { programme: "Engineering & Technology", academicLevel: "UG" },
        { programme: "Engineering & Technology", academicLevel: "PG" },
      ],
      premisesOwnership: "OWNED",
      depositedAmountRupees: 50_00_000, // ₹35L + ₹15L = ₹50L
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(50_00_000);
    expect(res.amountBeingCompared).toBe(50_00_000);
    expect(res.programmeBreakdown).toHaveLength(2);
    expect(res.programmeBreakdown[0].calculatedRequirementRupees).toBe(35_00_000);
    expect(res.programmeBreakdown[1].calculatedRequirementRupees).toBe(15_00_000);

    // If one programme in the list is unknown, the whole multi-programme evaluation requires manual review
    const mixedCtx: AphEvaluationContext = {
      programmes: [
        { programme: "Engineering & Technology", academicLevel: "UG" },
        { programme: "Unknown Unlisted Dept", academicLevel: "UG" },
      ],
      premisesOwnership: "OWNED",
      depositedAmountRupees: 50_00_000,
    };

    const mixedRes = evaluateAphCompliance(mixedCtx);
    expect(mixedRes.complianceStatus).toBe("NEEDS_MANUAL_REVIEW");
    expect(mixedRes.calculatedRequirement).toBeNull();
  });

  // ── 11. Multiple instruments: aggregate satisfaction ──────────────────────
  it("Scenario 11: Multiple instruments -> does not flag single FDR as deficient when aggregate satisfies obligation", () => {
    // Institution requires ₹35 lakh. Holds 2 FDRs: ₹20 lakh and ₹15 lakh. Total = ₹35 lakh.
    const ctx: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      instruments: [
        {
          id: "inst-1",
          fdrNumber: "FDR-SBIN-2024-001",
          bankName: "State Bank of India",
          amountRupees: 20_00_000,
          status: "ACTIVE",
        },
        {
          id: "inst-2",
          fdrNumber: "FDR-HDFC-2024-002",
          bankName: "HDFC Bank",
          amountRupees: 15_00_000,
          status: "ACTIVE",
        },
      ],
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(35_00_000);
    expect(res.amountBeingCompared).toBe(35_00_000);
    expect(res.shortfallOrExcess).toBe(0);
    expect(res.instrumentsEvaluated?.totalCount).toBe(2);
    expect(res.instrumentsEvaluated?.activeCount).toBe(2);
    expect(res.instrumentsEvaluated?.totalAmountRupees).toBe(35_00_000);
  });

  // ── 12. Prior deposits or historical rules: manual review ─────────────────
  it("Scenario 12: Prior historical deposits or conversion NOCs -> NEEDS_MANUAL_REVIEW", () => {
    const historicalCtx: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      depositedAmountRupees: 35_00_000,
      hasPriorHistoricalDeposit: true,
    };

    const res1 = evaluateAphCompliance(historicalCtx);
    expect(res1.complianceStatus).toBe("NEEDS_MANUAL_REVIEW");
    expect(res1.isManualReviewRequired).toBe(true);
    expect(res1.manualReviewReasons.some((r) => r.includes("prior historical deposit"))).toBe(true);

    const conversionCtx: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      premisesOwnership: "OWNED",
      depositedAmountRupees: 35_00_000,
      hasConversionNoc: true,
    };

    const res2 = evaluateAphCompliance(conversionCtx);
    expect(res2.complianceStatus).toBe("NEEDS_MANUAL_REVIEW");
    expect(res2.isManualReviewRequired).toBe(true);
    expect(res2.manualReviewReasons.some((r) => r.includes("conversion or NOC"))).toBe(true);
  });

  // ── 13. Unsupported programme/level combination: never treated as ₹0 ──────
  it("Scenario 13: Unsupported programme/level combination (e.g. Diploma Management) -> never treated as ₹0", () => {
    // In APH Table 1.4, Diploma Management and Diploma Computer Applications are "Not listed".
    const ctx: AphEvaluationContext = {
      programme: "Management",
      academicLevel: "DIPLOMA",
      premisesOwnership: "OWNED",
      depositedAmountRupees: 15_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("NEEDS_MANUAL_REVIEW");
    expect(res.calculatedRequirement).toBeNull();
    expect(res.calculatedRequirement).not.toBe(0);
    expect(res.isManualReviewRequired).toBe(true);
    expect(res.manualReviewReasons.some((r) => r.includes("not listed in Table 1.4"))).toBe(true);
  });

  // ── 14. Additional: Verified Government Exemption ─────────────────────────
  it("Verified Government Exemption -> COMPLIANT with ₹0 requirement", () => {
    const ctx: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG",
      premisesOwnership: "GOVERNMENT_ALLOTTED",
      isGovernmentOrAided: true,
      governmentExemptionVerified: true,
      depositedAmountRupees: 0,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(0);
    expect(res.shortfallOrExcess).toBe(0);
    expect(res.ruleId).toBe("APH_GOVT_EXEMPTION");
  });

  // ── 15. Additional: Verified Concession (Minority/Women-led/PwD) ───────────
  it("Verified Concession (Minority/Women) -> 20% concession (pays 80%)", () => {
    const ctx: AphEvaluationContext = {
      programme: "Engineering & Technology",
      academicLevel: "UG", // Base ₹35L -> 80% = ₹28L
      premisesOwnership: "OWNED",
      isWomenLedInstitution: true,
      concessionProofVerified: true,
      depositedAmountRupees: 28_00_000,
    };

    const res = evaluateAphCompliance(ctx);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.calculatedRequirement).toBe(28_00_000);
    expect(res.applicableBaseAmount).toBe(35_00_000);
    expect(res.applicableMultiplier).toBe(0.8);
    expect(res.shortfallOrExcess).toBe(0);
  });
});
