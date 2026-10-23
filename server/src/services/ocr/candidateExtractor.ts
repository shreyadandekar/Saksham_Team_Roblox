/**
 * src/services/ocr/candidateExtractor.ts
 * Deterministic candidate field extractor for Indian banking Fixed Deposit Receipts (FDR).
 *
 * Implements regex and anchor-based matching for:
 *   - FDR / Instrument / Receipt Number
 *   - Issuing Bank Name
 *   - Branch Name
 *   - Principal Deposit Amount
 *   - Issue Date
 *   - Maturity Date
 *
 * Computes per-field confidence scores and overall confidence.
 * Completely deterministic — no LLMs or external network dependencies.
 */

import type { CandidateField, ExtractedCandidates } from "./types";

/**
 * Common Indian Scheduled Commercial Banks for high-confidence identification.
 */
const KNOWN_INDIAN_BANKS: { name: string; patterns: RegExp[] }[] = [
  { name: "State Bank of India", patterns: [/\bState\s+Bank\s+of\s+India\b/i, /\bSBI\b/i] },
  { name: "Punjab National Bank", patterns: [/\bPunjab\s+National\s+Bank\b/i, /\bPNB\b/i] },
  { name: "Bank of Baroda", patterns: [/\bBank\s+of\s+Baroda\b/i, /\bBOB\b/i] },
  { name: "Canara Bank", patterns: [/\bCanara\s+Bank\b/i] },
  { name: "Union Bank of India", patterns: [/\bUnion\s+Bank\s+of\s+India\b/i, /\bUBI\b/i] },
  { name: "HDFC Bank", patterns: [/\bHDFC\s+Bank(?:\s+Ltd\.?)?\b/i, /\bHDFC\b/i] },
  { name: "ICICI Bank", patterns: [/\bICICI\s+Bank(?:\s+Ltd\.?)?\b/i, /\bICICI\b/i] },
  { name: "Axis Bank", patterns: [/\bAxis\s+Bank(?:\s+Ltd\.?)?\b/i] },
  { name: "Kotak Mahindra Bank", patterns: [/\bKotak\s+Mahindra\s+Bank\b/i, /\bKotak\s+Bank\b/i] },
  { name: "Bank of India", patterns: [/\bBank\s+of\s+India\b/i, /\bBOI\b/i] },
  { name: "Indian Bank", patterns: [/\bIndian\s+Bank\b/i] },
  { name: "Central Bank of India", patterns: [/\bCentral\s+Bank\s+of\s+India\b/i] },
  { name: "Indian Overseas Bank", patterns: [/\bIndian\s+Overseas\s+Bank\b/i, /\bIOB\b/i] },
  { name: "UCO Bank", patterns: [/\bUCO\s+Bank\b/i] },
  { name: "Bank of Maharashtra", patterns: [/\bBank\s+of\s+Maharashtra\b/i] },
  { name: "Punjab & Sind Bank", patterns: [/\bPunjab\s+&\s+Sind\s+Bank\b/i, /\bPunjab\s+and\s+Sind\s+Bank\b/i] },
  { name: "IndusInd Bank", patterns: [/\bIndusInd\s+Bank\b/i] },
  { name: "Federal Bank", patterns: [/\bFederal\s+Bank\b/i] },
  { name: "IDBI Bank", patterns: [/\bIDBI\s+Bank\b/i] },
  { name: "YES Bank", patterns: [/\bYES\s+Bank\b/i] },
];

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Validates whether a day/month/year combination forms a real, valid calendar date.
 * Accurately accounts for leap years, 28/29/30/31-day months, and avoids rollover.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1990 || year > 2099) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Normalize and parse Indian date representations (DD/MM/YYYY, DD-MMM-YYYY, YYYY-MM-DD) into YYYY-MM-DD.
 * Returns null if invalid or cannot be parsed.
 */
export function parseDateCandidate(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/[,\.]/g, "-").replace(/\//g, "-").replace(/\s+/g, "-");

  // Pattern 1: YYYY-MM-DD (ISO)
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (isValidCalendarDate(year, month, day)) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  // Pattern 2: DD-MM-YYYY
  const numericMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10);
    const year = parseInt(numericMatch[3], 10);

    if (isValidCalendarDate(year, month, day)) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  // Pattern 3: DD-MMM-YYYY (e.g. 15-Jan-2026)
  const alphaMonthMatch = clean.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
  if (alphaMonthMatch) {
    const day = parseInt(alphaMonthMatch[1], 10);
    const monthKey = alphaMonthMatch[2].toLowerCase();
    const year = parseInt(alphaMonthMatch[3], 10);
    const month = MONTH_NAMES[monthKey];

    if (month && isValidCalendarDate(year, month, day)) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  return null;
}

/**
 * Parse an Indian currency amount string (e.g. "₹ 5,00,000/-", "Rs. 1,00,000.00") into "500000.00".
 */
