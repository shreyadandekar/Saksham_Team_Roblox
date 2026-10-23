/**
 * src/services/ocr/ruleEngine.ts
 * Pure, deterministic rule-based comparison engine.
 * Compares institution-entered instrument particulars against OCR-extracted candidate values.
 *
 * Safeguards:
 *  - Pure calculation: zero database mutations or side effects.
 *  - Input objects are immutable and never modified.
 *  - OCR output is treated strictly as unverified candidate evidence.
 *  - Discrepancy detection never establishes document authenticity or fraud.
 */

import type { CandidateField, ExtractedCandidates } from "./types";
import type {
  ComparisonField,
  ComparisonSummary,
  EnteredInstrumentData,
  FieldComparisonResult,
  OcrComparisonReport,
  OverallReviewIndicator,
} from "./comparisonTypes";
import { parseDateCandidate } from "./candidateExtractor";

/**
 * Minimum confidence threshold required to consider an extracted field reliable for automated comparison.
 * Extractions below this threshold are flagged as AMBIGUOUS.
 */
export const CONFIDENCE_AMBIGUOUS_THRESHOLD = 0.50;

/**
 * Documented aliases for Indian Scheduled Commercial Banks.
 * Maps canonical bank names to known abbreviations and official name variations.
 */
export const DOCUMENTED_BANK_ALIASES: Record<string, string[]> = {
  "state bank of india": ["sbi", "state bank of india"],
  "punjab national bank": ["pnb", "punjab national bank"],
  "bank of baroda": ["bob", "bank of baroda"],
  "canara bank": ["canara bank", "canara"],
  "union bank of india": ["ubi", "union bank of india", "union bank"],
  "hdfc bank": ["hdfc", "hdfc bank", "hdfc bank ltd", "hdfc bank limited"],
  "icici bank": ["icici", "icici bank", "icici bank ltd", "icici bank limited"],
  "axis bank": ["axis", "axis bank", "axis bank ltd"],
  "kotak mahindra bank": ["kotak", "kotak bank", "kotak mahindra bank", "kotak mahindra"],
  "bank of india": ["boi", "bank of india"],
  "indian bank": ["indian bank"],
  "central bank of india": ["cbi", "central bank of india", "central bank"],
  "indian overseas bank": ["iob", "indian overseas bank"],
  "uco bank": ["uco", "uco bank"],
  "bank of maharashtra": ["bom", "bank of maharashtra"],
  "punjab & sind bank": ["punjab & sind bank", "punjab and sind bank", "psb"],
  "indusind bank": ["indusind", "indusind bank"],
  "federal bank": ["federal", "federal bank"],
  "idbi bank": ["idbi", "idbi bank"],
  "yes bank": ["yes", "yes bank"],
};

/**
 * Normalizes an amount value to a standard two-decimal string (e.g. "500000.00").
 * Handles numbers, strings, Indian comma groupings ("5,00,000"), and currency symbols.
 * Returns null if invalid or <= 0.
 */
export function normalizeAmountToDecimalString(
  val: string | number | { toString(): string } | null | undefined
): string | null {
  if (val === null || val === undefined) return null;

  let str: string;
  if (typeof val === "number") {
    if (isNaN(val) || val <= 0 || !isFinite(val)) return null;
    return val.toFixed(2);
  } else if (typeof val === "string") {
    str = val;
  } else {
    str = val.toString();
  }

  // Clean currency symbols, commas, and trailing punctuation
  let clean = str.replace(/[₹\u20B9]|INR|Rs\.?|Rupees/gi, "");
  clean = clean.replace(/[\/\-=]/g, "");
  clean = clean.replace(/,/g, "").trim();

  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0 || !isFinite(num)) {
    return null;
  }

  return num.toFixed(2);
}

/**
 * Normalizes a date value (Date object or string) into an ISO YYYY-MM-DD date string.
 * Returns null if the date is invalid.
 */
export function normalizeDateToIsoString(
  val: string | Date | null | undefined
): string | null {
  if (val === null || val === undefined) return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split("T")[0];
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // First attempt using candidate date parser (handles DD/MM/YYYY, DD-MMM-YYYY, YYYY-MM-DD)
    const parsed = parseDateCandidate(trimmed);
    if (parsed) return parsed;

    // Fallback: standard Date parsing
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      if (year >= 1990 && year <= 2099) {
        return d.toISOString().split("T")[0];
      }
    }
  }

  return null;
}

