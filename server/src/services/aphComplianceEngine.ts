/**
 * server/src/services/aphComplianceEngine.ts
 *
 * FDR Sentinel — SIH 2026 PS26265
 * USP-1: APH-Aware Security Deposit Compliance Rules Engine
 *
 * Regulatory Reference:
 *   AICTE Approval Process Handbook (APH) 2024–2027, Section 1.12, Table 1.4.
 *
 * Architectural Principles:
 *   - Pure, deterministic evaluator with ZERO database side effects.
 *   - Strictly integer rupee arithmetic — avoids all IEEE-754 floating-point inaccuracies.
 *   - Distinguishes institution-level multi-programme obligations from single FDR instruments.
 *   - Never defaults unlisted or unknown programmes to ₹0.
 *   - Flags incomplete or ambiguous data as INSUFFICIENT_DATA or NEEDS_MANUAL_REVIEW.
 */

import {
  AcademicLevel,
  AphRuleDefinition,
  APH_2024_2027_RULES,
  CURRENT_APH_VERSION,
  findAphRule,
  MULTIPLIERS,
  PremisesOwnershipType,
} from "./aphRules";

export type ComplianceStatus =
  | "COMPLIANT"
  | "DEFICIENT"
  | "INSUFFICIENT_DATA"
  | "NEEDS_MANUAL_REVIEW";

export interface ProgrammeOfferingInput {
  programme: string;
  academicLevel: string;
}

export interface DepositInstrumentInput {
  id?: string;
  fdrNumber?: string;
  bankName?: string;
  amountRupees: number;
  status?: string;
  isJointAccountWithAicte?: boolean;
}

export interface AphEvaluationContext {
  institutionId?: string;
  institutionName?: string;
  institutionType?: string; // e.g. "GOVERNMENT", "GOVERNMENT_AIDED", "PRIVATE_UNAIDED"

  // Programme specifications (either single programme shortcut OR array of offerings)
  programme?: string;
  academicLevel?: string;
  programmes?: ProgrammeOfferingInput[];

  // Premises ownership (mandatory to determine multiplier)
  premisesOwnership?:
    | PremisesOwnershipType
    | "OWNED"
    | "LEASED_PRIVATE"
    | "LEASED_GOVERNMENT"
    | "GOVERNMENT_ALLOTTED"
    | "UNKNOWN"
    | string
    | null;

  // Deposit inputs: explicit total amount or list of active instruments
  depositedAmountRupees?: number;
  instruments?: DepositInstrumentInput[];

  // Special regulatory conditions
  isMinorityInstitution?: boolean;
  isWomenLedInstitution?: boolean;
  isPwDInstitution?: boolean;
  concessionProofVerified?: boolean;

  isGovernmentOrAided?: boolean;
  governmentExemptionVerified?: boolean;

  hasPriorHistoricalDeposit?: boolean;
  hasConversionNoc?: boolean;

  // Optional custom ruleset override (e.g. for testing or historical version lookups)
  customRules?: AphRuleDefinition[];
}

export interface ProgrammeRequirementBreakdown {
  programme: string;
  academicLevel: string;
  ruleKey: string | null;
  baseAmountRupees: number | null;
  multiplier: number | null;
  calculatedRequirementRupees: number | null;
  status: "DETERMINED" | "NOT_LISTED" | "UNKNOWN_PROGRAMME" | "INVALID_LEVEL";
  explanation: string;
}

export interface AphEvaluationResult {
  complianceStatus: ComplianceStatus;
  calculatedRequirement: number | null; // Total required in integer INR (null if undeterminable)
  applicableBaseAmount: number | null;  // Base amount for single-programme (null or sum for multi)
  applicableMultiplier: number | null;  // Base multiplier (e.g. 1.0, 2.0, 0.8)
  amountBeingCompared: number;          // Total deposit compared in integer INR
  shortfallOrExcess: number | null;     // amountBeingCompared - calculatedRequirement
  ruleId: string | null;                // Rule key(s)
  regulatoryVersion: string;
  plainLanguageExplanation: string;
  missingInputs: string[];
  isManualReviewRequired: boolean;
  manualReviewReasons: string[];
  programmeBreakdown: ProgrammeRequirementBreakdown[];
  instrumentsEvaluated?: {
    totalCount: number;
    activeCount: number;
    totalAmountRupees: number;
  };
}

