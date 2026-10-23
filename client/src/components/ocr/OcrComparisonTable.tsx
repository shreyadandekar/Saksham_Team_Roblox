/**
 * src/components/ocr/OcrComparisonTable.tsx
 * Side-by-side comparison view comparing institution-entered values
 * against OCR-extracted candidate values with rule verdicts and provenance tracking.
 */

import { Info } from "lucide-react";
import type {
  FieldComparison,
  AcceptedValues,
  ValueProvenance,
} from "../../types/ocr";
import { VerdictBadge, ProvenanceBadge } from "./OcrStatusBadge";

interface OcrComparisonTableProps {
  fields: FieldComparison[];
  acceptedValues?: AcceptedValues | null;
  interactive?: boolean;
  selectedProvenance?: Record<string, ValueProvenance>;
  overrideValues?: Record<string, string>;
  onProvenanceChange?: (field: string, provenance: ValueProvenance) => void;
  onOverrideValueChange?: (field: string, value: string) => void;
}

function formatFieldLabel(field: string): string {
  switch (field) {
    case "fdrNumber":
    case "instrumentNumber":
      return "FDR / Instrument No.";
    case "bankName":
      return "Bank Name";
    case "branchName":
      return "Branch Name";
    case "amount":
      return "Principal Amount";
    case "issueDate":
      return "Date of Issue";
    case "maturityDate":
      return "Date of Maturity";
    default:
      return field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
  }
}

export default function OcrComparisonTable({
  fields,
  acceptedValues,
  interactive = false,
  selectedProvenance = {},
  overrideValues = {},
  onProvenanceChange,
  onOverrideValueChange,
}: OcrComparisonTableProps) {
  if (!fields || fields.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
        No field comparisons available for this extraction.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <th className="py-3 px-4">Field</th>
            <th className="py-3 px-4">Institution Entered</th>
            <th className="py-3 px-4">OCR Extracted Candidate</th>
            <th className="py-3 px-4">Rule Verdict</th>
            {interactive ? (
              <th className="py-3 px-4">Officer Selection</th>
            ) : acceptedValues ? (
              <th className="py-3 px-4">Accepted Value & Provenance</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {fields.map((f) => {
            const isMismatch = f.verdict === "MISMATCH";
            const isMatch = f.verdict === "MATCH";
            const rowBg = isMismatch
              ? "bg-rose-50/30 hover:bg-rose-50/50"
              : isMatch
              ? "hover:bg-slate-50/60"
              : "hover:bg-slate-50/60";

            const accepted = acceptedValues?.[f.field];
            const activeProv = selectedProvenance[f.field] || "ENTERED";
            const overrideVal = overrideValues[f.field] ?? "";

            return (
              <tr key={f.field} className={`transition-colors ${rowBg}`}>
                {/* Field Name */}
                <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                  <div>{formatFieldLabel(f.field)}</div>
                  {f.notes && (
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5 max-w-xs flex items-center gap-1">
                      <Info className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                      <span>{f.notes}</span>
                    </div>
                  )}
                </td>

                {/* Entered Value */}
                <td className="py-3 px-4 font-mono font-medium text-slate-800">
                  {f.enteredValue ? (
                    <span className="bg-slate-100/90 px-2 py-1 rounded border border-slate-200/70 inline-block">
                      {f.enteredValue}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Not entered</span>
                  )}
                </td>

                {/* Extracted Value */}
                <td className="py-3 px-4 font-mono">
                  {f.extractedValue ? (
                    <div className="space-y-1">
                      <span
                        className={`px-2 py-1 rounded inline-block font-medium ${
                          isMismatch
                            ? "bg-rose-100 text-rose-900 border border-rose-300 font-bold"
                            : "bg-indigo-50 text-indigo-900 border border-indigo-200"
                        }`}
                      >
                        {f.extractedValue}
                      </span>
                      {typeof f.confidence === "number" && (
                        <div className="text-[10px] text-slate-500">
                          Confidence: {(f.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">
                      Not found in document
                    </span>
                  )}
                </td>

                {/* Verdict Badge */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <VerdictBadge verdict={f.verdict} />
                </td>

                {/* Interactive Selection Mode */}
                {interactive && onProvenanceChange && (
                  <td className="py-3 px-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onProvenanceChange(f.field, "ENTERED")}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                            activeProv === "ENTERED"
                              ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          Use Entered
                        </button>

                        <button
                          type="button"
                          disabled={!f.extractedValue}
                          onClick={() => onProvenanceChange(f.field, "EXTRACTED")}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            activeProv === "EXTRACTED"
                              ? "bg-teal-600 text-white border-teal-700 shadow-xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          Use Extracted
                        </button>

                        <button
                          type="button"
                          onClick={() => onProvenanceChange(f.field, "OVERRIDE")}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                            activeProv === "OVERRIDE"
                              ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          Override
                        </button>
                      </div>

                      {activeProv === "OVERRIDE" && onOverrideValueChange && (
                        <div>
                          <input
                            type="text"
                            value={overrideVal}
                            onChange={(e) =>
                              onOverrideValueChange(f.field, e.target.value)
                            }
                            placeholder="Type override value..."
                            className="w-full px-2 py-1 text-xs border border-purple-300 rounded focus:ring-1 focus:ring-purple-500 focus:outline-hidden font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                )}

                {/* Readonly Accepted Value View */}
                {!interactive && acceptedValues && (
                  <td className="py-3 px-4">
                    {accepted ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {accepted.value ?? "(null)"}
                        </span>
                        <ProvenanceBadge provenance={accepted.provenance} />
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