/**
 * Normalizes a bank name string for alias resolution:
 * lowercase, stripped punctuation, collapsed spaces, and stripped legal entity suffixes.
 */
export function normalizeBankName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[,\.\-]/g, " ")
    .replace(/\b(ltd|limited)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a bank name to its canonical identifier using DOCUMENTED_BANK_ALIASES.
 * Returns normalized name if no documented alias matches.
 */
export function getCanonicalBank(raw: string): string {
  const norm = normalizeBankName(raw);
  for (const [canonical, aliases] of Object.entries(DOCUMENTED_BANK_ALIASES)) {
    for (const alias of aliases) {
      if (norm === alias || normalizeBankName(alias) === norm) {
        return canonical;
      }
    }
  }
  return norm;
}

/**
 * Normalizes branch names:
 * lowercase, strips "branch", "b.o.", punctuation, and collapses whitespace.
 */
export function normalizeBranchName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(branch|b\.?o\.?|bo)\b/gi, " ")
    .replace(/[,\.\-\/\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Field Comparison Handlers
// ─────────────────────────────────────────────────────────────────────────────

function compareInstrumentNumber(
  entered: string | null | undefined,
  extracted: CandidateField<string> | undefined
): FieldComparisonResult {
  const field: ComparisonField = "instrumentNumber";
  const enteredVal = entered ? entered.trim() : null;
  const extractedVal = extracted?.value ? extracted.value.trim() : null;

  if (!enteredVal && !extractedVal) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: null,
      extractedValue: null,
      rule: "BOTH_VALUES_ABSENT",
      message: "Both entered and extracted instrument numbers are absent",
      severity: "WARNING",
    };
  }

  if (!enteredVal) {
    return {
      field,
      status: "MISSING_ENTERED",
      enteredValue: null,
      extractedValue: extractedVal,
      rule: "ENTERED_VALUE_MISSING",
      message: "Instrument number was not recorded by institution",
      severity: "HIGH",
    };
  }

  if (!extractedVal) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: enteredVal,
      extractedValue: null,
      rule: "EXTRACTED_CANDIDATE_MISSING",
      message: "No candidate FDR/instrument number detected in document",
      severity: "WARNING",
    };
  }

  if (extracted && extracted.confidence < CONFIDENCE_AMBIGUOUS_THRESHOLD) {
    return {
      field,
      status: "AMBIGUOUS",
      enteredValue: enteredVal,
      extractedValue: extractedVal,
      rule: "LOW_CONFIDENCE_EXTRACTION",
      message: `Extracted instrument number has low OCR confidence (${Math.round(extracted.confidence * 100)}%)`,
      severity: "WARNING",
    };
  }

  // Exact case-insensitive match (do not remove internal dashes/slashes)
  if (enteredVal.toUpperCase() === extractedVal.toUpperCase()) {
    return {
      field,
      status: "MATCH",
      enteredValue: enteredVal,
      extractedValue: extractedVal,
      rule: "INSTRUMENT_NUMBER_CASE_INSENSITIVE",
      message: "Instrument number matches extracted document reference",
      severity: "INFO",
    };
  }

  return {
    field,
    status: "MISMATCH",
    enteredValue: enteredVal,
    extractedValue: extractedVal,
    rule: "INSTRUMENT_NUMBER_VALUE_MISMATCH",
    message: `Entered instrument number (${enteredVal}) does not match extracted document value (${extractedVal})`,
    severity: "HIGH",
  };
}

