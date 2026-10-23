/**
 * src/components/documents/DocumentList.tsx
 * Displays the list of documents attached to an instrument.
 * Handles download (signed URL) and delete actions.
 */

import { useState } from "react";
import {
  FileText,
  Image,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import type { Document } from "../../types/document";
import { getDocumentDownloadUrl, deleteDocument } from "../../api/documents";
import { formatDateTime } from "../../utils/format";

interface DocumentListProps {
  instrumentId: string;
  documents: Document[];
  canDelete: boolean; // true when instrument is DRAFT and user is INSTITUTION_USER
  onDocumentDeleted: (documentId: string) => void;
  onTriggerOcr?: (documentId: string) => void;
  triggeringDocId?: string | null;
}

function mimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return (
      <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
        <Image className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
      <FileText className="h-4 w-4" />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({
  instrumentId,
  documents,
  canDelete,
  onDocumentDeleted,
  onTriggerOcr,
  triggeringDocId,
}: DocumentListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(doc: Document) {
    setError(null);
    setDownloadingId(doc.id);
    try {
      const { signedUrl } = await getDocumentDownloadUrl(instrumentId, doc.id);
      // Open in new tab — the signed URL is short-lived (60 s)
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate download link.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(doc: Document) {
    if (!window.confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) return;
    setError(null);
    setDeletingId(doc.id);
    try {
      await deleteDocument(instrumentId, doc.id);
      onDocumentDeleted(doc.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <FileCheck2 className="h-8 w-8 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-700">No documents attached yet</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {canDelete
            ? "Upload the original scanned FDR, Bank Confirmation letter, or Board Resolution."
            : "No supporting verification documents have been uploaded for this instrument."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3.5 hover:bg-slate-50/80 transition-colors"
          >
            {mimeIcon(doc.mimeType)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {doc.originalName}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {doc.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatBytes(doc.sizeBytes)} · Uploaded {formatDateTime(doc.createdAt)}
                {doc.uploadedBy && (
                  <> by <span className="text-slate-700 font-medium">{doc.uploadedBy.fullName}</span></>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id={`doc-download-${doc.id}`}
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.id}
                title="View / Download (Secure Signed URL)"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {downloadingId === doc.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                <span>View</span>
              </button>

              {onTriggerOcr &&
                (doc.mimeType === "application/pdf" ||
                  doc.mimeType === "image/jpeg" ||
                  doc.mimeType === "image/png") && (
                  <button
                    type="button"
                    id={`doc-ocr-${doc.id}`}
                    onClick={() => onTriggerOcr(doc.id)}
                    disabled={triggeringDocId === doc.id}
                    title="Run OCR Document Intelligence"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {triggeringDocId === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                    <span>OCR</span>
                  </button>
                )}

              {canDelete && (
                <button
                  type="button"
                  id={`doc-delete-${doc.id}`}
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  title="Delete document"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>Total: {documents.length} document{documents.length === 1 ? "" : "s"} attached</span>
        <span>Signed links expire in 60s for regulatory privacy</span>
      </div>
    </div>
  );
}
