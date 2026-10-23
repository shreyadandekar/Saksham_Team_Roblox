/**
 * src/components/relationships/RenewReplaceModal.tsx
 * Modal dialog for institution users to initiate a Renewal or Replacement for an FDR deposit.
 */

import { useState } from "react";
import { X, RefreshCw, AlertCircle, FileCheck } from "lucide-react";
import type { Instrument } from "../../types/instrument";
import type { InstrumentRelationshipType, RenewOrReplacePayload } from "../../types/relationship";
import { submitRenewOrReplace } from "../../api/relationships";

interface RenewReplaceModalProps {
  originalInstrument: Instrument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInstrumentId: string) => void;
}

export default function RenewReplaceModal({
  originalInstrument,
  isOpen,
  onClose,
  onSuccess,
}: RenewReplaceModalProps) {
  const [relationshipType, setRelationshipType] = useState<InstrumentRelationshipType>("RENEWAL");
  const [instrumentNumber, setInstrumentNumber] = useState("");
  const [bankName, setBankName] = useState(originalInstrument.bankName);
  const [branchName, setBranchName] = useState(originalInstrument.branchName);
  const [amount, setAmount] = useState(String(originalInstrument.amount));
  const [issueDate, setIssueDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [favouringDetails, setFavouringDetails] = useState(originalInstrument.favouringDetails);
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!instrumentNumber.trim()) {
      setError("Successor reference number is required.");
      return;
    }

    if (instrumentNumber.trim().toUpperCase() === originalInstrument.instrumentNumber.trim().toUpperCase()) {
      setError("Successor reference number must be distinct from the original instrument reference.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Principal amount must be a positive number.");
      return;
    }

    if (!issueDate || !maturityDate) {
      setError("Both issue date and maturity date are required.");
      return;
    }

    if (new Date(maturityDate) < new Date(issueDate)) {
      setError("Maturity date cannot be earlier than issue date.");
      return;
    }

    setLoading(true);

    try {
      const payload: RenewOrReplacePayload = {
        relationshipType,
        instrumentNumber: instrumentNumber.trim(),
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        amount: numAmount,
        issueDate,
        maturityDate,
        favouringDetails: favouringDetails.trim(),
        remarks: remarks.trim() || undefined,
        submitImmediately: true,
      };

      const res = await submitRenewOrReplace(originalInstrument.id, payload);
      onSuccess(res.successor.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit renewal/replacement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Initiate FDR Renewal or Replacement</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Linking successor deposit to original FDR:{" "}
                <span className="font-mono text-blue-200 font-semibold">
                  {originalInstrument.instrumentNumber}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Action Choice: Renewal vs Replacement */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Select Submission Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  relationshipType === "RENEWAL"
                    ? "border-blue-600 bg-blue-50/60 text-blue-900 ring-1 ring-blue-600"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="relationshipType"
                  value="RENEWAL"
                  checked={relationshipType === "RENEWAL"}
                  onChange={() => setRelationshipType("RENEWAL")}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="text-xs font-bold block">Renewal (Maturity Extension)</span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Extending deposit term with the same issuing bank for continuing institutional compliance.
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  relationshipType === "REPLACEMENT"
                    ? "border-blue-600 bg-blue-50/60 text-blue-900 ring-1 ring-blue-600"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="relationshipType"
                  value="REPLACEMENT"
                  checked={relationshipType === "REPLACEMENT"}
                  onChange={() => setRelationshipType("REPLACEMENT")}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="text-xs font-bold block">Replacement (Bank/Instrument Substitution)</span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Substituting security deposit with a new instrument or moving to another scheduled bank.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Instrument Reference Number *
              </label>
              <input
                type="text"
                required
                value={instrumentNumber}
                onChange={(e) => setInstrumentNumber(e.target.value)}
                placeholder="e.g. FDR-BOB-2027-9001"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Principal Amount (INR) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issuing Bank Name *
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issuing Branch Name *
              </label>
              <input
                type="text"
                required
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Issue *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Maturity *
              </label>
              <input
                type="date"
                required
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Favouring Details *
              </label>
              <input
                type="text"
                required
                value={favouringDetails}
                onChange={(e) => setFavouringDetails(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Remarks for Renewal or Replacement (Optional)
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Mandatory 5-year security deposit renewal following AICTE approval letter..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-[11px] text-blue-900">
            <span className="font-semibold">Lifecycle Safety Assurance: </span>
            Your original deposit (<span className="font-mono">{originalInstrument.instrumentNumber}</span>) remains intact and valid throughout regulatory scrutiny. The original deposit will only be marked superseded once AICTE formally inspects and approves this successor.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Submit for Scrutiny</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