export function parseAmountCandidate(raw: string): string | null {
  if (!raw) return null;
  // Remove currency words, symbols, and formatting
  let clean = raw.replace(/[₹\u20B9]|INR|Rs\.?|Rupees/gi, "");
  clean = clean.replace(/[\/\-=]/g, ""); // remove trailing /- or /=
  clean = clean.replace(/,/g, "").trim();

  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0 || !isFinite(num)) {
    return null;
  }

  return num.toFixed(2);
}

/**
 * Extract candidate FDR fields from normalized text.
 */
export function extractCandidateFields(rawText: string): ExtractedCandidates {
  const text = rawText.replace(/\r\n/g, "\n");

  // ── 1. Bank Name ──────────────────────────────────────────────────────────
  let bankNameField: CandidateField<string> = { value: null, confidence: 0 };
  for (const known of KNOWN_INDIAN_BANKS) {
    for (const pattern of known.patterns) {
      const match = text.match(pattern);
      if (match) {
        bankNameField = {
          value: known.name,
          confidence: 0.95,
          rawMatch: match[0],
          anchor: "KNOWN_BANK_LIST",
        };
        break;
      }
    }
    if (bankNameField.value) break;
  }

  // Fallback bank regex: "... Bank"
  if (!bankNameField.value) {
    const genericBankMatch = text.match(/\b([A-Z][a-zA-Z\s]{2,25}\s+Bank(?:\s+Ltd\.?)?)\b/);
    if (genericBankMatch && !genericBankMatch[1].toLowerCase().includes("blood")) {
      bankNameField = {
        value: genericBankMatch[1].trim(),
        confidence: 0.70,
        rawMatch: genericBankMatch[0],
        anchor: "GENERIC_BANK_REGEX",
      };
    }
  }

  // ── 2. Branch Name ────────────────────────────────────────────────────────
  let branchField: CandidateField<string> = { value: null, confidence: 0 };
  const branchRegexes = [
    // Branch prefix anchors: "Branch: Fort, Mumbai", "Branch Name: Parliament Street"
    /(?:Branch\s*(?:Name|Code)?|B\.O\.)\s*[:\-–]\s*([A-Za-z0-9\s,\.\(\)\-\/]{2,40})(?=\n|$|,|\s*IFSC|\s*MICR|\s*Pin)/i,
    // Branch suffix anchors: "Parliament Street Branch", "Sector 17, Chandigarh Branch"
    /\b([A-Z0-9][A-Za-z0-9\s,\.\-]{2,35}\s+(?:Branch|B\.O\.))\b/i,
    // Loose branch prefix: "Branch Sector 17"
    /\bBranch\s*[:\-–]?\s*([A-Za-z][A-Za-z0-9\s]{2,30})\b/i,
  ];

  for (const re of branchRegexes) {
    const match = text.match(re);
    if (match && match[1]) {
      const cleaned = match[1].trim().replace(/^[:\-–\s]+|[,;\.\s]+$/g, "");
      if (cleaned.length >= 2 && !cleaned.toLowerCase().includes("manager")) {
        branchField = {
          value: cleaned,
          confidence: 0.85,
          rawMatch: match[0],
          anchor: "BRANCH_ANCHOR",
        };
        break;
      }
    }
  }

  // ── 3. FDR / Instrument Number ────────────────────────────────────────────
  let fdrNumberField: CandidateField<string> = { value: null, confidence: 0 };
  const fdrRegexes = [
    // Explicit FDR/TDR/Receipt/Certificate anchors
    /(?:FDR|TDR|Fixed\s+Deposit|Term\s+Deposit|Receipt|Deposit\s+Certificate|Certificate)\s*(?:No\.?|Number|#)?\s*[:\-–]\s*([A-Za-z0-9\/\-]{4,25})/i,
    // Deposit Account Number e.g. "Fixed Deposit A/c No: 50300998877665"
    /(?:Fixed\s+Deposit\s+A\/c|Deposit\s+A\/c|A\/c|Account)\s*(?:No\.?|Number|#)\s*[:\-–]\s*(\d{8,20})/i,
    // Loose FDR pattern e.g. "FDR/2026/001" or "TDR12345678"
    /\b((?:FDR|TDR)[\/\-_]?[A-Za-z0-9\-_]{4,20})\b/i,
  ];

  for (let i = 0; i < fdrRegexes.length; i++) {
    const match = text.match(fdrRegexes[i]);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Ensure candidate contains at least one digit and isn't a false match
      if (/\d/.test(candidate) && !/^(?:amount|rupees|date|branch)$/i.test(candidate)) {
        fdrNumberField = {
          value: candidate,
          confidence: i === 0 ? 0.95 : i === 1 ? 0.85 : 0.70,
          rawMatch: match[0],
          anchor: i === 0 ? "EXPLICIT_FDR_ANCHOR" : i === 1 ? "ACCOUNT_NO_ANCHOR" : "LOOSE_FDR_REGEX",
        };
        break;
      }
    }
  }

  // ── 4. Principal Amount ───────────────────────────────────────────────────
  let amountField: CandidateField<string> = { value: null, confidence: 0 };
  const amountRegexes = [
    // Explicit Deposit/Principal Amount / Sum / Value
    /(?:Principal\s+(?:Amount|Sum)|Deposit\s+(?:Amount|Sum|Value)?|Sum\s+of|FDR\s+Amount|Amount\s+Deposited|Fixed\s+Deposit\s+Value)\s*(?:in\s+figures)?\s*[:\-–]?\s*(?:[₹\u20B9]|INR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)(?:\s*[\/\-=])?/i,
    // Generic Amount with currency indicator
    /(?:Amount|Value)\s*[:\-–]?\s*(?:[₹\u20B9]|INR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{2})?)(?:\s*[\/\-=])?/i,
    // Currency followed by figure e.g. "Rs. 5,00,000/-" or "₹ 1,25,50,000.50"
    /(?:[₹\u20B9]|INR|Rs\.)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)(?:\s*[\/\-=])?/i,
  ];

  for (let i = 0; i < amountRegexes.length; i++) {
    const match = text.match(amountRegexes[i]);
    if (match && match[1]) {
      const parsed = parseAmountCandidate(match[1]);
      if (parsed) {
        amountField = {
          value: parsed,
          confidence: i === 0 ? 0.95 : i === 1 ? 0.85 : 0.75,
          rawMatch: match[0],
          anchor: i === 0 ? "EXPLICIT_AMOUNT_ANCHOR" : i === 1 ? "GENERIC_AMOUNT_ANCHOR" : "CURRENCY_FIGURE_ANCHOR",
        };
        break;
      }
    }
  }

  // ── 5. Issue Date & Maturity Date ─────────────────────────────────────────
  let issueDateField: CandidateField<string> = { value: null, confidence: 0 };
  let maturityDateField: CandidateField<string> = { value: null, confidence: 0 };

  const issueRegexes = [
    /(?:Date\s+of\s+Issue|Issue\s+Date|Effective\s+Date|Booking\s+Date|Value\s+Date|Date\s+of\s+Deposit|Deposit\s+Date|Opened\s+on|Dated|\bDate)\s*[:\-–]?\s*((?:\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|(?:\d{1,2}[\/\-\.]\w+[\/\-\.]\d{4}))/i,
    /\bIssue\s*[:\-–]\s*((?:\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|(?:\d{1,2}[\/\-\.]\w+[\/\-\.]\d{4}))/i,
  ];

  for (const re of issueRegexes) {
    const match = text.match(re);
    if (match && match[1]) {
      const parsed = parseDateCandidate(match[1]);
      if (parsed) {
        issueDateField = {
          value: parsed,
          confidence: 0.90,
          rawMatch: match[0],
          anchor: "ISSUE_DATE_ANCHOR",
        };
        break;
      }
    }
  }

  const maturityRegexes = [
    /(?:Date\s+of\s+Maturity|Maturity\s+Date|Due\s+Date|Repayment\s+Date|Matures\s+on|Expiry\s+Date|\bMaturity)\s*[:\-–]?\s*((?:\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|(?:\d{1,2}[\/\-\.]\w+[\/\-\.]\d{4}))/i,
  ];

  for (const re of maturityRegexes) {
    const match = text.match(re);
    if (match && match[1]) {
      const parsed = parseDateCandidate(match[1]);
      if (parsed) {
        maturityDateField = {
          value: parsed,
          confidence: 0.90,
          rawMatch: match[0],
          anchor: "MATURITY_DATE_ANCHOR",
        };
        break;
      }
    }
  }

  // Cross-validation boost: If both dates exist and maturityDate > issueDate, increase confidence!
  if (issueDateField.value && maturityDateField.value) {
    if (maturityDateField.value > issueDateField.value) {
      issueDateField.confidence = Math.min(issueDateField.confidence + 0.05, 1.0);
      maturityDateField.confidence = Math.min(maturityDateField.confidence + 0.05, 1.0);
    } else {
      // Anomaly: maturity date is before or equal to issue date
      maturityDateField.confidence = Math.max(maturityDateField.confidence - 0.30, 0.20);
    }
  }

  // ── Overall Confidence ───────────────────────────────────────────────────
  const fieldConfidences = [
    fdrNumberField.confidence,
    bankNameField.confidence,
    branchField.confidence,
    amountField.confidence,
    issueDateField.confidence,
    maturityDateField.confidence,
  ];

  const overallConfidence =
    Math.round(
      (fieldConfidences.reduce((sum, c) => sum + c, 0) / fieldConfidences.length) * 100
    ) / 100;

  return {
    fdrNumber: fdrNumberField,
    bankName: bankNameField,
    branchName: branchField,
    amount: amountField,
    issueDate: issueDateField,
    maturityDate: maturityDateField,
    overallConfidence,
  };
}
