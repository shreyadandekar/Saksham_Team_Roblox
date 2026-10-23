/**
 * tests/unit/milestone9_comparison_engine.test.ts
 *
 * Comprehensive unit test suite for Milestone 9 Phase 3:
 * Rule-Based Comparison Engine (Entered vs OCR-Extracted).
 *
 * Verifies:
 *  1. Helper utilities: normalizeAmountToDecimalString, normalizeDateToIsoString, normalizeBankName, getCanonicalBank, normalizeBranchName.
 *  2. Exact field matches across all 6 fields.
 *  3. Case and whitespace normalization (instrumentNumber, bank, branch).
 *  4. Documented bank aliases (e.g. SBI <-> State Bank of India, PNB <-> Punjab National Bank).
 *  5. Bank mismatches (distinct institutions, e.g. State Bank of India != Bank of India).
 *  6. Instrument number comparisons (similar but non-identical strings like trailing characters or digits).
 *  7. Amount comparisons (equal amounts with different formatting: commas, symbols, floats vs unequal amounts).
 *  8. Date comparisons (exact calendar matches, different formats, invalid dates).
 *  9. Missing and ambiguous handling:
 *     - Missing entered value (MISSING_ENTERED)
 *     - Missing extracted value (MISSING_EXTRACTED)
 *     - Both values absent (MISSING_EXTRACTED with BOTH_VALUES_ABSENT rule)
 *     - Low-confidence extracted candidate (AMBIGUOUS)
 *     - Partial branch containment (AMBIGUOUS)
 *  10. Summary aggregation and review indicator calculation (CLEAN_MATCH, REVIEW_RECOMMENDED, DISCREPANCY_DETECTED).
 *  11. Immutability guarantee: input objects are not mutated.
 *  12. Persistence boundary: persistRuleCheckResults verifies instrument ownership, updates only extraction ruleCheckResults, and never mutates instrument or status.
 */

import { describe, it, expect, vi } from "vitest";
import {
  compareEnteredAgainstExtracted,
  normalizeAmountToDecimalString,
  normalizeDateToIsoString,
  normalizeBankName,
  getCanonicalBank,
  normalizeBranchName,
  persistRuleCheckResults,
  CONFIDENCE_AMBIGUOUS_THRESHOLD,
  DOCUMENTED_BANK_ALIASES,
} from "../../src/services/ocr";
import type {
  EnteredInstrumentData,
  ExtractedCandidates,
} from "../../src/services/ocr";

