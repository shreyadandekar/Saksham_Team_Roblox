/**
 * src/components/clearance/ClearanceStatsCards.tsx
 *
 * KPI Metrics Cards for the Clearance Command Center.
 * Interactive: clicking a card filters the queue table.
 */

import { Clock, FileCheck2, Building2, CheckCircle2, AlertOctagon, Award } from "lucide-react";
import type { ClearanceQueueStats } from "../../types/clearance";

interface ClearanceStatsCardsProps {
  stats: ClearanceQueueStats;
  selectedStage?: string;
  onSelectStage: (stage: string) => void;
}

export default function ClearanceStatsCards({
  stats,
  selectedStage,
  onSelectStage,
}: ClearanceStatsCardsProps) {
  const cards = [
    {
      id: "ALL",
      label: "Total Pending",
      count: stats.totalPending,
      icon: Clock,
      color: "border-blue-500 bg-blue-50/70 text-blue-900",
      iconColor: "text-blue-600 bg-blue-100",
      description: "Active release workflows",
    },
    {
      id: "DOCUMENT_REVIEW",
      label: "Document Scrutiny",
      count: stats.awaitingDocumentReview,
      icon: FileCheck2,
      color: "border-sky-500 bg-sky-50/70 text-sky-900",
      iconColor: "text-sky-600 bg-sky-100",
      description: "Awaiting document verification",
    },
    {
      id: "CLEARANCES_PENDING",
      label: "Clearances Pending",
      count: stats.awaitingClearances,
      icon: Building2,
      color: "border-amber-500 bg-amber-50/70 text-amber-900",
      iconColor: "text-amber-600 bg-amber-100",
      description: "PGRC / Vigilance / Bureau review",
    },
    {
      id: "READY_FOR_FINAL_DECISION",
      label: "Ready for Final NOC",
      count: stats.readyForFinalDecision,
      icon: Award,
      color: "border-emerald-500 bg-emerald-50/70 text-emerald-900",
      iconColor: "text-emerald-600 bg-emerald-100",
      description: "Prerequisites met · Approver action",
    },
    {
      id: "ON_HOLD",
      label: "Holds & Objections",
      count: stats.unresolvedObjections,
      icon: AlertOctagon,
      color: "border-rose-500 bg-rose-50/70 text-rose-900",
      iconColor: "text-rose-600 bg-rose-100",
      description: "Unresolved departmental objections",
    },
    {
      id: "NOC_ISSUED",
      label: "Completed Cases",
      count: stats.completedCases,
      icon: CheckCircle2,
      color: "border-teal-500 bg-teal-50/70 text-teal-900",
      iconColor: "text-teal-600 bg-teal-100",
      description: "NOC granted / Refund confirmed",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedStage === card.id || (!selectedStage && card.id === "ALL");

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectStage(card.id)}
            className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${
              isSelected
                ? `${card.color} ring-2 ring-blue-500/30 font-semibold scale-[1.02]`
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">
                {card.label}
              </span>
              <span className={`p-1.5 rounded-lg ${card.iconColor}`}>
                <Icon className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {card.count}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {card.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
