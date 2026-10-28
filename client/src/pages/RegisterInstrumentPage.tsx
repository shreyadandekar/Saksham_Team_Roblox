/**
 * src/pages/RegisterInstrumentPage.tsx
 * Form to register a new FDR instrument: Save Draft or Submit for Scrutiny.
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FileText,
  Save,
  Send,
  ArrowLeft,
  AlertCircle,
  Paperclip,
  Info,
  CheckCircle2,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { createInstrument } from "../api/instruments";
import type { CreateInstrumentInput, DocumentMetadata } from "../types/instrument";

export default function RegisterInstrumentPage() {
  const navigate = useNavigate();

  // Form State
  const [instrumentNumber, setInstrumentNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [issueDate, setIssueDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [favouringDetails, setFavouringDetails] = useState("Member Secretary, AICTE, New Delhi");

  // Document metadata state
  const [docCategory, setDocCategory] = useState("FDR Fixed Deposit Receipt");
  const [docFileName, setDocFileName] = useState("");
  const [docFileSize, setDocFileSize] = useState<number>(0);
  const [docFileType, setDocFileType] = useState("");
  const [docNotes, setDocNotes] = useState("");

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setDocFileName(file.name);
      setDocFileSize(file.size);
      setDocFileType(file.type || "application/octet-stream");
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!instrumentNumber.trim()) {
      errors.instrumentNumber = "FDR reference number is required.";
    } else if (instrumentNumber.trim().length < 3) {
      errors.instrumentNumber = "Reference number must be at least 3 characters.";
    }

    if (!bankName.trim()) {
      errors.bankName = "Issuing bank name is required.";
    }

    if (!branchName.trim()) {
      errors.branchName = "Bank branch name is required.";
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = "Principal amount must be a positive number greater than 0.";
    }

    if (!issueDate) {
      errors.issueDate = "Issue date is required.";
    }

    if (!maturityDate) {
      errors.maturityDate = "Maturity date is required.";
    }

    if (issueDate && maturityDate) {
      const issue = new Date(issueDate);
      const maturity = new Date(maturityDate);
      if (maturity < issue) {
        errors.maturityDate = "Maturity date cannot be earlier than issue date.";
      }
    }

    if (!favouringDetails.trim()) {
      errors.favouringDetails = "Favouring details are required.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(submitImmediately: boolean) {
    setError(null);
    if (!validate()) return;

    setLoading(true);

    try {
      let documentMetadata: DocumentMetadata | null = null;
      if (docFileName) {
        documentMetadata = {
          fileName: docFileName,
          fileSize: docFileSize,
          fileType: docFileType,
          category: docCategory,
          uploadedAt: new Date().toISOString(),
          notes: docNotes || undefined,
        };
      }

      const payload: CreateInstrumentInput = {
        instrumentNumber: instrumentNumber.trim(),
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        amount: parseFloat(amount),
        issueDate: new Date(issueDate).toISOString(),
        maturityDate: new Date(maturityDate).toISOString(),
        favouringDetails: favouringDetails.trim(),
        submitImmediately,
        documentMetadata,
      };

      const result = await createInstrument(payload);

      // Navigate to the newly created record
      navigate(`/instruments/${result.instrument.id}`, {
        state: { message: result.message },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register instrument.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* ── Breadcrumb & Navigation ────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Link
            to="/instruments"
            className="hover:text-[#1D4ED8] flex items-center gap-1 transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Registry
          </Link>
          <span>/</span>
          <span className="text-[#0F172A] font-semibold">New FDR Registration</span>
        </div>

        {/* ── Title Banner ───────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-lg border border-[#CBD5E1] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center border border-[#BFDBFE]">
              <FileText className="h-5 w-5 text-[#1D4ED8]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                Register Security Deposit / Fixed Deposit Receipt (FDR)
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Record institutional security deposit details and attach verified bank receipt metadata for AICTE compliance.
              </p>
            </div>
          </div>
        </div>

        {/* ── Error Banner ───────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to complete registration</p>
              <p className="mt-0.5 text-xs text-[#991B1B]">{error}</p>
            </div>
          </div>
        )}

        {/* ── Registration Form ──────────────────────────────────── */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="bg-white p-6 rounded-lg border border-[#CBD5E1] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-6"
        >
          {/* Section 1: Instrument & Bank Particulars */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              1. Instrument & Banking Particulars
            </h2>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  FDR Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={instrumentNumber}
                  onChange={(e) => setInstrumentNumber(e.target.value)}
                  placeholder="e.g. FDR-SBI-2026-901"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono ${
                    validationErrors.instrumentNumber
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-300"
                  }`}
                />
                {validationErrors.instrumentNumber && (
                  <p className="mt-1 text-xs text-rose-600">
                    {validationErrors.instrumentNumber}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  Unique reference number stamped on the bank FDR certificate.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Principal Amount (INR ₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono ${
                    validationErrors.amount
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-300"
                  }`}
                />
                {validationErrors.amount && (
                  <p className="mt-1 text-xs text-rose-600">
                    {validationErrors.amount}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  Total deposit value pledged to AICTE as security deposit.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issuing Bank Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    validationErrors.bankName
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-300"
                  }`}
                />
                {validationErrors.bankName && (
                  <p className="mt-1 text-xs text-rose-600">
                    {validationErrors.bankName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issuing Bank Branch <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Sector 14 Branch, Dwarka, New Delhi"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    validationErrors.branchName
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-300"
                  }`}
                />
                {validationErrors.branchName && (
                  <p className="mt-1 text-xs text-rose-600">
                    {validationErrors.branchName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Issue <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    validationErrors.issueDate
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-300"
                  }`}
                />
                {validationErrors.issueDate && (
                  <p className="mt-1 text-xs text-rose-600">
                    {validationErrors.issueDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Maturity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    validationErrors.maturityDate
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-300"
                  }`}
                />
                {validationErrors.maturityDate && (
                  <p className="mt-1 text-xs text-rose-600">
                    {validationErrors.maturityDate}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  Security deposits typically require 5 to 10 years maturity.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Favouring / Beneficiary Details <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={favouringDetails}
                  onChange={(e) => setFavouringDetails(e.target.value)}
                  placeholder="e.g. Member Secretary, AICTE, New Delhi"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    validationErrors.favouringDetails
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-300"
                  }`}
                />
                {validationErrors.favouringDetails && (
                  <p className="mt-1 text-xs text-rose-600">
                    {validationErrors.favouringDetails}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Supporting Document Metadata */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Supporting Document Metadata
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Audit Trail Record
              </span>
            </div>

            <div className="mt-3 bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex gap-2">
              <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Document Metadata Recording</p>
                <p className="mt-0.5 text-amber-800">
                  In this milestone, select your scanned FDR receipt to record its verifiable file metadata (file name, size, type, timestamp) directly in PostgreSQL. Binary storage uploads will connect in a subsequent milestone.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Category
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="FDR Fixed Deposit Receipt">FDR Fixed Deposit Receipt</option>
                  <option value="Joint Operation Undertaking">Joint Operation Undertaking</option>
                  <option value="Bank Confirmation Letter">Bank Confirmation Letter</option>
                  <option value="Board Resolution">Board Resolution</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Certificate File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="docFilePicker"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelected}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {docFileName && (
                <div className="md:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="font-semibold text-slate-800">{docFileName}</p>
                      <p className="text-[10px] text-slate-500">
                        {(docFileSize / 1024).toFixed(1)} KB • {docFileType || "application/pdf"}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Metadata Captured
                  </span>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Verification Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="e.g. Scanned copy verified against original SBI certificate"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              to="/instruments"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Save Draft Action */}
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4 text-[#64748B]" />
                <span>{loading ? "Processing..." : "Save as Draft"}</span>
              </button>

              {/* Submit for Scrutiny Action */}
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#0B192C] hover:bg-[#15284F] text-white rounded-md text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-amber-400" />
                <span>{loading ? "Submitting..." : "Submit for Scrutiny"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
