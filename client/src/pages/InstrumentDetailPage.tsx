/**
 * src/pages/InstrumentDetailPage.tsx
 * Dedicated detail inspection page with lifecycle actions and verified audit timeline.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  Building2,
  Calendar,
  Send,
  Eye,
  ArrowLeft,
  Clock,
  User,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Coins,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getInstrumentById, submitInstrument, startScrutiny } from "../api/instruments";
import { listDocuments } from "../api/documents";
import type { Instrument, AuditEvent } from "../types/instrument";
import type { Document } from "../types/document";
import AppShell from "../components/layout/AppShell";
import StatusBadge from "../components/common/StatusBadge";
import DocumentUpload from "../components/documents/DocumentUpload";
import DocumentList from "../components/documents/DocumentList";
import CustodyCard from "../components/custody/CustodyCard";
import LinkedInstrumentsCard from "../components/relationships/LinkedInstrumentsCard";
import RenewReplaceModal from "../components/relationships/RenewReplaceModal";
import ScrutinyDecisionModal from "../components/scrutiny/ScrutinyDecisionModal";
import ReleaseCard from "../components/release/ReleaseCard";
import RequestReleaseModal from "../components/release/RequestReleaseModal";
import ReleaseDecisionModal from "../components/release/ReleaseDecisionModal";
import ConfirmRefundModal from "../components/release/ConfirmRefundModal";
import { getCustody } from "../api/custody";
import { getInstrumentRelationships } from "../api/relationships";
import { getReleaseRequests } from "../api/release";
import { listOcrExtractions, triggerDocumentOcr } from "../api/ocr";
import type { CurrentCustodyState, CustodyEvent } from "../types/custody";
import type { InstrumentRelationshipItem } from "../types/relationship";
import type { ReleaseRequest } from "../types/release";
import type { OcrExtraction } from "../types/ocr";
import { getActionMeta } from "../types/audit";
import AuditMetadataViewer from "../components/audit/AuditMetadataViewer";
import OcrReviewCard from "../components/ocr/OcrReviewCard";
import { formatINR, formatDate, formatDateTime } from "../utils/format";

export default function InstrumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentCustody, setCurrentCustody] = useState<CurrentCustodyState | null>(null);
  const [custodyEvents, setCustodyEvents] = useState<CustodyEvent[]>([]);
  const [predecessors, setPredecessors] = useState<InstrumentRelationshipItem[]>([]);
  const [successors, setSuccessors] = useState<InstrumentRelationshipItem[]>([]);
  const [releaseRequests, setReleaseRequests] = useState<ReleaseRequest[]>([]);
  const [extractions, setExtractions] = useState<OcrExtraction[]>([]);
  const [triggeringDocId, setTriggeringDocId] = useState<string | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isRequestReleaseOpen, setIsRequestReleaseOpen] = useState(false);
  const [isReleaseDecisionOpen, setIsReleaseDecisionOpen] = useState(false);
  const [isConfirmRefundOpen, setIsConfirmRefundOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { message?: string } | undefined)?.message || null
  );
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setDocsError(null);

    try {
      const instData = await getInstrumentById(id);
      setInstrument(instData.instrument);
      setAuditEvents(instData.auditEvents);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to retrieve instrument record."
      );
    } finally {
      setLoading(false);
    }

    setDocsLoading(true);
    try {
      const docsData = await listDocuments(id);
      setDocuments(docsData.documents);
    } catch (err: unknown) {
      setDocsError(
        err instanceof Error ? err.message : "Unable to retrieve document list from server."
      );
    } finally {
      setDocsLoading(false);
    }

    try {
      const custodyData = await getCustody(id);
      setCurrentCustody(custodyData.currentCustody);
      setCustodyEvents(custodyData.events);
    } catch {
      // Non-fatal or pending receipt
    }

    try {
      const relData = await getInstrumentRelationships(id);
      setPredecessors(relData.predecessors || []);
      setSuccessors(relData.successors || []);
    } catch {
      // Non-fatal
    }

    try {
      const relReqData = await getReleaseRequests(id);
      setReleaseRequests(relReqData.releaseRequests || []);
    } catch {
      // Non-fatal or none found
    }

    try {
      const ocrData = await listOcrExtractions(id);
      setExtractions(ocrData.extractions || []);
    } catch {
      // Non-fatal or none found
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleTriggerOcr(documentId: string) {
    if (!id) return;
    setTriggeringDocId(documentId);
    setError(null);
    try {
      const res = await triggerDocumentOcr(id, documentId);
      setSuccessMessage(res.message);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to trigger OCR extraction.");
    } finally {
      setTriggeringDocId(null);
    }
  }

  async function handleSubmit() {
    if (!id) return;
    if (!confirm("Are you sure you want to submit this FDR for AICTE scrutiny?")) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await submitInstrument(id);
      setSuccessMessage(res.message);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit instrument.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStartScrutiny() {
    if (!id) return;
    if (!confirm("Confirm that you are initiating regulatory scrutiny on this deposit?")) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await startScrutiny(id);
      setSuccessMessage(res.message);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start scrutiny.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleDocumentUploaded(newDoc: Document) {
    setDocuments((prev) => [newDoc, ...prev]);
    // Reload data so audit log updates with the DOCUMENT_UPLOADED event
    loadData();
  }

  function handleDocumentDeleted(deletedId: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
    // Reload data so audit log updates with the DOCUMENT_DELETED event
    loadData();
  }

  const isInstitutionUser = user?.role === "INSTITUTION_USER";
  const isOfficer = user?.role === "AICTE_OFFICER" || user?.role === "SYSTEM_ADMIN";
  const isOwner = user && instrument && instrument.institutionId === user.institutionId;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-sm font-medium">Retrieving verified instrument record...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !instrument) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Record Inaccessible</h2>
          <p className="mt-1 text-sm text-slate-600">
            {error || "The requested instrument could not be found or you do not have permission to view it."}
          </p>
          <div className="mt-6">
            <Link
              to={isOfficer ? "/scrutiny" : "/instruments"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Registry
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Breadcrumb ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link
              to={isOfficer ? "/scrutiny" : "/instruments"}
              className="hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {isOfficer ? "Back to Scrutiny Queue" : "Back to Registry"}
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-mono font-medium">
              {instrument.instrumentNumber}
            </span>
          </div>

          <StatusBadge status={instrument.status} />
        </div>

        {/* ── Notification Banner ────────────────────────────────── */}
        {successMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Instrument Header Card ─────────────────────────────── */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Fixed Deposit Receipt Ref
              </span>
              <h1 className="text-2xl font-bold font-mono text-blue-900 mt-0.5">
                {instrument.instrumentNumber}
              </h1>
              <p className="mt-1 text-sm text-slate-600 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="font-semibold">{instrument.institution?.name}</span>
                <span className="text-xs text-slate-400">({instrument.institution?.code})</span>
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Principal Amount
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-0.5">
                {formatINR(instrument.amount)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Favouring: {instrument.favouringDetails}
              </p>
            </div>
          </div>
        </div>

        {/* ── Workflow Action Panel ──────────────────────────────── */}
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              {instrument.status === "DRAFT" ? (
                <Send className="h-5 w-5 text-white" />
              ) : instrument.status === "ACTIVE" ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : instrument.status === "UNDER_SCRUTINY" ? (
                <Eye className="h-5 w-5 text-white" />
              ) : instrument.status === "CORRECTION_REQUIRED" ? (
                <AlertTriangle className="h-5 w-5 text-amber-300" />
              ) : (
                <Eye className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {instrument.status === "DRAFT"
                  ? "Draft Saved in Registry"
                  : instrument.status === "SUBMITTED"
                  ? "Submitted for AICTE Scrutiny"
                  : instrument.status === "UNDER_SCRUTINY"
                  ? "Under Active Regulatory Scrutiny"
                  : instrument.status === "CORRECTION_REQUIRED"
                  ? "Revision / Correction Requested"
                  : instrument.status === "ACTIVE"
                  ? "Active Compliant Deposit"
                  : instrument.status === "MATURED"
                  ? "Matured / Superseded Deposit"
                  : instrument.status === "RELEASE_REQUESTED"
                  ? "Deposit Release Requested"
                  : instrument.status === "RELEASED"
                  ? "Deposit Released & Approved"
                  : `Instrument Status: ${instrument.status}`}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                {instrument.status === "DRAFT"
                  ? isOwner
                    ? "Submit this draft to dispatch it to AICTE officer scrutiny queues."
                    : "Awaiting submission by the originating institution."
                  : instrument.status === "SUBMITTED"
                  ? isOfficer
                    ? "This instrument is awaiting your initial scrutiny review."
                    : "Queued with AICTE regulatory officers."
                  : instrument.status === "UNDER_SCRUTINY"
                  ? isOfficer
                    ? "Review verified documents, physical custody, and record an official approval or correction decision."
                    : "AICTE officers are actively reviewing documents and certificate authenticity."
                  : instrument.status === "CORRECTION_REQUIRED"
                  ? isOwner
                    ? "Please update your documents/details and resubmit for scrutiny."
                    : "Returned to the institution for corrective action."
                  : instrument.status === "ACTIVE"
                  ? isOwner
                    ? "Active security deposit. You may initiate an early renewal or request release."
                    : "Active and certified compliant."
                  : instrument.status === "MATURED"
                  ? isOwner
                    ? "Matured deposit. Initiate a renewal or request deposit release & refund."
                    : "Deposit has matured."
                  : instrument.status === "RELEASE_REQUESTED"
                  ? isOfficer
                    ? "This deposit has a pending release request awaiting regulatory scrutiny and decision."
                    : "Release request submitted to AICTE officers. Awaiting regulatory decision."
                  : instrument.status === "RELEASED"
                  ? "Regulatory release approved. Bank refund confirmation and physical document handover proceed as subsequent auditable steps."
                  : "Inspection record active."}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {instrument.status === "DRAFT" && isInstitutionUser && isOwner && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={actionLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{actionLoading ? "Submitting..." : "Submit for Scrutiny"}</span>
              </button>
            )}

            {instrument.status === "SUBMITTED" && isOfficer && (
              <button
                type="button"
                onClick={handleStartScrutiny}
                disabled={actionLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Eye className="h-4 w-4 text-slate-900" />
                <span>{actionLoading ? "Updating..." : "Start Scrutiny"}</span>
              </button>
            )}

            {(instrument.status === "SUBMITTED" || instrument.status === "UNDER_SCRUTINY") && isOfficer && (
              <button
                type="button"
                onClick={() => setIsDecisionModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Record Scrutiny Decision</span>
              </button>
            )}

            {(instrument.status === "ACTIVE" || instrument.status === "MATURED") && isInstitutionUser && isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Renew / Replace</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRequestReleaseOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Coins className="h-4 w-4" />
                  <span>Request Release</span>
                </button>
              </>
            )}

            {instrument.status === "RELEASE_REQUESTED" && isOfficer && (
              <button
                type="button"
                onClick={() => setIsReleaseDecisionOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Review Release Request</span>
              </button>
            )}

            {instrument.status === "RELEASED" && isOfficer && releaseRequests.some((r) => r.status === "APPROVED") && (
              <button
                type="button"
                onClick={() => setIsConfirmRefundOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <span>Confirm Refund</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Instrument Particulars Grid ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Banking Details */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-700" />
              Banking Particulars
            </h2>

            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Issuing Bank</dt>
                <dd className="font-semibold text-slate-900">{instrument.bankName}</dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500">Branch Name</dt>
                <dd className="font-semibold text-slate-900">{instrument.branchName}</dd>
              </div>

              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Favouring Details</dt>
                <dd className="font-semibold text-slate-900">{instrument.favouringDetails}</dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500">Recorded By</dt>
                <dd className="text-slate-800 text-xs">
                  {instrument.createdBy?.fullName || "—"} ({instrument.createdBy?.email})
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500">Institution Code</dt>
                <dd className="font-mono text-slate-800 text-xs">
                  {instrument.institution?.code || "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Card 2: Validity & Dates */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-700" />
              Validity & Schedule
            </h2>

            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Date of Issue</dt>
                <dd className="font-semibold text-slate-900">
                  {formatDate(instrument.issueDate)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500">Date of Maturity</dt>
                <dd className="font-semibold text-slate-900">
                  {formatDate(instrument.maturityDate)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500">Created in Portal</dt>
                <dd className="text-slate-700 text-xs">
                  {formatDateTime(instrument.createdAt)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500">Last Status Update</dt>
                <dd className="text-slate-700 text-xs">
                  {formatDateTime(instrument.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Card 3: Verified Supporting Documents & Cloud Storage */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-blue-700" />
                  Verified Supporting Documents
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cryptographically hashed and stored in encrypted Cloud Storage with signed-URL access
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 self-start sm:self-auto">
                {documents.length} File{documents.length === 1 ? "" : "s"} Attached
              </span>
            </div>

            {/* Server API Error Notification */}
            {docsError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{docsError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadData()}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Legacy metadata explanation when no binary document is in storage */}
            {instrument.documentMetadata && documents.length === 0 && !docsError && (
              <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                      Legacy Registration Metadata (No File Bytes in Cloud Storage)
                    </p>
                    <p className="text-amber-900 leading-relaxed">
                      Initial registration recorded metadata for{" "}
                      <span className="font-semibold text-amber-950">
                        {instrument.documentMetadata.fileName}
                      </span>{" "}
                      ({(instrument.documentMetadata.fileSize / 1024).toFixed(1)} KB,{" "}
                      {instrument.documentMetadata.fileType}).
                      Because binary storage was introduced in Milestone 4, this physical certificate was never uploaded to secure storage.
                    </p>
                    <p className="text-amber-800 pt-0.5">
                      {isInstitutionUser && isOwner
                        ? "To allow AICTE officers to scrutinize and verify this deposit, please upload the PDF/certificate below."
                        : "The institution has not yet uploaded the physical certificate binary. Scrutiny requires verifying the uploaded document."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Document upload form (available in DRAFT, or when documents are missing for unfinalized instruments) */}
            {isInstitutionUser &&
              isOwner &&
              (instrument.status === "DRAFT" || documents.length === 0) &&
              instrument.status !== "ACTIVE" &&
              instrument.status !== "REJECTED" && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {instrument.status === "DRAFT"
                        ? "Upload Supporting Document"
                        : "Upload Missing Supporting Document"}
                    </h3>
                    {instrument.status !== "DRAFT" && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                        Post-Submission Upload
                      </span>
                    )}
                  </div>
                  {instrument.status !== "DRAFT" && (
                    <p className="text-xs text-slate-600">
                      Attach the official FDR certificate or confirmation letter so AICTE officers can verify the deposit during scrutiny.
                    </p>
                  )}
                  <DocumentUpload
                    instrumentId={instrument.id}
                    onUploadSuccess={handleDocumentUploaded}
                  />
                </div>
              )}

            {/* Document list with secure view/download links */}
            {docsLoading ? (
              <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                Loading attached documents...
              </div>
            ) : (
              <DocumentList
                instrumentId={instrument.id}
                documents={documents}
                canDelete={Boolean(isInstitutionUser && isOwner && instrument.status === "DRAFT")}
                onDocumentDeleted={handleDocumentDeleted}
                onTriggerOcr={handleTriggerOcr}
                triggeringDocId={triggeringDocId}
              />
            )}

            {/* Initial registration reference (if files are already attached) */}
            {instrument.documentMetadata && documents.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Initial Registration Reference: </span>
                    {instrument.documentMetadata.fileName} ({instrument.documentMetadata.fileType},{" "}
                    {(instrument.documentMetadata.fileSize / 1024).toFixed(1)} KB)
                    {instrument.documentMetadata.notes && ` — Remarks: "${instrument.documentMetadata.notes}"`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3b: OCR Document Intelligence & Human Review */}
          <div className="md:col-span-2">
            <OcrReviewCard
              instrumentId={instrument.id}
              documents={documents}
              extractions={extractions}
              isOfficer={Boolean(isOfficer)}
              onRefresh={loadData}
            />
          </div>

          {/* Card 4: Linked Lineage (Predecessors & Successors) */}
          <div className="md:col-span-2">
            <LinkedInstrumentsCard
              currentInstrumentId={instrument.id}
              predecessors={predecessors}
              successors={successors}
            />
          </div>

          {/* Card 5: Security Deposit Release & Refund Processing */}
          <div className="md:col-span-2">
            <ReleaseCard
              instrument={instrument}
              releaseRequests={releaseRequests}
              currentCustody={currentCustody}
              isInstitutionUser={Boolean(isInstitutionUser)}
              isOwner={Boolean(isOwner)}
              isOfficer={Boolean(isOfficer)}
              onRequestRelease={() => setIsRequestReleaseOpen(true)}
              onDecideRelease={() => setIsReleaseDecisionOpen(true)}
              onConfirmRefund={() => setIsConfirmRefundOpen(true)}
            />
          </div>

          {/* Card 6: Physical Custody & Vault Location */}
          <div className="md:col-span-2">
            <CustodyCard
              instrumentId={instrument.id}
              currentCustody={currentCustody}
              events={custodyEvents}
              isOfficerOrAdmin={Boolean(isOfficer)}
              onEventRecorded={loadData}
            />
          </div>

          {/* Card 7: Audit Event Timeline */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-700" />
                Audit Trail & Regulatory Activity History
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                {auditEvents.length} Event{auditEvents.length === 1 ? "" : "s"}
              </span>
            </div>

            {auditEvents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No historical audit events recorded yet.
              </p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {auditEvents.map((event) => {
                  const meta = getActionMeta(event.action);

                  return (
                    <div key={event.id} className="relative group">
                      {/* Dynamic color-coded circle icon */}
                      <div
                        className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full ring-4 ${meta.dotClass}`}
                      />

                      <div
                        className={`bg-slate-50 p-4 rounded-lg border text-xs space-y-2 transition-shadow group-hover:shadow-xs ${meta.borderClass}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {meta.label}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${meta.badgeClass}`}
                            >
                              {meta.categoryLabel}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              [{event.action}]
                            </span>
                          </div>
                          <span className="text-slate-500 text-[11px] shrink-0 font-mono">
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-slate-600 pt-1">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-slate-400" />
                            <span>Actor:</span>
                            <span className="font-semibold text-slate-800">
                              {event.actor?.fullName || "System Engine"}
                            </span>
                            {event.actor?.email && (
                              <span className="text-slate-500 font-mono text-[11px]">
                                ({event.actor.email})
                              </span>
                            )}
                          </div>
                          {event.actor?.role && (
                            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">
                              {event.actor.role}
                            </span>
                          )}
                        </div>

                        {/* Structured Metadata Viewer (never exposes secrets or storage paths) */}
                        <AuditMetadataViewer
                          action={event.action}
                          metadata={event.metadata}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Modals ── */}
        <RenewReplaceModal
          originalInstrument={instrument}
          isOpen={isRenewModalOpen}
          onClose={() => setIsRenewModalOpen(false)}
          onSuccess={(_newId) => {
            setIsRenewModalOpen(false);
            setSuccessMessage("Renewal/replacement deposit submitted successfully for scrutiny.");
            loadData();
          }}
        />

        <ScrutinyDecisionModal
          instrument={instrument}
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          onSuccess={() => {
            setIsDecisionModalOpen(false);
            setSuccessMessage("Regulatory scrutiny decision recorded successfully.");
            loadData();
          }}
        />

        <RequestReleaseModal
          instrument={instrument}
          isOpen={isRequestReleaseOpen}
          onClose={() => setIsRequestReleaseOpen(false)}
          onSuccess={(msg) => {
            setIsRequestReleaseOpen(false);
            setSuccessMessage(msg);
            loadData();
          }}
        />

        <ReleaseDecisionModal
          instrument={instrument}
          pendingRequest={releaseRequests.find((r) => r.status === "PENDING") || null}
          isOpen={isReleaseDecisionOpen}
          onClose={() => setIsReleaseDecisionOpen(false)}
          onSuccess={(msg) => {
            setIsReleaseDecisionOpen(false);
            setSuccessMessage(msg);
            loadData();
          }}
        />

        <ConfirmRefundModal
          instrument={instrument}
          isOpen={isConfirmRefundOpen}
          onClose={() => setIsConfirmRefundOpen(false)}
          onSuccess={(msg) => {
            setIsConfirmRefundOpen(false);
            setSuccessMessage(msg);
            loadData();
          }}
        />
      </main>
    </AppShell>
  );
}
