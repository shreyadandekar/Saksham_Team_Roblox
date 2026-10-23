/**
 * src/components/documents/DocumentUpload.tsx
 * Secure document upload component with drag-and-drop, client-side validation,
 * category selection, and real-time upload progress.
 */

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Loader2,
  X,
  FileText,
} from "lucide-react";
import { uploadDocument } from "../../api/documents";
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS_LABEL,
  MAX_FILE_SIZE_BYTES,
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type Document,
} from "../../types/document";

interface DocumentUploadProps {
  instrumentId: string;
  onUploadSuccess: (document: Document) => void;
  disabled?: boolean;
}

export default function DocumentUpload({
  instrumentId,
  onUploadSuccess,
  disabled = false,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("FDR Receipt");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateFile(selectedFile: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return `Invalid file format (${selectedFile.type || "unknown"}). Allowed: ${ALLOWED_EXTENSIONS_LABEL}.`;
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      return `File size (${sizeMB} MB) exceeds maximum allowed limit of 10 MB.`;
    }
    return null;
  }

  function handleFileSelected(selectedFile: File) {
    setError(null);
    setSuccess(null);
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selectedFile);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  function clearSelectedFile() {
    setFile(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const response = await uploadDocument(
        instrumentId,
        file,
        category,
        (percent) => {
          setProgress(percent);
        }
      );

      setSuccess(`"${file.name}" uploaded successfully.`);
      clearSelectedFile();
      onUploadSuccess(response.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Category selector & Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div className="sm:col-span-2 space-y-1">
          <label
            htmlFor="document-category"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Document Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="document-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            disabled={disabled || uploading}
            className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="text-right sm:text-xs text-[11px] text-slate-500 pb-2">
          Max: 10 MB ({ALLOWED_EXTENSIONS_LABEL})
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => {
          if (!disabled && !uploading && !file) {
            fileInputRef.current?.click();
          }
        }}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-50/70"
            : file
            ? "border-emerald-400 bg-emerald-50/40 cursor-default"
            : disabled || uploading
            ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
            : "border-slate-300 bg-slate-50 hover:bg-slate-100/70 hover:border-blue-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload-input"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={onInputChange}
          disabled={disabled || uploading}
          className="hidden"
        />

        {!file ? (
          <div className="space-y-2">
            <UploadCloud
              className={`mx-auto h-10 w-10 ${
                isDragging ? "text-blue-600 scale-110" : "text-slate-400"
              } transition-transform`}
            />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                <span className="text-blue-700 hover:underline">Click to browse</span> or drag & drop supporting document
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Accepted: PDF, JPEG, PNG (scanned copy of FDR / bank letter)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB · {category}
                </p>
              </div>
            </div>

            {!uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedFile();
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                title="Remove selected file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar (Visible during upload) */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              Uploading & hashing document...
            </span>
            <span className="font-mono font-semibold text-blue-700">{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error & Success Messages */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <FileText className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Action Button */}
      {file && !uploading && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={clearSelectedFile}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Upload Document
          </button>
        </div>
      )}
    </div>
  );
}
