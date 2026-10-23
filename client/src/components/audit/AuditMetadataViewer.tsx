/**
 * src/components/audit/AuditMetadataViewer.tsx
 * Structured, human-readable metadata renderer for FDR audit events.
 * Never displays storage paths, passwords, tokens, or signed URLs.
 */

import { useState } from "react";
import {
  FileText,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CreditCard,
  ShieldAlert,
  ArrowRight,
  Code,
  MapPin,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface AuditMetadataViewerProps {
  action: string;
  metadata?: Record<string, unknown> | null;
}

export default function AuditMetadataViewer({
  action,
  metadata,
}: AuditMetadataViewerProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  // Filter out any sensitive internal properties before rendering
  const sensitiveKeys = new Set([
    "storagePath",
    "password",
    "passwordHash",
    "token",
    "signedUrl",
    "secret",
  ]);

  const sanitizedMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!sensitiveKeys.has(key)) {
      sanitizedMetadata[key] = value;
    }
  }

  // Format bytes nicely
  function formatBytes(bytes?: unknown): string {
    if (typeof bytes !== "number") return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Render action-specific structured views
  function renderStructuredContent() {
    // ── 1. Document Upload ───────────────────────────────────────────────────
    if (action === "DOCUMENT_UPLOADED") {
      const fileName = String(metadata?.originalName || "Document");
      const category = String(metadata?.category || "Supporting Document");
      const size = formatBytes(metadata?.sizeBytes);
      const mime = String(metadata?.mimeType || "");

      return (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 bg-sky-50 px-2 py-1 rounded border border-sky-200">
            <FileText className="h-3.5 w-3.5 text-sky-600" />
            {fileName}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
            {category}
          </span>
          {size && (
            <span className="text-slate-500 text-[11px] font-mono">
              ({size})
            </span>
          )}
          {mime && (
            <span className="text-slate-400 text-[10px] font-mono">
              {mime}
            </span>
          )}
        </div>
      );
    }

    // ── 2. Document Deletion ─────────────────────────────────────────────────
    if (action === "DOCUMENT_DELETED") {
      const docId = String(metadata?.documentId || "");
      return (
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <Trash2 className="h-3.5 w-3.5 text-slate-500" />
          <span>Document removed prior to formal submission.</span>
          {docId && (
            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              ID: {docId}
            </span>
          )}
        </div>
      );
    }

    // ── 2b. OCR Extraction & Review ──────────────────────────────────────────
    if (action === "OCR_EXTRACTED") {
      const hasMismatches = Boolean(metadata?.hasMismatches);
      const matchCount = metadata?.matchCount;
      const mismatchCount = metadata?.mismatchCount;
      const durationMs = metadata?.durationMs;

      return (
        <div className="space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-violet-900 bg-violet-50 px-2 py-1 rounded border border-violet-200">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              OCR Automated Extraction
            </span>
            {typeof matchCount === "number" && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px]">
                {matchCount} match{matchCount === 1 ? "" : "es"}
              </span>
            )}
            {typeof mismatchCount === "number" && mismatchCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[11px] font-bold">
                {mismatchCount} mismatch{mismatchCount === 1 ? "" : "es"}
              </span>
            )}
            {typeof durationMs === "number" && (
              <span className="text-slate-400 text-[10px] font-mono">
                ({durationMs} ms)
              </span>
            )}
          </div>
          {hasMismatches && (
            <div className="text-[11px] text-rose-700 font-medium">
              Discrepancies found between document evidence and entered instrument values.
            </div>
          )}
        </div>
      );
    }

    if (action === "OCR_REVIEW_COMPLETED") {
      const decision = String(metadata?.decision || "ACCEPTED");
      const remarks = String(metadata?.remarks || "");
      const count = metadata?.acceptedValuesCount;

      return (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span className="font-bold text-slate-900">
              Human Review Decision:
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                decision === "ACCEPTED"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : decision === "OVERRIDDEN"
                  ? "bg-purple-50 text-purple-800 border-purple-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {decision}
            </span>
            {typeof count === "number" && (
              <span className="text-[11px] text-slate-500">
                ({count} verified field{count === 1 ? "" : "s"})
              </span>
            )}
          </div>
          {remarks && (
            <div className="bg-slate-50 p-2 rounded border border-slate-200 text-slate-700 italic">
              &ldquo;{remarks}&rdquo;
            </div>
          )}
        </div>
      );
    }

    // ── 3. Release & Refund Actions ──────────────────────────────────────────
    if (action === "RELEASE_REQUESTED") {
      return (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-purple-900">Release Reason:</span>
            <span className="text-slate-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              {String(metadata?.reason || "Institution security deposit release requested")}
            </span>
          </div>
          {metadata?.releaseRequestId && (
            <p className="text-[11px] text-slate-500 font-mono">
              Request ID: {String(metadata.releaseRequestId)}
            </p>
          )}
        </div>
      );
    }

    if (action === "RELEASE_APPROVED") {
      return (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-bold">Officer Approval Decision</span>
            <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
              Transitioned to {String(metadata?.newStatus || "RELEASED")}
            </span>
          </div>
          {metadata?.officerRemarks && (
            <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100 text-slate-700">
              <span className="font-semibold text-slate-800">Remarks: </span>
              {String(metadata.officerRemarks)}
            </div>
          )}
        </div>
      );
    }

    if (action === "RELEASE_REJECTED") {
      return (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-rose-800">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span className="font-bold">Officer Rejection Decision</span>
            <span className="text-[11px] font-mono bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
              Restored to {String(metadata?.newStatus || "ACTIVE")}
            </span>
          </div>
          {metadata?.officerRemarks && (
            <div className="bg-rose-50/50 p-2 rounded border border-rose-100 text-slate-700">
              <span className="font-semibold text-slate-800">Rejection Reason: </span>
              {String(metadata.officerRemarks)}
            </div>
          )}
        </div>
      );
    }

    if (action === "REFUND_CONFIRMED") {
      return (
        <div className="space-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-green-600" />
            <span className="font-bold text-green-900">Bank Transfer Reference:</span>
            <span className="font-mono font-bold text-slate-800 bg-green-50 px-2 py-0.5 rounded border border-green-300">
              {String(metadata?.refundReference || "N/A")}
            </span>
          </div>
          {metadata?.confirmedByEmail && (
            <p className="text-[11px] text-slate-500">
              Confirmed by: <span className="font-medium text-slate-700">{String(metadata.confirmedByEmail)}</span>
            </p>
          )}
        </div>
      );
    }

    // ── 4. Scrutiny Actions ──────────────────────────────────────────────────
    if (
      action === "SCRUTINY_APPROVE" ||
      action === "SCRUTINY_REQUEST_CORRECTION" ||
      action === "SCRUTINY_REJECT"
    ) {
      const remarks = String(metadata?.remarks || metadata?.officerRemarks || "");
      const corrections = String(metadata?.correctionsRequired || "");

      return (
        <div className="space-y-1 text-xs">
          {remarks && (
            <div className="text-slate-700">
              <span className="font-semibold text-slate-800">Officer Remarks: </span>
              {remarks}
            </div>
          )}
          {corrections && (
            <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-900">
              <span className="font-semibold">Required Corrections: </span>
              {corrections}
            </div>
          )}
        </div>
      );
    }

    // ── 5. Physical Custody ──────────────────────────────────────────────────
    if (action === "CUSTODY_EVENT_RECORDED") {
      const eventType = String(metadata?.eventType || "");
      const vaultLocation = String(metadata?.vaultLocation || metadata?.location || "");
      const physicalStatus = String(metadata?.physicalStatus || "");
      const remarks = String(metadata?.remarks || "");

      return (
        <div className="space-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {eventType && (
              <span className="font-mono font-semibold bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                {eventType}
              </span>
            )}
            {physicalStatus && (
              <span className="text-slate-600">
                Status: <strong className="text-slate-800">{physicalStatus}</strong>
              </span>
            )}
            {vaultLocation && (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <MapPin className="h-3 w-3 text-teal-600" />
                {vaultLocation}
              </span>
            )}
          </div>
          {remarks && (
            <p className="text-slate-600 italic">"{remarks}"</p>
          )}
        </div>
      );
    }

    // ── 6. Renewal / Replacement Lifecycle ───────────────────────────────────
    if (
      action === "RENEWAL_INITIATED" ||
      action === "REPLACEMENT_INITIATED" ||
      action === "RENEWAL_SUBMITTED" ||
      action === "REPLACEMENT_SUBMITTED" ||
      action === "INSTRUMENT_SUPERSEDED"
    ) {
      const succNum = String(metadata?.successorInstrumentNumber || "");
      const relType = String(metadata?.relationshipType || "");

      return (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <RotateCcw className="h-3.5 w-3.5 text-cyan-600" />
          {relType && (
            <span className="font-bold text-cyan-900 uppercase">
              {relType}
            </span>
          )}
          {succNum && (
            <span className="inline-flex items-center gap-1 text-slate-700">
              <ArrowRight className="h-3 w-3 text-slate-400" />
              Successor FDR: <strong className="font-mono text-slate-900">{succNum}</strong>
            </span>
          )}
        </div>
      );
    }

    // ── 7. Authentication Events ─────────────────────────────────────────────
    if (action === "LOGIN_SUCCESS" || action === "LOGIN_FAILED" || action === "LOGOUT") {
      const email = String(metadata?.email || "");
      const reason = String(metadata?.reason || "");

      return (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {action === "LOGIN_FAILED" && (
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          )}
          {email && (
            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {email}
            </span>
          )}
          {reason && (
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {reason}
            </span>
          )}
        </div>
      );
    }

    // ── 8. Generic / Key-Value Grid Fallback ──────────────────────────────────
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        {Object.entries(sanitizedMetadata).map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-1 text-slate-600">
            <span className="font-medium text-slate-700 capitalize">
              {k.replace(/([A-Z])/g, " $1")}:
            </span>
            <span className="text-slate-900 font-mono text-[11px] truncate">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-slate-200/80">
      {renderStructuredContent()}

      {/* Raw JSON toggle for technical audit verification */}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
          title="Toggle sanitized technical metadata"
        >
          <Code className="h-3 w-3" />
          {showRaw ? "Hide technical data" : "Technical details"}
        </button>
      </div>

      {showRaw && (
        <pre className="mt-1.5 p-2 bg-slate-900 text-slate-100 rounded text-[10px] font-mono overflow-x-auto leading-relaxed">
          {JSON.stringify(sanitizedMetadata, null, 2)}
        </pre>
      )}
    </div>
  );
}