function compareBankName(
  entered: string | null | undefined,
  extracted: CandidateField<string> | undefined
): FieldComparisonResult {
  const field: ComparisonField = "bankName";
  const enteredVal = entered ? entered.trim() : null;
  const extractedVal = extracted?.value ? extracted.value.trim() : null;

  if (!enteredVal && !extractedVal) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: null,
      extractedValue: null,
      rule: "BOTH_VALUES_ABSENT",
      message: "Both entered and extracted bank names are absent",
      severity: "WARNING",
    };
  }

  if (!enteredVal) {
    return {
      field,
      status: "MISSING_ENTERED",
      enteredValue: null,
      extractedValue: extractedVal,
      rule: "ENTERED_VALUE_MISSING",
      message: "Bank name was not recorded by institution",
      severity: "HIGH",
    };
  }

  if (!extractedVal) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: enteredVal,
      extractedValue: null,
      rule: "EXTRACTED_CANDIDATE_MISSING",
      message: "No issuing bank name detected in document",
      severity: "WARNING",
    };
  }

  if (extracted && extracted.confidence < CONFIDENCE_AMBIGUOUS_THRESHOLD) {
    return {
      field,
      status: "AMBIGUOUS",
      enteredValue: enteredVal,
      extractedValue: extractedVal,
      rule: "LOW_CONFIDENCE_EXTRACTION",
      message: `Extracted bank name has low OCR confidence (${Math.round(extracted.confidence * 100)}%)`,
      severity: "WARNING",
    };
  }

  const canonEntered = getCanonicalBank(enteredVal);
  const canonExtracted = getCanonicalBank(extractedVal);

  if (canonEntered === canonExtracted) {
    return {
      field,
      status: "MATCH",
      enteredValue: enteredVal,
      extractedValue: extractedVal,
      rule: "DOCUMENTED_BANK_ALIAS",
      message: "Bank name matches documented bank alias",
      severity: "INFO",
    };
  }

  return {
    field,
    status: "MISMATCH",
    enteredValue: enteredVal,
    extractedValue: extractedVal,
    rule: "BANK_NAME_MISMATCH",
    message: `Entered bank (${enteredVal}) does not match extracted issuing bank (${extractedVal})`,
    severity: "HIGH",
  };
}

function compareBranchName(
  entered: string | null | undefined,
  extracted: CandidateField<string> | undefined
): FieldComparisonResult {
  const field: ComparisonField = "branchName";
  const enteredVal = entered ? entered.trim() : null;
  const extractedVal = extracted?.value ? extracted.value.trim() : null;

  if (!enteredVal && !extractedVal) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: null,
      extractedValue: null,
      rule: "BOTH_VALUES_ABSENT",
      message: "Both entered and extracted branch names are absent",
      severity: "WARNING",
    };
  }

  if (!enteredVal) {
    return {
      field,
      status: "MISSING_ENTERED",
      enteredValue: null,
      extractedValue: extractedVal,
      rule: "ENTERED_VALUE_MISSING",
      message: "Branch name was not recorded by institution",
      severity: "HIGH",
    };
  }

  if (!extractedVal) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: enteredVal,
      extractedValue: null,
      rule: "EXTRACTED_CANDIDATE_MISSING",
      message: "No branch name detected in document",
      severity: "WARNING",
    };
  }

  if (extracted && extracted.confidence < CONFIDENCE_AMBIGUOUS_THRESHOLD) {
    return {
      field,
      status: "AMBIGUOUS",
      enteredValue: enteredVal,
      extractedValue: extractedVal,
      rule: "LOW_CONFIDENCE_EXTRACTION",
      message: `Extracted branch name has low OCR confidence (${Math.round(extracted.confidence * 100)}%)`,
      severity: "WARNING",
    };
  }

  const normEntered = normalizeBranchName(enteredVal);
  const normExtracted = normalizeBranchName(extractedVal);

  if (normEntered === normExtracted) {
    return {
      field,
      status: "MATCH",
      enteredValue: enteredVal,
      extractedValue: extractedVal,
      rule: "BRANCH_NAME_NORMALIZED",
      message: "Branch name matches extracted document branch",
      severity: "INFO",
    };
  }

  // If one normalized string completely contains the other as a full sub-phrase
  if (normEntered.length > 3 && normExtracted.length > 3) {
    if (normExtracted.includes(normEntered) || normEntered.includes(normExtracted)) {
      return {
        field,
        status: "AMBIGUOUS",
        enteredValue: enteredVal,
        extractedValue: extractedVal,
        rule: "BRANCH_PARTIAL_CONTAINMENT",
        message: `Branch name partially aligns but contains differing location details (Entered: "${enteredVal}", Extracted: "${extractedVal}")`,
        severity: "WARNING",
      };
    }
  }

  return {
    field,
    status: "MISMATCH",
    enteredValue: enteredVal,
    extractedValue: extractedVal,
    rule: "BRANCH_NAME_MISMATCH",
    message: `Entered branch (${enteredVal}) does not match extracted branch (${extractedVal})`,
    severity: "HIGH",
  };
}