describe("Milestone 9 Phase 3 — Rule-Based Comparison Engine", () => {
  describe("Normalization & Parsing Helpers", () => {
    describe("normalizeAmountToDecimalString", () => {
      it("normalizes numbers to two-decimal strings", () => {
        expect(normalizeAmountToDecimalString(500000)).toBe("500000.00");
        expect(normalizeAmountToDecimalString(1250000.5)).toBe("1250000.50");
      });

      it("handles Indian comma grouping and currency symbols", () => {
        expect(normalizeAmountToDecimalString("₹ 5,00,000/-")).toBe("500000.00");
        expect(normalizeAmountToDecimalString("Rs. 1,25,50,000.00")).toBe("12550000.00");
        expect(normalizeAmountToDecimalString("INR 75,000")).toBe("75000.00");
      });

      it("handles Prisma Decimal-like objects with toString()", () => {
        const fakeDecimal = { toString: () => "850000.00" };
        expect(normalizeAmountToDecimalString(fakeDecimal)).toBe("850000.00");
      });

      it("returns null for invalid, negative, or empty amounts", () => {
        expect(normalizeAmountToDecimalString(null)).toBeNull();
        expect(normalizeAmountToDecimalString("")).toBeNull();
        expect(normalizeAmountToDecimalString(-100)).toBeNull();
        expect(normalizeAmountToDecimalString("abc")).toBeNull();
      });
    });

    describe("normalizeDateToIsoString", () => {
      it("normalizes JavaScript Date instances into YYYY-MM-DD", () => {
        const d = new Date("2025-06-15T00:00:00.000Z");
        expect(normalizeDateToIsoString(d)).toBe("2025-06-15");
      });

      it("normalizes diverse string date representations", () => {
        expect(normalizeDateToIsoString("15/01/2024")).toBe("2024-01-15");
        expect(normalizeDateToIsoString("15-Jan-2024")).toBe("2024-01-15");
        expect(normalizeDateToIsoString("2024-01-15")).toBe("2024-01-15");
        expect(normalizeDateToIsoString("01-02-2026")).toBe("2026-02-01");
      });

      it("returns null for invalid dates or empty strings", () => {
        expect(normalizeDateToIsoString(null)).toBeNull();
        expect(normalizeDateToIsoString("")).toBeNull();
        expect(normalizeDateToIsoString("invalid-date-string")).toBeNull();
        expect(normalizeDateToIsoString(new Date("invalid"))).toBeNull();
      });
    });

    describe("Bank & Branch Normalization", () => {
      it("resolves documented Indian bank aliases to canonical keys", () => {
        expect(getCanonicalBank("State Bank of India")).toBe("state bank of india");
        expect(getCanonicalBank("SBI")).toBe("state bank of india");
        expect(getCanonicalBank("pnb")).toBe("punjab national bank");
        expect(getCanonicalBank("Punjab National Bank")).toBe("punjab national bank");
        expect(getCanonicalBank("HDFC Bank Ltd.")).toBe("hdfc bank");
        expect(getCanonicalBank("HDFC")).toBe("hdfc bank");
      });

      it("normalizes branch names by stripping 'branch', 'b.o.', and extra spaces", () => {
        expect(normalizeBranchName("Parliament Street Branch")).toBe("parliament street");
        expect(normalizeBranchName("Fort, Mumbai B.O.")).toBe("fort mumbai");
        expect(normalizeBranchName("Sector 17, Chandigarh")).toBe("sector 17 chandigarh");
      });
    });
  });

  describe("Field Comparisons", () => {
    const baseEntered: EnteredInstrumentData = {
      instrumentNumber: "SBI-FDR-2024-998877",
      bankName: "State Bank of India",
      branchName: "Parliament Street",
      amount: "500000.00",
      issueDate: "2024-01-15",
      maturityDate: "2027-01-15",
    };

    const baseExtracted: ExtractedCandidates = {
      fdrNumber: { value: "SBI-FDR-2024-998877", confidence: 0.95 },
      bankName: { value: "State Bank of India", confidence: 0.95 },
      branchName: { value: "Parliament Street Branch", confidence: 0.90 },
      amount: { value: "500000.00", confidence: 0.95 },
      issueDate: { value: "2024-01-15", confidence: 0.90 },
      maturityDate: { value: "2027-01-15", confidence: 0.90 },
      overallConfidence: 0.92,
    };

    it("evaluates a perfect match across all 6 fields with CLEAN_MATCH indicator", () => {
      const report = compareEnteredAgainstExtracted(baseEntered, baseExtracted);

      expect(report.summary.totalFields).toBe(6);
      expect(report.summary.matchCount).toBe(6);
      expect(report.summary.mismatchCount).toBe(0);
      expect(report.summary.ambiguousCount).toBe(0);
      expect(report.summary.hasMismatches).toBe(false);
      expect(report.summary.requiresReview).toBe(false);
      expect(report.summary.overallReviewIndicator).toBe("CLEAN_MATCH");

      expect(report.fields.instrumentNumber.status).toBe("MATCH");
      expect(report.fields.bankName.status).toBe("MATCH");
      expect(report.fields.branchName.status).toBe("MATCH");
      expect(report.fields.amount.status).toBe("MATCH");
      expect(report.fields.issueDate.status).toBe("MATCH");
      expect(report.fields.maturityDate.status).toBe("MATCH");
    });

    it("matches instrument numbers case-insensitively with surrounding whitespace trimmed", () => {
      const entered = { ...baseEntered, instrumentNumber: "  sbi-fdr-2024-998877  " };
      const extracted = { ...baseExtracted, fdrNumber: { value: "SBI-FDR-2024-998877", confidence: 0.9 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.instrumentNumber.status).toBe("MATCH");
      expect(report.fields.instrumentNumber.rule).toBe("INSTRUMENT_NUMBER_CASE_INSENSITIVE");
    });

    it("flags similar but non-identical instrument numbers as a HIGH-severity MISMATCH", () => {
      const entered = { ...baseEntered, instrumentNumber: "SBI-FDR-2024-998877" };
      // 1 digit different: 998878 vs 998877
      const extracted = { ...baseExtracted, fdrNumber: { value: "SBI-FDR-2024-998878", confidence: 0.9 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.instrumentNumber.status).toBe("MISMATCH");
      expect(report.fields.instrumentNumber.severity).toBe("HIGH");
      expect(report.summary.hasMismatches).toBe(true);
      expect(report.summary.overallReviewIndicator).toBe("DISCREPANCY_DETECTED");
    });

    it("matches documented bank aliases (e.g. entered 'SBI', extracted 'State Bank of India')", () => {
      const entered = { ...baseEntered, bankName: "SBI" };
      const extracted = { ...baseExtracted, bankName: { value: "State Bank of India", confidence: 0.95 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.bankName.status).toBe("MATCH");
      expect(report.fields.bankName.rule).toBe("DOCUMENTED_BANK_ALIAS");
      expect(report.fields.bankName.severity).toBe("INFO");
    });

    it("flags distinct banks as a HIGH-severity MISMATCH without fuzzy false-positive matching", () => {
      const entered = { ...baseEntered, bankName: "State Bank of India" };
      const extracted = { ...baseExtracted, bankName: { value: "Bank of India", confidence: 0.95 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.bankName.status).toBe("MISMATCH");
      expect(report.fields.bankName.severity).toBe("HIGH");
    });

    it("matches amounts with different Indian formatting and currency symbols", () => {
      const entered = { ...baseEntered, amount: 500000 };
      const extracted = { ...baseExtracted, amount: { value: "Rs. 5,00,000/-", confidence: 0.9 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.amount.status).toBe("MATCH");
      expect(report.fields.amount.rule).toBe("EXACT_DECIMAL_AMOUNT");
    });

    it("flags unequal amounts as a HIGH-severity MISMATCH", () => {
      const entered = { ...baseEntered, amount: "500000.00" };
      const extracted = { ...baseExtracted, amount: { value: "750000.00", confidence: 0.9 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.amount.status).toBe("MISMATCH");
      expect(report.fields.amount.severity).toBe("HIGH");
      expect(report.summary.mismatchCount).toBe(1);
    });

    it("matches dates across different calendar date representations (ISO, DD/MM/YYYY)", () => {
      const entered = { ...baseEntered, issueDate: "2024-01-15", maturityDate: new Date("2027-01-15T00:00:00.000Z") };
      const extracted = {
        ...baseExtracted,
        issueDate: { value: "15/01/2024", confidence: 0.9 },
        maturityDate: { value: "15-Jan-2027", confidence: 0.9 },
      };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.issueDate.status).toBe("MATCH");
      expect(report.fields.maturityDate.status).toBe("MATCH");
    });

    it("flags date mismatches as a HIGH-severity MISMATCH", () => {
      const entered = { ...baseEntered, maturityDate: "2027-01-15" };
      const extracted = { ...baseExtracted, maturityDate: { value: "2026-01-15", confidence: 0.9 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.maturityDate.status).toBe("MISMATCH");
      expect(report.fields.maturityDate.severity).toBe("HIGH");
    });

    it("flags invalid dates as AMBIGUOUS with WARNING severity", () => {
      const entered = { ...baseEntered, maturityDate: "not-a-valid-date" };
      const extracted = { ...baseExtracted, maturityDate: { value: "2027-01-15", confidence: 0.9 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.maturityDate.status).toBe("AMBIGUOUS");
      expect(report.fields.maturityDate.rule).toBe("INVALID_CALENDAR_DATE");
      expect(report.fields.maturityDate.severity).toBe("WARNING");
    });
  });

  describe("Missing and Ambiguous Data Policies", () => {
    const baseEntered: EnteredInstrumentData = {
      instrumentNumber: "SBI-FDR-998877",
      bankName: "State Bank of India",
      branchName: "Parliament Street",
      amount: "500000.00",
      issueDate: "2024-01-15",
      maturityDate: "2027-01-15",
    };

    const baseExtracted: ExtractedCandidates = {
      fdrNumber: { value: "SBI-FDR-998877", confidence: 0.95 },
      bankName: { value: "State Bank of India", confidence: 0.95 },
      branchName: { value: "Parliament Street", confidence: 0.90 },
      amount: { value: "500000.00", confidence: 0.95 },
      issueDate: { value: "2024-01-15", confidence: 0.90 },
      maturityDate: { value: "2027-01-15", confidence: 0.90 },
      overallConfidence: 0.92,
    };

    it("reports MISSING_ENTERED (HIGH severity) when an entered field is absent but candidate exists", () => {
      const entered = { ...baseEntered, branchName: null };
      const report = compareEnteredAgainstExtracted(entered, baseExtracted);

      expect(report.fields.branchName.status).toBe("MISSING_ENTERED");
      expect(report.fields.branchName.severity).toBe("HIGH");
      expect(report.summary.missingEnteredCount).toBe(1);
      expect(report.summary.overallReviewIndicator).toBe("REVIEW_RECOMMENDED");
    });

    it("reports MISSING_EXTRACTED (WARNING severity) when an extracted candidate is absent but entered value exists", () => {
      const extracted = {
        ...baseExtracted,
        fdrNumber: { value: null, confidence: 0.0 },
      };
      const report = compareEnteredAgainstExtracted(baseEntered, extracted);

      expect(report.fields.instrumentNumber.status).toBe("MISSING_EXTRACTED");
      expect(report.fields.instrumentNumber.severity).toBe("WARNING");
      expect(report.summary.missingExtractedCount).toBe(1);
    });

    it("reports MISSING_EXTRACTED with BOTH_VALUES_ABSENT policy when both are absent", () => {
      const entered = { ...baseEntered, branchName: null };
      const extracted = { ...baseExtracted, branchName: { value: null, confidence: 0.0 } };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.branchName.status).toBe("MISSING_EXTRACTED");
      expect(report.fields.branchName.rule).toBe("BOTH_VALUES_ABSENT");
      expect(report.fields.branchName.severity).toBe("WARNING");
    });

    it("reports AMBIGUOUS when candidate confidence is below documented threshold (< 0.50)", () => {
      const extracted = {
        ...baseExtracted,
        amount: { value: "500000.00", confidence: 0.35 }, // below 0.50 threshold
      };

      const report = compareEnteredAgainstExtracted(baseEntered, extracted);
      expect(report.fields.amount.status).toBe("AMBIGUOUS");
      expect(report.fields.amount.rule).toBe("LOW_CONFIDENCE_EXTRACTION");
      expect(report.fields.amount.severity).toBe("WARNING");
      expect(report.summary.ambiguousCount).toBe(1);
      expect(report.summary.overallReviewIndicator).toBe("REVIEW_RECOMMENDED");
    });

    it("reports AMBIGUOUS when branch partially aligns with differing locality tokens", () => {
      const entered = { ...baseEntered, branchName: "Parliament Street" };
      const extracted = {
        ...baseExtracted,
        branchName: { value: "Parliament Street, New Delhi (00691)", confidence: 0.85 },
      };

      const report = compareEnteredAgainstExtracted(entered, extracted);
      expect(report.fields.branchName.status).toBe("AMBIGUOUS");
      expect(report.fields.branchName.rule).toBe("BRANCH_PARTIAL_CONTAINMENT");
      expect(report.fields.branchName.severity).toBe("WARNING");
    });
  });

  describe("Immutability & Safety Constraints", () => {
    it("never mutates the input entered or extracted objects", () => {
      const entered: EnteredInstrumentData = {
        instrumentNumber: "  SBI-123  ",
        amount: "500000",
        bankName: "SBI",
      };
      const extracted: ExtractedCandidates = {
        fdrNumber: { value: "SBI-123", confidence: 0.9 },
        bankName: { value: "State Bank of India", confidence: 0.9 },
        branchName: { value: null, confidence: 0.0 },
        amount: { value: "500000.00", confidence: 0.9 },
        issueDate: { value: null, confidence: 0.0 },
        maturityDate: { value: null, confidence: 0.0 },
        overallConfidence: 0.8,
      };

      const enteredSnapshot = JSON.stringify(entered);
      const extractedSnapshot = JSON.stringify(extracted);

      compareEnteredAgainstExtracted(entered, extracted);

      expect(JSON.stringify(entered)).toBe(enteredSnapshot);
      expect(JSON.stringify(extracted)).toBe(extractedSnapshot);
    });
  });

  describe("Persistence Boundary (persistRuleCheckResults)", () => {
    it("verifies instrument ownership and updates ONLY ruleCheckResults and hasMismatches", async () => {
      const mockPrisma: any = {
        ocrExtraction: {
          findUnique: vi.fn().mockResolvedValue({
            id: "ext-1",
            instrumentId: "inst-100",
            status: "EXTRACTED",
          }),
          update: vi.fn().mockResolvedValue({
            id: "ext-1",
            instrumentId: "inst-100",
            status: "EXTRACTED",
            hasMismatches: true,
          }),
        },
      };

      const fakeComparisonReport: any = {
        summary: { hasMismatches: true, mismatchCount: 1 },
        fields: {},
      };

      await persistRuleCheckResults(mockPrisma, {
        extractionId: "ext-1",
        instrumentId: "inst-100",
        comparison: fakeComparisonReport,
      });

      expect(mockPrisma.ocrExtraction.findUnique).toHaveBeenCalledWith({
        where: { id: "ext-1" },
        select: { id: true, instrumentId: true, status: true },
      });

      expect(mockPrisma.ocrExtraction.update).toHaveBeenCalledWith({
        where: { id: "ext-1" },
        data: {
          hasMismatches: true,
          ruleCheckResults: fakeComparisonReport,
        },
      });

      // Does not touch instrument model or change status
      expect(mockPrisma.instrument).toBeUndefined();
    });

    it("throws a security violation if the extraction belongs to a different instrument", async () => {
      const mockPrisma: any = {
        ocrExtraction: {
          findUnique: vi.fn().mockResolvedValue({
            id: "ext-1",
            instrumentId: "inst-DIFFERENT",
            status: "EXTRACTED",
          }),
        },
      };

      const fakeComparisonReport: any = {
        summary: { hasMismatches: false },
        fields: {},
      };

      await expect(
        persistRuleCheckResults(mockPrisma, {
          extractionId: "ext-1",
          instrumentId: "inst-100",
          comparison: fakeComparisonReport,
        })
      ).rejects.toThrow("Security violation: OCR extraction ext-1 does not belong to instrument inst-100");
    });
  });
});