/**
 * Pure evaluator for APH 2024-2027 Security Deposit Compliance.
 */
export function evaluateAphCompliance(ctx: AphEvaluationContext): AphEvaluationResult {
  const missingInputs: string[] = [];
  const manualReviewReasons: string[] = [];
  const rulesList = ctx.customRules ?? APH_2024_2027_RULES;

  // 1. Resolve programmes list
  const rawProgrammes: ProgrammeOfferingInput[] = [];
  if (ctx.programmes && ctx.programmes.length > 0) {
    rawProgrammes.push(...ctx.programmes);
  } else if (ctx.programme && ctx.academicLevel) {
    rawProgrammes.push({
      programme: ctx.programme,
      academicLevel: ctx.academicLevel,
    });
  } else {
    missingInputs.push("programme and academicLevel");
  }

  // 2. Resolve deposited amount (aggregate instruments if provided)
  let amountBeingCompared = 0;
  let instrumentsSummary: AphEvaluationResult["instrumentsEvaluated"] | undefined;

  if (ctx.instruments && ctx.instruments.length > 0) {
    let activeTotal = 0;
    let activeCount = 0;
    for (const inst of ctx.instruments) {
      // Instruments marked REJECTED or CANCELLED do not count toward obligation
      const statusUpper = inst.status?.toUpperCase();
      if (statusUpper !== "REJECTED" && statusUpper !== "CANCELLED") {
        activeTotal += Math.floor(inst.amountRupees || 0);
        activeCount++;
      }
    }
    amountBeingCompared = activeTotal;
    instrumentsSummary = {
      totalCount: ctx.instruments.length,
      activeCount,
      totalAmountRupees: activeTotal,
    };
  } else if (typeof ctx.depositedAmountRupees === "number") {
    amountBeingCompared = Math.floor(ctx.depositedAmountRupees);
  }

  // 3. Resolve premises ownership and lease multiplier
  let ownershipMultiplier = 1.0;
  let isOwnershipDetermined = false;

  const rawOwnership = ctx.premisesOwnership?.toUpperCase();
  if (
    !rawOwnership ||
    rawOwnership === "UNKNOWN" ||
    rawOwnership === "NULL" ||
    rawOwnership === "UNDEFINED"
  ) {
    missingInputs.push("premisesOwnership");
  } else if (rawOwnership === "LEASED_PRIVATE" || rawOwnership === "PRIVATE_LEASE") {
    ownershipMultiplier = MULTIPLIERS.LEASED_PRIVATE; // 2.0x per Sec 1.12.c
    isOwnershipDetermined = true;
  } else if (
    rawOwnership === "OWNED" ||
    rawOwnership === "LEASED_GOVERNMENT" ||
    rawOwnership === "GOVERNMENT_ALLOTTED"
  ) {
    ownershipMultiplier = 1.0;
    isOwnershipDetermined = true;
  } else {
    missingInputs.push(`premisesOwnership (unrecognized value: '${ctx.premisesOwnership}')`);
  }

  // 4. Check historical deposits and conversion NOCs
  if (ctx.hasPriorHistoricalDeposit) {
    manualReviewReasons.push(
      "Institution holds prior historical deposit under earlier APH edition; adjustment requires AICTE committee scrutiny."
    );
  }
  if (ctx.hasConversionNoc) {
    manualReviewReasons.push(
      "Institutional conversion or NOC detected; statutory deposit reconciliation must be validated manually."
    );
  }

  // 5. Check Government / Aided institution exemption
  const isGovCategory =
    ctx.isGovernmentOrAided === true ||
    ctx.institutionType?.toUpperCase().includes("GOVERNMENT") ||
    ctx.institutionType?.toUpperCase().includes("AIDED");

  if (isGovCategory) {
    if (ctx.governmentExemptionVerified === true) {
      // Verified full exemption
      return {
        complianceStatus: "COMPLIANT",
        calculatedRequirement: 0,
        applicableBaseAmount: 0,
        applicableMultiplier: 0,
        amountBeingCompared,
        shortfallOrExcess: amountBeingCompared,
        ruleId: "APH_GOVT_EXEMPTION",
        regulatoryVersion: CURRENT_APH_VERSION,
        plainLanguageExplanation:
          "Central/State Government / Government-Aided institution with verified exemption order. Statutory security deposit requirement is ₹0.",
        missingInputs: [],
        isManualReviewRequired: false,
        manualReviewReasons: [],
        programmeBreakdown: [],
        instrumentsEvaluated: instrumentsSummary,
      };
    } else {
      manualReviewReasons.push(
        "Government or Government-aided institution exemption claimed without verified government order or undertaking."
      );
    }
  }

  // 6. Check Concessions (Minority, Women-led, PwD)
  const isConcessionClaimed =
    ctx.isMinorityInstitution || ctx.isWomenLedInstitution || ctx.isPwDInstitution;
  let concessionMultiplier = 1.0;

  if (isConcessionClaimed) {
    if (ctx.concessionProofVerified === true) {
      // 20% concession applies (pays 80%). Capped at 20% even if multiple apply.
      concessionMultiplier = MULTIPLIERS.CONCESSION_FACTOR; // 0.80
    } else {
      manualReviewReasons.push(
        "Special concession claimed (Minority/Women-led/PwD) but supporting certificate is unverified or incomplete."
      );
    }
  }

  // 7. Process programme requirements
  const breakdowns: ProgrammeRequirementBreakdown[] = [];
  let totalBaseRequirement = 0;
  let totalCalculatedRequirement = 0;
  let hasUndeterminableProgramme = false;
  const ruleKeys: string[] = [];

  for (const prog of rawProgrammes) {
    const lookup = findAphRule(prog.programme, prog.academicLevel, rulesList);

    if (lookup.kind === "UNKNOWN_PROGRAMME") {
      hasUndeterminableProgramme = true;
      manualReviewReasons.push(
        `Programme '${prog.programme}' is not recognized in AICTE APH 2024–2027.`
      );
      breakdowns.push({
        programme: prog.programme,
        academicLevel: prog.academicLevel,
        ruleKey: null,
        baseAmountRupees: null,
        multiplier: null,
        calculatedRequirementRupees: null,
        status: "UNKNOWN_PROGRAMME",
        explanation: `Unknown programme '${prog.programme}'. Cannot safely assume ₹0 or standard amount.`,
      });
    } else if (lookup.kind === "INVALID_LEVEL") {
      hasUndeterminableProgramme = true;
      manualReviewReasons.push(
        `Academic level '${prog.academicLevel}' for programme '${prog.programme}' is invalid.`
      );
      breakdowns.push({
        programme: prog.programme,
        academicLevel: prog.academicLevel,
        ruleKey: null,
        baseAmountRupees: null,
        multiplier: null,
        calculatedRequirementRupees: null,
        status: "INVALID_LEVEL",
        explanation: `Invalid academic level '${prog.academicLevel}'. Must be Diploma, UG, or PG.`,
      });
    } else if (lookup.kind === "NOT_LISTED") {
      hasUndeterminableProgramme = true;
      manualReviewReasons.push(
        `Programme '${lookup.programmeKey}' at level '${lookup.academicLevel}' is not listed in Table 1.4.`
      );
      breakdowns.push({
        programme: prog.programme,
        academicLevel: prog.academicLevel,
        ruleKey: null,
        baseAmountRupees: null,
        multiplier: null,
        calculatedRequirementRupees: null,
        status: "NOT_LISTED",
        explanation: lookup.reason,
      });
    } else {
      // Found valid rule
      const rule = lookup.rule;
      ruleKeys.push(rule.ruleKey);
      const effectiveMultiplier = ownershipMultiplier * concessionMultiplier;
      const progRequired = Math.round(rule.baseAmountRupees * effectiveMultiplier);

      totalBaseRequirement += rule.baseAmountRupees;
      totalCalculatedRequirement += progRequired;

      breakdowns.push({
        programme: rule.programmeDisplayName,
        academicLevel: rule.academicLevel,
        ruleKey: rule.ruleKey,
        baseAmountRupees: rule.baseAmountRupees,
        multiplier: effectiveMultiplier,
        calculatedRequirementRupees: progRequired,
        status: "DETERMINED",
        explanation: `Base: ₹${(rule.baseAmountRupees / 100000).toFixed(1)}L × ${effectiveMultiplier}x = ₹${(progRequired / 100000).toFixed(1)}L (${rule.sourceClause})`,
      });
    }
  }

  // 8. Determine final status
  const effectiveCombinedMultiplier = ownershipMultiplier * concessionMultiplier;

  // If there are missing mandatory inputs, return INSUFFICIENT_DATA
  if (missingInputs.length > 0) {
    return {
      complianceStatus: "INSUFFICIENT_DATA",
      calculatedRequirement: null,
      applicableBaseAmount: rawProgrammes.length === 1 && breakdowns[0]?.baseAmountRupees ? breakdowns[0].baseAmountRupees : null,
      applicableMultiplier: isOwnershipDetermined ? effectiveCombinedMultiplier : null,
      amountBeingCompared,
      shortfallOrExcess: null,
      ruleId: ruleKeys.length > 0 ? ruleKeys.join(",") : null,
      regulatoryVersion: CURRENT_APH_VERSION,
      plainLanguageExplanation: `Insufficient data to evaluate regulatory compliance. Missing required inputs: ${missingInputs.join(", ")}.`,
      missingInputs,
      isManualReviewRequired: manualReviewReasons.length > 0,
      manualReviewReasons,
      programmeBreakdown: breakdowns,
      instrumentsEvaluated: instrumentsSummary,
    };
  }

  // If manual review is flagged or any programme was undeterminable, return NEEDS_MANUAL_REVIEW
  if (manualReviewReasons.length > 0 || hasUndeterminableProgramme) {
    return {
      complianceStatus: "NEEDS_MANUAL_REVIEW",
      calculatedRequirement: null,
      applicableBaseAmount: null,
      applicableMultiplier: effectiveCombinedMultiplier,
      amountBeingCompared,
      shortfallOrExcess: null,
      ruleId: ruleKeys.length > 0 ? ruleKeys.join(",") : null,
      regulatoryVersion: CURRENT_APH_VERSION,
      plainLanguageExplanation: `Evaluation requires manual regulatory review: ${manualReviewReasons.join("; ")}. Never defaulted to ₹0.`,
      missingInputs: [],
      isManualReviewRequired: true,
      manualReviewReasons,
      programmeBreakdown: breakdowns,
      instrumentsEvaluated: instrumentsSummary,
    };
  }

  // Determinable compliance check
  const shortfallOrExcess = amountBeingCompared - totalCalculatedRequirement;
  const isCompliant = shortfallOrExcess >= 0;

  const formattedRequired = `₹${(totalCalculatedRequirement / 100000).toFixed(2)} Lakh`;
  const formattedCompared = `₹${(amountBeingCompared / 100000).toFixed(2)} Lakh`;

  let explanation: string;
  if (isCompliant) {
    explanation = shortfallOrExcess > 0
      ? `Compliant. Deposited ${formattedCompared} exceeds required ${formattedRequired} by ₹${(shortfallOrExcess / 100000).toFixed(2)} Lakh.`
      : `Compliant. Deposited ${formattedCompared} exactly meets the statutory requirement of ${formattedRequired}.`;
  } else {
    explanation = `Deficient. Deposited ${formattedCompared} is short of statutory requirement ${formattedRequired} by ₹${(Math.abs(shortfallOrExcess) / 100000).toFixed(2)} Lakh.`;
  }

  return {
    complianceStatus: isCompliant ? "COMPLIANT" : "DEFICIENT",
    calculatedRequirement: totalCalculatedRequirement,
    applicableBaseAmount: rawProgrammes.length === 1 ? breakdowns[0].baseAmountRupees : totalBaseRequirement,
    applicableMultiplier: effectiveCombinedMultiplier,
    amountBeingCompared,
    shortfallOrExcess,
    ruleId: ruleKeys.join(","),
    regulatoryVersion: CURRENT_APH_VERSION,
    plainLanguageExplanation: explanation,
    missingInputs: [],
    isManualReviewRequired: false,
    manualReviewReasons: [],
    programmeBreakdown: breakdowns,
    instrumentsEvaluated: instrumentsSummary,
  };
}