function compareAmount(
  entered: string | number | { toString(): string } | null | undefined,
  extracted: CandidateField<string> | undefined
): FieldComparisonResult {
  const field: ComparisonField = "amount";
  const enteredValStr = entered !== null && entered !== undefined ? String(entered) : null;
  const extractedValStr = extracted?.value || null;

  if (enteredValStr === null && extractedValStr === null) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: null,
      extractedValue: null,
      rule: "BOTH_VALUES_ABSENT",
      message: "Both entered and extracted principal amounts are absent",
      severity: "WARNING",
    };
  }

  if (enteredValStr === null) {
    return {
      field,
      status: "MISSING_ENTERED",
      enteredValue: null,
      extractedValue: extractedValStr,
      rule: "ENTERED_VALUE_MISSING",
      message: "Principal amount was not recorded by institution",
      severity: "HIGH",
    };
  }

  if (extractedValStr === null) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: enteredValStr,
      extractedValue: null,
      rule: "EXTRACTED_CANDIDATE_MISSING",
      message: "No principal amount detected in document",
      severity: "WARNING",
    };
  }

  if (extracted && extracted.confidence < CONFIDENCE_AMBIGUOUS_THRESHOLD) {
    return {
      field,
      status: "AMBIGUOUS",
      enteredValue: enteredValStr,
      extractedValue: extractedValStr,
      rule: "LOW_CONFIDENCE_EXTRACTION",
      message: `Extracted amount has low OCR confidence (${Math.round(extracted.confidence * 100)}%)`,
      severity: "WARNING",
    };
  }

  const normEntered = normalizeAmountToDecimalString(entered);
  const normExtracted = normalizeAmountToDecimalString(extractedValStr);

  if (!normEntered || !normExtracted) {
    return {
      field,
      status: "AMBIGUOUS",
      enteredValue: enteredValStr,
      extractedValue: extractedValStr,
      rule: "AMOUNT_PARSE_ERROR",
      message: "Unable to parse one or both amount values into standard currency decimals",
      severity: "WARNING",
    };
  }

  if (normEntered === normExtracted) {
    return {
      field,
      status: "MATCH",
      enteredValue: normEntered,
      extractedValue: normExtracted,
      rule: "EXACT_DECIMAL_AMOUNT",
      message: "Principal amount matches extracted document value exactly",
      severity: "INFO",
    };
  }

  return {
    field,
    status: "MISMATCH",
    enteredValue: normEntered,
    extractedValue: normExtracted,
    rule: "AMOUNT_VALUE_MISMATCH",
    message: `Entered amount (Rs. ${normEntered}) does not match extracted amount (Rs. ${normExtracted})`,
    severity: "HIGH",
  };
}

