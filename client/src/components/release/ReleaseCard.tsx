/**
 * src/components/release/ReleaseCard.tsx
 * Card component for displaying and managing Security Deposit Release & Refund Processing.
 * Integrates into InstrumentDetailPage.
 */

import {
  Coins,
  Clock,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Send,
  PackageCheck,
} from "lucide-react";
import type { Instrument } from "../../types/instrument";
import type { ReleaseRequest } from "../../types/release";
import type { CurrentCustodyState } from "../../types/custody";
import { formatDateTime } from "../../utils/format";

interface ReleaseCardProps {
  instrument: Instrument;
  releaseRequests: ReleaseRequest[];
  currentCustody: CurrentCustodyState | null;
  isInstitutionUser: boolean;
  isOwner: boolean;
  isOfficer: boolean;
  onRequestRelease: () => void;
  onDecideRelease: () => void;
  onConfirmRefund: () => void;
}

export default function ReleaseCard({
  instrument,
  releaseRequests,
  currentCustody,
  isInstitutionUser,
  isOwner,
  isOfficer,
  onRequestRelease,
  onDecideRelease,
  onConfirmRefund,
}: ReleaseCardProps) {
  const pendingRequest = releaseRequests.find((r) => r.status === "PENDING") || null;
  const approvedRequest =
    releaseRequests.find(
      (r) => r.status === "APPROVED" || r.status === "REFUND_CONFIRMED"
    ) || null;

  const isCustodyReleased =
    currentCustody?.custodyStatus === "RELEASED" ||
    currentCustody?.mostRecentEvent?.eventType === "ORIGINAL_RELEASED";

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Coins className="h-4 w-4 text-purple-600" />
            Security Deposit Release & Refund Processing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Milestone 7: Role-controlled regulatory release approval, bank remittance tracking, and custody decoupling
          </p>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2">
          {instrument.status === "RELEASE_REQUESTED" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-300">
              <Clock className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
              Release Pending Decision
            </span>
          ) : instrument.status === "RELEASED" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Deposit Released
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              Instrument Status: <span className="font-semibold text-slate-700">{instrument.status}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Active Status Section ── */}

      {/* State 1: RELEASE_REQUESTED */}
      {instrument.status === "RELEASE_REQUESTED" && pendingRequest && (
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                  Pending Regulatory Scrutiny
                </h3>
                <p className="text-[11px] text-purple-700">
                  Submitted {formatDateTime(pendingRequest.createdAt)} by{" "}
                  <span className="font-semibold text-purple-900">
                    {pendingRequest.requestedBy?.fullName || "Institution User"}
                  </span>
                </p>
              </div>
            </div>

            {isOfficer && (
              <button
                type="button"
                onClick={onDecideRelease}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Review & Decide Request</span>
              </button>
            )}
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-purple-100 text-xs space-y-1.5">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
              Institution Stated Reason:
            </span>
            <p className="text-slate-800 italic leading-relaxed">
              "{pendingRequest.reason}"
            </p>
          </div>

          <p className="text-[11px] text-purple-800">
            {isOfficer
              ? "As an AICTE Officer, review the release justification and verified documents before approving or rejecting."
              : "Your release request is in the AICTE review queue. You will be notified once a regulatory decision is recorded."}
          </p>
        </div>
      )}

      {/* State 2: RELEASED */}
      {instrument.status === "RELEASED" && approvedRequest && (
        <div className="space-y-4">
          {/* Regulatory Approval Details */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Regulatory Release Granted
                  </h3>
                  <p className="text-[11px] text-emerald-700">
                    Approved {approvedRequest.decidedAt ? formatDateTime(approvedRequest.decidedAt) : "—"} by{" "}
                    <span className="font-semibold text-emerald-900">
                      {approvedRequest.decidedBy?.fullName || "AICTE Officer"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {approvedRequest.officerRemarks && (
              <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs space-y-1">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                  Officer Scrutiny Remarks:
                </span>
                <p className="text-slate-800">{approvedRequest.officerRemarks}</p>
              </div>
            )}
          </div>

          {/* Refund Remittance & Custody Decoupling Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 1: Bank Refund Confirmation */}
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                approvedRequest.status === "REFUND_CONFIRMED"
                  ? "bg-slate-50 border-slate-200"
                  : "bg-amber-50/70 border-amber-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard
                    className={`h-4 w-4 ${
                      approvedRequest.status === "REFUND_CONFIRMED"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Bank Refund Remittance
                  </h4>
                </div>

                {approvedRequest.status === "REFUND_CONFIRMED" ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Confirmed
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    Pending
                  </span>
                )}
              </div>

              {approvedRequest.status === "REFUND_CONFIRMED" ? (
                <div className="space-y-1 text-xs">
                  <p className="text-slate-600">
                    Bank Reference / UTR:{" "}
                    <span className="font-mono font-bold text-slate-900">
                      {approvedRequest.refundReference}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Confirmed{" "}
                    {approvedRequest.refundConfirmedAt
                      ? formatDateTime(approvedRequest.refundConfirmedAt)
                      : "—"}{" "}
                    by {approvedRequest.refundConfirmedBy?.fullName || "Officer"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Financial refund remittance has not yet been recorded. Regulatory release approval does not automatically remit funds.
                  </p>
                  {isOfficer && (
                    <button
                      type="button"
                      onClick={onConfirmRefund}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Confirm Refund Payment</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Physical Custody Handover */}
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isCustodyReleased
                  ? "bg-slate-50 border-slate-200"
                  : "bg-blue-50/70 border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PackageCheck
                    className={`h-4 w-4 ${
                      isCustodyReleased ? "text-emerald-600" : "text-blue-600"
                    }`}
                  />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Physical Document Custody
                  </h4>
                </div>

                {isCustodyReleased ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Handed Over
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                    In Vault / In Custody
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs">
                {isCustodyReleased ? (
                  <p className="text-slate-600">
                    Original physical certificate has been logged as handed over to the institution.
                  </p>
                ) : (
                  <p className="text-blue-900 leading-relaxed">
                    Physical paper FDR certificate is tracked independently. Record its dispatch or handover using the{" "}
                    <strong>Physical Custody</strong> panel below (event: <span className="font-mono font-semibold">ORIGINAL_RELEASED</span>).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State 3: ACTIVE or MATURED (Eligible for Release Request) */}
      {(instrument.status === "ACTIVE" || instrument.status === "MATURED") && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Eligible for Release & Refund
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Institutions may submit a formal release request for deposits that have completed their required AICTE embargo period, or upon approved course closure.
            </p>
          </div>

          {isInstitutionUser && isOwner && (
            <button
              type="button"
              onClick={onRequestRelease}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Request Release & Refund</span>
            </button>
          )}
        </div>
      )}

      {/* ── Historical Release Requests Table ── */}
      {releaseRequests.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Release Request History ({releaseRequests.length})
          </h3>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {releaseRequests.map((req) => (
              <div key={req.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    {req.status === "PENDING" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                        PENDING
                      </span>
                    )}
                    {req.status === "APPROVED" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        APPROVED
                      </span>
                    )}
                    {req.status === "REFUND_CONFIRMED" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                        REFUND CONFIRMED
                      </span>
                    )}
                    {req.status === "REJECTED" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        REJECTED
                      </span>
                    )}
                    <span className="text-slate-500 text-[11px]">
                      Submitted {formatDateTime(req.createdAt)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Requested by:{" "}
                    <span className="font-semibold text-slate-700">
                      {req.requestedBy?.fullName || "Institution"}
                    </span>
                  </div>
                </div>

                {/* Stated Reason */}
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-800">Reason: </span>
                  {req.reason}
                </p>

                {/* Decision / Officer Remarks */}
                {req.decidedAt && (
                  <div className="pt-1.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-700">
                        {req.status === "REJECTED" ? "Rejected" : "Decided"} by:{" "}
                      </span>
                      {req.decidedBy?.fullName || "AICTE Officer"} on {formatDateTime(req.decidedAt)}
                      {req.officerRemarks && (
                        <span className="block sm:inline sm:ml-2 text-slate-700 italic">
                          "{req.officerRemarks}"
                        </span>
                      )}
                    </div>

                    {req.refundReference && (
                      <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Refund Ref: {req.refundReference}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
