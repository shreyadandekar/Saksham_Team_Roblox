/**
 * src/components/clearance/ClearanceTimeline.tsx
 *
 * Feature 2 — Departmental Clearance Timeline:
 * Visual multi-step timeline displaying:
 *   1. Request Submission (Requester, timestamp, reason)
 *   2. Document Scrutiny (Checklist verification)
 *   3. PGRC Clearance (Status, observations, officer, timestamp)
 *   4. Vigilance Clearance (Status, observations, officer, timestamp)
 *   5. Other Applicable Bureau (Status, observations, officer, timestamp)
 *   6. Final Approval Bureau Decision (NOC status, approver, remarks)
 */

import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  XCircle,
} from "lucide-react";
import type {
  ReleaseClearanceRecord,
  ReleaseDocumentReviewRecord,
  ClearanceDepartment,
  ClearanceStatus,
} from "../../types/clearance";

interface ClearanceTimelineProps {
  releaseRequest: any;
  userRole?: string;
  userDepartment?: string | null;
  onOpenDocumentReview?: (docType: string) => void;
  onOpenDepartmentClearance?: (dept: ClearanceDepartment) => void;
  onOpenHoldModal?: () => void;
  onOpenNocModal?: () => void;
}

export default function ClearanceTimeline({
  releaseRequest,
  userRole,
  userDepartment,
  onOpenDocumentReview,
  onOpenDepartmentClearance,
  onOpenNocModal,
}: ClearanceTimelineProps) {
  if (!releaseRequest) return null;

  const clearances: ReleaseClearanceRecord[] = releaseRequest.clearances || [];
  const docReviews: ReleaseDocumentReviewRecord[] = releaseRequest.documentReviews || [];

  function getClearanceRecord(dept: ClearanceDepartment): ReleaseClearanceRecord | undefined {
    return clearances.find((c) => c.department === dept);
  }

  function getClearanceBadge(status?: ClearanceStatus) {
    switch (status) {
      case "CLEARED":
        return {
          label: "Cleared",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
        };
      case "OBJECTION_RAISED":
        return {
          label: "Objection Raised",
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: XCircle,
        };
      case "NOT_APPLICABLE":
        return {
          label: "Not Applicable",
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          icon: CheckCircle2,
        };
      case "PENDING":
      default:
        return {
          label: "Pending Review",
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
        };
    }
  }

  function canDecideDepartment(dept: ClearanceDepartment) {
    if (userRole === "ADMIN" || userRole === "SYSTEM_ADMIN") return true;
    const clr = getClearanceRecord(dept);
    if (clr?.assignedOfficerId && clr.assignedOfficerId === releaseRequest.requestedBy?.id) return false;
    if (userDepartment?.toUpperCase() === dept.toUpperCase() || userDepartment?.toUpperCase() === "ALL") {
      return true;
    }
    return false;
  }

  const pgrcClr = getClearanceRecord("PGRC");
  const vigilanceClr = getClearanceRecord("VIGILANCE");
  const otherClr = getClearanceRecord("OTHER_APPLICABLE_BUREAU");

  const pgrcBadge = getClearanceBadge(pgrcClr?.status);
  const vigilanceBadge = getClearanceBadge(vigilanceClr?.status);
  const otherBadge = getClearanceBadge(otherClr?.status);

  const PgrcIcon = pgrcBadge.icon;
  const VigilanceIcon = vigilanceBadge.icon;
  const OtherIcon = otherBadge.icon;

  const isNocGranted = releaseRequest.status === "APPROVED" || releaseRequest.workflowStage === "NOC_ISSUED";
  const isApprover = userRole === "APPROVER";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Departmental Clearance Timeline
          </h3>
          <p className="text-xs text-slate-500">
            Statutory AICTE Section 6.46 multi-stage regulatory progression
          </p>
        </div>

        {/* Current workflow stage badge */}
        <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Stage: {releaseRequest.workflowStage || "SUBMITTED"}
        </span>
      </div>

      <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {/* ── 1. Request Submission ─────────────────────────────────────────── */}
        <div className="relative group">
          <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 ring-4 ring-white flex items-center justify-center text-white text-[10px]">
            1
          </span>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. Release Request Submission
              </span>
              <span className="text-xs text-slate-500">
                {new Date(releaseRequest.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <p className="text-sm text-slate-700 font-medium italic">
              "{releaseRequest.reason}"
            </p>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
              <span>Submitted by: <strong>{releaseRequest.requestedBy?.fullName || "Institution Authority"}</strong></span>
              <span>·</span>
              <span>Email: {releaseRequest.requestedBy?.email}</span>
            </div>
          </div>
        </div>

        {/* ── 2. Document Scrutiny ─────────────────────────────────────────── */}
        <div className="relative group">
          <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-sky-600 ring-4 ring-white flex items-center justify-center text-white text-[10px]">
            2
          </span>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. Mandatory Document Scrutiny Checklist
              </span>
              <span className="text-xs text-slate-500">
                {docReviews.filter((d) => d.status === "CONFIRMED").length} of 4 Confirmed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {[
                { type: "APPLICATION_LETTER", label: "Formal Release Application Letter" },
                { type: "AFFIDAVIT_6", label: "Affidavit 6 (Prescribed Format)" },
                { type: "FDR_DEPOSIT_EVIDENCE", label: "Security Deposit / FDR Evidence" },
                { type: "LATEST_LOA_EOA", label: "Latest AICTE Approval (LoA / EoA)" },
              ].map((doc) => {
                const review = docReviews.find((d) => d.documentType === doc.type);
                const status = review?.status || "PENDING";
                const isConfirmed = status === "CONFIRMED";
                const isCorrection = status === "CORRECTION_REQUIRED";
                const canReview = userRole === "SCRUTINY_OFFICER" || userRole === "APPROVER" || userRole === "ADMIN";

                return (
                  <div
                    key={doc.type}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isConfirmed
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                        : isCorrection
                        ? "bg-amber-50/60 border-amber-200 text-amber-900"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        {isConfirmed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isCorrection ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span>{doc.label}</span>
                      </div>
                      {review?.reviewRemarks && (
                        <p className="text-[11px] text-slate-600 mt-1 pl-5 italic">
                          "{review.reviewRemarks}"
                        </p>
                      )}
                    </div>

                    {canReview && onOpenDocumentReview && (
                      <button
                        type="button"
                        onClick={() => onOpenDocumentReview(doc.type)}
                        className="ml-2 px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors shrink-0 cursor-pointer"
                      >
                        {status === "PENDING" ? "Review" : "Update"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 3. PGRC Clearance ────────────────────────────────────────────── */}
        <div className="relative group">
          <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-indigo-600 ring-4 ring-white flex items-center justify-center text-white text-[10px]">
            3
          </span>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  3. Public Grievance Redressal Cell (PGRC) Clearance
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border font-medium ${pgrcBadge.bg}`}>
                  <PgrcIcon className="w-3 h-3" />
                  {pgrcBadge.label}
                </span>
              </div>

              {canDecideDepartment("PGRC") && onOpenDepartmentClearance && (
                <button
                  type="button"
                  onClick={() => onOpenDepartmentClearance("PGRC")}
                  className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {pgrcClr?.status === "PENDING" || !pgrcClr ? "Record Decision" : "Update Clearance"}
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Clearance regarding student fee disputes, faculty salary complaints, or court orders.
            </p>

            {pgrcClr?.decisionReason && (
              <div className="mt-2.5 p-2.5 rounded bg-white border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold text-slate-800">PGRC Observations: </span>
                <span>{pgrcClr.decisionReason}</span>
                {pgrcClr.decidedBy && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Recorded by: {pgrcClr.decidedBy.fullName} ({pgrcClr.decidedBy.email}) ·{" "}
                    {pgrcClr.decidedAt ? new Date(pgrcClr.decidedAt).toLocaleString("en-IN") : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Vigilance Clearance ───────────────────────────────────────── */}
        <div className="relative group">
          <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-indigo-600 ring-4 ring-white flex items-center justify-center text-white text-[10px]">
            4
          </span>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  4. AICTE Vigilance Cell Clearance
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border font-medium ${vigilanceBadge.bg}`}>
                  <VigilanceIcon className="w-3 h-3" />
                  {vigilanceBadge.label}
                </span>
              </div>

              {canDecideDepartment("VIGILANCE") && onOpenDepartmentClearance && (
                <button
                  type="button"
                  onClick={() => onOpenDepartmentClearance("VIGILANCE")}
                  className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {vigilanceClr?.status === "PENDING" || !vigilanceClr ? "Record Decision" : "Update Clearance"}
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Clearance regarding financial inquiries, institutional fraud investigations, or vigilance holds.
            </p>

            {vigilanceClr?.decisionReason && (
              <div className="mt-2.5 p-2.5 rounded bg-white border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold text-slate-800">Vigilance Observations: </span>
                <span>{vigilanceClr.decisionReason}</span>
                {vigilanceClr.decidedBy && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Recorded by: {vigilanceClr.decidedBy.fullName} ({vigilanceClr.decidedBy.email}) ·{" "}
                    {vigilanceClr.decidedAt ? new Date(vigilanceClr.decidedAt).toLocaleString("en-IN") : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Other Bureau Clearance ─────────────────────────────────────── */}
        <div className="relative group">
          <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-indigo-600 ring-4 ring-white flex items-center justify-center text-white text-[10px]">
            5
          </span>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  5. Regional Office / Legal Bureau Clearance
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border font-medium ${otherBadge.bg}`}>
                  <OtherIcon className="w-3 h-3" />
                  {otherBadge.label}
                </span>
              </div>

              {canDecideDepartment("OTHER_APPLICABLE_BUREAU") && onOpenDepartmentClearance && (
                <button
                  type="button"
                  onClick={() => onOpenDepartmentClearance("OTHER_APPLICABLE_BUREAU")}
                  className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {otherClr?.status === "PENDING" || !otherClr ? "Record Decision" : "Update Clearance"}
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Regional office territorial jurisdiction verification, land lease status, or applicable state bureau NOC.
            </p>

            {otherClr?.decisionReason && (
              <div className="mt-2.5 p-2.5 rounded bg-white border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold text-slate-800">Bureau Observations: </span>
                <span>{otherClr.decisionReason}</span>
                {otherClr.decidedBy && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Recorded by: {otherClr.decidedBy.fullName} ({otherClr.decidedBy.email}) ·{" "}
                    {otherClr.decidedAt ? new Date(otherClr.decidedAt).toLocaleString("en-IN") : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 6. Final Approval Bureau Decision ─────────────────────────────── */}
        <div className="relative group">
          <span className={`absolute -left-6 top-1 w-5 h-5 rounded-full ring-4 ring-white flex items-center justify-center text-white text-[10px] ${
            isNocGranted ? "bg-teal-600" : "bg-emerald-600"
          }`}>
            6
          </span>
          <div className={`p-4 rounded-xl border ${
            isNocGranted
              ? "bg-teal-50/70 border-teal-200"
              : "bg-slate-50 border-slate-200"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                6. Approval Bureau Final Release NOC Decision
              </span>

              {isNocGranted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  NOC Granted
                </span>
              ) : isApprover && onOpenNocModal ? (
                <button
                  type="button"
                  onClick={onOpenNocModal}
                  className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  Issue Final NOC
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  Awaiting Approver Action
                </span>
              )}
            </div>

            {isNocGranted ? (
              <div className="mt-2 text-xs text-teal-900 bg-white/80 p-3 rounded-lg border border-teal-200">
                <p className="font-semibold text-teal-950">Statutory Release NOC Granted</p>
                <p className="mt-0.5">{releaseRequest.officerRemarks || "Approval Bureau granted unconditional security deposit release NOC."}</p>
                {releaseRequest.decidedBy && (
                  <p className="text-[11px] text-teal-700 mt-1.5">
                    Authorized Approver: {releaseRequest.decidedBy.fullName} ({releaseRequest.decidedBy.email}) ·{" "}
                    {releaseRequest.decidedAt ? new Date(releaseRequest.decidedAt).toLocaleString("en-IN") : ""}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-600 mt-1">
                The Approval Bureau Competent Authority grants final statutory NOC once all 5 preceding milestones are verified by the backend guard.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
