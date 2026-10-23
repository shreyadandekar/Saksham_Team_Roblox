/**
 * tests/unit/milestone9_ocr_extraction.test.ts
 *
 * Comprehensive unit test suite for Milestone 9 Phase 2:
 * Deterministic Text Extraction Engine & Candidate Field Extraction.
 *
 * Verifies:
 *  1. Candidate field extraction across realistic Indian banking receipt formats
 *     (SBI, PNB, HDFC, Canara, ICICI).
 *  2. Amount normalization (Indian comma notation "5,00,000" -> "500000.00").
 *  3. Date parsing and normalization (DD/MM/YYYY, DD-MMM-YYYY -> YYYY-MM-DD).
 *  4. Confidence scoring and cross-validation anomaly detection (e.g. maturity < issue date).
 *  5. Graceful handling of missing fields, empty text, and ambiguous matches.
 *  6. Text normalization (whitespace, control characters, CRLF).
 *  7. MIME type validation and safe rejection of unsupported types (text/plain, zip).
 *  8. Empty buffer and corrupt document handling with sanitized errors.
 *  9. End-to-end processDocumentExtraction with real PDF and image buffers.
 */

import { describe, it, expect } from "vitest";
import {
  extractCandidateFields,
  extractTextFromBuffer,
  processDocumentExtraction,
  normalizeExtractedText,
  isSupportedExtractionMime,
  SUPPORTED_EXTRACTION_MIMES,
} from "../../src/services/ocr";

/**
 * Generates a valid minimal PDF buffer containing text for unit testing.
 */
function createMinimalPdfBuffer(lines: string[]): Buffer {
  const textCmds = lines
    .map((l, i) => (i === 0 ? `72 712 Td (${l.replace(/([\\()])/g, "\\$1")}) Tj` : `0 -18 Td (${l.replace(/([\\()])/g, "\\$1")}) Tj`))
    .join("\n");
  const content = `BT\n/F1 12 Tf\n${textCmds}\nET`;
  const streamLen = content.length;
  const pdf = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
    "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    `5 0 obj<</Length ${streamLen}>>stream`,
    content,
    "endstream\nendobj",
    "xref",
    "0 6",
    "0000000000 65535 f",
    "0000000009 00000 n",
    "0000000052 00000 n",
    "0000000101 00000 n",
    "0000000212 00000 n",
    "0000000282 00000 n",
    "trailer<</Size 6/Root 1 0 R>>",
    "startxref",
    "380",
    "%%EOF",
  ].join("\n");
  return Buffer.from(pdf, "binary");
}

