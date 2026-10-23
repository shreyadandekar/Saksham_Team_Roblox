/**
 * src/components/relationships/LinkedInstrumentsCard.tsx
 * Component displaying predecessor (original) and successor (renewals/replacements)
 * linked to an instrument, with status badges, timestamps, and navigation links.
 */

import { Link } from "react-router-dom";
import { GitFork, ArrowRight, ArrowLeft, Clock, User, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { InstrumentRelationshipItem } from "../../types/relationship";
import StatusBadge from "../common/StatusBadge";
import { formatINR, formatDate, formatDateTime } from "../../utils/format";
import type { InstrumentStatus } from "../../types/instrument";

interface LinkedInstrumentsCardProps {
  currentInstrumentId: string;
  predecessors: InstrumentRelationshipItem[];
  successors: InstrumentRelationshipItem[];
}

export default function LinkedInstrumentsCard({
  currentInstrumentId: _currentInstrumentId,
  predecessors,
  successors,
}: LinkedInstrumentsCardProps) {
  const hasRelationships = predecessors.length > 0 || successors.length > 0;

  if (!hasRelationships) {
    return null;
  }

  const statusConfig = {
    PENDING: { label: "Under Review", bg: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
    APPROVED: { label: "Approved & Linked", bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", bg: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle },
    CANCELLED: { label: "Cancelled", bg: "bg-slate-100 text-slate-700 border-slate-200", icon: AlertCircle },
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <GitFork className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Deposit Lifecycle Lineage & Relationships
          </h2>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono">
          {predecessors.length + successors.length} Linked Record{predecessors.length + successors.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Predecessors (Parent original instrument this deposit renews/replaces) */}
      {predecessors.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5 text-blue-600" />
            Predecessor / Original Deposit (Replaced by this FDR)
          </h3>
          <div className="space-y-2">
            {predecessors.map((rel) => {
              const cfg = statusConfig[rel.status];
              const Icon = cfg.icon;
              const source = rel.sourceInstrument;

              return (
                <div
                  key={rel.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-blue-900 text-sm font-mono">
                        {source?.instrumentNumber || "Original FDR"}
                      </span>
                      <span className="px-2 py-0.2 bg-blue-100 text-blue-800 font-semibold rounded text-[10px]">
                        {rel.relationshipType}
                      </span>
                      {source?.status && (
                        <StatusBadge status={source.status as InstrumentStatus} />
                      )}
                    </div>
                    <p className="text-slate-600">
                      Bank: <span className="font-semibold">{source?.bankName}</span> &bull; Principal:{" "}
                      <span className="font-mono font-semibold">{formatINR(source?.amount || 0)}</span> &bull; Matured:{" "}
                      {source?.maturityDate ? formatDate(source.maturityDate) : "—"}
                    </p>
                    {rel.remarks && (
                      <p className="text-slate-500 italic text-[11px] mt-0.5">
                        &ldquo;{rel.remarks}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg}`}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    {source?.id && (
                      <Link
                        to={`/instruments/${source.id}`}
                        className="text-blue-700 hover:text-blue-900 font-semibold text-xs inline-flex items-center gap-1"
                      >
                        Inspect Original <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Successors (Renewals or replacements initiated from this deposit) */}
      {successors.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
            Proposed Successor Deposits (Renewals & Replacements)
          </h3>
          <div className="space-y-2">
            {successors.map((rel) => {
              const cfg = statusConfig[rel.status];
              const Icon = cfg.icon;
              const target = rel.targetInstrument;

              return (
                <div
                  key={rel.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-blue-900 text-sm font-mono">
                        {target?.instrumentNumber || "Successor FDR"}
                      </span>
                      <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 font-semibold rounded text-[10px]">
                        {rel.relationshipType}
                      </span>
                      {target?.status && (
                        <StatusBadge status={target.status as InstrumentStatus} />
                      )}
                    </div>
                    <p className="text-slate-600">
                      Bank: <span className="font-semibold">{target?.bankName}</span> &bull; Principal:{" "}
                      <span className="font-mono font-semibold">{formatINR(target?.amount || 0)}</span> &bull; Maturity:{" "}
                      {target?.maturityDate ? formatDate(target.maturityDate) : "—"}
                    </p>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px] pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Submitted: {formatDateTime(rel.createdAt)}
                      </span>
                      {rel.initiatedBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> By: {rel.initiatedBy.fullName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg}`}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    {target?.id && (
                      <Link
                        to={`/instruments/${target.id}`}
                        className="text-blue-700 hover:text-blue-900 font-semibold text-xs inline-flex items-center gap-1"
                      >
                        View Successor <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
