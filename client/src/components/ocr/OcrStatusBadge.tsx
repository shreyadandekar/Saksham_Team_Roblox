/**
 * src/components/ocr/OcrStatusBadge.tsx
 * Visual status badges for OCR extraction status, rule-check verdicts,
 * provenance indicators, and overall review indicators.
 */

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  HelpCircle,
  FileCheck,
  Sparkles,
} from "lucide-react";
import type {
  OcrStatus,
  FieldVerdict,
  ValueProvenance,
  OverallReviewIndicatorType,
} from "../../types/ocr";

interface OcrStatusBadgeProps {
  status: OcrStatus;
  size?: "sm" | "md";
}

export function OcrStatusBadge({ status, size = "md" }: OcrStatusBadgeProps) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  switch (status) {
    case "PENDING":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-300 animate-pulse ${sizeClasses}`}
        >
          <Clock className="h-3 w-3 text-amber-600" />
          Processing OCR...
        </span>
      );
    case "EXTRACTED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 ${sizeClasses}`}
        >
          <Sparkles className="h-3 w-3 text-indigo-600" />
          OCR Extracted
        </span>
      );
    case "REVIEWED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 ${sizeClasses}`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Officer Reviewed
        </span>
      );
    case "FAILED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-50 text-rose-800 border border-rose-300 ${sizeClasses}`}
        >
          <XCircle className="h-3 w-3 text-rose-600" />
          Extraction Failed
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
}

interface VerdictBadgeProps {
  verdict: FieldVerdict;
  size?: "sm" | "md";
}

export function VerdictBadge({ verdict, size = "md" }: VerdictBadgeProps) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  switch (verdict) {
    case "MATCH":
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Match
        </span>
      );
    case "MISMATCH":
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}
        >
          <XCircle className="h-3 w-3 text-rose-600" />
          Mismatch
        </span>
      );
    case "MISSING":
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}
        >
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          Not Found
        </span>
      );
    case "AMBIGUOUS":
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}
        >
          <HelpCircle className="h-3 w-3 text-purple-600" />
          Ambiguous
        </span>
      );
    case "NOT_CHECKED":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
        >
          Unchecked
        </span>
      );
  }
}

interface ProvenanceBadgeProps {
  provenance: ValueProvenance;
}

export function ProvenanceBadge({ provenance }: ProvenanceBadgeProps) {
  switch (provenance) {
    case "ENTERED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
          <FileCheck className="h-3 w-3 text-blue-600" />
          Entered
        </span>
      );
    case "EXTRACTED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-teal-50 text-teal-700 border border-teal-200">
          <Sparkles className="h-3 w-3 text-teal-600" />
          Extracted
        </span>
      );
    case "OVERRIDE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
          Override
        </span>
      );
  }
}

interface IndicatorBadgeProps {
  indicator: OverallReviewIndicatorType;
}

export function IndicatorBadge({ indicator }: IndicatorBadgeProps) {
  switch (indicator) {
    case "PASS":
    case "CLEAN_MATCH":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          All Fields Match (Pass)
        </span>
      );
    case "REVIEW_REQUIRED":
    case "REVIEW_RECOMMENDED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Discrepancies Detected (Review Required)
        </span>
      );
    case "FAIL":
    case "DISCREPANCY_DETECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="h-3.5 w-3.5 text-rose-600" />
          Critical Discrepancies
        </span>
      );
  }
}
