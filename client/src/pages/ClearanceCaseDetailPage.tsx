/**
 * src/pages/ClearanceCaseDetailPage.tsx
 *
 * Case Console for a specific FDR Release Request.
 * Integrates:
 * - USP 2: Multi-Department Clearance Timeline & Explainable Blockers.
 * - USP 1: APH Compliance Engine evaluation.
 * - Role-Gated Statutory Actions (Scrutiny, PGRC, Vigilance, Bureau, Final NOC).
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building,
  AlertTriangle,
  Award,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle2,
  History,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";
import ExplainableBlockersPanel from "../components/clearance/ExplainableBlockersPanel";
import ClearanceTimeline from "../components/clearance/ClearanceTimeline";
import AphComplianceCard from "../components/clearance/AphComplianceCard";
import DocumentReviewModal from "../components/clearance/DocumentReviewModal";
import DepartmentClearanceModal from "../components/clearance/DepartmentClearanceModal";
import HoldModal from "../components/clearance/HoldModal";
import IssueNocModal from "../components/clearance/IssueNocModal";
import { getClearanceCaseDetail } from "../api/clearances";
import type {
  ClearanceCaseDetailResponse,
  ClearanceDepartment,
} from "../types/clearance";

export default function ClearanceCaseDetailPage() {
  const { releaseRequestId } = useParams<{ releaseRequestId: string }>();
  const { user } = useAuth();

  const [caseDetail, setCaseDetail] = useState<ClearanceCaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("AFFIDAVIT_6");

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<ClearanceDepartment>("PGRC");

  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [nocModalOpen, setNocModalOpen] = useState(false);

  const loadCase = useCallback(async () => {
    if (!releaseRequestId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getClearanceCaseDetail(releaseRequestId);
      setCaseDetail(data);
    } catch (err: any) {
      setError(err.message || "Failed to load case clearance details.");
    } finally {
      setLoading(false);
    }
  }, [releaseRequestId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Handle action callbacks
  const handleActionSuccess = (msg: string) => {
    setActionSuccess(msg);
    loadCase();
    setTimeout(() => setActionSuccess(null), 6000);
  };

  // Open Document Scrutiny Modal
  const handleOpenDocReview = (docType: string) => {
    setSelectedDocType(docType);
    setDocModalOpen(true);
  };

  // Open Department Clearance Modal
  const handleOpenDeptClearance = (dept: ClearanceDepartment) => {
    setSelectedDepartment(dept);
    setDeptModalOpen(true);
  };

  if (loading && !caseDetail) {
    return (
      <AppShell>
        <div className="py-20 text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-sky-500 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">
            Fetching statutory clearance case record and audit chains...
          </p>
        </div>
      </AppShell>
    );
  }

  if (error || !caseDetail) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-16 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Clearance Case Error</h2>
          <p className="text-sm text-slate-500">{error || "Case record not found."}</p>
          <div className="pt-2">
            <Link
              to="/clearances"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Command Center
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { releaseRequest, guardResult, aphCompliance, auditEvents } = caseDetail;
  const instrument = releaseRequest?.instrument || {};
  const institution = instrument?.institution || {};

  const isHoldActive = releaseRequest.status === "HOLD" || releaseRequest.workflowStage === "ON_HOLD";
  const isApproved = releaseRequest.status === "APPROVED" || releaseRequest.workflowStage === "NOC_ISSUED";
  const isRejected = releaseRequest.status === "REJECTED";

  const canManageHold =
    user?.role === "APPROVER" ||
    user?.role === "ADMIN" ||
    user?.role === "SCRUTINY_OFFICER" ||
    user?.role === "AICTE_OFFICER";

  return (
    <AppShell>
      <div className="space-y-6 pb-16 animate-fade-in" id="clearance-case-console">
        {/* ── Top Bar Navigation & Actions ───────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/clearances"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Clearances
            </Link>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-mono">
              Req ID: {releaseRequest.id?.slice(0, 12)}...
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadCase()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title="Refresh Case Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Regulatory Hold Button */}
            {canManageHold && !isApproved && !isRejected && (
              <button
                onClick={() => setHoldModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isHoldActive
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-slate-800 hover:bg-slate-900 text-amber-300 border border-amber-500/30"
                }`}
                id="toggle-hold-btn"
              >
                {isHoldActive ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    Lift Regulatory Hold
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Place Statutory Hold
                  </>
                )}
              </button>
            )}

            {/* Approval Bureau Final Action */}
            {user?.role === "APPROVER" && (
              <button
                onClick={() => setNocModalOpen(true)}
                disabled={!guardResult?.isEligible || isApproved}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                  guardResult?.isEligible && !isApproved
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/30"
                    : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                }`}
                title={
                  guardResult?.isEligible
                    ? "Statutory clearance requirements met. Issue NOC."
                    : "Final decision blocked: review outstanding prerequisites below."
                }
                id="header-issue-noc-btn"
              >
                <Award className="w-4 h-4" />
                {isApproved ? "NOC Already Issued" : "Issue Release NOC"}
              </button>
            )}
          </div>
        </div>

        {/* ── Success Alert ──────────────────────────────────────── */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        )}

        {/* ── Case Header & Core Metadata Card ───────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  {releaseRequest.workflowStage ? releaseRequest.workflowStage.replace(/_/g, " ") : releaseRequest.stage?.replace(/_/g, " ") || "IN REVIEW"}
                </span>
                {isHoldActive && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white animate-pulse">
                    REGULATORY HOLD ACTIVE
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  Submitted {new Date(releaseRequest.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building className="w-6 h-6 text-blue-800 shrink-0" />
                {institution.name || "AICTE Approved Institution"}
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                AICTE Permanent ID: {institution.aicteId || institution.code || "AICTE-INST-REG"}
              </p>
            </div>

            {/* Financial Overview */}
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:px-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Release Amount Requested
                </span>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  ₹{Number(releaseRequest.amountRequested || instrument.amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  FDR Number
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {instrument.instrumentNumber || instrument.fdrNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Quick specs grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-medium">Bank & Branch</span>
              <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                {instrument.bankName} ({instrument.branchName})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-medium">Deposit Maturity</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {instrument.maturityDate
                  ? new Date(instrument.maturityDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-medium">Release Reason</span>
              <span className="font-semibold text-slate-800 mt-0.5 block capitalize truncate">
                {releaseRequest.reason ? releaseRequest.reason.replace(/_/g, " ") : "Maturity / Course Closure"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-medium">Current Reviewer</span>
              <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                {releaseRequest.assignedTo?.fullName || "Unassigned / Bureau Queue"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Feature 4: Explainable Blockers Panel ──────────────── */}
        <ExplainableBlockersPanel
          guardResult={guardResult}
          workflowStage={releaseRequest.workflowStage}
        />

        {/* ── Feature 2 & 3: Departmental Clearance Timeline ─────── */}
        <ClearanceTimeline
          releaseRequest={releaseRequest}
          userRole={user?.role}
          userDepartment={user?.department}
          onOpenDocumentReview={handleOpenDocReview}
          onOpenDepartmentClearance={handleOpenDeptClearance}
          onOpenHoldModal={() => setHoldModalOpen(true)}
          onOpenNocModal={() => setNocModalOpen(true)}
        />

        {/* ── Feature 5: USP 1 APH Compliance Engine Integration ─── */}
        <AphComplianceCard
          aphResult={aphCompliance}
          instrumentAmount={Number(instrument.amount || 0)}
        />

        {/* ── Cryptographic Audit Chain & History ────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-sky-600" />
              Cryptographic Audit Chain (SHA-256)
            </h3>
            <span className="text-xs text-slate-400">
              {auditEvents?.length || 0} Recorded Action{(auditEvents?.length || 0) === 1 ? "" : "s"}
            </span>
          </div>

          <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100">
            {!auditEvents || auditEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No audit events recorded yet for this release case.
              </div>
            ) : (
              auditEvents.map((evt: any) => (
                <div
                  key={evt.id}
                  className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 font-mono">
                        {evt.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-400">by</span>
                      <span className="font-semibold text-slate-700">
                        {evt.actor?.fullName || "System"} ({evt.actor?.role || "SYSTEM"})
                      </span>
                    </div>
                    {evt.details && (
                      <p className="text-[11px] text-slate-500 font-mono truncate max-w-xl">
                        {typeof evt.details === "string" ? evt.details : JSON.stringify(evt.details)}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-slate-400 text-[11px] block">
                      {new Date(evt.timestamp || evt.createdAt).toLocaleString("en-IN")}
                    </span>
                    {evt.chainHash && (
                      <span className="text-[9px] text-slate-400 font-mono">
                        Hash: {evt.chainHash.slice(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Modals ────────────────────────────────────────────── */}
        {/* Document Review Scrutiny Modal */}
        {docModalOpen && (
          <DocumentReviewModal
            instrumentId={instrument.id}
            releaseRequestId={releaseRequest.id}
            documentType={selectedDocType}
            onClose={() => setDocModalOpen(false)}
            onSuccess={() => handleActionSuccess("Document review recorded successfully.")}
          />
        )}

        {/* Department Clearance Decision Modal */}
        {deptModalOpen && (
          <DepartmentClearanceModal
            instrumentId={instrument.id}
            releaseRequestId={releaseRequest.id}
            department={selectedDepartment}
            onClose={() => setDeptModalOpen(false)}
            onSuccess={() => handleActionSuccess("Department clearance recorded successfully.")}
          />
        )}

        {/* Hold Modal */}
        {holdModalOpen && (
          <HoldModal
            instrumentId={instrument.id}
            releaseRequestId={releaseRequest.id}
            isCurrentlyOnHold={isHoldActive}
            currentHoldReason={releaseRequest.holdReason}
            onClose={() => setHoldModalOpen(false)}
            onSuccess={() =>
              handleActionSuccess(
                isHoldActive
                  ? "Statutory hold lifted successfully."
                  : "Statutory hold placed on release case."
              )
            }
          />
        )}

        {/* Issue NOC Modal */}
        <IssueNocModal
          isOpen={nocModalOpen}
          onClose={() => setNocModalOpen(false)}
          onSuccess={() => handleActionSuccess("AICTE Release NOC issued successfully!")}
          instrumentId={instrument.id}
          releaseRequestId={releaseRequest.id}
          caseDetail={caseDetail}
        />
      </div>
    </AppShell>
  );
}