function compareDate(
  field: "issueDate" | "maturityDate",
  entered: string | Date | null | undefined,
  extracted: CandidateField<string> | undefined
): FieldComparisonResult {
  const enteredValStr = entered ? (entered instanceof Date ? entered.toISOString().split("T")[0] : String(entered)) : null;
  const extractedValStr = extracted?.value || null;

  const fieldLabel = field === "issueDate" ? "Issue date" : "Maturity date";

  if (!enteredValStr && !extractedValStr) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: null,
      extractedValue: null,
      rule: "BOTH_VALUES_ABSENT",
      message: `Both entered and extracted ${fieldLabel.toLowerCase()}s are absent`,
      severity: "WARNING",
    };
  }

  if (!enteredValStr) {
    return {
      field,
      status: "MISSING_ENTERED",
      enteredValue: null,
      extractedValue: extractedValStr,
      rule: "ENTERED_VALUE_MISSING",
      message: `${fieldLabel} was not recorded by institution`,
      severity: "HIGH",
    };
  }

  if (!extractedValStr) {
    return {
      field,
      status: "MISSING_EXTRACTED",
      enteredValue: enteredValStr,
      extractedValue: null,
      rule: "EXTRACTED_CANDIDATE_MISSING",
      message: `No ${fieldLabel.toLowerCase()} detected in document`,
      severity: "WARNING",
    };
  }

  if (extracted && extracted.confidence < CONFIDENCE_AMBIGUOUS_THRESHOLD) {
    return {
      field,
      status: "AMBIGUOUS",
      enteredValue: enteredValStr,
      extractedValue: extractedValStr,
      rule: "LOW_CONFIDENCE_EXTRACTION",
      message: `Extracted ${fieldLabel.toLowerCase()} has low OCR confidence (${Math.round(extracted.confidence * 100)}%)`,
      severity: "WARNING",
    };
  }

  const normEntered = normalizeDateToIsoString(entered);
  const normExtracted = normalizeDateToIsoString(extractedValStr);

  if (!normEntered || !normExtracted) {
    return {
      field,
      status: "AMBIGUOUS",
      enteredValue: enteredValStr,
      extractedValue: extractedValStr,
      rule: "INVALID_CALENDAR_DATE",
      message: `One or both ${fieldLabel.toLowerCase()} values represent an invalid calendar date`,
      severity: "WARNING",
    };
  }

  if (normEntered === normExtracted) {
    return {
      field,
      status: "MATCH",
      enteredValue: normEntered,
      extractedValue: normExtracted,
      rule: "CALENDAR_DATE_MATCH",
      message: `${fieldLabel} matches extracted document date (${normEntered})`,
      severity: "INFO",
    };
  }

  return {
    field,
    status: "MISMATCH",
    enteredValue: normEntered,
    extractedValue: normExtracted,
    rule: "CALENDAR_DATE_MISMATCH",
    message: `Entered ${fieldLabel.toLowerCase()} (${normEntered}) does not match extracted date (${normExtracted})`,
    severity: "HIGH",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Comparison Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure function: compares institution-entered instrument data against OCR-extracted candidate values.
 *
 * @param entered - Institution-entered instrument particulars
 * @param extracted - Candidate fields extracted by deterministic OCR engine
 * @returns Structured OcrComparisonReport with field results and overall summary
 */
export function compareEnteredAgainstExtracted(
  entered: EnteredInstrumentData,
  extracted: ExtractedCandidates
): OcrComparisonReport {
  // Defensive copy to ensure pure execution without mutating inputs
  const enteredCopy: EnteredInstrumentData = { ...entered };
  const extractedCopy: ExtractedCandidates = { ...extracted };

  const fields: Record<ComparisonField, FieldComparisonResult> = {
    instrumentNumber: compareInstrumentNumber(
      enteredCopy.instrumentNumber,
      extractedCopy.fdrNumber
    ),
    bankName: compareBankName(enteredCopy.bankName, extractedCopy.bankName),
    branchName: compareBranchName(enteredCopy.branchName, extractedCopy.branchName),
    amount: compareAmount(enteredCopy.amount, extractedCopy.amount),
    issueDate: compareDate("issueDate", enteredCopy.issueDate, extractedCopy.issueDate),
    maturityDate: compareDate(
      "maturityDate",
      enteredCopy.maturityDate,
      extractedCopy.maturityDate
    ),
  };

  const fieldList = Object.values(fields);
  const totalFields = fieldList.length;

  let matchCount = 0;
  let mismatchCount = 0;
  let missingEnteredCount = 0;
  let missingExtractedCount = 0;
  let ambiguousCount = 0;

  for (const f of fieldList) {
    switch (f.status) {
      case "MATCH":
        matchCount++;
        break;
      case "MISMATCH":
        mismatchCount++;
        break;
      case "MISSING_ENTERED":
        missingEnteredCount++;
        break;
      case "MISSING_EXTRACTED":
        missingExtractedCount++;
        break;
      case "AMBIGUOUS":
        ambiguousCount++;
        break;
    }
  }

  const hasMismatches = mismatchCount > 0;
  const requiresReview =
    hasMismatches ||
    ambiguousCount > 0 ||
    missingEnteredCount > 0 ||
    missingExtractedCount > 0;

  let overallReviewIndicator: OverallReviewIndicator;
  if (hasMismatches) {
    overallReviewIndicator = "DISCREPANCY_DETECTED";
  } else if (requiresReview) {
    overallReviewIndicator = "REVIEW_RECOMMENDED";
  } else {
    overallReviewIndicator = "CLEAN_MATCH";
  }

  const summary: ComparisonSummary = {
    totalFields,
    matchCount,
    mismatchCount,
    missingEnteredCount,
    missingExtractedCount,
    ambiguousCount,
    hasMismatches,
    requiresReview,
    overallReviewIndicator,
    evaluatedAt: new Date().toISOString(),
    disclaimer:
      "OCR candidate comparisons are unverified evidence and do not establish document authenticity or legal validity.",
  };

  return {
    summary,
    fields,
  };
}