describe("Milestone 9 Phase 2 — Deterministic Text Extraction Engine", () => {
  describe("Candidate Field Extraction — Realistic Indian Banking Receipts", () => {
    it("extracts fields accurately from a State Bank of India (SBI) Fixed Deposit Receipt", () => {
      const sbiReceipt = `
        STATE BANK OF INDIA
        PARLIAMENT STREET BRANCH, NEW DELHI (00691)
        TERM DEPOSIT ADVICE / FIXED DEPOSIT RECEIPT

        Customer Name: ABC INSTITUTE OF TECHNOLOGY
        FDR Number: SBI-FDR-2024-998877
        Account No: 33445566778

        Deposit Details:
        Principal Amount: Rs. 5,00,000.00
        Rupees Five Lakh Only

        Date of Issue: 15/01/2024
        Date of Maturity: 15/01/2027
        Tenure: 36 Months
        Rate of Interest: 7.10% p.a.
        Lien Marked in favour of: AICTE New Delhi
      `;

      const result = extractCandidateFields(sbiReceipt);

      expect(result.bankName.value).toBe("State Bank of India");
      expect(result.bankName.confidence).toBeGreaterThanOrEqual(0.9);

      expect(result.fdrNumber.value).toBe("SBI-FDR-2024-998877");
      expect(result.fdrNumber.confidence).toBeGreaterThanOrEqual(0.85);

      expect(result.branchName.value).toMatch(/PARLIAMENT STREET BRANCH/i);
      expect(result.branchName.confidence).toBeGreaterThanOrEqual(0.7);

      expect(result.amount.value).toBe("500000.00");
      expect(result.amount.confidence).toBeGreaterThanOrEqual(0.9);

      expect(result.issueDate.value).toBe("2024-01-15");
      expect(result.maturityDate.value).toBe("2027-01-15");
      expect(result.maturityDate.confidence).toBeGreaterThanOrEqual(0.9);

      expect(result.overallConfidence).toBeGreaterThanOrEqual(0.8);
    });

    it("extracts fields from a Punjab National Bank (PNB) Fixed Deposit Certificate", () => {
      const pnbReceipt = `
        PUNJAB NATIONAL BANK
        Sector 17, Chandigarh Branch
        FIXED DEPOSIT RECEIPT

        Receipt No: PNB/FDR/88776655
        Depositor: XYZ Engineering College
        Deposit Amount: ₹ 12,50,000/-
        (Twelve Lakh Fifty Thousand Only)

        Value Date: 01-Feb-2023
        Maturity Date: 01-Feb-2028
        Auto Renewal: No
      `;

      const result = extractCandidateFields(pnbReceipt);

      expect(result.bankName.value).toBe("Punjab National Bank");
      expect(result.fdrNumber.value).toBe("PNB/FDR/88776655");
      expect(result.amount.value).toBe("1250000.00");
      expect(result.issueDate.value).toBe("2023-02-01");
      expect(result.maturityDate.value).toBe("2028-02-01");
      expect(result.branchName.value).toMatch(/Sector 17/i);
    });

    it("extracts fields from an HDFC Bank Deposit Confirmation Advice", () => {
      const hdfcReceipt = `
        HDFC Bank Ltd.
        Branch: Fort, Mumbai - 400001
        FIXED DEPOSIT ADVICE

        Fixed Deposit A/c No: 50300998877665
        In favour of: AICTE A/C DEF POLYTECHNIC
        Principal Sum: INR 7,00,000.00

        Booking Date: 2024-05-10
        Expiry Date: 2027-05-10
        Applicable ROI: 7.25%
      `;

      const result = extractCandidateFields(hdfcReceipt);

      expect(result.bankName.value).toBe("HDFC Bank");
      expect(result.fdrNumber.value).toBe("50300998877665");
      expect(result.amount.value).toBe("700000.00");
      expect(result.issueDate.value).toBe("2024-05-10");
      expect(result.maturityDate.value).toBe("2027-05-10");
    });

    it("extracts fields from a Canara Bank Deposit Receipt", () => {
      const canaraReceipt = `
        CANARA BANK
        Jayanagar 4th Block, Bengaluru Branch
        TERM DEPOSIT RECEIPT

        TDR Number: CNRB99112233
        Name of Depositor: Global Technical Institute
        Amount Deposited: Rs. 10,00,000/-

        Issue Date: 10/11/2023
        Maturity Date: 10/11/2026
        Lien Note: Jointly held with Member Secretary AICTE
      `;

      const result = extractCandidateFields(canaraReceipt);

      expect(result.bankName.value).toBe("Canara Bank");
      expect(result.fdrNumber.value).toBe("CNRB99112233");
      expect(result.amount.value).toBe("1000000.00");
      expect(result.issueDate.value).toBe("2023-11-10");
      expect(result.maturityDate.value).toBe("2026-11-10");
    });

    it("extracts fields from an ICICI Bank Fixed Deposit Certificate", () => {
      const iciciReceipt = `
        ICICI Bank Ltd.
        Connaught Place Branch, New Delhi
        FIXED DEPOSIT RECEIPT

        Deposit Certificate No: ICICI-FD-445566
        Held For: Modern Educational Society
        Deposit Value: Rs. 3,50,000

        Effective Date: 25-Aug-2022
        Due Date: 25-Aug-2025
      `;

      const result = extractCandidateFields(iciciReceipt);

      expect(result.bankName.value).toBe("ICICI Bank");
      expect(result.fdrNumber.value).toBe("ICICI-FD-445566");
      expect(result.amount.value).toBe("350000.00");
      expect(result.issueDate.value).toBe("2022-08-25");
      expect(result.maturityDate.value).toBe("2025-08-25");
    });
  });

  describe("Amount Normalization & Edge Cases", () => {
    it("handles diverse Indian currency formats and normalizes to standard decimal strings", () => {
      const testCases = [
        { text: "Principal Amount: Rs. 5,00,000/-", expected: "500000.00" },
        { text: "Deposit Sum: ₹ 1,25,50,000.50", expected: "12550000.50" },
        { text: "Amount: INR 1500000", expected: "1500000.00" },
        { text: "Fixed Deposit Value: Rs 25,000.00 only", expected: "25000.00" },
      ];

      for (const { text, expected } of testCases) {
        const res = extractCandidateFields(text);
        expect(res.amount.value).toBe(expected);
      }
    });

    it("ignores phone numbers, pincodes, and interest rates when searching for principal amounts", () => {
      const text = `
        State Bank of India
        Contact Phone: 9876543210
        Pin Code: 110001
        Interest Rate: 7.25% p.a.
        Fixed Deposit Amount: Rs. 8,00,000
      `;

      const res = extractCandidateFields(text);
      expect(res.amount.value).toBe("800000.00");
    });
  });

  describe("Date Parsing and Anomaly Detection", () => {
    it("parses dates in DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY, and YYYY-MM-DD", () => {
      const res1 = extractCandidateFields("Date of Issue: 05/12/2023 Date of Maturity: 05/12/2026");
      expect(res1.issueDate.value).toBe("2023-12-05");
      expect(res1.maturityDate.value).toBe("2026-12-05");

      const res2 = extractCandidateFields("Issue Date: 14-Oct-2022 Maturity Date: 14-Oct-2025");
      expect(res2.issueDate.value).toBe("2022-10-14");
      expect(res2.maturityDate.value).toBe("2025-10-14");
    });

    it("penalizes confidence when maturity date is before or equal to issue date (anomaly detection)", () => {
      const normalDates = `
        Issue Date: 01/01/2024
        Maturity Date: 01/01/2027
      `;
      const normalResult = extractCandidateFields(normalDates);

      const invertedDates = `
        Issue Date: 01/01/2027
        Maturity Date: 01/01/2024
      `;
      const invertedResult = extractCandidateFields(invertedDates);

      // In normal order, cross-validation boosts maturity confidence
      expect(normalResult.maturityDate.confidence).toBeGreaterThan(invertedResult.maturityDate.confidence);
      // In inverted order, anomaly penalty reduces confidence to <= 0.65
      expect(invertedResult.maturityDate.confidence).toBeLessThanOrEqual(0.65);
    });
  });

  describe("Missing Fields and Ambiguity Handling", () => {
    it("returns null with 0 confidence for missing fields without throwing", () => {
      const partialText = "Bank of Baroda Deposit Confirmation without account numbers or dates";
      const result = extractCandidateFields(partialText);

      expect(result.bankName.value).toBe("Bank of Baroda");
      expect(result.bankName.confidence).toBeGreaterThan(0.8);

      expect(result.fdrNumber.value).toBeNull();
      expect(result.fdrNumber.confidence).toBe(0.0);

      expect(result.amount.value).toBeNull();
      expect(result.amount.confidence).toBe(0.0);

      expect(result.issueDate.value).toBeNull();
      expect(result.issueDate.confidence).toBe(0.0);

      expect(result.maturityDate.value).toBeNull();
      expect(result.maturityDate.confidence).toBe(0.0);
    });

    it("handles completely empty or whitespace-only text gracefully", () => {
      const emptyResult = extractCandidateFields("   \n\n\t   ");

      expect(emptyResult.fdrNumber.value).toBeNull();
      expect(emptyResult.bankName.value).toBeNull();
      expect(emptyResult.branchName.value).toBeNull();
      expect(emptyResult.amount.value).toBeNull();
      expect(emptyResult.issueDate.value).toBeNull();
      expect(emptyResult.maturityDate.value).toBeNull();
      expect(emptyResult.overallConfidence).toBe(0.0);
    });
  });

  describe("Text Normalization", () => {
    it("replaces CRLF with LF and strips non-printable control characters", () => {
      const noisyText = "Hello\r\nWorld\r\n\x00\x07Test\x1FDocument\n\n\n\nFinal";
      const cleaned = normalizeExtractedText(noisyText);

      expect(cleaned).not.toContain("\r");
      expect(cleaned).not.toContain("\x00");
      expect(cleaned).not.toContain("\x07");
      expect(cleaned).toContain("Hello\nWorld");
      expect(cleaned).toContain("TestDocument");
      expect(cleaned).not.toContain("\n\n\n");
    });
  });

  describe("Document MIME Validation and Safe Error Handling", () => {
    it("recognizes supported MIME types correctly", () => {
      expect(isSupportedExtractionMime("application/pdf")).toBe(true);
      expect(isSupportedExtractionMime("image/jpeg")).toBe(true);
      expect(isSupportedExtractionMime("image/png")).toBe(true);

      expect(isSupportedExtractionMime("text/plain")).toBe(false);
      expect(isSupportedExtractionMime("application/zip")).toBe(false);
      expect(isSupportedExtractionMime("application/msword")).toBe(false);
      expect(SUPPORTED_EXTRACTION_MIMES).toHaveLength(3);
    });

    it("rejects unsupported MIME types with an explicit safe error", async () => {
      const dummyBuffer = Buffer.from("dummy data");
      await expect(
        extractTextFromBuffer(dummyBuffer, "application/zip")
      ).rejects.toThrow("Unsupported document MIME type");
    });

    it("rejects empty 0-byte buffer with an explicit error", async () => {
      const emptyBuf = Buffer.alloc(0);
      await expect(
        extractTextFromBuffer(emptyBuf, "application/pdf")
      ).rejects.toThrow("Cannot extract text from empty document buffer");
    });
  });

  describe("Orchestration Engine — processDocumentExtraction", () => {
    it("extracts text and candidate fields from a real text-based PDF buffer", async () => {
      const pdfLines = [
        "STATE BANK OF INDIA",
        "FDR No: SBI-FDR-998877",
        "Amount: Rs. 5,00,000",
        "Date of Issue: 15/01/2024",
        "Date of Maturity: 15/01/2027",
      ];
      const pdfBuffer = createMinimalPdfBuffer(pdfLines);

      const result = await processDocumentExtraction(pdfBuffer, "application/pdf");

      expect(result.success).toBe(true);
      expect(result.status).toBe("EXTRACTED");
      expect(result.engine).toBe("pdf-parse/2.4.5");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.rawText).toContain("STATE BANK OF INDIA");

      expect(result.candidates).toBeDefined();
      expect(result.candidates?.bankName.value).toBe("State Bank of India");
      expect(result.candidates?.fdrNumber.value).toBe("SBI-FDR-998877");
      expect(result.candidates?.amount.value).toBe("500000.00");
      expect(result.candidates?.issueDate.value).toBe("2024-01-15");
      expect(result.candidates?.maturityDate.value).toBe("2027-01-15");

      expect(result.confidenceScores).toBeDefined();
      expect(result.confidenceScores?.overall).toBeGreaterThanOrEqual(0.7);
    });

    it("handles corrupt PDF buffers safely without crashing or leaking server paths", async () => {
      const corruptBuffer = Buffer.from("THIS_IS_NOT_A_VALID_PDF_STREAM_CORRUPT_BYTES");

      const result = await processDocumentExtraction(corruptBuffer, "application/pdf");

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.engine).toBe("pdf-parse/2.4.5");
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain("PDF text extraction failed");
      // Must not leak absolute paths
      expect(result.errorMessage).not.toMatch(/[a-zA-Z]:\\[\w\.\-\\]+/);
    });

    it("handles a 1x1 transparent PNG image buffer cleanly", async () => {
      const png1x1 = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64"
      );

      const result = await processDocumentExtraction(png1x1, "image/png");

      expect(result.success).toBe(true);
      expect(result.status).toBe("EXTRACTED");
      expect(result.engine).toBe("tesseract.js/7.0.0");
      expect(result.rawText).toBe("");
      expect(result.candidates?.overallConfidence).toBe(0.0);
    });
  });
});
